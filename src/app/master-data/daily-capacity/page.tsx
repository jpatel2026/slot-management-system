"use client"
import { useEffect, useState, useCallback } from "react"
import { DataTable } from "@/components/data-table"
import { PageHeader } from "@/components/page-header"
import { Dialog, DialogHeader, DialogTitle, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { remainingColor, formatDate } from "@/lib/utils"
import type { ColumnDef } from "@tanstack/react-table"

interface DailyCapacity {
  id: number; name: string; date: string; capacityType: string; siteType: string
  baseCapacity: number; bookedCapacity: number; overallocationCapacity: number
  remainingCapacity: number; mfgType: string | null; siteId: number; productCode: string | null
  createdAt: string; updatedAt: string
}

const capacityTypeBadge: Record<string, "info" | "purple" | "warning" | "secondary"> = {
  Commercial: "info",
  Clinical: "purple",
  Reserve: "warning",
  "Non-patient": "secondary",
  Patient: "info",
}

export default function DailyCapacityPage() {
  const [data, setData] = useState<DailyCapacity[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<DailyCapacity | null>(null)
  const [form, setForm] = useState({ baseCapacity: "0", overallocationCapacity: "0" })
  const [error, setError] = useState("")

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/daily-capacity")
    setData(await res.json())
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const openEdit = (dc: DailyCapacity) => {
    setEditing(dc)
    setForm({
      baseCapacity: String(dc.baseCapacity),
      overallocationCapacity: String(dc.overallocationCapacity),
    })
    setError("")
    setDialogOpen(true)
  }

  const handleSave = async () => {
    setError("")
    const payload = {
      baseCapacity: parseInt(form.baseCapacity) || 0,
      overallocationCapacity: parseInt(form.overallocationCapacity) || 0,
    }
    const res = await fetch(`/api/daily-capacity/${editing!.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const err = await res.json()
      setError(err.error || "Save failed")
      return
    }
    setDialogOpen(false)
    fetchData()
  }

  const rowClassName = (row: DailyCapacity) => {
    if (row.remainingCapacity <= 0) return "bg-red-50/60 hover:bg-red-50"
    if (row.remainingCapacity === 1) return "bg-yellow-50/60 hover:bg-yellow-50"
    return ""
  }

  const columns: ColumnDef<DailyCapacity, unknown>[] = [
    { accessorKey: "name", header: "Capacity Name", cell: ({ row }) => (
      <span className="font-medium text-sm">{row.original.name}</span>
    )},
    { accessorKey: "date", header: "Date", cell: ({ row }) => (
      <span className="text-sm text-gray-600">{formatDate(row.original.date)}</span>
    )},
    { accessorKey: "capacityType", header: "Capacity Type", cell: ({ row }) => {
      const v = row.original.capacityType
      return <Badge variant={capacityTypeBadge[v] || "secondary"}>{v}</Badge>
    }},
    { accessorKey: "baseCapacity", header: "Base", cell: ({ row }) => (
      <span className="inline-flex h-7 min-w-[2rem] items-center justify-center rounded-md bg-gray-100 px-2 text-sm font-semibold">{row.original.baseCapacity}</span>
    )},
    { accessorKey: "bookedCapacity", header: "Booked", cell: ({ row }) => (
      <span className="inline-flex h-7 min-w-[2rem] items-center justify-center rounded-md bg-blue-50 px-2 text-sm font-semibold text-blue-700">{row.original.bookedCapacity}</span>
    )},
    { accessorKey: "overallocationCapacity", header: "Overallocation", cell: ({ row }) => (
      <span className="inline-flex h-7 min-w-[2rem] items-center justify-center rounded-md bg-orange-50 px-2 text-sm font-semibold text-orange-700">{row.original.overallocationCapacity}</span>
    )},
    { accessorKey: "remainingCapacity", header: "Remaining", cell: ({ row }) => {
      const v = row.original.remainingCapacity
      const cls = v <= 0 ? "bg-red-100 text-red-800" : v === 1 ? "bg-yellow-100 text-yellow-800" : "bg-green-50 text-green-700"
      return <span className={`inline-flex h-7 min-w-[2rem] items-center justify-center rounded-md px-2 text-sm font-bold ${cls}`}>{v}</span>
    }},
    { accessorKey: "mfgType", header: "Mfgtype", cell: ({ row }) => {
      const v = row.original.mfgType
      if (!v) return <span className="text-gray-300">-</span>
      const variant = v === "Fresh" ? "info" : v === "Frozen" ? "purple" : "secondary"
      return <Badge variant={variant}>{v}</Badge>
    }},
  ]

  return (
    <div>
      <PageHeader title="Daily Capacity" description="View and adjust daily slot capacity across sites" />
      <DataTable columns={columns} data={data} searchPlaceholder="Search capacity..." showActiveFilter={false} exportFilename="daily-capacity.csv" onRowClick={openEdit} rowClassName={rowClassName} />
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogHeader><DialogTitle>Edit Daily Capacity</DialogTitle></DialogHeader>
        <DialogContent>
          {editing && (
            <div className="space-y-4">
              <div className="rounded-lg border border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50/30 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Capacity Name</span>
                  <span className="font-medium">{editing.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Date</span>
                  <span>{formatDate(editing.date)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Type</span>
                  <Badge variant={capacityTypeBadge[editing.capacityType] || "secondary"}>{editing.capacityType}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Currently Booked</span>
                  <span className="font-semibold text-blue-700">{editing.bookedCapacity}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Remaining</span>
                  <span className={`font-bold ${editing.remainingCapacity <= 0 ? "text-red-600" : editing.remainingCapacity === 1 ? "text-yellow-600" : "text-green-600"}`}>{editing.remainingCapacity}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Base Capacity</Label>
                  <Input type="number" min="0" value={form.baseCapacity} onChange={e => setForm(f => ({ ...f, baseCapacity: e.target.value }))} />
                </div>
                <div>
                  <Label>Overallocation Capacity</Label>
                  <Input type="number" min="0" value={form.overallocationCapacity} onChange={e => setForm(f => ({ ...f, overallocationCapacity: e.target.value }))} />
                </div>
              </div>
              <div className="rounded-lg bg-blue-50 p-3">
                <p className="text-xs text-blue-700">
                  New Remaining = Base ({form.baseCapacity || 0}) + Overallocation ({form.overallocationCapacity || 0}) - Booked ({editing.bookedCapacity}) = <strong>{(parseInt(form.baseCapacity) || 0) + (parseInt(form.overallocationCapacity) || 0) - editing.bookedCapacity}</strong>
                </p>
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSave} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">Save Changes</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
