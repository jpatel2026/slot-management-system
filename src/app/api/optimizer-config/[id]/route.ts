import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const config = await prisma.optimizerPriorityConfig.findUnique({
    where: { id: parseInt(id) },
    include: { site: { select: { name: true, alias: true } } },
  })
  if (!config) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(config)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const config = await prisma.optimizerPriorityConfig.update({
    where: { id: parseInt(id) },
    data: {
      factor1: body.factor1,
      factor2: body.factor2,
      factor3: body.factor3,
    },
    include: { site: { select: { name: true, alias: true } } },
  })
  return NextResponse.json(config)
}
