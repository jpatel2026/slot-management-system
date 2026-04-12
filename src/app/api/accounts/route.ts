import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { logAudit } from '@/lib/audit'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const siteType = searchParams.get('siteType')
  const mfgType = searchParams.get('mfgType')
  const active = searchParams.get('active')
  const search = searchParams.get('search')

  const where: Record<string, unknown> = {}
  if (siteType) where.siteType = siteType
  if (mfgType) where.mfgType = mfgType
  if (active === 'true') where.active = true
  if (active === 'false') where.active = false
  if (search) where.OR = [
    { name: { contains: search } },
    { siteId: { contains: search } },
  ]

  const accounts = await prisma.account.findMany({ where, orderBy: { updatedAt: 'desc' } })
  return NextResponse.json(accounts)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const existing = await prisma.account.findUnique({ where: { siteId: body.siteId } })
  if (existing) {
    return NextResponse.json({ error: 'Site ID already exists' }, { status: 400 })
  }
  const account = await prisma.account.create({ data: body })
  await logAudit({ objectType: 'Account', recordId: String(account.id), action: 'create', newValue: JSON.stringify(body) })
  return NextResponse.json(account, { status: 201 })
}
