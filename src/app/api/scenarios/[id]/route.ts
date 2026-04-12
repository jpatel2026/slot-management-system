import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { logAudit } from '@/lib/audit'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const scenario = await prisma.scenario.findUnique({
    where: { id: parseInt(id) },
    include: {
      parent: { select: { id: true, name: true, status: true } },
      children: {
        select: { id: true, name: true, status: true, depth: true, createdAt: true, _count: { select: { overrides: true, children: true } } },
        orderBy: { createdAt: 'desc' },
      },
      _count: { select: { overrides: true, children: true } },
    },
  })
  if (!scenario) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(scenario)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const scenario = await prisma.scenario.update({
    where: { id: parseInt(id) },
    data: { name: body.name, description: body.description, status: body.status, updatedBy: body.updatedBy || 'system' },
  })
  await logAudit({ objectType: 'Scenario', recordId: id, action: 'update', newValue: JSON.stringify(body) })
  return NextResponse.json(scenario)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sid = parseInt(id)
  const scenario = await prisma.scenario.findUnique({ where: { id: sid }, include: { children: true } })
  if (!scenario) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (scenario.children.length > 0) {
    return NextResponse.json({ error: 'Cannot delete scenario with children. Delete children first.' }, { status: 400 })
  }
  await prisma.scenarioOverride.deleteMany({ where: { scenarioId: sid } })
  await prisma.scenario.delete({ where: { id: sid } })
  await logAudit({ objectType: 'Scenario', recordId: id, action: 'delete' })
  return NextResponse.json({ deleted: true })
}
