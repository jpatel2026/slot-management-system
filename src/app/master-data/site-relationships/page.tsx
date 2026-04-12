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
import { Switch } from "@/components/ui/switch"
import { formatDate } from "@/lib/utils"
import type { ColumnDef } from "@tanstack/react-table"

interface Account {
  id: number; name: string; siteId: string; alias: string; siteType: string; active: boolean
}

interface SiteRelationship {
  id: number; name: string; active: boolean
  aphSiteId: number; cryoSiteId: number | null; cryoPreference: string | null
  mfgSiteId: number; mfgPreference: string; wdcSiteId: number | null; infusionSiteId: number | null
  effectiveDate: string
  aphSite: Account; cryoSite: Account | null; mfgSite: Account; wdcSite: Account | null; infusionSite: Account | null
  createdAt: string; updatedAt: string
}

const preferenceOptions = [
  { value: "Primary", label: "Primary" },
  { value: "Secondary", label: "Secondary" },
  { value: "Tertiary", label: "Tertiary" },
]

export default function SiteRelationshipsPage() {
  const [data, setData] = useState<SiteRelationship[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [showActiveOnly, setShowActiveOnly] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<SiteRelationship | null>(null)
  const [form, setForm] = useState({
    name: "", aphSiteId: "", cryoSiteId: "", cryoPreference: "",
    mfgSiteId: "", mfgPreference: "Primary", wdcSiteId: "", infusionSiteId: "",
    effectiveDate: "", active: true,
  })
  const [error, setError] = useState("")

  const fetchData = useCallback(async () => {
    const params = new URLSearchParams()
    if (showActiveOnly) params.set("active", "true")
    const res = await fetch(`/api/site-relationships?${params}`)
    setData(await res.json())
  }, [showActiveOnly])

  const fetchAccounts = useCallback(async () => {
    const res = await fetch("/api/accounts?active=true")
    setAccounts(await res.json())
  }, [])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { fetchAccounts() }, [fetchAccounts])

  const sitesByType = (type: string) => accounts.filter(a => a.siteType === type).map(a => ({ value: String(a.id), label: `${a.name} (${a.alias})` }))

  const openCreate = () => {
    setEditing(null)
    setForm({ name: "", aphSiteId: "", cryoSiteId: "", cryoPreference: "", mfgSiteId: "", mfgPreference: "Primary", wdcSiteId: "", infusionSiteId: "", effectiveDate: "", active: true })
    setError("")
    setDialogOpen(true)
  }

  const openEdit = (sr: SiteRelationship) => {
    setEditing(sr)
    setForm({
      name: sr.name,
      aphSiteId: String(sr.aphSiteId),
      cryoSiteId: sr.cryoSiteId ? String(sr.cryoSiteId) : "",
      cryoPreference: sr.cryoPreference || "",
      mfgSiteId: String(sr.mfgSiteId),
      mfgPreference: sr.mfgPreference,
      wdcSiteId: sr.wdcSiteId ? String(sr.wdcSiteId) : "",
      infusionSiteId: sr.infusionSiteId ? String(sr.infusionSiteId) : "",
      effectiveDate: sr.effectiveDate ? sr.effectiveDate.split("T")[0] : "",
      active: sr.active,
    })
    setError("")
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.aphSiteId || !form.mfgSiteId || !form.mfgPreference || !form.effectiveDate) {
      setError("Name, apheresis site, mfg site, mfg preference, and effective date are required"); return
    }
    setError("")
    const payload = {
      name: form.name,
      aphSiteId: parseInt(form.aphSiteId),
      cryoSiteId: form.cryoSiteId ? parseInt(form.cryoSiteId) : null,
      cryoPreference: form.cryoPreference || null,
      mfgSiteId: parseInt(form.mfgSiteId),
      mfgPreference: form.mfgPreference,
      wdcSiteId: form.wdcSiteId ? parseInt(form.wdcSiteId) : null,
      infusionSiteId: form.infusionSiteId ? parseInt(form.infusionSiteId) : null,
      effectiveDate: form.effectiveDate,
      active: form.active,
    }
    const url = editing ? `/api/site-relationships/${editing.id}` : "/api/site-relationships"
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

  const prefBadge = (pref: string | null) => {
    if (!pref) return <span className="text-gray-300">-</span>
    const v = pref === "Primary" ? "success" : pref === "Secondary" ? "info" : "warning"
    return <Badge variant={v}>{pref}</Badge>
  }

  const columns: ColumnDef<SiteRelationship, unknown>[] = [
    { accessorKey: "name", header: "Name", cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
    { accessorKey: "aphSite.alias", header: "Aph Site", cell: ({ row }) => <code className="rounded bg-purple-50 px-2 py-0.5 text-xs font-mono text-purple-700">{row.original.aphSite?.alias || "-"}</code> },
    { accessorKey: "cryoSite.alias", header: "Cryo Site", cell: ({ row }) => row.original.cryoSite ? <code className="rounded bg-blue-50 px-2 py-0.5 text-xs font-mono text-blue-700">{row.original.cryoSite.alias}</code> : <span className="text-gray-300">-</span> },
    { accessorKey: "cryoPreference", header: "Cryo Pref", cell: ({ row }) => prefBadge(row.original.cryoPreference) },
    { accessorKey: "mfgSite.alias", header: "Mfg Site", cell: ({ row }) => <code className="rounded bg-amber-50 px-2 py-0.5 text-xs font-mono text-amber-700">{row.original.mfgSite?.alias || "-"}</code> },
    { accessorKey: "mfgPreference", header: "Mfg Pref", cell: ({ row }) => prefBadge(row.original.mfgPreference) },
    { accessorKey: "wdcSite.alias", header: "WDC Site", cell: ({ row }) => row.original.wdcSite ? <code className="rounded bg-gray-100 px-2 py-0.5 text-xs font-mono">{row.original.wdcSite.alias}</code> : <span className="text-gray-300">-</span> },
    { accessorKey: "infusionSite.alias", header: "Infusion Site", cell: ({ row }) => row.original.infusionSite ? <code className="rounded bg-green-50 px-2 py-0.5 text-xs font-mono text-green-700">{row.original.infusionSite.alias}</code> : <span className="text-gray-300">-</span> },
    { accessorKey: "effectiveDate", header: "Effective Date", cell: ({ row }) => <span className="text-sm text-gray-600">{formatDate(row.original.effectiveDate)}</span> },
    { accessorKey: "active", header: "Status", cell: ({ row }) => <Badge variant={row.original.active ? "success" : "secondary"}>{row.original.active ? "Active" : "Inactive"}</Badge> },
  ]

  return (
    <div>
      <PageHeader title="Site Relationships" description="Manage site routing and preferences" createLabel="New Relationship" onCreateClick={openCreate} />
      <DataTable columns={columns} data={data} searchPlaceholder="Search relationships..." showActiveOnly={showActiveOnly} onActiveFilterChange={setShowActiveOnly} exportFilename="site-relationships.csv" onRowClick={openEdit} />
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogHeader><DialogTitle>{editing ? "Edit Site Relationship" : "New Site Relationship"}</DialogTitle></DialogHeader>
        <DialogContent>
          <div className="space-y-4">
            <div>
              <Label>Relationship Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. BOS-APH -> MFG1" />
            </div>
            <div className="rounded-lg border border-purple-200 bg-purple-50/30 p-4 space-y-3">
              <h3 className="text-xs font-semibold text-purple-700 uppercase tracking-wider">Apheresis</h3>
              <div>
                <Label>Apheresis Site *</Label>
                <Select value={form.aphSiteId} onChange={e => setForm(f => ({ ...f, aphSiteId: e.target.value }))} options={sitesByType("Apheresis")} placeholder="Select apheresis site..." />
              </div>
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50/30 p-4 space-y-3">
              <h3 className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Cryopreservation</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Cryo Site</Label>
                  <Select value={form.cryoSiteId} onChange={e => setForm(f => ({ ...f, cryoSiteId: e.target.value }))} options={sitesByType("Cryopreservation")} placeholder="Select cryo site..." />
                </div>
                <div>
                  <Label>Cryo Preference</Label>
                  <Select value={form.cryoPreference} onChange={e => setForm(f => ({ ...f, cryoPreference: e.target.value }))} options={preferenceOptions} placeholder="Select..." />
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50/30 p-4 space-y-3">
              <h3 className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Manufacturing</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Manufacturing Site *</Label>
                  <Select value={form.mfgSiteId} onChange={e => setForm(f => ({ ...f, mfgSiteId: e.target.value }))} options={sitesByType("Manufacturing")} placeholder="Select mfg site..." />
                </div>
                <div>
                  <Label>Mfg Preference *</Label>
                  <Select value={form.mfgPreference} onChange={e => setForm(f => ({ ...f, mfgPreference: e.target.value }))} options={preferenceOptions} />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>WDC Site</Label>
                <Select value={form.wdcSiteId} onChange={e => setForm(f => ({ ...f, wdcSiteId: e.target.value }))} options={sitesByType("Distribution Center")} placeholder="Select WDC site..." />
              </div>
              <div>
                <Label>Infusion Site</Label>
                <Select value={form.infusionSiteId} onChange={e => setForm(f => ({ ...f, infusionSiteId: e.target.value }))} options={sitesByType("Infusion")} placeholder="Select infusion site..." />
              </div>
            </div>
            <div>
              <Label>Effective Date *</Label>
              <Input type="date" value={form.effectiveDate} onChange={e => setForm(f => ({ ...f, effectiveDate: e.target.value }))} />
            </div>
            <div className="flex items-center gap-2">
              <Label>Active</Label>
              <Switch checked={form.active} onCheckedChange={v => setForm(f => ({ ...f, active: v }))} />
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">{editing ? "Save Changes" : "Create Relationship"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
