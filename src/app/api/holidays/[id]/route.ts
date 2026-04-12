import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { logChanges } from '@/lib/audit'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const holiday = await prisma.holiday.findUnique({
    where: { id: parseInt(id) },
    include: { account: true },
  })
  if (!holiday) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(holiday)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const old = await prisma.holiday.findUnique({ where: { id: parseInt(id) } })
  if (!old) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const holiday = await prisma.holiday.update({
    where: { id: parseInt(id) },
    data: body,
    include: { account: true },
  })
  await logChanges('Holiday', String(id), old as Record<string, unknown>, body)
  return NextResponse.json(holiday)
}
