import prisma from '@/lib/prisma'
import { getScenarioPrisma } from '@/lib/scenario/scenario-prisma'
import { logAudit } from '@/lib/audit'
import { generateOrderMilestones } from './ltm'

export async function rescheduleOrder(
  orderId: string,
  newMfgCapacityId: number,
  newCryoCapacityId?: number,
  scenarioId?: number
) {
  const db = getScenarioPrisma(scenarioId) as any
  const order = await db.orderReservation.findUnique({
    where: { id: orderId },
    include: { mfgCapacity: true, cryoCapacity: true, product: true },
  })
  if (!order) throw new Error('Order not found')

  // Release old mfg capacity
  await db.dailyCapacity.update({
    where: { id: order.mfgCapacityId },
    data: {
      bookedCapacity: { decrement: 1 },
      remainingCapacity: { increment: 1 },
    },
  })

  // Release old cryo capacity if exists
  if (order.cryoCapacityId) {
    await db.dailyCapacity.update({
      where: { id: order.cryoCapacityId },
      data: {
        bookedCapacity: { decrement: 1 },
        remainingCapacity: { increment: 1 },
      },
    })
  }

  // Book new mfg capacity
  const newMfg = await db.dailyCapacity.update({
    where: { id: newMfgCapacityId },
    data: {
      bookedCapacity: { increment: 1 },
      remainingCapacity: { decrement: 1 },
    },
  })

  // Book new cryo capacity if provided
  let newCryo = null
  if (newCryoCapacityId) {
    newCryo = await db.dailyCapacity.update({
      where: { id: newCryoCapacityId },
      data: {
        bookedCapacity: { increment: 1 },
        remainingCapacity: { decrement: 1 },
      },
    })
  }

  // Update order
  const updatedOrder = await db.orderReservation.update({
    where: { id: orderId },
    data: {
      mfgCapacityId: newMfgCapacityId,
      cryoCapacityId: newCryoCapacityId || order.cryoCapacityId,
    },
  })

  // Find care program
  const careProgram = await prisma.careProgram.findFirst({
    where: {
      therapyType: order.therapyType,
      country: order.country,
      productId: order.productId,
    },
  })

  // Recalculate milestones
  if (careProgram) {
    await generateOrderMilestones(
      orderId,
      careProgram.id,
      order.cryoType,
      !!order.wdcSiteId,
      new Date(order.createdAt),
      order.aphPickupDate || new Date(),
      newCryo ? new Date(newCryo.date) : null,
      new Date(newMfg.date),
      order.mfgSiteId
    )
  }

  // Update PDD based on last milestone
  const lastMilestone = await prisma.orderMilestone.findFirst({
    where: { orderReservationId: orderId },
    orderBy: { sequentialLeg: 'desc' },
  })
  if (lastMilestone) {
    await db.orderReservation.update({
      where: { id: orderId },
      data: { plannedPdd: lastMilestone.plannedDate },
    })
  }

  await logAudit({
    objectType: 'OrderReservation',
    recordId: orderId,
    action: 'reschedule',
    oldValue: `Mfg: ${order.mfgCapacityId}`,
    newValue: `Mfg: ${newMfgCapacityId}`,
  })

  return updatedOrder
}

export async function cancelOrder(orderId: string, scenarioId?: number) {
  const db = getScenarioPrisma(scenarioId) as any
  const order = await db.orderReservation.findUnique({
    where: { id: orderId },
  })
  if (!order) throw new Error('Order not found')

  // Release mfg capacity
  await db.dailyCapacity.update({
    where: { id: order.mfgCapacityId },
    data: {
      bookedCapacity: { decrement: 1 },
      remainingCapacity: { increment: 1 },
    },
  })

  // Release cryo capacity if exists
  if (order.cryoCapacityId) {
    await db.dailyCapacity.update({
      where: { id: order.cryoCapacityId },
      data: {
        bookedCapacity: { decrement: 1 },
        remainingCapacity: { increment: 1 },
      },
    })
  }

  const updated = await db.orderReservation.update({
    where: { id: orderId },
    data: { status: 'Cancelled' },
  })

  await logAudit({
    objectType: 'OrderReservation',
    recordId: orderId,
    action: 'cancel',
    oldValue: order.status,
    newValue: 'Cancelled',
  })

  return updated
}

export async function swapOrders(orderId1: string, orderId2: string, scenarioId?: number) {
  const db = getScenarioPrisma(scenarioId) as any
  const order1 = await db.orderReservation.findUnique({ where: { id: orderId1 } })
  const order2 = await db.orderReservation.findUnique({ where: { id: orderId2 } })
  if (!order1 || !order2) throw new Error('One or both orders not found')

  // Swap mfg capacity
  await db.orderReservation.update({
    where: { id: orderId1 },
    data: {
      mfgCapacityId: order2.mfgCapacityId,
      cryoCapacityId: order2.cryoCapacityId,
    },
  })
  await db.orderReservation.update({
    where: { id: orderId2 },
    data: {
      mfgCapacityId: order1.mfgCapacityId,
      cryoCapacityId: order1.cryoCapacityId,
    },
  })

  // Recalculate milestones for both
  for (const oid of [orderId1, orderId2]) {
    const ord = await db.orderReservation.findUnique({
      where: { id: oid },
      include: { mfgCapacity: true, cryoCapacity: true },
    })
    if (!ord) continue

    const careProgram = await prisma.careProgram.findFirst({
      where: {
        therapyType: ord.therapyType,
        country: ord.country,
        productId: ord.productId,
      },
    })

    if (careProgram) {
      await generateOrderMilestones(
        oid,
        careProgram.id,
        ord.cryoType,
        !!ord.wdcSiteId,
        new Date(ord.createdAt),
        ord.aphPickupDate || new Date(),
        ord.cryoCapacity ? new Date(ord.cryoCapacity.date) : null,
        new Date(ord.mfgCapacity.date),
        ord.mfgSiteId
      )
    }
  }

  await logAudit({
    objectType: 'OrderReservation',
    recordId: `${orderId1}<>${orderId2}`,
    action: 'swap',
    oldValue: `${orderId1}:Mfg${order1.mfgCapacityId}, ${orderId2}:Mfg${order2.mfgCapacityId}`,
    newValue: `${orderId1}:Mfg${order2.mfgCapacityId}, ${orderId2}:Mfg${order1.mfgCapacityId}`,
  })

  return { order1: orderId1, order2: orderId2 }
}

export async function holdOrder(orderId: string, scenarioId?: number) {
  const db = getScenarioPrisma(scenarioId) as any
  const order = await db.orderReservation.findUnique({ where: { id: orderId } })
  if (!order) throw new Error('Order not found')

  const updated = await db.orderReservation.update({
    where: { id: orderId },
    data: { status: 'On Hold' },
  })

  await logAudit({
    objectType: 'OrderReservation',
    recordId: orderId,
    action: 'hold',
    oldValue: order.status,
    newValue: 'On Hold',
  })

  return updated
}
