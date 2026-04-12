import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { logChanges } from '@/lib/audit'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const relationship = await prisma.siteRelationship.findUnique({
    where: { id: parseInt(id) },
    include: {
      aphSite: true,
      cryoSite: true,
      mfgSite: true,
      wdcSite: true,
      infusionSite: true,
    },
  })
  if (!relationship) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(relationship)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const old = await prisma.siteRelationship.findUnique({ where: { id: parseInt(id) } })
  if (!old) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const relationship = await prisma.siteRelationship.update({
    where: { id: parseInt(id) },
    data: body,
    include: {
      aphSite: true,
      cryoSite: true,
      mfgSite: true,
      wdcSite: true,
      infusionSite: true,
    },
  })
  await logChanges('SiteRelationship', String(id), old as Record<string, unknown>, body)
  return NextResponse.json(relationship)
}
