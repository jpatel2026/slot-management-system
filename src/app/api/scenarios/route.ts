import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { logAudit } from '@/lib/audit'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const parentId = searchParams.get('parentId')
  const status = searchParams.get('status')

  const where: Record<string, unknown> = {}
  if (parentId === 'null') where.parentId = null
  else if (parentId) where.parentId = parseInt(parentId)
  if (status) where.status = status

  const scenarios = await prisma.scenario.findMany({
    where,
    include: {
      parent: { select: { id: true, name: true } },
      children: { select: { id: true, name: true, status: true } },
      _count: { select: { overrides: true, children: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })
  return NextResponse.json(scenarios)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, description, parentId } = body

  let depth = 0
  if (parentId) {
    const parent = await prisma.scenario.findUnique({ where: { id: parentId } })
    if (parent) depth = parent.depth + 1
  }

  const scenario = await prisma.scenario.create({
    data: {
      name,
      description: description || null,
      parentId: parentId || null,
      depth,
      status: 'Draft',
      lastRefreshedAt: new Date(),
    },
    include: {
      parent: { select: { id: true, name: true } },
      _count: { select: { overrides: true, children: true } },
    },
  })

  await logAudit({ objectType: 'Scenario', recordId: String(scenario.id), action: 'create', newValue: name })
  return NextResponse.json(scenario, { status: 201 })
}
