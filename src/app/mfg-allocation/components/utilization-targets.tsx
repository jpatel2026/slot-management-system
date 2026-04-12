"use client"
import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Plus, Save, Trash2 } from "lucide-react"

interface UtilTarget {
  id?: number
  dateRangeType: string
  dateRangeValue: string
  siteType: string
  siteName: string
  minUtilizationTarget: number | null
}

export function UtilizationTargets({ siteType, rangeType }: { siteType: string; rangeType: string }) {
  const [data, setData] = useState<UtilTarget[]>([])
  const [editing, setEditing] = useState<Record<number, UtilTarget>>({})

  const fetchData = useCallback(async () => {
    const params = new URLSearchParams({ siteType, dateRangeType: rangeType })
    const res = await fetch(`/api/utilization?${params}`)
    setData(await res.json())
  }, [siteType, rangeType])

  useEffect(() => { fetchData() }, [fetchData])

  const handleAdd = () => {
    setData(prev => [...prev, {
      dateRangeType: rangeType,
      dateRangeValue: "",
      siteType,
      siteName: "",
      minUtilizationTarget: null,
    }])
  }

  const handleChange = (idx: number, field: keyof UtilTarget, value: string | number | null) => {
    setData(prev => prev.map((row, i) => i === idx ? { ...row, [field]: value } : row))
    setEditing(prev => ({ ...prev, [idx]: { ...data[idx], [field]: value } }))
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
    setEditing(prev => { const n = { ...prev }; delete n[idx]; return n })
    fetchData()
  }

  const handleDelete = async (idx: number) => {
    const row = data[idx]
    if (row.id) {
      await fetch(`/api/utilization/${row.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...row, minUtilizationTarget: null }) })
    }
    setData(prev => prev.filter((_, i) => i !== idx))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">{rangeType} Utilization Targets — {siteType}</h3>
        <Button onClick={handleAdd} size="sm" variant="outline">
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Row
        </Button>
      </div>
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/80">
              <TableHead className="text-xs font-semibold">{rangeType === "Weekly" ? "Week" : "Month"}</TableHead>
              <TableHead className="text-xs font-semibold">{siteType} Site</TableHead>
              <TableHead className="text-xs font-semibold">Min Utilization Target</TableHead>
              <TableHead className="text-xs font-semibold w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, idx) => (
              <TableRow key={row.id || `new-${idx}`}>
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
            ))}
            {data.length === 0 && (
              <TableRow><TableCell colSpan={4} className="text-center py-8 text-gray-400">No utilization targets set. Click &quot;Add Row&quot; to begin.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
