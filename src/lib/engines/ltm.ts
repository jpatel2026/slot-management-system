import prisma from '@/lib/prisma'
import { getScenarioPrisma } from '@/lib/scenario/scenario-prisma'
import { skipNonWorkingAndHolidays } from '@/lib/utils'

interface MilestoneResult {
  milestoneName: string
  leg: number
  sequentialLeg: number
  plannedDate: Date
}

export async function calculateMilestones(
  orderId: string,
  careProgramId: number,
  cryoType: string,
  hasWdc: boolean,
  creationDate: Date,
  aphPickupDate: Date,
  cryoCapacityDate: Date | null,
  mfgCapacityDate: Date,
  mfgSiteId: number,
  scenarioId?: number
): Promise<MilestoneResult[]> {
  // Step 1: Get applicable LTM config rows
  const configs = await prisma.ltmConfig.findMany({
    where: {
      careProgramId,
      active: true,
    },
    orderBy: { leg: 'asc' },
    include: { mfgSite: true },
  })

  // Step 2: Filter to applicable milestones
  const applicable = configs.filter(config => {
    // Check cryo type
    const cryoTypes = config.cryoTypes.split(',').map(s => s.trim())
    if (!cryoTypes.includes(cryoType)) return false

    // Check WDC applicability
    if (config.wdcApplicable && !hasWdc) return false

    // Check update logic applicability for this cryo type
    let updateLogic: string | null = null
    let applicability: string | null = null
    if (cryoType === 'Central') {
      updateLogic = config.updateLogicCentral
      applicability = config.centralApplicability
    } else if (cryoType === 'Manufacturing') {
      updateLogic = config.updateLogicMfg
      applicability = config.mfgApplicability
    } else if (cryoType === 'Local') {
      updateLogic = config.updateLogicLocal
      applicability = config.localApplicability
    }

    if (!updateLogic || applicability !== 'Applicable') return false

    // Check site-specific filter
    if (config.mfgSiteId && config.mfgSiteId !== mfgSiteId) return false

    return true
  })

  // Step 3: Assign sequential legs
  const results: MilestoneResult[] = []
  let previousPlannedDate: Date | null = null

  // Get holidays for relevant sites
  const allHolidays = await prisma.holiday.findMany({
    where: { active: true },
  })

  for (let i = 0; i < applicable.length; i++) {
    const config = applicable[i]
    const sequentialLeg = i + 1

    // Determine update logic for this cryo type
    let updateLogic: string | null = null
    let leadTime: number | null = null
    if (cryoType === 'Central') {
      updateLogic = config.updateLogicCentral
      leadTime = config.cryoLeadTime
    } else if (cryoType === 'Manufacturing') {
      updateLogic = config.updateLogicMfg
      leadTime = config.mfgLeadTime
    } else if (cryoType === 'Local') {
      updateLogic = config.updateLogicLocal
      leadTime = config.localLeadTime
    }

    let plannedDate: Date

    switch (updateLogic) {
      case 'Creation Date':
        plannedDate = new Date(creationDate)
        break
      case 'Collection Date':
        plannedDate = new Date(aphPickupDate)
        break
      case 'Cryopreservation Daily Capacity':
        plannedDate = cryoCapacityDate ? new Date(cryoCapacityDate) : new Date(aphPickupDate)
        break
      case 'Manufacturing Daily Capacity':
        plannedDate = new Date(mfgCapacityDate)
        break
      case 'Lead Time':
        if (previousPlannedDate && leadTime !== null) {
          plannedDate = new Date(previousPlannedDate)
          plannedDate.setDate(plannedDate.getDate() + leadTime)
        } else {
          plannedDate = new Date(creationDate)
        }
        break
      default:
        plannedDate = new Date(creationDate)
    }

    // Holiday avoidance
    if (config.holidaySiteAssociation) {
      const siteHolidays = allHolidays
        .filter(h => {
          // Match by site type association - simplified
          return true
        })
        .map(h => new Date(h.date))

      const nonWorkingDays = config.nonWorkingDay?.split(',') || []
      plannedDate = skipNonWorkingAndHolidays(plannedDate, nonWorkingDays, siteHolidays)
    } else if (config.nonWorkingDay) {
      const nonWorkingDays = config.nonWorkingDay.split(',')
      plannedDate = skipNonWorkingAndHolidays(plannedDate, nonWorkingDays, [])
    }

    results.push({
      milestoneName: config.milestoneName,
      leg: config.leg,
      sequentialLeg,
      plannedDate,
    })

    previousPlannedDate = plannedDate
  }

  return results
}

export async function generateOrderMilestones(
  orderId: string,
  careProgramId: number,
  cryoType: string,
  hasWdc: boolean,
  creationDate: Date,
  aphPickupDate: Date,
  cryoCapacityDate: Date | null,
  mfgCapacityDate: Date,
  mfgSiteId: number,
  scenarioId?: number
) {
  const db = getScenarioPrisma(scenarioId) as any
  // Delete existing milestones for this order
  await db.orderMilestone.deleteMany({
    where: { orderReservationId: orderId },
  })

  const milestones = await calculateMilestones(
    orderId, careProgramId, cryoType, hasWdc,
    creationDate, aphPickupDate, cryoCapacityDate, mfgCapacityDate, mfgSiteId
  )

  // Create milestone records
  for (const ms of milestones) {
    await db.orderMilestone.create({
      data: {
        orderReservationId: orderId,
        milestoneName: ms.milestoneName,
        leg: ms.leg,
        sequentialLeg: ms.sequentialLeg,
        plannedDate: ms.plannedDate,
      },
    })
  }

  return milestones
}
