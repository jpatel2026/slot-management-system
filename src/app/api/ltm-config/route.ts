import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { logAudit } from '@/lib/audit'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const careProgramId = searchParams.get('careProgramId')
  const active = searchParams.get('active')
  const search = searchParams.get('search')

  const where: Record<string, unknown> = {}
  if (careProgramId) where.careProgramId = parseInt(careProgramId)
  if (active === 'true') where.active = true
  if (active === 'false') where.active = false
  if (search) where.OR = [
    { milestoneName: { contains: search } },
  ]

  const configs = await prisma.ltmConfig.findMany({
    where,
    include: { careProgram: true, mfgSite: true },
    orderBy: { updatedAt: 'desc' },
  })
  return NextResponse.json(configs)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const config = await prisma.ltmConfig.create({
    data: body,
    include: { careProgram: true, mfgSite: true },
  })
  await logAudit({ objectType: 'LtmConfig', recordId: String(config.id), action: 'create', newValue: JSON.stringify(body) })
  return NextResponse.json(config, { status: 201 })
}
