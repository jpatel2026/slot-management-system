import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getScenarioPrisma } from '@/lib/scenario/scenario-prisma'

// NO POST - created by allocation engine only
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const scenarioId = searchParams.get('scenarioId')
  const db = getScenarioPrisma(scenarioId ? parseInt(scenarioId) : null)
  const siteId = searchParams.get('siteId')
  const siteType = searchParams.get('siteType')
  const capacityType = searchParams.get('capacityType')
  const mfgType = searchParams.get('mfgType')
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')

  const productCode = searchParams.get('productCode')

  const where: Record<string, unknown> = {}
  if (siteId) where.siteId = parseInt(siteId)
  if (siteType) where.siteType = siteType
  if (capacityType) where.capacityType = capacityType
  if (mfgType) where.mfgType = mfgType
  if (productCode) where.productCode = productCode
  if (dateFrom || dateTo) {
    // Always use proper Date objects (never raw strings) so Prisma doesn't throw
    // a DateTime validation error. Append explicit UTC suffix so the conversion
    // is timezone-agnostic on both client and server.
    const dateFilter: Record<string, Date> = {}
    if (dateFrom) dateFilter.gte = new Date(dateFrom + 'T00:00:00.000Z')
    if (dateTo)   dateFilter.lte = new Date(dateTo   + 'T23:59:59.999Z')
    where.date = dateFilter
  }

  try {
    const capacities = await db.dailyCapacity.findMany({
      where,
      orderBy: { date: 'asc' },
    })
    return NextResponse.json(capacities)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[daily-capacity GET]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
