import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { logAudit } from '@/lib/audit'

export async function POST(req: NextRequest) {
  const records: Record<string, unknown>[] = await req.json()

  if (!Array.isArray(records) || records.length === 0) {
    return NextResponse.json({ error: 'Request body must be a non-empty array' }, { status: 400 })
  }

  const results: { created: number; skipped: number; errors: string[] } = {
    created: 0,
    skipped: 0,
    errors: [],
  }

  for (const record of records) {
    try {
      const mfgSiteId = record.mfgSiteId as number
      const month = record.month as number
      const year = record.year as number

      // Check for existing record
      const existing = await prisma.ibp.findFirst({
        where: { mfgSiteId, month, year },
      })
      if (existing) {
        results.skipped++
        continue
      }

      // Look up account for siteId to auto-generate name
      const account = await prisma.account.findUnique({ where: { id: mfgSiteId } })
      if (!account) {
        results.errors.push(`Manufacturing site ${mfgSiteId} not found`)
        continue
      }

      const name = `${account.siteId}-${month}-${year}`
      const ibp = await prisma.ibp.create({
        data: {
          name,
          mfgSiteId,
          month,
          year,
          commercialCapacity: (record.commercialCapacity as number) || 0,
          clinicalCapacity: (record.clinicalCapacity as number) || 0,
          nonPatientCapacity: (record.nonPatientCapacity as number) || 0,
          reserveCapacity: (record.reserveCapacity as number) || 0,
        },
      })
      await logAudit({
        objectType: 'Ibp',
        recordId: String(ibp.id),
        action: 'create',
        newValue: JSON.stringify({ ...record, name }),
      })
      results.created++
    } catch (err) {
      results.errors.push(`Error importing record: ${(err as Error).message}`)
    }
  }

  return NextResponse.json(results, { status: 201 })
}
