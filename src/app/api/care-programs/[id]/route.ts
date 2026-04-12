import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { logChanges } from '@/lib/audit'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const careProgram = await prisma.careProgram.findUnique({
    where: { id: parseInt(id) },
    include: { product: true },
  })
  if (!careProgram) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(careProgram)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const old = await prisma.careProgram.findUnique({ where: { id: parseInt(id) } })
  if (!old) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const careProgram = await prisma.careProgram.update({
    where: { id: parseInt(id) },
    data: body,
    include: { product: true },
  })
  await logChanges('CareProgram', String(id), old as Record<string, unknown>, body)
  return NextResponse.json(careProgram)
}
