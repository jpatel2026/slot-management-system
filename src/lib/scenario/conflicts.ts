import prisma from '@/lib/prisma'
import { getAncestorChain, getOverridesForChain } from './resolve'
import type { Conflict, ScenarioOverrideRow } from './types'

export async function detectConflicts(childScenarioId: number): Promise<Conflict[]> {
  const child = await prisma.scenario.findUnique({ where: { id: childScenarioId } })
  if (!child) throw new Error('Scenario not found')

  // Get child's own overrides (not inherited)
  const childOverrides = await prisma.scenarioOverride.findMany({
    where: { scenarioId: childScenarioId },
  }) as unknown as ScenarioOverrideRow[]

  if (childOverrides.length === 0) return []

  const conflicts: Conflict[] = []

  // For each child override, check if parent's value has changed since lastRefreshedAt
  for (const ov of childOverrides) {
    if (ov.action !== 'update' || !ov.field) continue // Only field-level updates can conflict
    if (!ov.baseValue) continue // No base value means we can't detect conflict

    let parentValue: string | null = null

    if (child.parentId) {
      // Parent is another scenario — resolve parent's value
      const parentChain = await getAncestorChain(child.parentId)
      const parentOverrides = await getOverridesForChain(parentChain, ov.objectType, ov.recordId)

      // Find the parent's latest value for this field
      const parentFieldOverride = parentOverrides
        .filter(po => po.field === ov.field)
        .sort((a, b) => {
          // Child-first chain order — last in sorted chain wins
          return parentChain.indexOf(a.scenarioId) - parentChain.indexOf(b.scenarioId)
        })
        .pop()

      if (parentFieldOverride) {
        parentValue = parentFieldOverride.newValue
      } else {
        // Parent hasn't overridden this field — check base table
        parentValue = await getBaseFieldValue(ov.objectType, ov.recordId, ov.field)
      }
    } else {
      // Parent is production — check base table directly
      parentValue = await getBaseFieldValue(ov.objectType, ov.recordId, ov.field)
    }

    // Conflict if base value differs from current parent value
    // (meaning parent changed it since we took our snapshot)
    if (parentValue !== null && parentValue !== ov.baseValue) {
      conflicts.push({
        objectType: ov.objectType,
        recordId: ov.recordId,
        field: ov.field,
        baseValue: ov.baseValue,
        parentValue,
        childValue: ov.newValue,
        overrideId: ov.id,
      })
    }
  }

  return conflicts
}

async function getBaseFieldValue(objectType: string, recordId: string, field: string): Promise<string | null> {
  const modelMap: Record<string, any> = {
    DailyCapacity: prisma.dailyCapacity,
    Ibp: prisma.ibp,
    Mps: prisma.mps,
    OrderReservation: prisma.orderReservation,
    OrderMilestone: prisma.orderMilestone,
    UtilizationQueue: prisma.utilizationQueue,
  }

  const model = modelMap[objectType]
  if (!model) return null

  const pkType = objectType === 'OrderReservation' ? 'string' : 'int'
  const pk = pkType === 'int' ? parseInt(recordId) : recordId

  try {
    const record = await model.findUnique({ where: { id: pk } })
    if (!record) return null
    return JSON.stringify(record[field])
  } catch {
    return null
  }
}

