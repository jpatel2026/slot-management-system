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

interface Account {
  id: number; name: string; siteId: string; alias: string; siteType: string; active: boolean
}

interface Ibp {
  id: number; name: string; mfgSiteId: number; month: number; year: number
  commercialCapacity: number; clinicalCapacity: number
  nonPatientCapacity: number; reserveCapacity: number
  mfgSite: Account; createdAt: string; updatedAt: string
}

const monthOptions = [
  { value: "1", label: "January" }, { value: "2", label: "February" }, { value: "3", label: "March" },
  { value: "4", label: "April" }, { value: "5", label: "May" }, { value: "6", label: "June" },
  { value: "7", label: "July" }, { value: "8", label: "August" }, { value: "9", label: "September" },
  { value: "10", label: "October" }, { value: "11", label: "November" }, { value: "12", label: "December" },
]

const currentYear = new Date().getFullYear()
const yearOptions = Array.from({ length: 5 }, (_, i) => ({
  value: String(currentYear + i - 1),
  label: String(currentYear + i - 1),
}))

export default function IbpPage() {
  const [data, setData] = useState<Ibp[]>([])
  const [mfgSites, setMfgSites] = useState<Account[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Ibp | null>(null)
  const [form, setForm] = useState({
    mfgSiteId: "", month: "1", year: String(currentYear),
    commercialCapacity: "0", clinicalCapacity: "0",
    nonPatientCapacity: "0", reserveCapacity: "0",
  })
  const [error, setError] = useState("")

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/ibp")
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
      month: "1", year: String(currentYear),
      commercialCapacity: "0", clinicalCapacity: "0",
      nonPatientCapacity: "0", reserveCapacity: "0",
    })
    setError("")
    setDialogOpen(true)
  }

  const openEdit = (ibp: Ibp) => {
    setEditing(ibp)
    setForm({
      mfgSiteId: String(ibp.mfgSiteId),
      month: String(ibp.month), year: String(ibp.year),
      commercialCapacity: String(ibp.commercialCapacity),
      clinicalCapacity: String(ibp.clinicalCapacity),
      nonPatientCapacity: String(ibp.nonPatientCapacity),
      reserveCapacity: String(ibp.reserveCapacity),
    })
    setError("")
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.mfgSiteId || !form.month || !form.year) {
      setError("Manufacturing site, month, and year are required"); return
    }
    setError("")
    const payload = {
      mfgSiteId: parseInt(form.mfgSiteId),
      month: parseInt(form.month),
      year: parseInt(form.year),
      commercialCapacity: parseInt(form.commercialCapacity) || 0,
      clinicalCapacity: parseInt(form.clinicalCapacity) || 0,
      nonPatientCapacity: parseInt(form.nonPatientCapacity) || 0,
      reserveCapacity: parseInt(form.reserveCapacity) || 0,
    }
    const url = editing ? `/api/ibp/${editing.id}` : "/api/ibp"
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

  const totalCapacity = (ibp: Ibp) => ibp.commercialCapacity + ibp.clinicalCapacity + ibp.nonPatientCapacity + ibp.reserveCapacity

  const columns: ColumnDef<Ibp, unknown>[] = [
    { accessorKey: "name", header: "IBP Name", cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
    { accessorKey: "mfgSite.alias", header: "Mfg Site", cell: ({ row }) => (
      <code className="rounded bg-amber-50 px-2 py-0.5 text-xs font-mono text-amber-700">{row.original.mfgSite?.alias || "-"}</code>
    )},
    { accessorKey: "month", header: "Month", cell: ({ row }) => {
      const m = row.original.month
      return <span className="text-sm">{monthOptions.find(o => o.value === String(m))?.label || m}</span>
    }},
    { accessorKey: "year", header: "Year", cell: ({ row }) => <Badge variant="secondary">{row.original.year}</Badge> },
    { accessorKey: "commercialCapacity", header: "Commercial", cell: ({ row }) => (
      <span className="inline-flex h-7 min-w-[2.5rem] items-center justify-center rounded-md bg-blue-50 px-2 text-sm font-semibold text-blue-700">{row.original.commercialCapacity}</span>
    )},
    { accessorKey: "clinicalCapacity", header: "Clinical", cell: ({ row }) => (
      <span className="inline-flex h-7 min-w-[2.5rem] items-center justify-center rounded-md bg-purple-50 px-2 text-sm font-semibold text-purple-700">{row.original.clinicalCapacity}</span>
    )},
    { accessorKey: "nonPatientCapacity", header: "Non-patient", cell: ({ row }) => (
      <span className="inline-flex h-7 min-w-[2.5rem] items-center justify-center rounded-md bg-gray-100 px-2 text-sm font-semibold text-gray-600">{row.original.nonPatientCapacity}</span>
    )},
    { accessorKey: "reserveCapacity", header: "Reserve", cell: ({ row }) => (
      <span className="inline-flex h-7 min-w-[2.5rem] items-center justify-center rounded-md bg-orange-50 px-2 text-sm font-semibold text-orange-700">{row.original.reserveCapacity}</span>
    )},
    { id: "total", header: "Total", cell: ({ row }) => (
      <span className="inline-flex h-7 min-w-[2.5rem] items-center justify-center rounded-md bg-gradient-to-r from-blue-100 to-purple-100 px-2 text-sm font-bold text-gray-800">{totalCapacity(row.original)}</span>
    )},
  ]

  const mfgSiteOptions = mfgSites.map(s => ({ value: String(s.id), label: `${s.name} (${s.alias})` }))

  return (
    <div>
      <PageHeader title="IBP" description="Integrated Business Plan - monthly manufacturing capacity" createLabel="New IBP Entry" onCreateClick={openCreate} />
      <DataTable columns={columns} data={data} searchPlaceholder="Search IBP..." showActiveFilter={false} exportFilename="ibp.csv" onRowClick={openEdit} />
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogHeader><DialogTitle>{editing ? "Edit IBP Entry" : "New IBP Entry"}</DialogTitle></DialogHeader>
        <DialogContent>
          <div className="space-y-4">
            {editing && (
              <div>
                <Label>IBP Name</Label>
                <Input value={editing.name} disabled className="bg-gray-50" />
                <p className="text-xs text-gray-400 mt-1">Name is auto-generated</p>
              </div>
            )}
            <div>
              <Label>Manufacturing Site *</Label>
              <Select value={form.mfgSiteId} onChange={e => setForm(f => ({ ...f, mfgSiteId: e.target.value }))} options={mfgSiteOptions} placeholder="Select manufacturing site..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Month *</Label>
                <Select value={form.month} onChange={e => setForm(f => ({ ...f, month: e.target.value }))} options={monthOptions} />
              </div>
              <div>
                <Label>Year *</Label>
                <Select value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} options={yearOptions} />
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gradient-to-r from-blue-50/30 to-purple-50/30 p-4 space-y-3">
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Capacity Allocation</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Commercial Capacity</Label>
                  <Input type="number" min="0" value={form.commercialCapacity} onChange={e => setForm(f => ({ ...f, commercialCapacity: e.target.value }))} />
                </div>
                <div>
                  <Label>Clinical Capacity</Label>
                  <Input type="number" min="0" value={form.clinicalCapacity} onChange={e => setForm(f => ({ ...f, clinicalCapacity: e.target.value }))} />
                </div>
                <div>
                  <Label>Non-patient Capacity</Label>
                  <Input type="number" min="0" value={form.nonPatientCapacity} onChange={e => setForm(f => ({ ...f, nonPatientCapacity: e.target.value }))} />
                </div>
                <div>
                  <Label>Reserve Capacity</Label>
                  <Input type="number" min="0" value={form.reserveCapacity} onChange={e => setForm(f => ({ ...f, reserveCapacity: e.target.value }))} />
                </div>
              </div>
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">{editing ? "Save Changes" : "Create IBP Entry"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
