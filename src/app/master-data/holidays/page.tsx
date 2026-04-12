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
import { Checkbox } from "@/components/ui/checkbox"
import { formatDate } from "@/lib/utils"
import type { ColumnDef } from "@tanstack/react-table"

interface Account {
  id: number; name: string; siteId: string; alias: string; siteType: string; active: boolean
}

interface Holiday {
  id: number; name: string; date: string; accountId: number
  active: boolean; account: Account; createdAt: string; updatedAt: string
}

export default function HolidaysPage() {
  const [data, setData] = useState<Holiday[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [showActiveOnly, setShowActiveOnly] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Holiday | null>(null)
  const [form, setForm] = useState({
    name: "", date: "", accountIds: [] as number[], active: true,
  })
  const [error, setError] = useState("")

  const fetchData = useCallback(async () => {
    const params = new URLSearchParams()
    if (showActiveOnly) params.set("active", "true")
    const res = await fetch(`/api/holidays?${params}`)
    setData(await res.json())
  }, [showActiveOnly])

  const fetchAccounts = useCallback(async () => {
    const res = await fetch("/api/accounts?active=true")
    setAccounts(await res.json())
  }, [])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { fetchAccounts() }, [fetchAccounts])

  const openCreate = () => {
    setEditing(null)
    setForm({ name: "", date: "", accountIds: [], active: true })
    setError("")
    setDialogOpen(true)
  }

  const openEdit = (h: Holiday) => {
    setEditing(h)
    setForm({
      name: h.name,
      date: h.date ? h.date.split("T")[0] : "",
      accountIds: [h.accountId],
      active: h.active,
    })
    setError("")
    setDialogOpen(true)
  }

  const toggleSite = (siteId: number) => {
    setForm(f => ({
      ...f,
      accountIds: f.accountIds.includes(siteId)
        ? f.accountIds.filter(id => id !== siteId)
        : [...f.accountIds, siteId],
    }))
  }

  const handleSave = async () => {
    if (!form.name || !form.date || form.accountIds.length === 0) {
      setError("Name, date, and at least one site are required"); return
    }
    setError("")
    if (editing) {
      const payload = { name: form.name, date: form.date, accountId: form.accountIds[0], active: form.active }
      const res = await fetch(`/api/holidays/${editing.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      if (!res.ok) {
        const err = await res.json()
        setError(err.error || "Save failed")
        return
      }
    } else {
      const payload = { name: form.name, date: form.date, accountIds: form.accountIds, active: form.active }
      const res = await fetch("/api/holidays", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      if (!res.ok) {
        const err = await res.json()
        setError(err.error || "Save failed")
        return
      }
    }
    setDialogOpen(false)
    fetchData()
  }

  const columns: ColumnDef<Holiday, unknown>[] = [
    { accessorKey: "name", header: "Holiday Name", cell: ({ row }) => (
      <span className="font-medium">{row.original.name}</span>
    )},
    { accessorKey: "date", header: "Date", cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-100 to-red-100 text-xs font-bold text-orange-700">
          {new Date(row.original.date).getDate()}
        </span>
        <span className="text-sm text-gray-600">{formatDate(row.original.date)}</span>
      </div>
    )},
    { accessorKey: "account.name", header: "Site", cell: ({ row }) => (
      <code className="rounded bg-gray-100 px-2 py-0.5 text-xs font-mono">{row.original.account?.name || "-"}</code>
    )},
    { accessorKey: "active", header: "Status", cell: ({ row }) => (
      <Badge variant={row.original.active ? "success" : "secondary"}>{row.original.active ? "Active" : "Inactive"}</Badge>
    )},
  ]

  return (
    <div>
      <PageHeader title="Holidays" description="Manage site holidays for scheduling" createLabel="New Holiday" onCreateClick={openCreate} />
      <DataTable columns={columns} data={data} searchPlaceholder="Search holidays..." showActiveOnly={showActiveOnly} onActiveFilterChange={setShowActiveOnly} exportFilename="holidays.csv" onRowClick={openEdit} />
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogHeader><DialogTitle>{editing ? "Edit Holiday" : "New Holiday"}</DialogTitle></DialogHeader>
        <DialogContent>
          <div className="space-y-4">
            <div>
              <Label>Holiday Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Christmas Day" />
            </div>
            <div>
              <Label>Date *</Label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            {editing ? (
              <div>
                <Label>Site *</Label>
                <Select
                  value={String(form.accountIds[0] || "")}
                  onChange={e => setForm(f => ({ ...f, accountIds: [parseInt(e.target.value)] }))}
                  options={accounts.map(a => ({ value: String(a.id), label: `${a.name} (${a.alias})` }))}
                  placeholder="Select site..."
                />
              </div>
            ) : (
              <div>
                <Label>Sites * <span className="text-xs text-gray-400 font-normal">(select one or more)</span></Label>
                <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white p-3 space-y-2 mt-1">
                  {accounts.map(a => (
                    <div key={a.id} className="flex items-center gap-2">
                      <Checkbox checked={form.accountIds.includes(a.id)} onCheckedChange={() => toggleSite(a.id)} />
                      <span className="text-sm">{a.name}</span>
                      <Badge variant="secondary" className="text-[10px]">{a.siteType}</Badge>
                    </div>
                  ))}
                  {accounts.length === 0 && <p className="text-xs text-gray-400">No active sites found</p>}
                </div>
                {form.accountIds.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">{form.accountIds.length} site(s) selected</p>
                )}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Label>Active</Label>
              <Switch checked={form.active} onCheckedChange={v => setForm(f => ({ ...f, active: v }))} />
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">{editing ? "Save Changes" : "Create Holiday"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
