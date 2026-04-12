import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { logChanges } from '@/lib/audit'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const gdlt = await prisma.gdlt.findUnique({
    where: { id: parseInt(id) },
    include: { site: true, product: true },
  })
  if (!gdlt) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(gdlt)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const old = await prisma.gdlt.findUnique({ where: { id: parseInt(id) } })
  if (!old) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Validate mfgType-specific fields on update
  const mfgType = body.mfgType || (old as Record<string, unknown>).mfgType
  if (mfgType === 'Fresh') {
    if (body.exactLt != null || (old as Record<string, unknown>).exactLt != null) {
      // Valid - exactLt exists
    } else {
      return NextResponse.json(
        { error: 'Fresh mfg type requires exactLt field' },
        { status: 400 }
      )
    }
  } else if (mfgType === 'Frozen') {
    const minLt = body.minLt ?? (old as Record<string, unknown>).minLt
    const maxLt = body.maxLt ?? (old as Record<string, unknown>).maxLt
    if (maxLt != null && minLt != null && maxLt < minLt) {
      return NextResponse.json(
        { error: 'maxLt must be greater than or equal to minLt' },
        { status: 400 }
      )
    }
  }

  const gdlt = await prisma.gdlt.update({
    where: { id: parseInt(id) },
    data: body,
    include: { site: true, product: true },
  })
  await logChanges('Gdlt', String(id), old as Record<string, unknown>, body)
  return NextResponse.json(gdlt)
}
