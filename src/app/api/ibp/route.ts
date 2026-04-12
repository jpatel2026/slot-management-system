import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { getScenarioPrisma } from '@/lib/scenario/scenario-prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const scenarioId = searchParams.get('scenarioId')
  const db = getScenarioPrisma(scenarioId ? parseInt(scenarioId) : null)
  const mfgSiteId = searchParams.get('mfgSiteId')
  const year = searchParams.get('year')
  const month = searchParams.get('month')

  const where: Record<string, unknown> = {}
  if (mfgSiteId) where.mfgSiteId = parseInt(mfgSiteId)
  if (year) where.year = parseInt(year)
  if (month) where.month = parseInt(month)

  const ibpRecords = await db.ibp.findMany({
    where,
    include: { mfgSite: true },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  })
  return NextResponse.json(ibpRecords)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const scenarioId = body.scenarioId
  const db = getScenarioPrisma(scenarioId ? parseInt(scenarioId) : null)

  // Validate unique combo of mfgSiteId + month + year
  const existing = await db.ibp.findFirst({
    where: {
      mfgSiteId: body.mfgSiteId,
      month: body.month,
      year: body.year,
    },
  })
  if (existing) {
    return NextResponse.json(
      { error: 'IBP record for this site, month, and year already exists' },
      { status: 400 }
    )
  }

  // Look up account for siteId to auto-generate name
  const account = await prisma.account.findUnique({ where: { id: body.mfgSiteId } })
  if (!account) {
    return NextResponse.json({ error: 'Manufacturing site not found' }, { status: 400 })
  }

  const name = `${account.siteId}-${body.month}-${body.year}`

  const ibp = await db.ibp.create({
    data: { ...body, name },
    include: { mfgSite: true },
  })
  await logAudit({ objectType: 'Ibp', recordId: String(ibp.id), action: 'create', newValue: JSON.stringify({ ...body, name }) })
  return NextResponse.json(ibp, { status: 201 })
}
