import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// Temporary route — delete after use
export async function POST() {
  // Clear existing records first
  await prisma.utilizationQueue.deleteMany()

  const weeks = [
    'W1-May-2026', 'W2-May-2026', 'W3-May-2026', 'W4-May-2026',
    'W1-Jun-2026', 'W2-Jun-2026', 'W3-Jun-2026', 'W4-Jun-2026',
    'W1-Jul-2026', 'W2-Jul-2026', 'W3-Jul-2026', 'W4-Jul-2026',
  ]
  const months = ['May-2026', 'Jun-2026', 'Jul-2026']
  const productCodes = ['CA1', 'CA2']

  const mfgSites = [
    { name: 'BioManufacturing East',   overloaded: true  },
    { name: 'BioManufacturing West',   overloaded: false },
    { name: 'BioManufacturing Canada', overloaded: false },
  ]
  const cryoSites = [
    'CryoSolutions East',
    'CryoSolutions West',
    'CryoTech Canada',
  ]

  // Deterministic seeded values (consistent across re-runs)
  let count = 0
  let seed = 42
  function rng(min: number, max: number): number {
    seed = (seed * 1664525 + 1013904223) & 0x7fffffff
    return min + (seed % (max - min + 1))
  }

  for (const site of mfgSites) {
    for (const pc of productCodes) {
      // Weekly util — mfg
      for (const w of weeks) {
        await prisma.utilizationQueue.create({
          data: {
            dateRangeType:       'Weekly',
            dateRangeValue:      w,
            siteType:            'Manufacturing',
            siteName:            site.name,
            productCode:         pc,
            minUtilizationTarget: rng(55, 65),
            currentUtilization:  site.overloaded ? rng(70, 85) : rng(25, 50),
            maxAphReceipts:      rng(5, 12),
            currentAphReceipts:  site.overloaded ? rng(6, 11) : rng(1, 4),
          },
        })
        count++
      }
      // Monthly util — mfg
      for (const m of months) {
        await prisma.utilizationQueue.create({
          data: {
            dateRangeType:       'Monthly',
            dateRangeValue:      m,
            siteType:            'Manufacturing',
            siteName:            site.name,
            productCode:         pc,
            minUtilizationTarget: rng(55, 65),
            currentUtilization:  site.overloaded ? rng(68, 82) : rng(28, 52),
          },
        })
        count++
      }
    }
  }

  // Weekly util — cryo
  for (const siteName of cryoSites) {
    for (const pc of productCodes) {
      for (const w of weeks) {
        await prisma.utilizationQueue.create({
          data: {
            dateRangeType:       'Weekly',
            dateRangeValue:      w,
            siteType:            'Cryopreservation',
            siteName,
            productCode:         pc,
            minUtilizationTarget: rng(50, 65),
            currentUtilization:  rng(30, 70),
          },
        })
        count++
      }
    }
  }

  return NextResponse.json({ ok: true, message: `Seeded ${count} UtilizationQueue records` })
}
