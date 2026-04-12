"use client"
import { useEffect, useState, useCallback } from "react"
import { DataTable } from "@/components/data-table"
import { PageHeader } from "@/components/page-header"
import { Dialog, DialogHeader, DialogTitle, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import type { ColumnDef } from "@tanstack/react-table"

interface UtilizationQueue {
  id: number; dateRangeType: string; dateRangeValue: string
  siteType: string; siteName: string
  minUtilizationTarget: number | null; maxAphReceipts: number | null
  currentAphReceipts: number
  createdAt: string; updatedAt: string
}

const dateRangeTypeOptions = [
  { value: "Weekly", label: "Weekly" },
  { value: "Monthly", label: "Monthly" },
  { value: "Quarterly", label: "Quarterly" },
]

const siteTypeOptions = [
  { value: "Apheresis", label: "Apheresis" },
  { value: "Manufacturing", label: "Manufacturing" },
  { value: "Cryopreservation", label: "Cryopreservation" },
]

export default function UtilizationPage() {
  const [data, setData] = useState<UtilizationQueue[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<UtilizationQueue | null>(null)
  const [form, setForm] = useState({
    dateRangeType: "Weekly", dateRangeValue: "",
    siteType: "Apheresis", siteName: "",
    minUtilizationTarget: "", maxAphReceipts: "", currentAphReceipts: "0",
  })
  const [error, setError] = useState("")

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/utilization")
    setData(await res.json())
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const openCreate = () => {
    setEditing(null)
    setForm({
      dateRangeType: "Weekly", dateRangeValue: "",
      siteType: "Apheresis", siteName: "",
      minUtilizationTarget: "", maxAphReceipts: "", currentAphReceipts: "0",
    })
    setError("")
    setDialogOpen(true)
  }

  const openEdit = (u: UtilizationQueue) => {
    setEditing(u)
    setForm({
      dateRangeType: u.dateRangeType,
      dateRangeValue: u.dateRangeValue,
      siteType: u.siteType,
      siteName: u.siteName,
      minUtilizationTarget: u.minUtilizationTarget != null ? String(u.minUtilizationTarget) : "",
      maxAphReceipts: u.maxAphReceipts != null ? String(u.maxAphReceipts) : "",
      currentAphReceipts: String(u.currentAphReceipts),
    })
    setError("")
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.dateRangeType || !form.dateRangeValue || !form.siteType || !form.siteName) {
      setError("Date range type, date range value, site type, and site name are required"); return
    }
    setError("")
    const payload = {
      dateRangeType: form.dateRangeType,
      dateRangeValue: form.dateRangeValue,
      siteType: form.siteType,
      siteName: form.siteName,
      minUtilizationTarget: form.minUtilizationTarget ? parseFloat(form.minUtilizationTarget) : null,
      maxAphReceipts: form.maxAphReceipts ? parseInt(form.maxAphReceipts) : null,
      currentAphReceipts: parseInt(form.currentAphReceipts) || 0,
    }
    const url = editing ? `/api/utilization/${editing.id}` : "/api/utilization"
    const method = editing ? "PUT" : "POST"
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
    if (!res.ok) {
      const err = await res.json()
      setError(err.error || "Save failed")
      return
    }
    setDialogOpen(false)
    fetchData()
  }

  const columns: ColumnDef<UtilizationQueue, unknown>[] = [
    { accessorKey: "dateRangeType", header: "Date Range Type", cell: ({ row }) => (
      <Badge variant={row.original.dateRangeType === "Weekly" ? "info" : row.original.dateRangeType === "Monthly" ? "purple" : "warning"}>{row.original.dateRangeType}</Badge>
    )},
    { accessorKey: "dateRangeValue", header: "Date Range Value", cell: ({ row }) => (
      <span className="font-medium text-sm">{row.original.dateRangeValue}</span>
    )},
    { accessorKey: "siteType", header: "Site Type", cell: ({ row }) => {
      const v = row.original.siteType
      const variant = v === "Apheresis" ? "purple" : v === "Manufacturing" ? "warning" : "info"
      return <Badge variant={variant}>{v}</Badge>
    }},
    { accessorKey: "siteName", header: "Site Name", cell: ({ row }) => (
      <code className="rounded bg-gray-100 px-2 py-0.5 text-xs font-mono">{row.original.siteName}</code>
    )},
    { accessorKey: "minUtilizationTarget", header: "Min Util Target", cell: ({ row }) => {
      const v = row.original.minUtilizationTarget
      if (v == null) return <span className="text-gray-300">-</span>
      return <span className="inline-flex h-7 min-w-[3rem] items-center justify-center rounded-md bg-green-50 px-2 text-sm font-semibold text-green-700">{v}%</span>
    }},
    { accessorKey: "maxAphReceipts", header: "Max Aph Receipts", cell: ({ row }) => {
      const v = row.original.maxAphReceipts
      if (v == null) return <span className="text-gray-300">-</span>
      return <span className="inline-flex h-7 min-w-[2rem] items-center justify-center rounded-md bg-blue-50 px-2 text-sm font-semibold text-blue-700">{v}</span>
    }},
    { accessorKey: "currentAphReceipts", header: "Current Aph Receipts", cell: ({ row }) => {
      const current = row.original.currentAphReceipts
      const max = row.original.maxAphReceipts
      const isOver = max != null && current > max
      return (
        <span className={`inline-flex h-7 min-w-[2rem] items-center justify-center rounded-md px-2 text-sm font-bold ${isOver ? "bg-red-50 text-red-700" : "bg-gray-100 text-gray-700"}`}>
          {current}
        </span>
      )
    }},
  ]

  return (
    <div>
      <PageHeader title="Utilization" description="Manage utilization targets and queue configurations" createLabel="New Entry" onCreateClick={openCreate} />
      <DataTable columns={columns} data={data} searchPlaceholder="Search utilization..." showActiveFilter={false} exportFilename="utilization.csv" onRowClick={openEdit} />
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogHeader><DialogTitle>{editing ? "Edit Utilization Entry" : "New Utilization Entry"}</DialogTitle></DialogHeader>
        <DialogContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date Range Type *</Label>
                <Select value={form.dateRangeType} onChange={e => setForm(f => ({ ...f, dateRangeType: e.target.value }))} options={dateRangeTypeOptions} />
              </div>
              <div>
                <Label>Date Range Value *</Label>
                <Input value={form.dateRangeValue} onChange={e => setForm(f => ({ ...f, dateRangeValue: e.target.value }))} placeholder="e.g. 2026-W15 or 2026-04" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Site Type *</Label>
                <Select value={form.siteType} onChange={e => setForm(f => ({ ...f, siteType: e.target.value }))} options={siteTypeOptions} />
              </div>
              <div>
                <Label>Site Name *</Label>
                <Input value={form.siteName} onChange={e => setForm(f => ({ ...f, siteName: e.target.value }))} placeholder="e.g. BOS-APH" />
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gradient-to-r from-green-50/30 to-blue-50/30 p-4 space-y-3">
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Targets & Metrics</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Min Utilization Target (%)</Label>
                  <Input type="number" step="0.1" min="0" max="100" value={form.minUtilizationTarget} onChange={e => setForm(f => ({ ...f, minUtilizationTarget: e.target.value }))} placeholder="e.g. 90" />
                </div>
                <div>
                  <Label>Max Aph Receipts</Label>
                  <Input type="number" min="0" value={form.maxAphReceipts} onChange={e => setForm(f => ({ ...f, maxAphReceipts: e.target.value }))} placeholder="e.g. 10" />
                </div>
                <div>
                  <Label>Current Aph Receipts</Label>
                  <Input type="number" min="0" value={form.currentAphReceipts} onChange={e => setForm(f => ({ ...f, currentAphReceipts: e.target.value }))} />
                </div>
              </div>
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">{editing ? "Save Changes" : "Create Entry"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
