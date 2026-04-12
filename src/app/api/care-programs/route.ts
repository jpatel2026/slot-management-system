import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { logAudit } from '@/lib/audit'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const therapyType = searchParams.get('therapyType')
  const country = searchParams.get('country')
  const productId = searchParams.get('productId')
  const active = searchParams.get('active')
  const search = searchParams.get('search')

  const where: Record<string, unknown> = {}
  if (therapyType) where.therapyType = therapyType
  if (country) where.country = country
  if (productId) where.productId = parseInt(productId)
  if (active === 'true') where.active = true
  if (active === 'false') where.active = false
  if (search) where.OR = [
    { name: { contains: search } },
  ]

  const carePrograms = await prisma.careProgram.findMany({
    where,
    include: { product: true },
    orderBy: { updatedAt: 'desc' },
  })
  return NextResponse.json(carePrograms)
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  // Validate uniqueness of therapyType + country + productId combo
  const existing = await prisma.careProgram.findFirst({
    where: {
      therapyType: body.therapyType,
      country: body.country || null,
      productId: body.productId,
    },
  })
  if (existing) {
    return NextResponse.json(
      { error: 'Care program with this therapy type, country, and product already exists' },
      { status: 400 }
    )
  }

  // Look up product code for auto-generated name
  const product = await prisma.product.findUnique({ where: { id: body.productId } })
  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 400 })
  }

  // Auto-generate name
  let name: string
  if (body.therapyType === 'Commercial') {
    name = `${body.country}-Commercial-${product.code}`
  } else {
    name = `Clinical-${product.code}`
  }

  const careProgram = await prisma.careProgram.create({
    data: { ...body, name },
    include: { product: true },
  })
  await logAudit({
    objectType: 'CareProgram',
    recordId: String(careProgram.id),
    action: 'create',
    newValue: JSON.stringify({ ...body, name }),
  })
  return NextResponse.json(careProgram, { status: 201 })
}
