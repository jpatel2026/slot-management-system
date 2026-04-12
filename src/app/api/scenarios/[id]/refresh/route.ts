import { NextRequest, NextResponse } from 'next/server'
import { refreshScenario } from '@/lib/scenario/conflicts'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const result = await refreshScenario(parseInt(id))
    return NextResponse.json(result)
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
