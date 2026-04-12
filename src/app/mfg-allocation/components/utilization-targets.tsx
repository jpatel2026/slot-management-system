"use client"
import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Plus, Save, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

// Parse "W1-May-2026" or "May-2026" into a sortable timestamp
function parseDateRangeValue(v: string): number {
  if (!v) return 0
  const weekMatch = v.match(/W(\d+)-(\w+)-(\d{4})/)
  if (weekMatch) {
    const d = new Date(`${weekMatch[2]} 1, ${weekMatch[3]}`)
    return d.getTime() + (parseInt(weekMatch[1]) - 1) * 7 * 86400000
  }
  const monthMatch = v.match(/(\w+)-(\d{4})/)
  if (monthMatch) {
    return new Date(`${monthMatch[1]} 1, ${monthMatch[2]}`).getTime()
  }
  return 0
}

const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
const fmtFull = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })

// Get the start and end Date of a dateRangeValue
function getDateRangeBounds(v: string): { start: Date; end: Date } | null {
  if (!v) return null
  const weekMatch = v.match(/W(\d+)-(\w+)-(\d{4})/)
  if (weekMatch) {
    const weekNum = parseInt(weekMatch[1])
    const monthStart = new Date(`${weekMatch[2]} 1, ${weekMatch[3]}`)
    const start = new Date(monthStart)
    start.setDate(start.getDate() + (weekNum - 1) * 7 - start.getDay())
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    return { start, end }
  }
  const monthMatch = v.match(/(\w+)-(\d{4})/)
  if (monthMatch) {
    const start = new Date(`${monthMatch[1]} 1, ${monthMatch[2]}`)
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0)
    return { start, end }
  }
  return null
}

// Check if a row's date range overlaps with the filter range (partial overlap = include)
function rowMatchesDateFilter(dateRangeValue: string, dateFrom: string, dateTo: string): boolean {
  if (!dateFrom && !dateTo) return true
  const bounds = getDateRangeBounds(dateRangeValue)
  if (!bounds) return true // can't parse → don't filter out
  const filterStart = dateFrom ? new Date(dateFrom) : new Date(0)
  const filterEnd = dateTo ? new Date(dateTo) : new Date(9999, 11, 31)
  // Overlap: row starts before filter ends AND row ends after filter starts
  return bounds.start <= filterEnd && bounds.end >= filterStart
}

// Convert "W1-May-2026" → "Apr 28 – May 4, 2026" or "May-2026" → "May 1 – May 31, 2026"
function formatDateRange(v: string): string | null {
  if (!v) return null
  const weekMatch = v.match(/W(\d+)-(\w+)-(\d{4})/)
  if (weekMatch) {
    const weekNum = parseInt(weekMatch[1])
    const monthStart = new Date(`${weekMatch[2]} 1, ${weekMatch[3]}`)
    const start = new Date(monthStart)
    start.setDate(start.getDate() + (weekNum - 1) * 7 - start.getDay()) // align to Sunday start
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    return `${fmt(start)} – ${fmtFull(end)}`
  }
  const monthMatch = v.match(/(\w+)-(\d{4})/)
  if (monthMatch) {
    const start = new Date(`${monthMatch[1]} 1, ${monthMatch[2]}`)
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0) // last day of month
    return `${fmt(start)} – ${fmtFull(end)}`
  }
  return null
}

interface UtilTarget {
  id?: number
  dateRangeType: string
  dateRangeValue: string
  siteType: string
  siteName: string
  productCode?: string | null
  minUtilizationTarget: number | null
  currentUtilization?: number | null
}

interface AllocationFilters {
  selectedSite: string; selectedProduct: string; dateFrom: string; dateTo: string
}

