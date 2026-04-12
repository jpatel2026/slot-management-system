import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { logChanges } from '@/lib/audit'
import { getScenarioPrisma } from '@/lib/scenario/scenario-prisma'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { searchParams } = new URL(req.url)
  const scenarioId = searchParams.get('scenarioId')
  const db = getScenarioPrisma(scenarioId ? parseInt(scenarioId) : null)
  const milestone = await db.orderMilestone.findUnique({ where: { id: parseInt(id) } })
  if (!milestone) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(milestone)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const scenarioId = body.scenarioId
  const db = getScenarioPrisma(scenarioId ? parseInt(scenarioId) : null)
  const old = await db.orderMilestone.findUnique({ where: { id: parseInt(id) } })
  if (!old) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const allowedFields: Record<string, unknown> = {}
  if (body.actualDate !== undefined) allowedFields.actualDate = body.actualDate ? new Date(body.actualDate) : null

  const milestone = await db.orderMilestone.update({
    where: { id: parseInt(id) },
    data: allowedFields,
  })
  await logChanges('OrderMilestone', String(id), old as Record<string, unknown>, allowedFields)
  return NextResponse.json(milestone)
}
