import { NextRequest, NextResponse } from 'next/server'
import { runOptimizer, applyOptimizerMoves } from '@/lib/engines/optimizer'
import { logAudit } from '@/lib/audit'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { mode, siteIds, productCode, dateFrom, dateTo, factors, scenarioId, apply } = body

    if (!mode || !siteIds?.length || !productCode || !dateFrom || !dateTo || !factors?.length) {
      return NextResponse.json({ error: 'Missing required fields: mode, siteIds, productCode, dateFrom, dateTo, factors' }, { status: 400 })
    }

    // Run optimization to compute moves
    const result = await runOptimizer({
      mode,
      siteIds,
      productCode,
      dateFrom,
      dateTo,
      factors,
      scenarioId: scenarioId || undefined,
    })

    // If apply=true, execute the moves
    if (apply && result.moves.length > 0) {
      const applyResult = await applyOptimizerMoves(result.moves, scenarioId || undefined)
      await logAudit({
        objectType: 'Optimizer',
        recordId: `${mode}-${siteIds.join(',')}-${productCode}`,
        action: 'optimize',
        newValue: JSON.stringify({ mode, moves: applyResult.applied, errors: applyResult.errors.length }),
      })
      return NextResponse.json({ ...result, applied: applyResult })
    }

    return NextResponse.json(result)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Optimization failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
