import { NextRequest, NextResponse } from 'next/server'
import { generateMfgAllocations, generateCryoAllocations } from '@/lib/engines/allocation'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { siteId, month, year, rules, siteType, productCode, scenarioId: rawScenarioId } = body
    const scenarioId = rawScenarioId ? parseInt(rawScenarioId) : undefined

    if (siteType === 'Manufacturing') {
      const result = await generateMfgAllocations(siteId, month, year, rules, productCode, scenarioId)
      return NextResponse.json(result)
    } else {
      const result = await generateCryoAllocations(siteId, month, year, rules, scenarioId)
      return NextResponse.json(result)
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Generation failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
