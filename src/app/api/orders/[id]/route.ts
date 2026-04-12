import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { logChanges } from '@/lib/audit'
import { getScenarioPrisma } from '@/lib/scenario/scenario-prisma'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { searchParams } = new URL(req.url)
  const scenarioId = searchParams.get('scenarioId')
  const db = getScenarioPrisma(scenarioId ? parseInt(scenarioId) : null)
  const order = await db.orderReservation.findUnique({
    where: { id: id },
    include: {
      product: true,
      aphSite: true,
      cryoSite: true,
      mfgSite: true,
      wdcSite: true,
      infusionSite: true,
      cryoCapacity: true,
      mfgCapacity: true,
      milestones: true,
    },
  })
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(order)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const scenarioId = body.scenarioId
  const db = getScenarioPrisma(scenarioId ? parseInt(scenarioId) : null)
  const old = await db.orderReservation.findUnique({ where: { id: id } })
  if (!old) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Limited fields for update
  const order = await db.orderReservation.update({
    where: { id: id },
    data: body,
    include: {
      product: true,
      aphSite: true,
      cryoSite: true,
      mfgSite: true,
      wdcSite: true,
      infusionSite: true,
      cryoCapacity: true,
      mfgCapacity: true,
      milestones: true,
    },
  })
  await logChanges('OrderReservation', String(id), old as Record<string, unknown>, body)
  return NextResponse.json(order)
}
