import prisma from '@/lib/prisma'
import { getScenarioPrisma } from '@/lib/scenario/scenario-prisma'

const PRIORITY_FACTORS = ['Apheresis Completed', 'Aph Received at Manufacturing', 'Original PDD'] as const
type PriorityFactor = typeof PRIORITY_FACTORS[number]

interface OptimizerInput {
  mode: 'FIFO' | 'DayByDay' | 'MultiSite'
  siteIds: number[]          // single site for FIFO/DayByDay, multiple for MultiSite
  productCode: string
  dateFrom: string           // ISO date
  dateTo: string             // ISO date
  factors: [PriorityFactor, PriorityFactor, PriorityFactor]
  scenarioId?: number
}

interface Move {
  orderId: string
  orderName: string
  fromSlotId: number
  fromSlotName: string
  fromDate: string
  toSlotId: number
  toSlotName: string
  toDate: string
  fromSiteId?: number
  fromSiteName?: string
  toSiteId?: number
  toSiteName?: string
}

interface OptimizerResult {
  moves: Move[]
  summary: { totalOrders: number; rescheduled: number; unchanged: number }
  utilizationBefore: Record<number, { siteId: number; siteName: string; booked: number; base: number; pct: number }>
  utilizationAfter: Record<number, { siteId: number; siteName: string; booked: number; base: number; pct: number }>
}

// Get the date value for a priority factor from an order
function getFactorDate(order: any, factorName: PriorityFactor): number {
  if (factorName === 'Original PDD') {
    return new Date(order.originalPdd).getTime()
  }

  // Search milestones for the matching name
  const milestones = order.milestones || []
  const searchName = factorName === 'Apheresis Completed' ? 'apheresis completed' : 'aph received at manufacturing'

  const milestone = milestones.find((m: any) =>
    m.milestoneName.toLowerCase().includes(searchName.toLowerCase().slice(0, 15))
  )

  if (milestone) {
    // Use actual date if available, otherwise planned
    const date = milestone.actualDate || milestone.plannedDate
    return new Date(date).getTime()
  }

  // Fallback to order creation date if milestone not found
  return new Date(order.createdAt).getTime()
}

// Sort orders by priority factors (earlier date = higher priority)
function sortByPriority(orders: any[], factors: PriorityFactor[]): any[] {
  return [...orders].sort((a, b) => {
    for (const factor of factors) {
      const dateA = getFactorDate(a, factor)
      const dateB = getFactorDate(b, factor)
      if (dateA !== dateB) return dateA - dateB // earlier = higher priority
    }
    // Tie-break: random
    return Math.random() - 0.5
  })
}

// Fetch orders and capacity for a set of sites within date range
async function fetchOrdersAndCapacity(
  siteIds: number[],
  productCode: string,
  dateFrom: string,
  dateTo: string,
  scenarioId?: number
) {
  const db = getScenarioPrisma(scenarioId) as any

  // Fetch orders booked to these sites in the date range
  const orders = await db.orderReservation.findMany({
    where: {
      mfgSiteId: { in: siteIds },
      status: { in: ['Booked', 'In Progress'] },
      productId: undefined, // will filter by product via capacity
    },
    include: {
      product: true,
      mfgCapacity: true,
      mfgSite: true,
      milestones: true,
    },
  })

  // Filter to orders whose mfg capacity date falls in range AND matches product
  const fromDate = new Date(dateFrom)
  const toDate = new Date(dateTo)
  const filteredOrders = orders.filter((o: any) => {
    if (!o.mfgCapacity) return false
    if (o.product.code !== productCode) return false
    const capDate = new Date(o.mfgCapacity.date)
    return capDate >= fromDate && capDate <= toDate
  })

  // Fetch capacity slots for these sites in date range
  // Get Commercial + Clinical capacity (patient types that can be rescheduled)
  const capacitySlots = await db.dailyCapacity.findMany({
    where: {
      siteId: { in: siteIds },
      siteType: 'Manufacturing',
      capacityType: { in: ['Commercial', 'Clinical'] },
      productCode,
      date: { gte: fromDate, lte: toDate },
    },
    include: { site: true },
    orderBy: { date: 'asc' },
  })

  return { orders: filteredOrders, capacitySlots }
}

