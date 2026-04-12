"use client"
import { useEffect, useState, useCallback } from "react"
import { DataTable } from "@/components/data-table"
import { PageHeader } from "@/components/page-header"
import { Dialog, DialogHeader, DialogTitle, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/utils"
import type { ColumnDef } from "@tanstack/react-table"

interface Milestone {
  id: number; milestoneId: string; orderReservationId: string
  milestoneName: string; leg: number; sequentialLeg: number
  plannedDate: string; actualDate: string | null
  createdAt: string; updatedAt: string
}

export default function MilestonesPage() {
  const [data, setData] = useState<Milestone[]>([])
  const [filterOrderId, setFilterOrderId] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Milestone | null>(null)
  const [form, setForm] = useState({ actualDate: "" })
  const [error, setError] = useState("")

  const fetchData = useCallback(async () => {
    const params = new URLSearchParams()
    if (filterOrderId) params.set("orderReservationId", filterOrderId)
    const res = await fetch(`/api/milestones?${params}`)
    setData(await res.json())
  }, [filterOrderId])

  useEffect(() => { fetchData() }, [fetchData])

  const openEdit = (m: Milestone) => {
    setEditing(m)
    setForm({ actualDate: m.actualDate ? m.actualDate.split("T")[0] : "" })
    setError("")
    setDialogOpen(true)
  }

  const handleSave = async () => {
    setError("")
    const payload = {
      actualDate: form.actualDate || null,
    }
    const res = await fetch(`/api/milestones/${editing!.id}`, {
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

  const columns: ColumnDef<Milestone, unknown>[] = [
    { accessorKey: "orderReservationId", header: "Order ID", cell: ({ row }) => (
      <code className="rounded bg-gray-100 px-2 py-0.5 text-xs font-mono">{row.original.orderReservationId.slice(0, 12)}...</code>
    )},
    { accessorKey: "milestoneName", header: "Milestone Name", cell: ({ row }) => (
      <span className="font-medium">{row.original.milestoneName}</span>
    )},
    { accessorKey: "leg", header: "Leg", cell: ({ row }) => (
      <Badge variant="secondary">{row.original.leg}</Badge>
    )},
    { accessorKey: "sequentialLeg", header: "Seq Leg", cell: ({ row }) => (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-purple-100 text-xs font-bold text-blue-700">{row.original.sequentialLeg}</span>
    )},
    { accessorKey: "plannedDate", header: "Planned Date", cell: ({ row }) => (
      <span className="text-sm text-gray-600">{formatDate(row.original.plannedDate)}</span>
    )},
    { accessorKey: "actualDate", header: "Actual Date", cell: ({ row }) => {
      const ad = row.original.actualDate
      if (!ad) return <span className="text-gray-300 italic text-xs">Pending</span>
      return <span className="text-sm font-medium text-green-700">{formatDate(ad)}</span>
    }},
    { id: "status", header: "Status", cell: ({ row }) => {
      const ad = row.original.actualDate
      if (ad) return <Badge variant="success">Completed</Badge>
      return <Badge variant="secondary">Pending</Badge>
    }},
  ]

  return (
    <div>
      <PageHeader title="Milestones" description="View and update order milestone actual dates">
        <div className="flex items-center gap-2">
          <Label className="text-sm text-gray-500 whitespace-nowrap">Filter by Order ID:</Label>
          <Input
            value={filterOrderId}
            onChange={e => setFilterOrderId(e.target.value)}
            placeholder="Enter order ID..."
            className="w-64"
          />
        </div>
      </PageHeader>
      <DataTable columns={columns} data={data} searchPlaceholder="Search milestones..." showActiveFilter={false} exportFilename="milestones.csv" onRowClick={openEdit} />
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogHeader><DialogTitle>Update Milestone Actual Date</DialogTitle></DialogHeader>
        <DialogContent>
          {editing && (
            <div className="space-y-4">
              <div className="rounded-lg border border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50/30 p-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Milestone</span>
                  <span className="font-medium">{editing.milestoneName}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Order ID</span>
                  <code className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded">{editing.orderReservationId}</code>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Leg / Seq</span>
                  <span>{editing.leg} / {editing.sequentialLeg}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Planned Date</span>
                  <span className="font-medium text-blue-700">{formatDate(editing.plannedDate)}</span>
                </div>
              </div>
              <div>
                <Label>Actual Date</Label>
                <Input type="date" value={form.actualDate} onChange={e => setForm({ actualDate: e.target.value })} />
                <p className="text-xs text-gray-400 mt-1">Leave empty to clear the actual date</p>
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSave} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">Update Milestone</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
