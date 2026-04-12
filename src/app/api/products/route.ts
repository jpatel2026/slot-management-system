import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { logAudit } from '@/lib/audit'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const active = searchParams.get('active')
  const mfgType = searchParams.get('mfgType')
  const search = searchParams.get('search')

  const where: Record<string, unknown> = {}
  if (active === 'true') where.active = true
  if (active === 'false') where.active = false
  if (mfgType) where.mfgType = mfgType
  if (search) where.OR = [
    { name: { contains: search } },
    { code: { contains: search } },
  ]

  const products = await prisma.product.findMany({ where, orderBy: { updatedAt: 'desc' } })
  return NextResponse.json(products)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const existing = await prisma.product.findUnique({ where: { code: body.code } })
  if (existing) {
    return NextResponse.json({ error: 'Product code already exists' }, { status: 400 })
  }
  const product = await prisma.product.create({ data: body })
  await logAudit({ objectType: 'Product', recordId: String(product.id), action: 'create', newValue: JSON.stringify(body) })
  return NextResponse.json(product, { status: 201 })
}
