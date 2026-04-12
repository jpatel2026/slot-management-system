import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { logAudit } from '@/lib/audit'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const aphSiteId = searchParams.get('aphSiteId')
  const mfgSiteId = searchParams.get('mfgSiteId')
  const active = searchParams.get('active')

  const where: Record<string, unknown> = {}
  if (aphSiteId) where.aphSiteId = parseInt(aphSiteId)
  if (mfgSiteId) where.mfgSiteId = parseInt(mfgSiteId)
  if (active === 'true') where.active = true
  if (active === 'false') where.active = false

  const relationships = await prisma.siteRelationship.findMany({
    where,
    include: {
      aphSite: true,
      cryoSite: true,
      mfgSite: true,
      wdcSite: true,
      infusionSite: true,
    },
    orderBy: { updatedAt: 'desc' },
  })
  return NextResponse.json(relationships)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const relationship = await prisma.siteRelationship.create({
    data: body,
    include: {
      aphSite: true,
      cryoSite: true,
      mfgSite: true,
      wdcSite: true,
      infusionSite: true,
    },
  })
  await logAudit({ objectType: 'SiteRelationship', recordId: String(relationship.id), action: 'create', newValue: JSON.stringify(body) })
  return NextResponse.json(relationship, { status: 201 })
}
