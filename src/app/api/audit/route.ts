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
    const dateFilter: Record<string, string> = {}
    if (dateFrom) dateFilter.gte = dateFrom
    if (dateTo) dateFilter.lte = dateTo
    where.timestamp = dateFilter
  }

  const auditLogs = await prisma.auditLog.findMany({
    where,
    orderBy: { timestamp: 'desc' },
  })
  return NextResponse.json(auditLogs)
}
