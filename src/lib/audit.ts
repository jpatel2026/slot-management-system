import prisma from './prisma'

export async function logAudit({
  objectType,
  recordId,
  action,
  field,
  oldValue,
  newValue,
  userId = 'system',
}: {
  objectType: string
  recordId: string
  action: string
  field?: string
  oldValue?: string
  newValue?: string
  userId?: string
}) {
  await prisma.auditLog.create({
    data: {
      objectType,
      recordId: String(recordId),
      action,
      field: field || null,
      oldValue: oldValue !== undefined ? String(oldValue) : null,
      newValue: newValue !== undefined ? String(newValue) : null,
      userId,
    },
  })
}

export async function logChanges(
  objectType: string,
  recordId: string,
  oldData: Record<string, unknown>,
  newData: Record<string, unknown>,
  userId = 'system'
) {
  const changes: { field: string; oldValue: string; newValue: string }[] = []
  for (const key of Object.keys(newData)) {
    if (String(oldData[key]) !== String(newData[key])) {
      changes.push({
        field: key,
        oldValue: String(oldData[key] ?? ''),
        newValue: String(newData[key] ?? ''),
      })
    }
  }
  for (const change of changes) {
    await logAudit({
      objectType,
      recordId: String(recordId),
      action: 'update',
      ...change,
      userId,
    })
  }
}
