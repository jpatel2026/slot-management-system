import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { logChanges } from '@/lib/audit'
import { getScenarioPrisma } from '@/lib/scenario/scenario-prisma'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { searchParams } = new URL(req.url)
  const scenarioId = searchParams.get('scenarioId')
  const db = getScenarioPrisma(scenarioId ? parseInt(scenarioId) : null)
  const capacity = await db.dailyCapacity.findUnique({ where: { id: parseInt(id) } })
  if (!capacity) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(capacity)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const scenarioId = body.scenarioId
  const db = getScenarioPrisma(scenarioId ? parseInt(scenarioId) : null)
  const old = await db.dailyCapacity.findUnique({ where: { id: parseInt(id) } })
  if (!old) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Only allow editing baseCapacity and overallocationCapacity
  const allowedFields: Record<string, unknown> = {}
  if (body.baseCapacity !== undefined) allowedFields.baseCapacity = body.baseCapacity
  if (body.overallocationCapacity !== undefined) allowedFields.overallocationCapacity = body.overallocationCapacity

  // Recalculate remainingCapacity
  const baseCapacity = allowedFields.baseCapacity ?? (old as Record<string, unknown>).baseCapacity as number
  const bookedCapacity = (old as Record<string, unknown>).bookedCapacity as number
  const overallocationCapacity = allowedFields.overallocationCapacity ?? (old as Record<string, unknown>).overallocationCapacity as number
  const siteType = (old as Record<string, unknown>).siteType as string

  let remainingCapacity: number
  if (siteType === 'Cryo') {
    // Cryo: Base - Booked
    remainingCapacity = (baseCapacity as number) - (bookedCapacity as number)
  } else {
    // Mfg: Base - Booked + Overallocation
    remainingCapacity = (baseCapacity as number) - (bookedCapacity as number) + (overallocationCapacity as number)
  }

  allowedFields.remainingCapacity = remainingCapacity

  const capacity = await db.dailyCapacity.update({
    where: { id: parseInt(id) },
    data: allowedFields,
  })
  await logChanges('DailyCapacity', String(id), old as Record<string, unknown>, allowedFields)
  return NextResponse.json(capacity)
}