export async function commitScenario(
  scenarioId: number,
  resolutions?: Record<number, { action: 'keep-child' | 'keep-parent' | 'custom'; value?: string }>
): Promise<{ committed: number; skipped: number }> {
  const scenario = await prisma.scenario.findUnique({ where: { id: scenarioId } })
  if (!scenario) throw new Error('Scenario not found')

  const overrides = await prisma.scenarioOverride.findMany({
    where: { scenarioId },
  }) as unknown as ScenarioOverrideRow[]

  let committed = 0
  let skipped = 0

  const modelMap: Record<string, any> = {
    DailyCapacity: prisma.dailyCapacity,
    Ibp: prisma.ibp,
    Mps: prisma.mps,
    OrderReservation: prisma.orderReservation,
    OrderMilestone: prisma.orderMilestone,
    UtilizationQueue: prisma.utilizationQueue,
  }

  for (const ov of overrides) {
    // Check if this override has a resolution
    const resolution = resolutions?.[ov.id]
    if (resolution?.action === 'keep-parent') {
      skipped++
      continue
    }

    const effectiveValue = resolution?.action === 'custom' && resolution.value !== undefined
      ? resolution.value
      : ov.newValue

    if (scenario.parentId) {
      // Commit to parent scenario — merge overrides
      if (ov.action === 'update' && ov.field) {
        await prisma.scenarioOverride.upsert({
          where: {
            scenarioId_objectType_recordId_field: {
              scenarioId: scenario.parentId,
              objectType: ov.objectType,
              recordId: ov.recordId,
              field: ov.field,
            },
          },
          update: { newValue: effectiveValue, action: 'update' },
          create: {
            scenarioId: scenario.parentId,
            objectType: ov.objectType,
            recordId: ov.recordId,
            field: ov.field,
            action: 'update',
            newValue: effectiveValue,
            baseValue: ov.baseValue,
          },
        })
      } else if (ov.action === 'create' || ov.action === 'delete') {
        await prisma.scenarioOverride.create({
          data: {
            scenarioId: scenario.parentId,
            objectType: ov.objectType,
            recordId: ov.recordId,
            action: ov.action,
            field: null,
            newValue: ov.action === 'create' ? effectiveValue : null,
            baseValue: null,
          },
        })
      }
      committed++
    } else {
      // Commit to production — execute real writes
      const model = modelMap[ov.objectType]
      if (!model) continue

      const pkType = ov.objectType === 'OrderReservation' ? 'string' : 'int'

      if (ov.action === 'update' && ov.field) {
        const pk = pkType === 'int' ? parseInt(ov.recordId) : ov.recordId
        try {
          let parsedValue: unknown
          try { parsedValue = JSON.parse(effectiveValue || 'null') } catch { parsedValue = effectiveValue }
          await model.update({
            where: { id: pk },
            data: { [ov.field]: parsedValue },
          })
          committed++
        } catch {
          skipped++
        }
      } else if (ov.action === 'create') {
        try {
          const data = JSON.parse(effectiveValue || '{}')
          delete data.id
          delete data._scenarioCreated
          delete data._scenarioId
          await model.create({ data })
          committed++
        } catch {
          skipped++
        }
      } else if (ov.action === 'delete') {
        const pk = pkType === 'int' ? parseInt(ov.recordId) : ov.recordId
        try {
          await model.delete({ where: { id: pk } })
          committed++
        } catch {
          skipped++
        }
      }
    }
  }

  // Mark scenario as committed
  await prisma.scenario.update({
    where: { id: scenarioId },
    data: { status: 'Committed', committedAt: new Date() },
  })

  // Clean up overrides
  await prisma.scenarioOverride.deleteMany({ where: { scenarioId } })

  return { committed, skipped }
}

export async function refreshScenario(scenarioId: number): Promise<{ updated: number; conflicts: Conflict[] }> {
  const conflicts = await detectConflicts(scenarioId)

  if (conflicts.length > 0) {
    return { updated: 0, conflicts }
  }

  // No conflicts — rebase all baseValues to current parent values
  const overrides = await prisma.scenarioOverride.findMany({
    where: { scenarioId, action: 'update', field: { not: null } },
  })

  let updated = 0
  for (const ov of overrides) {
    const currentParentValue = await getBaseFieldValue(ov.objectType, ov.recordId, ov.field!)
    if (currentParentValue && currentParentValue !== ov.baseValue) {
      await prisma.scenarioOverride.update({
        where: { id: ov.id },
        data: { baseValue: currentParentValue },
      })
      updated++
    }
  }

  await prisma.scenario.update({
    where: { id: scenarioId },
    data: { lastRefreshedAt: new Date() },
  })

  return { updated, conflicts: [] }
}