export function UtilizationTargets({ siteType, rangeType, filters }: { siteType: string; rangeType: string; filters: AllocationFilters }) {
  const [data, setData] = useState<UtilTarget[]>([])

  const fetchData = useCallback(async () => {
    const params = new URLSearchParams({ siteType, dateRangeType: rangeType })
    if (filters.selectedSite) {
      const siteRes = await fetch(`/api/accounts/${filters.selectedSite}`)
      if (siteRes.ok) {
        const site = await siteRes.json()
        params.set("siteName", site.name)
      }
    }
    if (filters.selectedProduct) params.set("productCode", filters.selectedProduct)
    const res = await fetch(`/api/utilization?${params}`)
    setData(await res.json())
  }, [siteType, rangeType, filters])

  useEffect(() => { fetchData() }, [fetchData])

  const handleAdd = () => {
    setData(prev => [...prev, {
      dateRangeType: rangeType,
      dateRangeValue: "",
      siteType,
      siteName: "",
      productCode: filters.selectedProduct || "",
      minUtilizationTarget: null,
      currentUtilization: null,
    }])
  }

  const handleChange = (idx: number, field: keyof UtilTarget, value: string | number | null) => {
    setData(prev => prev.map((row, i) => i === idx ? { ...row, [field]: value } : row))
  }

  const handleSave = async (idx: number) => {
    const row = data[idx]
    const method = row.id ? "PUT" : "POST"
    const url = row.id ? `/api/utilization/${row.id}` : "/api/utilization"
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(row),
    })
    fetchData()
  }

  const handleDelete = async (idx: number) => {
    const row = data[idx]
    if (row.id) {
      await fetch(`/api/utilization/${row.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...row, minUtilizationTarget: null }) })
    }
    setData(prev => prev.filter((_, i) => i !== idx))
  }

  const getStatus = (row: UtilTarget) => {
    if (row.minUtilizationTarget === null || row.minUtilizationTarget === undefined) return null
    const current = row.currentUtilization ?? 0
    const target = row.minUtilizationTarget
    if (current >= target) return "met"
    if (current >= target * 0.8) return "near"
    return "below"
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">{rangeType} Utilization Targets — {siteType}</h3>
        <Button onClick={handleAdd} size="sm" variant="outline">
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Row
        </Button>
      </div>
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden max-h-[500px] overflow-y-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur-sm">
            <TableRow className="bg-gray-50/95">
              <TableHead className="text-xs font-semibold">{rangeType === "Weekly" ? "Week" : "Month"}</TableHead>
              <TableHead className="text-xs font-semibold">{siteType} Site</TableHead>
              <TableHead className="text-xs font-semibold">Product</TableHead>
              <TableHead className="text-xs font-semibold">Min Utilization Target</TableHead>
              <TableHead className="text-xs font-semibold">Current Utilization</TableHead>
              <TableHead className="text-xs font-semibold">Status</TableHead>
              <TableHead className="text-xs font-semibold w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...data]
              .filter(row => rowMatchesDateFilter(row.dateRangeValue, filters.dateFrom, filters.dateTo))
              .sort((a, b) => parseDateRangeValue(a.dateRangeValue) - parseDateRangeValue(b.dateRangeValue))
              .map((row, idx) => {
              const status = getStatus(row)
              return (
                <TableRow key={row.id || `new-${idx}`} className={cn(
                  status === "below" ? "bg-red-50" : status === "near" ? "bg-amber-50" : ""
                )}>
                  <TableCell>
                    <div className="space-y-0.5">
                      <Input value={row.dateRangeValue} onChange={e => handleChange(idx, "dateRangeValue", e.target.value)}
                        placeholder={rangeType === "Weekly" ? "W1-May-2026" : "May-2026"} className="h-8 text-sm" />
                      {formatDateRange(row.dateRangeValue) && (
                        <p className="text-[10px] text-gray-400 pl-1">{formatDateRange(row.dateRangeValue)}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Input value={row.siteName} onChange={e => handleChange(idx, "siteName", e.target.value)}
                      placeholder="Site name" className="h-8 text-sm" />
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-medium text-gray-700">{row.productCode || "—"}</span>
                  </TableCell>
                  <TableCell>
                    <Input type="number" min={0} step={1} value={row.minUtilizationTarget ?? ""} onChange={e => handleChange(idx, "minUtilizationTarget", e.target.value ? Number(e.target.value) : null)}
                      placeholder="Blank = unconstrained" className="h-8 text-sm" />
                  </TableCell>
                  <TableCell>
                    <Input type="number" min={0} step={1} value={row.currentUtilization ?? ""} onChange={e => handleChange(idx, "currentUtilization", e.target.value ? Number(e.target.value) : null)}
                      placeholder="0" className="h-8 text-sm" />
                  </TableCell>
                  <TableCell>
                    {status === "met" ? (
                      <Badge variant="success">On Target</Badge>
                    ) : status === "near" ? (
                      <Badge variant="warning">Near Target</Badge>
                    ) : status === "below" ? (
                      <Badge variant="destructive">Below Target</Badge>
                    ) : (
                      <Badge variant="secondary">No Target</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleSave(idx)}>
                        <Save className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => handleDelete(idx)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
            {data.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-gray-400">No utilization targets set. Click &quot;Add Row&quot; to begin.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
