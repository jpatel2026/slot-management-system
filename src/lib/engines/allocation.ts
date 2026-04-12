import prisma from '@/lib/prisma'
import { getScenarioPrisma } from '@/lib/scenario/scenario-prisma'
import { logAudit } from '@/lib/audit'
import { getDaysInMonth, generateCapacityName } from '@/lib/utils'

interface RulesTable {
  [capacityType: string]: {
    [dayOfWeek: string]: number | boolean
  }
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export async function generateMfgAllocations(
  siteId: number,
  month: number, // 1-12
  year: number,
  rules: RulesTable,
  productCode: string,
  scenarioId?: number
) {
  const db = getScenarioPrisma(scenarioId) as any
  // 1. Fetch IBP
  const ibp = await db.ibp.findFirst({
    where: { mfgSiteId: siteId, month, year },
  })
  if (!ibp) throw new Error('No IBP record found for this site-month')

  // 2. Fetch site
  const site = await prisma.account.findUnique({ where: { id: siteId } })
  if (!site) throw new Error('Site not found')

  // 3. Fetch holidays
  const holidays = await prisma.holiday.findMany({
    where: { accountId: siteId, active: true },
  })
  const holidayDates = holidays.map(h => new Date(h.date))

  // 4. Get all dates in month
  const dates = getDaysInMonth(year, month)

  // 5. Fetch MPS records for each date
  const mpsRecords = await db.mps.findMany({
    where: {
      mfgSiteId: siteId,
      date: {
        gte: new Date(year, month - 1, 1),
        lt: new Date(year, month, 1),
      },
    },
  })
  const mpsMap = new Map(mpsRecords.map((m: any) => [new Date(m.date).toDateString(), m]))

  // 6. Calculate IBP percentage splits
  const totalIbpPatient = ibp.commercialCapacity + ibp.clinicalCapacity + ibp.reserveCapacity
  const pctCommercial = totalIbpPatient > 0 ? ibp.commercialCapacity / totalIbpPatient : 0
  const pctClinical = totalIbpPatient > 0 ? ibp.clinicalCapacity / totalIbpPatient : 0
  const pctReserve = totalIbpPatient > 0 ? ibp.reserveCapacity / totalIbpPatient : 0

  // 7. Delete existing records for this site-month
  await db.dailyCapacity.deleteMany({
    where: {
      siteId,
      siteType: 'Manufacturing',
      date: {
        gte: new Date(year, month - 1, 1),
        lt: new Date(year, month, 1),
      },
    },
  })

  // 8. Track monthly totals
  let monthlyCommercial = 0
  let monthlyClinical = 0
  let monthlyReserve = 0
  let monthlyNonPatient = 0

  const capacityRecords: Array<{
    name: string; date: Date; capacityType: string; siteType: string
    baseCapacity: number; remainingCapacity: number; mfgType: string | null
    siteId: number; productCode: string
  }> = []

  // Determine Mfgtype from rules checkboxes
  const freshApplicable = rules['Fresh'] || {}
  const frozenApplicable = rules['Frozen'] || {}

  for (const date of dates) {
    const dayName = DAY_NAMES[date.getDay()]
    const mps = mpsMap.get(date.toDateString()) as any
    if (!mps) continue // Skip days without MPS

    const dailyPatientCap = mps.patientCapacity as number
    const dailyNonPatientCap = mps.nonPatientCapacity as number

    // Get rules for this day
    const ruleCommercial = (rules['Commercial']?.[dayName] as number) ?? null
    const ruleClinical = (rules['Clinical']?.[dayName] as number) ?? null
    const ruleReserve = (rules['Reserve']?.[dayName] as number) ?? null
    const ruleNonPatient = (rules['Non-patient']?.[dayName] as number) ?? null

    // Calculate patient split using IBP percentages, capped by MPS
    let commercial = ruleCommercial !== null ? Math.min(ruleCommercial, dailyPatientCap) : Math.floor(dailyPatientCap * pctCommercial)
    let clinical = ruleClinical !== null ? Math.min(ruleClinical, dailyPatientCap) : Math.floor(dailyPatientCap * pctClinical)
    let reserve = ruleReserve !== null ? Math.min(ruleReserve, dailyPatientCap) : Math.floor(dailyPatientCap * pctReserve)
    let nonPatient = ruleNonPatient !== null ? Math.min(ruleNonPatient, dailyNonPatientCap) : dailyNonPatientCap

    // Ensure daily patient cap respected
    const totalPatient = commercial + clinical + reserve
    if (totalPatient > dailyPatientCap) {
      const scale = dailyPatientCap / totalPatient
      commercial = Math.floor(commercial * scale)
      clinical = Math.floor(clinical * scale)
      reserve = dailyPatientCap - commercial - clinical
    }

    // Enforce monthly IBP caps
    if (monthlyCommercial + commercial > ibp.commercialCapacity) {
      commercial = Math.max(0, ibp.commercialCapacity - monthlyCommercial)
    }
    if (monthlyClinical + clinical > ibp.clinicalCapacity) {
      clinical = Math.max(0, ibp.clinicalCapacity - monthlyClinical)
    }
    if (monthlyReserve + reserve > ibp.reserveCapacity) {
      reserve = Math.max(0, ibp.reserveCapacity - monthlyReserve)
    }
    if (monthlyNonPatient + nonPatient > ibp.nonPatientCapacity) {
      nonPatient = Math.max(0, ibp.nonPatientCapacity - monthlyNonPatient)
    }

    monthlyCommercial += commercial
    monthlyClinical += clinical
    monthlyReserve += reserve
    monthlyNonPatient += nonPatient

    // Determine mfgType for this day
    const isFresh = freshApplicable[dayName] === true
    const isFrozen = frozenApplicable[dayName] === true
    let mfgType: string | null = null
    if (isFresh && isFrozen) mfgType = 'Fresh & Frozen'
    else if (isFresh) mfgType = 'Fresh'
    else if (isFrozen) mfgType = 'Frozen'
    else mfgType = site.mfgType // Default to site mfgType

    // Create records for each capacity type
    const types = [
      { type: 'Commercial', base: commercial },
      { type: 'Clinical', base: clinical },
      { type: 'Reserve', base: reserve },
      { type: 'Non-patient', base: nonPatient },
    ]

    for (const { type, base } of types) {
      if (base === 0 && type !== 'Non-patient') continue // Skip zero-capacity patient types but keep non-patient
      const name = generateCapacityName(date, site.alias, type, 'Manufacturing', productCode)
      capacityRecords.push({
        name,
        date,
        capacityType: type,
        siteType: 'Manufacturing',
        baseCapacity: base,
        remainingCapacity: base,
        mfgType,
        siteId,
        productCode,
      })
    }
  }

  // 9. Bulk create
  for (const record of capacityRecords) {
    await db.dailyCapacity.create({
      data: {
        ...record,
        bookedCapacity: 0,
        overallocationCapacity: 0,
      },
    })
  }

  await logAudit({
    objectType: 'DailyCapacity',
    recordId: `${site.siteId}-${month}-${year}`,
    action: 'generate',
    newValue: `Generated ${capacityRecords.length} Mfg records`,
  })

  return { count: capacityRecords.length, monthlyCommercial, monthlyClinical, monthlyReserve, monthlyNonPatient }
}

export async function generateCryoAllocations(
  siteId: number,
  month: number,
  year: number,
  rules: RulesTable,
  scenarioId?: number
) {
  const db = getScenarioPrisma(scenarioId) as any
  const site = await prisma.account.findUnique({ where: { id: siteId } })
  if (!site) throw new Error('Site not found')

  const holidays = await prisma.holiday.findMany({
    where: { accountId: siteId, active: true },
  })
  const holidayDates = new Set(holidays.map(h => new Date(h.date).toDateString()))

  const dates = getDaysInMonth(year, month)

  // Check if rules have any values
  const hasRules = Object.keys(rules).some(key =>
    Object.values(rules[key]).some(v => typeof v === 'number' && v > 0)
  )
  if (!hasRules) {
    return { count: 0, message: 'No rules defined for this site-month. No records created.' }
  }

  // Delete existing
  await db.dailyCapacity.deleteMany({
    where: {
      siteId,
      siteType: 'Cryopreservation',
      date: {
        gte: new Date(year, month - 1, 1),
        lt: new Date(year, month, 1),
      },
    },
  })

  const records: Array<{
    name: string; date: Date; capacityType: string; siteType: string
    baseCapacity: number; remainingCapacity: number; siteId: number
  }> = []

  for (const date of dates) {
    const dayName = DAY_NAMES[date.getDay()]
    const isHoliday = holidayDates.has(date.toDateString())

    const types = ['Patient', 'Reserve', 'Non-patient']
    for (const type of types) {
      const ruleValue = (rules[type]?.[dayName] as number) ?? 0
      const base = isHoliday ? 0 : ruleValue
      const name = generateCapacityName(date, site.alias, type, 'Cryopreservation')
      records.push({
        name,
        date,
        capacityType: type,
        siteType: 'Cryopreservation',
        baseCapacity: base,
        remainingCapacity: base,
        siteId,
      })
    }
  }

  for (const record of records) {
    await db.dailyCapacity.create({
      data: {
        ...record,
        bookedCapacity: 0,
        overallocationCapacity: 0,
      },
    })
  }

  await logAudit({
    objectType: 'DailyCapacity',
    recordId: `${site.siteId}-${month}-${year}`,
    action: 'generate',
    newValue: `Generated ${records.length} Cryo records`,
  })

  return { count: records.length }
}
