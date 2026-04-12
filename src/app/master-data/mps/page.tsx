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
import { formatDate } from "@/lib/utils"
import type { ColumnDef } from "@tanstack/react-table"

interface Account {
  id: number; name: string; siteId: string; alias: string; siteType: string; active: boolean
}

interface Mps {
  id: number; name: string; mfgSiteId: number; date: string
  patientCapacity: number; nonPatientCapacity: number
  mfgSite: Account; createdAt: string; updatedAt: string
}

export default function MpsPage() {
  const [data, setData] = useState<Mps[]>([])
  const [mfgSites, setMfgSites] = useState<Account[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Mps | null>(null)
  const [form, setForm] = useState({
    mfgSiteId: "", date: "", patientCapacity: "0", nonPatientCapacity: "0",
  })
  const [error, setError] = useState("")

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/mps")
    setData(await res.json())
  }, [])

  const fetchMfgSites = useCallback(async () => {
    const res = await fetch("/api/accounts?siteType=Manufacturing&active=true")
    setMfgSites(await res.json())
  }, [])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { fetchMfgSites() }, [fetchMfgSites])

  const openCreate = () => {
    setEditing(null)
    setForm({
      mfgSiteId: mfgSites[0] ? String(mfgSites[0].id) : "",
      date: "", patientCapacity: "0", nonPatientCapacity: "0",
    })
    setError("")
    setDialogOpen(true)
  }

  const openEdit = (m: Mps) => {
    setEditing(m)
    setForm({
      mfgSiteId: String(m.mfgSiteId),
      date: m.date ? m.date.split("T")[0] : "",
      patientCapacity: String(m.patientCapacity),
      nonPatientCapacity: String(m.nonPatientCapacity),
    })
    setError("")
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.mfgSiteId || !form.date) {
      setError("Manufacturing site and date are required"); return
    }
    setError("")
    const payload = {
      mfgSiteId: parseInt(form.mfgSiteId),
      date: form.date,
      patientCapacity: parseInt(form.patientCapacity) || 0,
      nonPatientCapacity: parseInt(form.nonPatientCapacity) || 0,
    }
    const url = editing ? `/api/mps/${editing.id}` : "/api/mps"
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

  const columns: ColumnDef<Mps, unknown>[] = [
    { accessorKey: "name", header: "MPS Name", cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
    { accessorKey: "mfgSite.alias", header: "Mfg Site", cell: ({ row }) => (
      <code className="rounded bg-amber-50 px-2 py-0.5 text-xs font-mono text-amber-700">{row.original.mfgSite?.alias || "-"}</code>
    )},
    { accessorKey: "date", header: "Date", cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-100 to-purple-100 text-xs font-bold text-blue-700">
          {new Date(row.original.date).getDate()}
        </span>
        <span className="text-sm text-gray-600">{formatDate(row.original.date)}</span>
      </div>
    )},
    { accessorKey: "patientCapacity", header: "Patient Capacity", cell: ({ row }) => (
      <span className="inline-flex h-7 min-w-[2.5rem] items-center justify-center rounded-md bg-green-50 px-2 text-sm font-semibold text-green-700">{row.original.patientCapacity}</span>
    )},
    { accessorKey: "nonPatientCapacity", header: "Non-patient Capacity", cell: ({ row }) => (
      <span className="inline-flex h-7 min-w-[2.5rem] items-center justify-center rounded-md bg-gray-100 px-2 text-sm font-semibold text-gray-600">{row.original.nonPatientCapacity}</span>
    )},
    { id: "total", header: "Total", cell: ({ row }) => (
      <span className="inline-flex h-7 min-w-[2.5rem] items-center justify-center rounded-md bg-gradient-to-r from-green-100 to-blue-100 px-2 text-sm font-bold text-gray-800">{row.original.patientCapacity + row.original.nonPatientCapacity}</span>
    )},
  ]

  const mfgSiteOptions = mfgSites.map(s => ({ value: String(s.id), label: `${s.name} (${s.alias})` }))

  return (
    <div>
      <PageHeader title="MPS" description="Master Production Schedule - daily manufacturing capacity" createLabel="New MPS Entry" onCreateClick={openCreate} />
      <DataTable columns={columns} data={data} searchPlaceholder="Search MPS..." showActiveFilter={false} exportFilename="mps.csv" onRowClick={openEdit} />
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogHeader><DialogTitle>{editing ? "Edit MPS Entry" : "New MPS Entry"}</DialogTitle></DialogHeader>
        <DialogContent>
          <div className="space-y-4">
            {editing && (
              <div>
                <Label>MPS Name</Label>
                <Input value={editing.name} disabled className="bg-gray-50" />
                <p className="text-xs text-gray-400 mt-1">Name is auto-generated</p>
              </div>
            )}
            <div>
              <Label>Manufacturing Site *</Label>
              <Select value={form.mfgSiteId} onChange={e => setForm(f => ({ ...f, mfgSiteId: e.target.value }))} options={mfgSiteOptions} placeholder="Select manufacturing site..." />
            </div>
            <div>
              <Label>Date *</Label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="rounded-lg border border-gray-200 bg-gradient-to-r from-green-50/30 to-blue-50/30 p-4 space-y-3">
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Capacity</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Patient Capacity</Label>
                  <Input type="number" min="0" value={form.patientCapacity} onChange={e => setForm(f => ({ ...f, patientCapacity: e.target.value }))} />
                </div>
                <div>
                  <Label>Non-patient Capacity</Label>
                  <Input type="number" min="0" value={form.nonPatientCapacity} onChange={e => setForm(f => ({ ...f, nonPatientCapacity: e.target.value }))} />
                </div>
              </div>
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">{editing ? "Save Changes" : "Create MPS Entry"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
