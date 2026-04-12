import { NextRequest, NextResponse } from 'next/server'
import { holdOrder } from '@/lib/engines/exception'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const scenarioId = body.scenarioId ? parseInt(body.scenarioId) : undefined
    const result = await holdOrder(id, scenarioId)
    return NextResponse.json(result)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Hold failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
