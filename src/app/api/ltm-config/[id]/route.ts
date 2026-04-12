import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { logChanges } from '@/lib/audit'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const config = await prisma.ltmConfig.findUnique({
    where: { id: parseInt(id) },
    include: { careProgram: true, mfgSite: true },
  })
  if (!config) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(config)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const old = await prisma.ltmConfig.findUnique({ where: { id: parseInt(id) } })
  if (!old) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const config = await prisma.ltmConfig.update({
    where: { id: parseInt(id) },
    data: body,
    include: { careProgram: true, mfgSite: true },
  })
  await logChanges('LtmConfig', String(id), old as Record<string, unknown>, body)
  return NextResponse.json(config)
}
