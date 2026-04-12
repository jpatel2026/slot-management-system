export interface ScenarioOverrideRow {
  id: number
  scenarioId: number
  objectType: string
  recordId: string
  action: 'update' | 'create' | 'delete'
  field: string | null
  newValue: string | null
  baseValue: string | null
}

export interface Conflict {
  objectType: string
  recordId: string
  field: string
  baseValue: string | null
  parentValue: string | null
  childValue: string | null
  overrideId: number
  resolution?: 'keep-child' | 'keep-parent' | 'custom'
  customValue?: string
}

export const SCENARIO_ENABLED_MODELS = [
  'DailyCapacity',
  'Ibp',
  'Mps',
  'OrderReservation',
  'OrderMilestone',
  'UtilizationQueue',
] as const

export type ScenarioEnabledModel = typeof SCENARIO_ENABLED_MODELS[number]

export function isScenarioEnabled(objectType: string): boolean {
  return SCENARIO_ENABLED_MODELS.includes(objectType as ScenarioEnabledModel)
}

// Maps Prisma model names to their PK field name and type
export const MODEL_PK_MAP: Record<string, { field: string; type: 'int' | 'string' }> = {
  DailyCapacity: { field: 'id', type: 'int' },
  Ibp: { field: 'id', type: 'int' },
  Mps: { field: 'id', type: 'int' },
  OrderReservation: { field: 'id', type: 'string' },
  OrderMilestone: { field: 'id', type: 'int' },
  UtilizationQueue: { field: 'id', type: 'int' },
}
