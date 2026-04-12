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
    const dateFilter: Record<string, string> = {}
    if (dateFrom) dateFilter.gte = dateFrom
    if (dateTo) dateFilter.lte = dateTo
    where.date = dateFilter
  }

  const capacities = await db.dailyCapacity.findMany({
    where,
    orderBy: { date: 'asc' },
  })
  return NextResponse.json(capacities)
}
