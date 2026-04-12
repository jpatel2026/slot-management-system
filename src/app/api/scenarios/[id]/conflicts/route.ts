import { NextRequest, NextResponse } from 'next/server'
import { detectConflicts } from '@/lib/scenario/conflicts'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const conflicts = await detectConflicts(parseInt(id))
    return NextResponse.json({ conflicts, count: conflicts.length })
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