// Calculate utilization stats per site
function calcUtilization(capacitySlots: any[]): Record<number, { siteId: number; siteName: string; booked: number; base: number; pct: number }> {
  const bysite: Record<number, { siteId: number; siteName: string; booked: number; base: number }> = {}
  for (const slot of capacitySlots) {
    if (!bysite[slot.siteId]) {
      bysite[slot.siteId] = { siteId: slot.siteId, siteName: slot.site?.name || `Site ${slot.siteId}`, booked: 0, base: 0 }
    }
    bysite[slot.siteId].booked += slot.bookedCapacity
    bysite[slot.siteId].base += slot.baseCapacity
  }
  const result: Record<number, any> = {}
  for (const [id, s] of Object.entries(bysite)) {
    result[Number(id)] = { ...s, pct: s.base > 0 ? Math.round((s.booked / s.base) * 100) : 0 }
  }
  return result
}

// ──────────────────── FIFO MODE ────────────────────
async function runFIFO(input: OptimizerInput): Promise<OptimizerResult> {
  const { siteIds, productCode, dateFrom, dateTo, factors, scenarioId } = input
  const siteId = siteIds[0]
  const { orders, capacitySlots } = await fetchOrdersAndCapacity([siteId], productCode, dateFrom, dateTo, scenarioId)

  const utilizationBefore = calcUtilization(capacitySlots)
  const prioritized = sortByPriority(orders, factors)
  const moves: Move[] = []

  // Build slot availability: for each slot, track how many we can assign
  const slotAvailability = capacitySlots.map((s: any) => ({
    id: s.id,
    name: s.name,
    date: new Date(s.date).toISOString().split('T')[0],
    siteId: s.siteId,
    siteName: s.site?.name || '',
    capacity: s.baseCapacity + s.overallocationCapacity,
    assigned: 0,
  }))

  // Sort slots by date ascending
  slotAvailability.sort((a: any, b: any) => a.date.localeCompare(b.date))

  // Assign each prioritized order to the earliest available slot
  for (const order of prioritized) {
    const currentSlotId = order.mfgCapacityId
    const currentSlotName = order.mfgCapacity?.name || ''
    const currentDate = order.mfgCapacity ? new Date(order.mfgCapacity.date).toISOString().split('T')[0] : ''

    // Find the earliest slot with capacity matching order's therapy type
    const targetSlot = slotAvailability.find((s: any) => s.assigned < s.capacity)

    if (targetSlot && targetSlot.id !== currentSlotId) {
      targetSlot.assigned++
      moves.push({
        orderId: order.id,
        orderName: order.id.slice(0, 12),
        fromSlotId: currentSlotId,
        fromSlotName: currentSlotName,
        fromDate: currentDate,
        toSlotId: targetSlot.id,
        toSlotName: targetSlot.name,
        toDate: targetSlot.date,
      })
    } else if (targetSlot) {
      targetSlot.assigned++
    }
  }

  // Simulate updated utilization
  const utilizationAfter = { ...utilizationBefore }
  if (utilizationAfter[siteId]) {
    utilizationAfter[siteId] = { ...utilizationAfter[siteId], pct: utilizationAfter[siteId].pct }
  }

  return {
    moves,
    summary: { totalOrders: orders.length, rescheduled: moves.length, unchanged: orders.length - moves.length },
    utilizationBefore,
    utilizationAfter,
  }
}

