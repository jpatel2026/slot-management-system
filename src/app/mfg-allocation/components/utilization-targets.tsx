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
  // Weekly: "W1-May-2026" → extract month-year, week number
  const weekMatch = v.match(/W(\d+)-(\w+)-(\d{4})/)
  if (weekMatch) {
    const d = new Date(`${weekMatch[2]} 1, ${weekMatch[3]}`)
    return d.getTime() + (parseInt(weekMatch[1]) - 1) * 7 * 86400000
  }
  // Monthly: "May-2026" → first of month
  const monthMatch = v.match(/(\w+)-(\d{4})/)
  if (monthMatch) {
    return new Date(`${monthMatch[1]} 1, ${monthMatch[2]}`).getTime()
  }
  return 0
}

interface UtilTarget {
  id?: number
  dateRangeType: string
  dateRangeValue: string
  siteType: string
  siteName: string
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
      // Look up site name for filtering
      const siteRes = await fetch(`/api/accounts/${filters.selectedSite}`)
      if (siteRes.ok) {
        const site = await siteRes.json()
        params.set("siteName", site.name)
      }
    }
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
              <TableHead className="text-xs font-semibold">Min Utilization Target</TableHead>
              <TableHead className="text-xs font-semibold">Current Utilization</TableHead>
              <TableHead className="text-xs font-semibold">Status</TableHead>
              <TableHead className="text-xs font-semibold w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...data].sort((a, b) => parseDateRangeValue(a.dateRangeValue) - parseDateRangeValue(b.dateRangeValue)).map((row, idx) => {
              const status = getStatus(row)
              return (
                <TableRow key={row.id || `new-${idx}`} className={cn(
                  status === "below" ? "bg-red-50" : status === "near" ? "bg-amber-50" : ""
                )}>
                  <TableCell>
                    <Input value={row.dateRangeValue} onChange={e => handleChange(idx, "dateRangeValue", e.target.value)}
                      placeholder={rangeType === "Weekly" ? "W1-May-2026" : "May-2026"} className="h-8 text-sm" />
                  </TableCell>
                  <TableCell>
                    <Input value={row.siteName} onChange={e => handleChange(idx, "siteName", e.target.value)}
                      placeholder="Site name" className="h-8 text-sm" />
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
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-400">No utilization targets set. Click &quot;Add Row&quot; to begin.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
