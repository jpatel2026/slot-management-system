import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getScenarioPrisma } from '@/lib/scenario/scenario-prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const scenarioId = searchParams.get('scenarioId')
  const db = getScenarioPrisma(scenarioId ? parseInt(scenarioId) : null)
  const orderReservationId = searchParams.get('orderReservationId')

  const where: Record<string, unknown> = {}
  if (orderReservationId) where.orderReservationId = orderReservationId

  const milestones = await db.orderMilestone.findMany({
    where,
    orderBy: { plannedDate: 'asc' },
  })
  return NextResponse.json(milestones)
}
