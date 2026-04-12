import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const overrides = await prisma.scenarioOverride.findMany({
    where: { scenarioId: parseInt(id) },
    orderBy: [{ objectType: 'asc' }, { recordId: 'asc' }, { field: 'asc' }],
  })

  // Group by objectType for summary
  const summary: Record<string, { updates: number; creates: number; deletes: number }> = {}
  for (const ov of overrides) {
    if (!summary[ov.objectType]) summary[ov.objectType] = { updates: 0, creates: 0, deletes: 0 }
    if (ov.action === 'update') summary[ov.objectType].updates++
    else if (ov.action === 'create') summary[ov.objectType].creates++
    else if (ov.action === 'delete') summary[ov.objectType].deletes++
  }

  return NextResponse.json({ overrides, summary, total: overrides.length })
}
