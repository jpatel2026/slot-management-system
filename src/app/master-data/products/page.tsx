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
import type { ColumnDef } from "@tanstack/react-table"

interface Product {
  id: number; name: string; code: string; mfgType: string; active: boolean
  createdAt: string; updatedAt: string
}

const mfgTypeOptions = [
  { value: "Fresh", label: "Fresh" },
  { value: "Frozen", label: "Frozen" },
  { value: "Fresh & Frozen", label: "Fresh & Frozen" },
]

export default function ProductsPage() {
  const [data, setData] = useState<Product[]>([])
  const [showActiveOnly, setShowActiveOnly] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState({ name: "", code: "", mfgType: "Fresh", active: true })
  const [error, setError] = useState("")

  const fetchData = useCallback(async () => {
    const params = new URLSearchParams()
    if (showActiveOnly) params.set("active", "true")
    const res = await fetch(`/api/products?${params}`)
    setData(await res.json())
  }, [showActiveOnly])

  useEffect(() => { fetchData() }, [fetchData])

  const openCreate = () => {
    setEditing(null)
    setForm({ name: "", code: "", mfgType: "Fresh", active: true })
    setError("")
    setDialogOpen(true)
  }

  const openEdit = (p: Product) => {
    setEditing(p)
    setForm({ name: p.name, code: p.code, mfgType: p.mfgType, active: p.active })
    setError("")
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.code || !form.mfgType) { setError("All fields are required"); return }
    setError("")
    const url = editing ? `/api/products/${editing.id}` : "/api/products"
    const method = editing ? "PUT" : "POST"
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
    if (!res.ok) {
      const err = await res.json()
      setError(err.error || "Save failed")
      return
    }
    setDialogOpen(false)
    fetchData()
  }

  const columns: ColumnDef<Product, unknown>[] = [
    { accessorKey: "name", header: "Product Name", cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
    { accessorKey: "code", header: "Product Code", cell: ({ row }) => <code className="rounded bg-gray-100 px-2 py-0.5 text-xs font-mono">{row.original.code}</code> },
    { accessorKey: "mfgType", header: "Mfgtype", cell: ({ row }) => {
      const v = row.original.mfgType
      const variant = v === "Fresh" ? "info" : v === "Frozen" ? "purple" : "secondary"
      return <Badge variant={variant}>{v}</Badge>
    }},
    { accessorKey: "active", header: "Status", cell: ({ row }) => (
      <Badge variant={row.original.active ? "success" : "secondary"}>{row.original.active ? "Active" : "Inactive"}</Badge>
    )},
  ]

  return (
    <div>
      <PageHeader title="Products" description="Manage therapy product master data" createLabel="New Product" onCreateClick={openCreate} />
      <DataTable columns={columns} data={data} searchPlaceholder="Search products..." showActiveOnly={showActiveOnly} onActiveFilterChange={setShowActiveOnly} exportFilename="products.csv" onRowClick={openEdit} />
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogHeader><DialogTitle>{editing ? "Edit Product" : "New Product"}</DialogTitle></DialogHeader>
        <DialogContent>
          <div className="space-y-4">
            <div>
              <Label>Product Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. CARTAsset1" />
            </div>
            <div>
              <Label>Product Code *</Label>
              <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="e.g. CA1" disabled={!!editing} className={editing ? "bg-gray-50" : ""} />
              {editing && <p className="text-xs text-gray-400 mt-1">Product code cannot be changed after creation</p>}
            </div>
            <div>
              <Label>Mfgtype *</Label>
              <Select value={form.mfgType} onChange={e => setForm(f => ({ ...f, mfgType: e.target.value }))} options={mfgTypeOptions} />
            </div>
            <div className="flex items-center gap-2">
              <Label>Active</Label>
              <Switch checked={form.active} onCheckedChange={v => setForm(f => ({ ...f, active: v }))} />
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">{editing ? "Save Changes" : "Create Product"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
