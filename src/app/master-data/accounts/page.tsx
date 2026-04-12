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
import { Textarea } from "@/components/ui/textarea"
import type { ColumnDef } from "@tanstack/react-table"

interface Account {
  id: number; name: string; siteId: string; alias: string; siteType: string
  address: string; contactName: string; contactEmail: string; contactPhone: string
  mfgType: string | null; active: boolean; createdAt: string; updatedAt: string
}

const siteTypeOptions = [
  { value: "Treatment", label: "Treatment" },
  { value: "Apheresis", label: "Apheresis" },
  { value: "Cryopreservation", label: "Cryopreservation" },
  { value: "Manufacturing", label: "Manufacturing" },
  { value: "Infusion", label: "Infusion" },
  { value: "Courier", label: "Courier" },
  { value: "Distribution Center", label: "Distribution Center" },
]

const mfgTypeOptions = [
  { value: "Fresh", label: "Fresh" },
  { value: "Frozen", label: "Frozen" },
  { value: "Fresh & Frozen", label: "Fresh & Frozen" },
]

const siteTypeBadgeColor: Record<string, "info" | "purple" | "success" | "warning" | "secondary" | "destructive"> = {
  Treatment: "info",
  Apheresis: "purple",
  Cryopreservation: "info",
  Manufacturing: "warning",
  Infusion: "success",
  Courier: "secondary",
  "Distribution Center": "secondary",
}

export default function AccountsPage() {
  const [data, setData] = useState<Account[]>([])
  const [showActiveOnly, setShowActiveOnly] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Account | null>(null)
  const [form, setForm] = useState({
    name: "", siteId: "", alias: "", siteType: "Treatment",
    address: "", contactName: "", contactEmail: "", contactPhone: "",
    mfgType: "", active: true,
  })
  const [error, setError] = useState("")

  const fetchData = useCallback(async () => {
    const params = new URLSearchParams()
    if (showActiveOnly) params.set("active", "true")
    const res = await fetch(`/api/accounts?${params}`)
    setData(await res.json())
  }, [showActiveOnly])

  useEffect(() => { fetchData() }, [fetchData])

  const openCreate = () => {
    setEditing(null)
    setForm({ name: "", siteId: "", alias: "", siteType: "Treatment", address: "", contactName: "", contactEmail: "", contactPhone: "", mfgType: "", active: true })
    setError("")
    setDialogOpen(true)
  }

  const openEdit = (a: Account) => {
    setEditing(a)
    setForm({
      name: a.name, siteId: a.siteId, alias: a.alias, siteType: a.siteType,
      address: a.address, contactName: a.contactName, contactEmail: a.contactEmail,
      contactPhone: a.contactPhone, mfgType: a.mfgType || "", active: a.active,
    })
    setError("")
    setDialogOpen(true)
  }

  const showMfgType = form.siteType === "Apheresis" || form.siteType === "Manufacturing"

  const handleSave = async () => {
    if (!form.name || !form.siteId || !form.alias || !form.siteType) {
      setError("Name, Site ID, Alias, and Site Type are required"); return
    }
    setError("")
    const payload = {
      ...form,
      mfgType: showMfgType ? form.mfgType || null : null,
    }
    const url = editing ? `/api/accounts/${editing.id}` : "/api/accounts"
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

  const columns: ColumnDef<Account, unknown>[] = [
    { accessorKey: "name", header: "Site Name", cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
    { accessorKey: "siteId", header: "Site ID", cell: ({ row }) => <code className="rounded bg-gray-100 px-2 py-0.5 text-xs font-mono">{row.original.siteId}</code> },
    { accessorKey: "alias", header: "Alias", cell: ({ row }) => <span className="text-gray-600">{row.original.alias}</span> },
    { accessorKey: "siteType", header: "Site Type", cell: ({ row }) => {
      const v = row.original.siteType
      return <Badge variant={siteTypeBadgeColor[v] || "secondary"}>{v}</Badge>
    }},
    { accessorKey: "mfgType", header: "Mfgtype", cell: ({ row }) => {
      const v = row.original.mfgType
      if (!v) return <span className="text-gray-300">-</span>
      const variant = v === "Fresh" ? "info" : v === "Frozen" ? "purple" : "secondary"
      return <Badge variant={variant}>{v}</Badge>
    }},
    { accessorKey: "active", header: "Status", cell: ({ row }) => (
      <Badge variant={row.original.active ? "success" : "secondary"}>{row.original.active ? "Active" : "Inactive"}</Badge>
    )},
  ]

  return (
    <div>
      <PageHeader title="Sites" description="Manage site and account master data" createLabel="New Site" onCreateClick={openCreate} />
      <DataTable columns={columns} data={data} searchPlaceholder="Search sites..." showActiveOnly={showActiveOnly} onActiveFilterChange={setShowActiveOnly} exportFilename="accounts.csv" onRowClick={openEdit} />
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogHeader><DialogTitle>{editing ? "Edit Site" : "New Site"}</DialogTitle></DialogHeader>
        <DialogContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Site Name *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Boston Apheresis Center" />
              </div>
              <div>
                <Label>Site ID *</Label>
                <Input value={form.siteId} onChange={e => setForm(f => ({ ...f, siteId: e.target.value }))} placeholder="e.g. APH-001" disabled={!!editing} className={editing ? "bg-gray-50" : ""} />
                {editing && <p className="text-xs text-gray-400 mt-1">Site ID cannot be changed</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Alias *</Label>
                <Input value={form.alias} onChange={e => setForm(f => ({ ...f, alias: e.target.value }))} placeholder="e.g. BOS-APH" />
              </div>
              <div>
                <Label>Site Type *</Label>
                <Select value={form.siteType} onChange={e => setForm(f => ({ ...f, siteType: e.target.value }))} options={siteTypeOptions} disabled={!!editing} className={editing ? "bg-gray-50" : ""} />
                {editing && <p className="text-xs text-gray-400 mt-1">Site type cannot be changed</p>}
              </div>
            </div>
            <div>
              <Label>Address</Label>
              <Textarea value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Full site address" rows={2} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Contact Name</Label>
                <Input value={form.contactName} onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))} placeholder="Contact name" />
              </div>
              <div>
                <Label>Contact Email</Label>
                <Input type="email" value={form.contactEmail} onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))} placeholder="email@site.com" />
              </div>
              <div>
                <Label>Contact Phone</Label>
                <Input value={form.contactPhone} onChange={e => setForm(f => ({ ...f, contactPhone: e.target.value }))} placeholder="+1-555-0100" />
              </div>
            </div>
            {showMfgType && (
              <div>
                <Label>Mfgtype</Label>
                <Select value={form.mfgType} onChange={e => setForm(f => ({ ...f, mfgType: e.target.value }))} options={mfgTypeOptions} placeholder="Select mfg type..." />
              </div>
            )}
            <div className="flex items-center gap-2">
              <Label>Active</Label>
              <Switch checked={form.active} onCheckedChange={v => setForm(f => ({ ...f, active: v }))} />
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">{editing ? "Save Changes" : "Create Site"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
