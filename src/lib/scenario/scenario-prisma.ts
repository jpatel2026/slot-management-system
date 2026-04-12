import prisma from '@/lib/prisma'
import {
  resolveList, resolveOne, writeOverride,
  createInScenario, deleteInScenario, deleteManyInScenario,
  getAncestorChain, getOverridesForChain
} from './resolve'

type PrismaModel = {
  findMany: (args?: any) => Promise<any[]>
  findFirst: (args?: any) => Promise<any>
  findUnique: (args?: any) => Promise<any>
  create: (args: any) => Promise<any>
  update: (args: any) => Promise<any>
  delete: (args: any) => Promise<any>
  deleteMany: (args?: any) => Promise<any>
  count: (args?: any) => Promise<number>
}

function createScenarioModel(
  basePrismaModel: PrismaModel,
  objectType: string,
  scenarioId: number
): PrismaModel {
  return {
    findMany: async (args?: any) => {
      const baseRecords = await basePrismaModel.findMany(args)
      const resolved = await resolveList(objectType, baseRecords, scenarioId)

      // Handle includes — re-fetch relations using resolved FK values
      // For non-scenario models in includes, this is passthrough
      return resolved
    },

    findFirst: async (args?: any) => {
      const baseRecords = await basePrismaModel.findMany(args)
      const resolved = await resolveList(objectType, baseRecords, scenarioId)
      return resolved[0] || null
    },

    findUnique: async (args?: any) => {
      const baseRecord = await basePrismaModel.findUnique(args)
      const whereKey = args?.where
      const recordId = String(whereKey?.id ?? whereKey?.name ?? Object.values(whereKey || {})[0])
      return resolveOne(objectType, baseRecord, recordId, scenarioId)
    },

    create: async (args: any) => {
      return createInScenario(scenarioId, objectType, args.data)
    },

    update: async (args: any) => {
      const whereKey = args?.where
      const recordId = String(whereKey?.id ?? Object.values(whereKey || {})[0])

      // Get current resolved record for increment/decrement handling
      const currentBase = await basePrismaModel.findUnique({ where: args.where })
      const chain = await getAncestorChain(scenarioId)
      const overrides = await getOverridesForChain(chain, objectType, recordId)

      // Build current resolved values
      let currentRecord = currentBase ? { ...currentBase } as Record<string, unknown> : {}
      const sortedChain = [...chain].reverse()
      for (const sid of sortedChain) {
        for (const ov of overrides.filter(o => o.scenarioId === sid && o.action === 'update' && o.field)) {
          try {
            currentRecord[ov.field!] = JSON.parse(ov.newValue || 'null')
          } catch {
            currentRecord[ov.field!] = ov.newValue
          }
        }
      }

      await writeOverride(scenarioId, objectType, recordId, args.data, currentRecord)

      // Return a merged version
      const updatedRecord = { ...currentRecord }
      for (const [k, v] of Object.entries(args.data)) {
        if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
          const obj = v as Record<string, unknown>
          if ('increment' in obj) {
            updatedRecord[k] = (typeof updatedRecord[k] === 'number' ? updatedRecord[k] as number : 0) + (obj.increment as number)
          } else if ('decrement' in obj) {
            updatedRecord[k] = (typeof updatedRecord[k] === 'number' ? updatedRecord[k] as number : 0) - (obj.decrement as number)
          } else {
            updatedRecord[k] = v
          }
        } else {
          updatedRecord[k] = v
        }
      }
      return updatedRecord
    },

    delete: async (args: any) => {
      const whereKey = args?.where
      const recordId = String(whereKey?.id ?? Object.values(whereKey || {})[0])
      await deleteInScenario(scenarioId, objectType, recordId)
      return { id: recordId }
    },

    deleteMany: async (args?: any) => {
      // Find matching records, then create tombstones
      const records = await basePrismaModel.findMany({ where: args?.where, select: { id: true } })
      const ids = records.map((r: any) => String(r.id))

      // Also remove any create overrides for this scenario matching the criteria
      if (ids.length > 0) {
        await deleteManyInScenario(scenarioId, objectType, ids)
      }

      // Also clean up scenario-created records
      await prisma.scenarioOverride.deleteMany({
        where: {
          scenarioId,
          objectType,
          action: 'create',
        },
      })

      return { count: ids.length }
    },

    count: async (args?: any) => {
      const baseRecords = await basePrismaModel.findMany({ where: args?.where, select: { id: true } })
      const resolved = await resolveList(objectType, baseRecords.map((r: any) => ({ id: r.id })), scenarioId)
      return resolved.length
    },
  }
}

export function getScenarioPrisma(scenarioId?: number | null): any {
  if (!scenarioId) return prisma // Zero overhead production path

  return {
    // Scenario-enabled models — routed through resolution layer
    dailyCapacity: createScenarioModel(prisma.dailyCapacity as any, 'DailyCapacity', scenarioId),
    ibp: createScenarioModel(prisma.ibp as any, 'Ibp', scenarioId),
    mps: createScenarioModel(prisma.mps as any, 'Mps', scenarioId),
    orderReservation: createScenarioModel(prisma.orderReservation as any, 'OrderReservation', scenarioId),
    orderMilestone: createScenarioModel(prisma.orderMilestone as any, 'OrderMilestone', scenarioId),
    utilizationQueue: createScenarioModel(prisma.utilizationQueue as any, 'UtilizationQueue', scenarioId),

    // Non-scenario models — pass through directly
    product: prisma.product,
    careProgram: prisma.careProgram,
    account: prisma.account,
    ltmConfig: prisma.ltmConfig,
    holiday: prisma.holiday,
    siteRelationship: prisma.siteRelationship,
    gdlt: prisma.gdlt,
    auditLog: prisma.auditLog,
    scenario: prisma.scenario,
    scenarioOverride: prisma.scenarioOverride,

    // Pass through $transaction for engines
    $transaction: prisma.$transaction.bind(prisma),
  }
}