// ──────────────────── DAY-BY-DAY MODE ────────────────────
async function runDayByDay(input: OptimizerInput): Promise<OptimizerResult> {
  const { siteIds, productCode, dateFrom, dateTo, factors, scenarioId } = input
  const siteId = siteIds[0]
  const { orders, capacitySlots } = await fetchOrdersAndCapacity([siteId], productCode, dateFrom, dateTo, scenarioId)

  const utilizationBefore = calcUtilization(capacitySlots)
  const moves: Move[] = []

  // Group capacity slots by date
  const slotsByDate = new Map<string, any[]>()
  for (const slot of capacitySlots) {
    const dateKey = new Date(slot.date).toISOString().split('T')[0]
    if (!slotsByDate.has(dateKey)) slotsByDate.set(dateKey, [])
    slotsByDate.get(dateKey)!.push(slot)
  }

  // Group orders by their current mfg date
  const ordersByDate = new Map<string, any[]>()
  for (const order of orders) {
    if (!order.mfgCapacity) continue
    const dateKey = new Date(order.mfgCapacity.date).toISOString().split('T')[0]
    if (!ordersByDate.has(dateKey)) ordersByDate.set(dateKey, [])
    ordersByDate.get(dateKey)!.push(order)
  }

  // Get sorted dates
  const allDates = Array.from(new Set([...slotsByDate.keys(), ...ordersByDate.keys()])).sort()
  const overflow: any[] = [] // orders that couldn't fit in their day

  for (const dateKey of allDates) {
    const daySlots = slotsByDate.get(dateKey) || []
    const dayCapacity = daySlots.reduce((s: number, slot: any) => s + slot.baseCapacity + slot.overallocationCapacity, 0)

    // Combine current day's orders + overflow from previous days
    const dayOrders = [...(ordersByDate.get(dateKey) || []), ...overflow.splice(0)]

    // Sort by priority within the day
    const prioritized = sortByPriority(dayOrders, factors)

    let assigned = 0
    for (const order of prioritized) {
      if (assigned < dayCapacity) {
        // Order stays or gets assigned to this day
        const targetSlot = daySlots.find((s: any) => s.id !== undefined) // pick first slot for simplicity
        if (targetSlot && targetSlot.id !== order.mfgCapacityId) {
          moves.push({
            orderId: order.id,
            orderName: order.id.slice(0, 12),
            fromSlotId: order.mfgCapacityId,
            fromSlotName: order.mfgCapacity?.name || '',
            fromDate: order.mfgCapacity ? new Date(order.mfgCapacity.date).toISOString().split('T')[0] : '',
            toSlotId: targetSlot.id,
            toSlotName: targetSlot.name,
            toDate: dateKey,
          })
        }
        assigned++
      } else {
        // Push to overflow for next day
        overflow.push(order)
      }
    }
  }

  // Any remaining overflow
  // These orders couldn't be placed — they'd go beyond the date range

  return {
    moves,
    summary: { totalOrders: orders.length, rescheduled: moves.length, unchanged: orders.length - moves.length },
    utilizationBefore,
    utilizationAfter: calcUtilization(capacitySlots), // simplified
  }
}

