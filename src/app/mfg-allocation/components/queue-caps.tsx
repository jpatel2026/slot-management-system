"use client"
import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select } from "@/components/ui/select"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Plus, Save, Trash2, ShieldAlert } from "lucide-react"
import { cn } from "@/lib/utils"

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

function formatDateRange(v: string): string | null {
  if (!v) return null
  const weekMatch = v.match(/W(\d+)-(\w+)-(\d{4})/)
  if (weekMatch) {
    const weekNum = parseInt(weekMatch[1])
    const monthStart = new Date(`${weekMatch[2]} 1, ${weekMatch[3]}`)
    const start = new Date(monthStart)
    start.setDate(start.getDate() + (weekNum - 1) * 7 - start.getDay())
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    return `${fmt(start)} – ${fmtFull(end)}`
  }
  const monthMatch = v.match(/(\w+)-(\d{4})/)
  if (monthMatch) {
    const start = new Date(`${monthMatch[1]} 1, ${monthMatch[2]}`)
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0)
    return `${fmt(start)} – ${fmtFull(end)}`
  }
  return null
}

interface QueueRow {
  id?: number
  dateRangeType: string
  dateRangeValue: string
  siteType: string
  siteName: string
  productCode?: string | null
  maxAphReceipts: number | null
  currentAphReceipts: number
}

interface AllocationFilters {
  selectedSite: string; selectedProduct: string; dateFrom: string; dateTo: string
}

export function QueueCaps({ filters }: { filters: AllocationFilters }) {
  const [data, setData] = useState<QueueRow[]>([])
  const [products, setProducts] = useState<{ code: string; name: string }[]>([])

  useEffect(() => {
    fetch("/api/products?active=true").then(r => r.json()).then((p: { code: string; name: string }[]) => setProducts(p))
  }, [])

  const fetchData = useCallback(async () => {
    const params = new URLSearchParams({ siteType: "Manufacturing", dateRangeType: "Weekly" })
    if (filters.selectedSite) {
      const siteRes = await fetch(`/api/accounts/${filters.selectedSite}`)
      if (siteRes.ok) {
        const site = await siteRes.json()
        params.set("siteName", site.name)
      }
    }
    if (filters.selectedProduct) params.set("productCode", filters.selectedProduct)
    const res = await fetch(`/api/utilization?${params}`)
    const all = await res.json()
    setData(all.filter((r: QueueRow) => r.maxAphReceipts !== null || r.currentAphReceipts > 0))
  }, [filters])

  useEffect(() => { fetchData() }, [fetchData])

  const handleAdd = () => {
    setData(prev => [...prev, {
      dateRangeType: "Weekly",
      dateRangeValue: "",
      siteType: "Manufacturing",
      siteName: "",
      productCode: filters.selectedProduct || "",
      maxAphReceipts: null,
      currentAphReceipts: 0,
    }])
  }

  const handleChange = (idx: number, field: keyof QueueRow, value: string | number | null) => {
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-900">Queue Caps</h3>
          <Badge variant="outline" className="gap-1">
            <ShieldAlert className="h-3 w-3" /> Manufacturing
          </Badge>
        </div>
        <Button onClick={handleAdd} size="sm" variant="outline">
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Row
        </Button>
      </div>
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/80">
              <TableHead className="text-xs font-semibold">Week</TableHead>
              <TableHead className="text-xs font-semibold">Mfg Site</TableHead>
              <TableHead className="text-xs font-semibold">Product</TableHead>
              <TableHead className="text-xs font-semibold">Max Aph Receipts</TableHead>
              <TableHead className="text-xs font-semibold">Current Aph Receipts</TableHead>
              <TableHead className="text-xs font-semibold">Status</TableHead>
              <TableHead className="text-xs font-semibold w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...data].sort((a, b) => parseDateRangeValue(a.dateRangeValue) - parseDateRangeValue(b.dateRangeValue)).map((row, idx) => {
              const atLimit = row.maxAphReceipts !== null && row.currentAphReceipts >= row.maxAphReceipts
              const nearLimit = row.maxAphReceipts !== null && row.currentAphReceipts >= (row.maxAphReceipts * 0.8)
              return (
                <TableRow key={row.id || `new-${idx}`} className={cn(atLimit ? "bg-red-50" : nearLimit ? "bg-amber-50" : "")}>
                  <TableCell>
                    <div className="space-y-0.5">
                      <Input value={row.dateRangeValue} onChange={e => handleChange(idx, "dateRangeValue", e.target.value)}
                        placeholder="W1-May-2026" className="h-8 text-sm" />
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
                    <Select value={row.productCode || ""} onChange={e => handleChange(idx, "productCode", e.target.value || null)}
                      options={products.map(p => ({ value: p.code, label: `${p.name} (${p.code})` }))}
                      placeholder="All" className="h-8 text-sm" />
                  </TableCell>
                  <TableCell>
                    <Input type="number" value={row.maxAphReceipts ?? ""} onChange={e => handleChange(idx, "maxAphReceipts", e.target.value ? Number(e.target.value) : null)}
                      className="h-8 text-sm" />
                  </TableCell>
                  <TableCell className="font-semibold">{row.currentAphReceipts}</TableCell>
                  <TableCell>
                    {atLimit ? (
                      <Badge variant="destructive">At Limit</Badge>
                    ) : nearLimit ? (
                      <Badge variant="warning">Near Limit</Badge>
                    ) : (
                      <Badge variant="success">Open</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleSave(idx)}>
                      <Save className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
            {data.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-gray-400">No queue caps configured.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
