import prisma from '@/lib/prisma'
import type { ScenarioOverrideRow } from './types'
import { MODEL_PK_MAP } from './types'

// Cache ancestor chains briefly (per-request would be ideal, but module-level with short TTL works)
const chainCache = new Map<number, { chain: number[]; ts: number }>()
const CACHE_TTL = 5000 // 5 seconds

export async function getAncestorChain(scenarioId: number): Promise<number[]> {
  const cached = chainCache.get(scenarioId)
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.chain

  const chain: number[] = [scenarioId]
  let currentId: number | null = scenarioId

  while (currentId) {
    const sc: { parentId: number | null } | null = await (prisma.scenario as any).findUnique({
      where: { id: currentId },
      select: { parentId: true },
    })
    if (sc?.parentId) {
      chain.push(sc.parentId)
      currentId = sc.parentId
    } else {
      currentId = null
    }
  }

  chainCache.set(scenarioId, { chain, ts: Date.now() })
  return chain // [childId, parentId, grandparentId, ...] — child first
}

export async function getOverridesForChain(
  chain: number[],
  objectType: string,
  recordId?: string
): Promise<ScenarioOverrideRow[]> {
  const where: Record<string, unknown> = {
    scenarioId: { in: chain },
    objectType,
  }
  if (recordId) where.recordId = recordId

  const overrides = await prisma.scenarioOverride.findMany({
    where,
    orderBy: [{ scenarioId: 'asc' }],
  }) as unknown as ScenarioOverrideRow[]

  return overrides
}

function getPkValue(record: Record<string, unknown>, objectType: string): string {
  const pk = MODEL_PK_MAP[objectType]
  return String(record[pk?.field || 'id'])
}

export async function resolveList(
  objectType: string,
  baseRecords: Record<string, unknown>[],
  scenarioId: number
): Promise<Record<string, unknown>[]> {
  const chain = await getAncestorChain(scenarioId)
  const overrides = await getOverridesForChain(chain, objectType)

  if (overrides.length === 0) return baseRecords

  // Group overrides by recordId, then apply in parent-first order (reverse chain)
  // chain = [child, parent, grandparent] -> apply grandparent first, then parent, then child
  const sortedChain = [...chain].reverse()

  // Build a map of recordId -> resolved record
  const recordMap = new Map<string, Record<string, unknown>>()
  for (const rec of baseRecords) {
    recordMap.set(getPkValue(rec, objectType), { ...rec })
  }

  // Track deleted records
  const deleted = new Set<string>()
  // Track created records (per scenario layer)
  const createdRecords: Record<string, unknown>[] = []

  // Apply overrides layer by layer (parent first -> child last)
  for (const sid of sortedChain) {
    const layerOverrides = overrides.filter(o => o.scenarioId === sid)

    for (const ov of layerOverrides) {
      if (ov.action === 'delete') {
        deleted.add(ov.recordId)
        recordMap.delete(ov.recordId)
      } else if (ov.action === 'create' && !ov.field) {
        // Full record create — newValue is JSON of entire record
        try {
          const newRec = JSON.parse(ov.newValue || '{}')
          newRec._scenarioCreated = true
          newRec._scenarioId = sid
          const rid = String(newRec.id || ov.recordId)
          deleted.delete(rid) // Un-delete if parent deleted but child recreated
          recordMap.set(rid, newRec)
          if (!baseRecords.find(r => getPkValue(r, objectType) === rid)) {
            createdRecords.push(newRec)
          }
        } catch {
          // skip malformed
        }
      } else if (ov.action === 'update' && ov.field) {
        // Field-level update
        const existing = recordMap.get(ov.recordId)
        if (existing) {
          try {
            existing[ov.field] = JSON.parse(ov.newValue || 'null')
          } catch {
            existing[ov.field] = ov.newValue
          }
        }
      }
    }
  }

  // Return all non-deleted records
  return Array.from(recordMap.values())
}

