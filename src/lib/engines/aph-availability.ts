import prisma from '@/lib/prisma'
import { getScenarioPrisma } from '@/lib/scenario/scenario-prisma'
import type { AvailabilityRequest, AvailabilityResponse } from '@/types'

const PREFERENCE_ORDER = ['Primary', 'Secondary', 'Tertiary']

export async function getAphPickupAvailability(
  request: AvailabilityRequest,
  scenarioId?: number
): Promise<AvailabilityResponse[]> {
  const db = getScenarioPrisma(scenarioId) as any
  const { aphSiteId, startDate, dateRange, productCode, country, therapyType, cryoType } = request

  // Step 1: Resolve site relationships
  const relationships = await prisma.siteRelationship.findMany({
    where: {
      aphSiteId,
      active: true,
      effectiveDate: { lte: new Date() },
    },
    include: { aphSite: true, cryoSite: true, mfgSite: true },
  })

  if (relationships.length === 0) return []

  // Step 2: Get product
  const product = await prisma.product.findFirst({ where: { code: productCode, active: true } })
  if (!product) return []

  // Get GDLT records
  const gdlts = await prisma.gdlt.findMany({
    where: { productId: product.id },
  })

  // Determine capacity type from therapy type
  const capacityType = therapyType === 'Commercial' ? 'Commercial' : 'Clinical'

  // Step 3: For each date in range, check availability
  const results: AvailabilityResponse[] = []
  const start = new Date(startDate)

  for (let d = 0; d < dateRange; d++) {
    const aphDate = new Date(start)
    aphDate.setDate(start.getDate() + d)

    let bestMfg: { name: string; date: Date; siteId: number } | null = null
    let bestCryo: { name: string; date: Date } | null = null

    // Sort relationships by mfg preference
    const sortedRels = [...relationships].sort((a, b) =>
      PREFERENCE_ORDER.indexOf(a.mfgPreference) - PREFERENCE_ORDER.indexOf(b.mfgPreference)
    )

    for (const rel of sortedRels) {
      // Calculate mfg date from aph date using GDLT
      const gdlt = gdlts.find(g => g.siteId === rel.mfgSiteId || g.siteId === aphSiteId)
      if (!gdlt) continue

      // Determine lead time based on mfgType
      let leadTimeDays: number
      const aphSiteMfgType = rel.aphSite?.mfgType
      if (aphSiteMfgType === 'Fresh' || product.mfgType === 'Fresh') {
        leadTimeDays = gdlt.exactLt || 0
      } else {
        leadTimeDays = gdlt.minLt || 0
      }

      // For Central cryo, we need cryo date first, then mfg date
      if (cryoType === 'Central' && rel.cryoSiteId) {
        const cryoDate = new Date(aphDate)
        cryoDate.setDate(aphDate.getDate() + leadTimeDays)

        // Check cryo capacity
        const cryoCap = await db.dailyCapacity.findFirst({
          where: {
            siteId: rel.cryoSiteId,
            siteType: 'Cryopreservation',
            date: cryoDate,
            capacityType: 'Patient',
            remainingCapacity: { gt: 0 },
          },
        })

        if (!cryoCap) continue

        // Calculate mfg date from cryo
        const mfgDate = new Date(cryoDate)
        mfgDate.setDate(cryoDate.getDate() + 1) // simplified - should use LTM

        const mfgCap = await db.dailyCapacity.findFirst({
          where: {
            siteId: rel.mfgSiteId,
            siteType: 'Manufacturing',
            date: mfgDate,
            capacityType,
            remainingCapacity: { gt: 0 },
            productCode,
          },
        })

        if (mfgCap) {
          bestCryo = { name: cryoCap.name, date: cryoDate }
          bestMfg = { name: mfgCap.name, date: mfgDate, siteId: rel.mfgSiteId }
          break
        }
      } else {
        // Local or Manufacturing cryo - check mfg directly
        const mfgDate = new Date(aphDate)
        mfgDate.setDate(aphDate.getDate() + leadTimeDays)

        const mfgCap = await db.dailyCapacity.findFirst({
          where: {
            siteId: rel.mfgSiteId,
            siteType: 'Manufacturing',
            date: mfgDate,
            capacityType,
            remainingCapacity: { gt: 0 },
            productCode,
          },
        })

        if (mfgCap) {
          bestMfg = { name: mfgCap.name, date: mfgDate, siteId: rel.mfgSiteId }
          break
        }
      }
    }

    // Step 6: Cryo fallback for Central
    if (cryoType === 'Central' && bestMfg && !bestCryo) {
      // Try any cryo site with availability for the earliest mfg date
      for (const rel of sortedRels) {
        if (!rel.cryoSiteId) continue
        const fallbackCryo = await db.dailyCapacity.findFirst({
          where: {
            siteId: rel.cryoSiteId,
            siteType: 'Cryopreservation',
            capacityType: 'Patient',
            remainingCapacity: { gt: 0 },
            date: { lte: bestMfg.date },
          },
          orderBy: { date: 'desc' },
        })
        if (fallbackCryo) {
          bestCryo = { name: fallbackCryo.name, date: new Date(fallbackCryo.date) }
          break
        }
      }
    }

    // Step 7: Assemble response
    if (cryoType === 'Central') {
      if (bestMfg && bestCryo) {
        results.push({
          aphDate: aphDate.toISOString().split('T')[0],
          cryoCapacityName: bestCryo.name,
          mfgCapacityName: bestMfg.name,
        })
      }
    } else {
      if (bestMfg) {
        results.push({
          aphDate: aphDate.toISOString().split('T')[0],
          cryoCapacityName: null,
          mfgCapacityName: bestMfg.name,
        })
      }
    }
  }

  return results
}
