import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function formatDateShort(date: Date | string): string {
  const d = new Date(date)
  const day = d.getDate()
  const month = d.toLocaleString('en-US', { month: 'short' })
  const year = d.getFullYear().toString().slice(-2)
  return `${day}${month}${year}`
}

export function generateCapacityName(
  date: Date,
  siteAlias: string,
  capacityType: string,
  siteType: string,
  productCode?: string
): string {
  const dateStr = formatDateShort(date)
  if (siteType === 'Manufacturing') {
    const typeAbbr = capacityType === 'Commercial' ? 'COM' : capacityType === 'Clinical' ? 'CLIN' : capacityType === 'Reserve' ? 'RES' : 'NP'
    return `${dateStr}-${siteAlias}-${typeAbbr}-${productCode || ''}`
  } else if (siteType === 'Cryopreservation') {
    const typeAbbr = capacityType === 'Patient' ? 'PAT' : capacityType === 'Reserve' ? 'RES' : 'NP'
    return `${dateStr}-${typeAbbr}-${siteAlias}`
  } else {
    return `${dateStr}-${siteAlias}`
  }
}

export function addBusinessDays(date: Date, days: number, nonWorkingDays?: string[], holidays?: Date[]): Date {
  const result = new Date(date)
  let added = 0
  const nwd = (nonWorkingDays || []).map(d => d.trim().toLowerCase())
  const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

  while (added < days) {
    result.setDate(result.getDate() + 1)
    const dayName = dayNames[result.getDay()]
    const isNonWorking = nwd.some(nw => dayName.startsWith(nw.toLowerCase().slice(0, 3)))
    const isHoliday = holidays?.some(h => {
      const hd = new Date(h)
      return hd.getFullYear() === result.getFullYear() &&
             hd.getMonth() === result.getMonth() &&
             hd.getDate() === result.getDate()
    })
    if (!isNonWorking && !isHoliday) {
      added++
    }
  }
  return result
}

export function skipNonWorkingAndHolidays(date: Date, nonWorkingDays?: string[], holidays?: Date[]): Date {
  const result = new Date(date)
  const nwd = (nonWorkingDays || []).map(d => d.trim().toLowerCase())
  const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

  let safe = false
  while (!safe) {
    const dayName = dayNames[result.getDay()]
    const isNonWorking = nwd.some(nw => dayName.startsWith(nw.toLowerCase().slice(0, 3)))
    const isHoliday = holidays?.some(h => {
      const hd = new Date(h)
      return hd.getFullYear() === result.getFullYear() &&
             hd.getMonth() === result.getMonth() &&
             hd.getDate() === result.getDate()
    })
    if (isNonWorking || isHoliday) {
      result.setDate(result.getDate() + 1)
    } else {
      safe = true
    }
  }
  return result
}

export function getDaysInMonth(year: number, month: number): Date[] {
  const dates: Date[] = []
  const daysInMonth = new Date(year, month, 0).getDate()
  for (let day = 1; day <= daysInMonth; day++) {
    dates.push(new Date(year, month - 1, day))
  }
  return dates
}

export function getWeekNumber(date: Date): number {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const week1 = new Date(d.getFullYear(), 0, 4)
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7)
}

export function utilizationColor(pct: number): string {
  if (pct > 100) return 'bg-purple-100 text-purple-800'
  if (pct >= 96) return 'bg-green-100 text-green-800'
  if (pct >= 91) return 'bg-yellow-100 text-yellow-800'
  return 'bg-red-100 text-red-800'
}

export function remainingColor(remaining: number): string {
  if (remaining <= 0) return 'bg-red-100'
  if (remaining === 1) return 'bg-yellow-100'
  return ''
}

export function exportToCSV(data: Record<string, unknown>[], filename: string) {
  if (data.length === 0) return
  const headers = Object.keys(data[0])
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(h => {
      const val = row[h]
      const str = val === null || val === undefined ? '' : String(val)
      return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str
    }).join(','))
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}