export async function resolveOne(
  objectType: string,
  baseRecord: Record<string, unknown> | null,
  recordId: string,
  scenarioId: number
): Promise<Record<string, unknown> | null> {
  const chain = await getAncestorChain(scenarioId)
  const overrides = await getOverridesForChain(chain, objectType, recordId)

  if (overrides.length === 0) return baseRecord

  // Check for delete
  const sortedChain = [...chain].reverse()
  let isDeleted = false
  let record = baseRecord ? { ...baseRecord } : null

  for (const sid of sortedChain) {
    const layerOverrides = overrides.filter(o => o.scenarioId === sid)
    for (const ov of layerOverrides) {
      if (ov.action === 'delete') {
        isDeleted = true
        record = null
      } else if (ov.action === 'create' && !ov.field) {
        try {
          record = JSON.parse(ov.newValue || '{}')
          if (record) record._scenarioCreated = true
          isDeleted = false
        } catch { /* skip */ }
      } else if (ov.action === 'update' && ov.field && record) {
        try {
          record[ov.field] = JSON.parse(ov.newValue || 'null')
        } catch {
          record[ov.field] = ov.newValue
        }
      }
    }
  }

  return isDeleted ? null : record
}

export async function writeOverride(
  scenarioId: number,
  objectType: string,
  recordId: string,
  changes: Record<string, unknown>,
  currentRecord?: Record<string, unknown>
): Promise<void> {
  for (const [field, value] of Object.entries(changes)) {
    // Skip internal Prisma fields
    if (field === 'id' || field === 'createdAt' || field === 'updatedAt') continue

    // Handle Prisma increment/decrement
    let newVal = value
    let baseVal = currentRecord?.[field]

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const obj = value as Record<string, unknown>
      if ('increment' in obj && typeof obj.increment === 'number') {
        const current = typeof baseVal === 'number' ? baseVal : 0
        newVal = current + obj.increment
      } else if ('decrement' in obj && typeof obj.decrement === 'number') {
        const current = typeof baseVal === 'number' ? baseVal : 0
        newVal = current - obj.decrement
      }
    }

    await prisma.scenarioOverride.upsert({
      where: {
        scenarioId_objectType_recordId_field: {
          scenarioId, objectType, recordId, field,
        },
      },
      update: {
        newValue: JSON.stringify(newVal),
        action: 'update',
      },
      create: {
        scenarioId, objectType, recordId, field,
        action: 'update',
        newValue: JSON.stringify(newVal),
        baseValue: baseVal !== undefined ? JSON.stringify(baseVal) : null,
      },
    })
  }
}

export async function createInScenario(
  scenarioId: number,
  objectType: string,
  data: Record<string, unknown>
): Promise<Record<string, unknown>> {
  // Generate a temp ID for the created record
  const tempId = `s${scenarioId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const record = { ...data, id: tempId, _scenarioCreated: true }

  await prisma.scenarioOverride.create({
    data: {
      scenarioId,
      objectType,
      recordId: tempId,
      action: 'create',
      field: null,
      newValue: JSON.stringify(record),
      baseValue: null,
    },
  })

  return record
}

export async function deleteInScenario(
  scenarioId: number,
  objectType: string,
  recordId: string
): Promise<void> {
  // Remove any existing overrides for this record in this scenario
  await prisma.scenarioOverride.deleteMany({
    where: { scenarioId, objectType, recordId },
  })

  // Create tombstone
  await prisma.scenarioOverride.create({
    data: {
      scenarioId,
      objectType,
      recordId,
      action: 'delete',
      field: null,
      newValue: null,
      baseValue: null,
    },
  })
}

export async function deleteManyInScenario(
  scenarioId: number,
  objectType: string,
  recordIds: string[]
): Promise<void> {
  for (const rid of recordIds) {
    await deleteInScenario(scenarioId, objectType, rid)
  }
}
