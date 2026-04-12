import { NextRequest, NextResponse } from 'next/server'
import { getAphPickupAvailability } from '@/lib/engines/aph-availability'
import type { AvailabilityRequest } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json()
    const scenarioId = rawBody.scenarioId ? parseInt(rawBody.scenarioId) : undefined
    const body: AvailabilityRequest = rawBody
    const results = await getAphPickupAvailability(body, scenarioId)
    return NextResponse.json(results)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Availability check failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
