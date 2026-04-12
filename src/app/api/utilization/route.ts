import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { getScenarioPrisma } from '@/lib/scenario/scenario-prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const scenarioId = searchParams.get('scenarioId')
  const db = getScenarioPrisma(scenarioId ? parseInt(scenarioId) : null)
  const siteType = searchParams.get('siteType')
  const siteName = searchParams.get('siteName')
  const dateRangeType = searchParams.get('dateRangeType')

  const where: Record<string, unknown> = {}
  if (siteType) where.siteType = siteType
  if (siteName) where.siteName = siteName
  if (dateRangeType) where.dateRangeType = dateRangeType

  const utilization = await db.utilizationQueue.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
  })
  return NextResponse.json(utilization)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const scenarioId = body.scenarioId
  const db = getScenarioPrisma(scenarioId ? parseInt(scenarioId) : null)
  const utilization = await db.utilizationQueue.create({ data: body })
  await logAudit({ objectType: 'Utilization', recordId: String(utilization.id), action: 'create', newValue: JSON.stringify(body) })
  return NextResponse.json(utilization, { status: 201 })
}
