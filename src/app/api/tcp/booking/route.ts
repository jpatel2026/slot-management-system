import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { generateOrderMilestones } from '@/lib/engines/ltm'
import { getScenarioPrisma } from '@/lib/scenario/scenario-prisma'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      aphDate, cryoCapacityName, mfgCapacityName,
      country, productCode, therapyType, cryoType,
      aphSiteId, cryoSiteId, mfgSiteId, wdcSiteId, infusionSiteId,
      aphPickupDate, scenarioId: rawScenarioId,
    } = body
    const db = getScenarioPrisma(rawScenarioId ? parseInt(rawScenarioId) : null)

    // Find product
    const product = await prisma.product.findFirst({ where: { code: productCode } })
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 400 })

    // Find and book mfg capacity
    const mfgCapacity = await db.dailyCapacity.findUnique({ where: { name: mfgCapacityName } })
    if (!mfgCapacity || mfgCapacity.remainingCapacity <= 0) {
      return NextResponse.json({ error: 'Mfg capacity not available' }, { status: 400 })
    }

    await db.dailyCapacity.update({
      where: { id: mfgCapacity.id },
      data: { bookedCapacity: { increment: 1 }, remainingCapacity: { decrement: 1 } },
    })

    // Book cryo capacity if applicable
    let cryoCapacity = null
    if (cryoCapacityName) {
      cryoCapacity = await db.dailyCapacity.findUnique({ where: { name: cryoCapacityName } })
      if (cryoCapacity) {
        await db.dailyCapacity.update({
          where: { id: cryoCapacity.id },
          data: { bookedCapacity: { increment: 1 }, remainingCapacity: { decrement: 1 } },
        })
      }
    }

    // Create order
    const order = await db.orderReservation.create({
      data: {
        status: 'Booked',
        country,
        productId: product.id,
        therapyType,
        cryoType,
        mfgCapacityId: mfgCapacity.id,
        cryoCapacityId: cryoCapacity?.id || null,
        originalPdd: new Date(mfgCapacity.date),
        plannedPdd: new Date(mfgCapacity.date),
        aphSiteId,
        cryoSiteId: cryoSiteId || null,
        mfgSiteId,
        wdcSiteId: wdcSiteId || null,
        infusionSiteId,
        aphPickupDate: aphPickupDate ? new Date(aphPickupDate) : null,
      },
    })

    // Find care program
    const careProgram = await prisma.careProgram.findFirst({
      where: { therapyType, country, productId: product.id },
    })

    // Generate milestones
    if (careProgram) {
      const milestones = await generateOrderMilestones(
        order.id,
        careProgram.id,
        cryoType,
        !!wdcSiteId,
        new Date(),
        aphPickupDate ? new Date(aphPickupDate) : new Date(),
        cryoCapacity ? new Date(cryoCapacity.date) : null,
        new Date(mfgCapacity.date),
        mfgSiteId,
        rawScenarioId ? parseInt(rawScenarioId) : undefined
      )

      // Update PDD from last milestone
      if (milestones.length > 0) {
        const lastMs = milestones[milestones.length - 1]
        await db.orderReservation.update({
          where: { id: order.id },
          data: { plannedPdd: lastMs.plannedDate },
        })
      }
    }

    await logAudit({
      objectType: 'OrderReservation',
      recordId: order.id,
      action: 'create',
      newValue: JSON.stringify({ mfgCapacityName, cryoCapacityName }),
    })

    return NextResponse.json(order, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Booking failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
