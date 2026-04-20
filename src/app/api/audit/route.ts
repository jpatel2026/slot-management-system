import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// GET only - audit logs are read-only
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const objectType = searchParams.get('objectType')
  const recordId = searchParams.get('recordId')
  const userId = searchParams.get('userId')
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')

  const where: Record<string, unknown> = {}
  if (objectType) where.objectType = objectType
  if (recordId) where.recordId = recordId
  if (userId) where.userId = userId
  if (dateFrom || dateTo) {
    const dateFilter: Record<string, Date> = {}
    if (dateFrom) dateFilter.gte = new Date(dateFrom + 'T00:00:00.000Z')
    if (dateTo)   dateFilter.lte = new Date(dateTo   + 'T23:59:59.999Z')
    where.timestamp = dateFilter
  }

  const auditLogs = await prisma.auditLog.findMany({
    where,
    orderBy: { timestamp: 'desc' },
  })
  return NextResponse.json(auditLogs)
}
