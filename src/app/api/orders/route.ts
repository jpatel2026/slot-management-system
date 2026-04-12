import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getScenarioPrisma } from '@/lib/scenario/scenario-prisma'

// NO POST - created by TCP booking only
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const scenarioId = searchParams.get('scenarioId')
  const db = getScenarioPrisma(scenarioId ? parseInt(scenarioId) : null)
  const status = searchParams.get('status')
  const productId = searchParams.get('productId')
  const therapyType = searchParams.get('therapyType')
  const cryoType = searchParams.get('cryoType')
  const mfgSiteId = searchParams.get('mfgSiteId')
  const country = searchParams.get('country')

  const where: Record<string, unknown> = {}
  if (status) where.status = status
  if (productId) where.productId = parseInt(productId)
  if (therapyType) where.therapyType = therapyType
  if (cryoType) where.cryoType = cryoType
  if (mfgSiteId) where.mfgSiteId = parseInt(mfgSiteId)
  if (country) where.country = country

  const orders = await db.orderReservation.findMany({
    where,
    include: {
      product: true,
      aphSite: true,
      cryoSite: true,
      mfgSite: true,
      wdcSite: true,
      infusionSite: true,
      cryoCapacity: true,
      mfgCapacity: true,
      milestones: true,
    },
    orderBy: { updatedAt: 'desc' },
  })
  return NextResponse.json(orders)
}
