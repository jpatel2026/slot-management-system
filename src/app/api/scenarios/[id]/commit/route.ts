import { NextRequest, NextResponse } from 'next/server'
import { detectConflicts, commitScenario } from '@/lib/scenario/conflicts'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json().catch(() => ({}))

  // Check for unresolved conflicts
  const conflicts = await detectConflicts(parseInt(id))
  const resolutions = body.resolutions as Record<number, { action: string; value?: string }> | undefined

  if (conflicts.length > 0 && !resolutions) {
    return NextResponse.json({
      error: 'Unresolved conflicts',
      conflicts,
      count: conflicts.length,
    }, { status: 409 })
  }

  try {
    const result = await commitScenario(parseInt(id), resolutions as any)
    return NextResponse.json(result)
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
