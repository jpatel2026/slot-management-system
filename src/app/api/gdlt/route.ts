import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { logAudit } from '@/lib/audit'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const siteId = searchParams.get('siteId')
  const productId = searchParams.get('productId')
  const mfgType = searchParams.get('mfgType')

  const where: Record<string, unknown> = {}
  if (siteId) where.siteId = parseInt(siteId)
  if (productId) where.productId = parseInt(productId)
  if (mfgType) where.mfgType = mfgType

  const gdltRecords = await prisma.gdlt.findMany({
    where,
    include: { site: true, product: true },
    orderBy: { updatedAt: 'desc' },
  })
  return NextResponse.json(gdltRecords)
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  // Validate mfgType-specific fields
  if (body.mfgType === 'Fresh') {
    if (body.exactLt == null) {
      return NextResponse.json(
        { error: 'Fresh mfg type requires exactLt field' },
        { status: 400 }
      )
    }
  } else if (body.mfgType === 'Frozen') {
    if (body.minLt == null || body.maxLt == null) {
      return NextResponse.json(
        { error: 'Frozen mfg type requires minLt and maxLt fields' },
        { status: 400 }
      )
    }
    if (body.maxLt < body.minLt) {
      return NextResponse.json(
        { error: 'maxLt must be greater than or equal to minLt' },
        { status: 400 }
      )
    }
  }

  const gdlt = await prisma.gdlt.create({
    data: body,
    include: { site: true, product: true },
  })
  await logAudit({ objectType: 'Gdlt', recordId: String(gdlt.id), action: 'create', newValue: JSON.stringify(body) })
  return NextResponse.json(gdlt, { status: 201 })
}
