import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { logChanges } from '@/lib/audit'
import { getScenarioPrisma } from '@/lib/scenario/scenario-prisma'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { searchParams } = new URL(req.url)
  const scenarioId = searchParams.get('scenarioId')
  const db = getScenarioPrisma(scenarioId ? parseInt(scenarioId) : null)
  const utilization = await db.utilizationQueue.findUnique({ where: { id: parseInt(id) } })
  if (!utilization) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(utilization)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const scenarioId = body.scenarioId
  const db = getScenarioPrisma(scenarioId ? parseInt(scenarioId) : null)
  const old = await db.utilizationQueue.findUnique({ where: { id: parseInt(id) } })
  if (!old) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const utilization = await db.utilizationQueue.update({ where: { id: parseInt(id) }, data: body })
  await logChanges('Utilization', String(id), old as Record<string, unknown>, body)
  return NextResponse.json(utilization)
}
