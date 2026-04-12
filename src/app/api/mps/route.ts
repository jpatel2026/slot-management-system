import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { getScenarioPrisma } from '@/lib/scenario/scenario-prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const scenarioId = searchParams.get('scenarioId')
  const db = getScenarioPrisma(scenarioId ? parseInt(scenarioId) : null)
  const mfgSiteId = searchParams.get('mfgSiteId')
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')

  const where: Record<string, unknown> = {}
  if (mfgSiteId) where.mfgSiteId = parseInt(mfgSiteId)
  if (dateFrom || dateTo) {
    const dateFilter: Record<string, string> = {}
    if (dateFrom) dateFilter.gte = dateFrom
    if (dateTo) dateFilter.lte = dateTo
    where.date = dateFilter
  }

  const mpsRecords = await db.mps.findMany({
    where,
    include: { mfgSite: true },
    orderBy: { date: 'desc' },
  })
  return NextResponse.json(mpsRecords)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const scenarioId = body.scenarioId
  const db = getScenarioPrisma(scenarioId ? parseInt(scenarioId) : null)

  // Look up account for siteId to auto-generate name
  const account = await prisma.account.findUnique({ where: { id: body.mfgSiteId } })
  if (!account) {
    return NextResponse.json({ error: 'Manufacturing site not found' }, { status: 400 })
  }

  const name = `${account.siteId}-${body.date}`

  const mps = await db.mps.create({
    data: { ...body, name },
    include: { mfgSite: true },
  })
  await logAudit({ objectType: 'Mps', recordId: String(mps.id), action: 'create', newValue: JSON.stringify({ ...body, name }) })
  return NextResponse.json(mps, { status: 201 })
}
