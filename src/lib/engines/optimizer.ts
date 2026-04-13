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
// Level-load across sites based on min utilization targets.
// Logic:
//   1. Get min utilization target per site from UtilizationQueue
//   2. Get each order's primary site from SiteRelationship (mfgPreference)
//   3. If primary site is below min target → move orders TO primary
//   4. If primary is above target but other sites are below → move orders to secondary/tertiary
//      (without dropping primary below its min target)
//   5. If all sites meet min target → level-load by equalizing utilization % across sites
//      (without dropping any site below its min target)

async function runMultiSite(input: OptimizerInput): Promise<OptimizerResult> {
  const { siteIds, productCode, dateFrom, dateTo, factors, scenarioId } = input
  const { orders, capacitySlots } = await fetchOrdersAndCapacity(siteIds, productCode, dateFrom, dateTo, scenarioId)

  const utilizationBefore = calcUtilization(capacitySlots)
  const moves: Move[] = []

  // Fetch min utilization targets per site
  const utilTargets = await prisma.utilizationQueue.findMany({
    where: {
      siteType: 'Manufacturing',
      productCode,
      dateRangeType: 'Monthly',
      minUtilizationTarget: { not: null },
    },
  })
  const minTargetBySite = new Map<number, number>()
  for (const sid of siteIds) {
    // Find the best matching target for this site
    const siteTargets = utilTargets.filter((t: any) => {
      const siteUtil = Object.values(utilizationBefore).find(u => u.siteId === sid)
      return siteUtil && t.siteName === siteUtil.siteName
    })
    const avgTarget = siteTargets.length > 0
      ? siteTargets.reduce((s: number, t: any) => s + (t.minUtilizationTarget || 0), 0) / siteTargets.length
      : 80 // default 80% if no target defined
    minTargetBySite.set(sid, avgTarget)
  }

  // Fetch site relationships to determine primary/secondary/tertiary for each order's aph site
  const relationships = await prisma.siteRelationship.findMany({
    where: { active: true, mfgSiteId: { in: siteIds } },
    include: { mfgSite: true },
  })

  // For each order, determine its preferred site ranking (Primary > Secondary > Tertiary)
  const PREF_ORDER = ['Primary', 'Secondary', 'Tertiary']
  function getPreferredSites(order: any): number[] {
    const rels = relationships
      .filter((r: any) => r.aphSiteId === order.aphSiteId)
      .filter((r: any) => siteIds.includes(r.mfgSiteId))
      .sort((a: any, b: any) => PREF_ORDER.indexOf(a.mfgPreference) - PREF_ORDER.indexOf(b.mfgPreference))
    return rels.map((r: any) => r.mfgSiteId)
  }

  // Group capacity by site with remaining-capacity tracking
  const capacityBySite = new Map<number, any[]>()
  for (const slot of capacitySlots) {
    if (!capacityBySite.has(slot.siteId)) capacityBySite.set(slot.siteId, [])
    capacityBySite.get(slot.siteId)!.push({ ...slot, _remaining: slot.remainingCapacity })
  }

  // Track simulated booked counts per site (for utilization calculation during moves)
  const simBooked = new Map<number, number>()
  const simBase = new Map<number, number>()
  for (const [sid, util] of Object.entries(utilizationBefore)) {
    simBooked.set(Number(sid), util.booked)
    simBase.set(Number(sid), util.base)
  }

  const getSimPct = (sid: number) => {
    const base = simBase.get(sid) || 0
    return base > 0 ? ((simBooked.get(sid) || 0) / base) * 100 : 0
  }

  const getMinTarget = (sid: number) => minTargetBySite.get(sid) || 80

  // Helper: can we remove an order from this site without going below min target?
  const canRemoveFromSite = (sid: number) => {
    const newBooked = (simBooked.get(sid) || 0) - 1
    const base = simBase.get(sid) || 0
    const newPct = base > 0 ? (newBooked / base) * 100 : 0
    return newPct >= getMinTarget(sid)
  }

  // Helper: find nearest available slot at a target site
  const findSlotAtSite = (targetSiteId: number, nearDate: Date): any | null => {
    const slots = capacityBySite.get(targetSiteId) || []
    return slots
      .filter((s: any) => s._remaining > 0)
      .sort((a: any, b: any) => {
        const diffA = Math.abs(new Date(a.date).getTime() - nearDate.getTime())
        const diffB = Math.abs(new Date(b.date).getTime() - nearDate.getTime())
        return diffA - diffB
      })[0] || null
  }

  // Helper: record a move
  const recordMove = (order: any, fromSiteId: number, toSiteId: number, toSlot: any) => {
    moves.push({
      orderId: order.id,
      orderName: order.id.slice(0, 12),
      fromSlotId: order.mfgCapacityId,
      fromSlotName: order.mfgCapacity?.name || '',
      fromDate: order.mfgCapacity ? new Date(order.mfgCapacity.date).toISOString().split('T')[0] : '',
      toSlotId: toSlot.id,
      toSlotName: toSlot.name,
      toDate: new Date(toSlot.date).toISOString().split('T')[0],
      fromSiteId,
      fromSiteName: order.mfgSite?.name || '',
      toSiteId,
      toSiteName: toSlot.site?.name || '',
    })
    // Update simulated counts
    simBooked.set(fromSiteId, (simBooked.get(fromSiteId) || 0) - 1)
    simBooked.set(toSiteId, (simBooked.get(toSiteId) || 0) + 1)
    toSlot._remaining--
  }

  const prioritized = sortByPriority(orders, factors)

  // ── PASS 1: Move orders to primary site if primary is below min target ──
  for (const order of prioritized) {
    const preferred = getPreferredSites(order)
    const primarySiteId = preferred[0]
    if (!primarySiteId || primarySiteId === order.mfgSiteId) continue // already at primary

    const primaryPct = getSimPct(primarySiteId)
    const primaryTarget = getMinTarget(primarySiteId)

    if (primaryPct < primaryTarget) {
      // Primary is below target — pull this order to primary if we can remove it from current
      if (canRemoveFromSite(order.mfgSiteId)) {
        const slot = findSlotAtSite(primarySiteId, new Date(order.mfgCapacity?.date || Date.now()))
        if (slot) {
          recordMove(order, order.mfgSiteId, primarySiteId, slot)
        }
      }
    }
  }

  // ── PASS 2: If primary is above target and other sites are below → move to secondary/tertiary ──
  for (const order of prioritized) {
    if (moves.find(m => m.orderId === order.id)) continue // already moved
    const preferred = getPreferredSites(order)
    const primarySiteId = preferred[0]
    if (!primarySiteId || order.mfgSiteId !== primarySiteId) continue // only process orders AT primary

    const primaryPct = getSimPct(primarySiteId)
    const primaryTarget = getMinTarget(primarySiteId)

    if (primaryPct <= primaryTarget) continue // primary still needs orders, don't move away

    // Check secondary, tertiary sites
    for (let i = 1; i < preferred.length; i++) {
      const altSiteId = preferred[i]
      const altPct = getSimPct(altSiteId)
      const altTarget = getMinTarget(altSiteId)

      if (altPct < altTarget && canRemoveFromSite(primarySiteId)) {
        const slot = findSlotAtSite(altSiteId, new Date(order.mfgCapacity?.date || Date.now()))
        if (slot) {
          recordMove(order, primarySiteId, altSiteId, slot)
          break
        }
      }
    }
  }

  // ── PASS 3: All sites meet min target → level-load by equalizing utilization % ──
  const allMeetTarget = siteIds.every(sid => getSimPct(sid) >= getMinTarget(sid))
  if (allMeetTarget) {
    // Calculate average utilization across all sites
    const totalSimBooked = siteIds.reduce((s, sid) => s + (simBooked.get(sid) || 0), 0)
    const totalSimBase = siteIds.reduce((s, sid) => s + (simBase.get(sid) || 0), 0)
    const avgPct = totalSimBase > 0 ? (totalSimBooked / totalSimBase) * 100 : 0

    // Move orders from highest-utilization sites to lowest, targeting avg pct
    const unmoved = prioritized.filter(o => !moves.find(m => m.orderId === o.id))
    for (const order of unmoved) {
      const currentSiteId = order.mfgSiteId
      const currentPct = getSimPct(currentSiteId)

      if (currentPct <= avgPct) continue // this site is at or below average, skip

      // Find the site with lowest utilization that's still above min target after receiving
      const targetSite = siteIds
        .filter(sid => sid !== currentSiteId)
        .filter(sid => getSimPct(sid) < avgPct)
        .sort((a, b) => getSimPct(a) - getSimPct(b))[0]

      if (targetSite && canRemoveFromSite(currentSiteId)) {
        const slot = findSlotAtSite(targetSite, new Date(order.mfgCapacity?.date || Date.now()))
        if (slot) {
          recordMove(order, currentSiteId, targetSite, slot)
        }
      }
    }
  }

  // Calculate final utilization
  const utilizationAfter: Record<number, { siteId: number; siteName: string; booked: number; base: number; pct: number; minTarget: number }> = {}
  for (const sid of siteIds) {
    const before = utilizationBefore[sid]
    if (before) {
      const booked = simBooked.get(sid) || 0
      utilizationAfter[sid] = {
        ...before,
        booked,
        pct: before.base > 0 ? Math.round((booked / before.base) * 100) : 0,
        minTarget: getMinTarget(sid),
      }
    }
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
