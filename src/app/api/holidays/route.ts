import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { logAudit } from '@/lib/audit'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const accountId = searchParams.get('accountId')
  const active = searchParams.get('active')
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')

  const where: Record<string, unknown> = {}
  if (accountId) where.accountId = parseInt(accountId)
  if (active === 'true') where.active = true
  if (active === 'false') where.active = false
  if (dateFrom || dateTo) {
    const dateFilter: Record<string, string> = {}
    if (dateFrom) dateFilter.gte = dateFrom
    if (dateTo) dateFilter.lte = dateTo
    where.date = dateFilter
  }

  const holidays = await prisma.holiday.findMany({
    where,
    include: { account: true },
    orderBy: { date: 'asc' },
  })
  return NextResponse.json(holidays)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { accountIds, ...holidayData } = body

  // Support bulk create across multiple sites
  if (accountIds && Array.isArray(accountIds)) {
    const holidays = await prisma.$transaction(
      accountIds.map((accountId: number) =>
        prisma.holiday.create({
          data: { ...holidayData, accountId },
          include: { account: true },
        })
      )
    )
    for (const holiday of holidays) {
      await logAudit({
        objectType: 'Holiday',
        recordId: String(holiday.id),
        action: 'create',
        newValue: JSON.stringify({ ...holidayData, accountId: holiday.accountId }),
      })
    }
    return NextResponse.json(holidays, { status: 201 })
  }

  const holiday = await prisma.holiday.create({
    data: holidayData,
    include: { account: true },
  })
  await logAudit({ objectType: 'Holiday', recordId: String(holiday.id), action: 'create', newValue: JSON.stringify(holidayData) })
  return NextResponse.json(holiday, { status: 201 })
}