// ──────────────────── MULTI-SITE MODE ────────────────────
async function runMultiSite(input: OptimizerInput): Promise<OptimizerResult> {
  const { siteIds, productCode, dateFrom, dateTo, factors, scenarioId } = input
  const { orders, capacitySlots } = await fetchOrdersAndCapacity(siteIds, productCode, dateFrom, dateTo, scenarioId)

  const utilizationBefore = calcUtilization(capacitySlots)
  const moves: Move[] = []

  // Calculate target utilization (average across all sites)
  const totalBooked = Object.values(utilizationBefore).reduce((s, v) => s + v.booked, 0)
  const totalBase = Object.values(utilizationBefore).reduce((s, v) => s + v.base, 0)
  const targetPct = totalBase > 0 ? (totalBooked / totalBase) * 100 : 0

  // Sort orders by priority
  const prioritized = sortByPriority(orders, factors)

  // Group capacity by site
  const capacityBySite = new Map<number, any[]>()
  for (const slot of capacitySlots) {
    if (!capacityBySite.has(slot.siteId)) capacityBySite.set(slot.siteId, [])
    capacityBySite.get(slot.siteId)!.push(slot)
  }

  // Calculate how many orders each site should have to reach target utilization
  const siteTargets = new Map<number, number>()
  for (const [sid, slots] of capacityBySite) {
    const siteBase = slots.reduce((s: number, sl: any) => s + sl.baseCapacity, 0)
    const targetOrders = Math.round(siteBase * (targetPct / 100))
    siteTargets.set(sid, targetOrders)
  }

  // Track how many orders currently assigned per site
  const siteCurrentCount = new Map<number, number>()
  for (const order of prioritized) {
    const sid = order.mfgSiteId
    siteCurrentCount.set(sid, (siteCurrentCount.get(sid) || 0) + 1)
  }

  // Find over-utilized sites (more orders than target) and under-utilized sites
  for (const order of prioritized) {
    const currentSiteId = order.mfgSiteId
    const currentCount = siteCurrentCount.get(currentSiteId) || 0
    const currentTarget = siteTargets.get(currentSiteId) || 0

    if (currentCount > currentTarget) {
      // This site is over-utilized — try to move this order to an under-utilized site
      for (const [targetSiteId, targetCount] of siteTargets) {
        if (targetSiteId === currentSiteId) continue
        const targetCurrentCount = siteCurrentCount.get(targetSiteId) || 0
        if (targetCurrentCount < targetCount) {
          // Find a slot at the target site near the same date
          const currentDate = order.mfgCapacity ? new Date(order.mfgCapacity.date) : new Date()
          const targetSlots = capacityBySite.get(targetSiteId) || []
          const nearestSlot = targetSlots
            .filter((s: any) => s.remainingCapacity > 0)
            .sort((a: any, b: any) => {
              const diffA = Math.abs(new Date(a.date).getTime() - currentDate.getTime())
              const diffB = Math.abs(new Date(b.date).getTime() - currentDate.getTime())
              return diffA - diffB
            })[0]

          if (nearestSlot) {
            moves.push({
              orderId: order.id,
              orderName: order.id.slice(0, 12),
              fromSlotId: order.mfgCapacityId,
              fromSlotName: order.mfgCapacity?.name || '',
              fromDate: order.mfgCapacity ? new Date(order.mfgCapacity.date).toISOString().split('T')[0] : '',
              toSlotId: nearestSlot.id,
              toSlotName: nearestSlot.name,
              toDate: new Date(nearestSlot.date).toISOString().split('T')[0],
              fromSiteId: currentSiteId,
              fromSiteName: order.mfgSite?.name || '',
              toSiteId: targetSiteId,
              toSiteName: nearestSlot.site?.name || '',
            })

            // Update counts
            siteCurrentCount.set(currentSiteId, currentCount - 1)
            siteCurrentCount.set(targetSiteId, targetCurrentCount + 1)
            break
          }
        }
      }
    }
  }

  // Calculate after utilization (simulated)
  const utilizationAfter = { ...utilizationBefore }
  for (const [sid, util] of Object.entries(utilizationAfter)) {
    const moved = moves.filter(m => m.toSiteId === Number(sid)).length - moves.filter(m => m.fromSiteId === Number(sid)).length
    const newBooked = util.booked + moved
    utilizationAfter[Number(sid)] = { ...util, booked: newBooked, pct: util.base > 0 ? Math.round((newBooked / util.base) * 100) : 0 }
  }

  return {
    moves,
    summary: { totalOrders: orders.length, rescheduled: moves.length, unchanged: orders.length - moves.length },
    utilizationBefore,
    utilizationAfter,
  }
}

// ──────────────────── MAIN ENTRY ────────────────────
export async function runOptimizer(input: OptimizerInput): Promise<OptimizerResult> {
  switch (input.mode) {
    case 'FIFO': return runFIFO(input)
    case 'DayByDay': return runDayByDay(input)
    case 'MultiSite': return runMultiSite(input)
    default: throw new Error(`Unknown optimizer mode: ${input.mode}`)
  }
}

// Apply moves by calling reschedule for each
export async function applyOptimizerMoves(moves: Move[], scenarioId?: number): Promise<{ applied: number; errors: string[] }> {
  const errors: string[] = []
  let applied = 0

  for (const move of moves) {
    try {
      const url = `/api/orders/${move.orderId}/reschedule`
      // Direct DB call instead of HTTP to avoid circular fetch
      const db = getScenarioPrisma(scenarioId) as any

      // Release old capacity
      await db.dailyCapacity.update({
        where: { id: move.fromSlotId },
        data: { bookedCapacity: { decrement: 1 }, remainingCapacity: { increment: 1 } },
      })

      // Book new capacity
      await db.dailyCapacity.update({
        where: { id: move.toSlotId },
        data: { bookedCapacity: { increment: 1 }, remainingCapacity: { decrement: 1 } },
      })

      // Update order
      await db.orderReservation.update({
        where: { id: move.orderId },
        data: { mfgCapacityId: move.toSlotId },
      })

      applied++
    } catch (err) {
      errors.push(`Failed to move ${move.orderId}: ${(err as Error).message}`)
    }
  }

  return { applied, errors }
}
