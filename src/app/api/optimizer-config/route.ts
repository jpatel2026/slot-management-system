import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mfgSiteId = searchParams.get('mfgSiteId')
  const productCode = searchParams.get('productCode')

  const where: Record<string, unknown> = {}
  if (mfgSiteId) where.mfgSiteId = parseInt(mfgSiteId)
  if (productCode) where.productCode = productCode

  const configs = await prisma.optimizerPriorityConfig.findMany({
    where,
    include: { site: { select: { name: true, alias: true } } },
    orderBy: { updatedAt: 'desc' },
  })
  return NextResponse.json(configs)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const config = await prisma.optimizerPriorityConfig.upsert({
    where: {
      mfgSiteId_productCode: {
        mfgSiteId: body.mfgSiteId,
        productCode: body.productCode,
      },
    },
    update: {
      factor1: body.factor1,
      factor2: body.factor2,
      factor3: body.factor3,
    },
    create: {
      mfgSiteId: body.mfgSiteId,
      productCode: body.productCode,
      factor1: body.factor1,
      factor2: body.factor2,
      factor3: body.factor3,
    },
    include: { site: { select: { name: true, alias: true } } },
  })
  return NextResponse.json(config, { status: 201 })
}
