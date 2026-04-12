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
}

interface CareProgram {
  id: number; name: string; therapyType: string; country: string | null
  productId: number; active: boolean; product: Product
  createdAt: string; updatedAt: string
}

const therapyTypeOptions = [
  { value: "Commercial", label: "Commercial" },
  { value: "Clinical", label: "Clinical" },
]

const countryOptions = [
  { value: "US", label: "United States" },
  { value: "UK", label: "United Kingdom" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
  { value: "JP", label: "Japan" },
  { value: "CA", label: "Canada" },
  { value: "AU", label: "Australia" },
  { value: "IT", label: "Italy" },
  { value: "ES", label: "Spain" },
  { value: "IL", label: "Israel" },
]

export default function CareProgramsPage() {
  const [data, setData] = useState<CareProgram[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [showActiveOnly, setShowActiveOnly] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<CareProgram | null>(null)
  const [form, setForm] = useState({
    therapyType: "Commercial", country: "US", productId: 0, active: true,
  })
  const [error, setError] = useState("")

  const fetchData = useCallback(async () => {
    const params = new URLSearchParams()
    if (showActiveOnly) params.set("active", "true")
    const res = await fetch(`/api/care-programs?${params}`)
    setData(await res.json())
  }, [showActiveOnly])

  const fetchProducts = useCallback(async () => {
    const res = await fetch("/api/products?active=true")
    setProducts(await res.json())
  }, [])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { fetchProducts() }, [fetchProducts])

  const openCreate = () => {
    setEditing(null)
    setForm({ therapyType: "Commercial", country: "US", productId: products[0]?.id || 0, active: true })
    setError("")
    setDialogOpen(true)
  }

  const openEdit = (cp: CareProgram) => {
    setEditing(cp)
    setForm({
      therapyType: cp.therapyType,
      country: cp.country || "",
      productId: cp.productId,
      active: cp.active,
    })
    setError("")
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.therapyType || !form.productId) {
      setError("Therapy type and product are required"); return
    }
    if (form.therapyType === "Commercial" && !form.country) {
      setError("Country is required for Commercial therapy type"); return
    }
    setError("")
    const payload = {
      ...form,
      country: form.therapyType === "Commercial" ? form.country : null,
    }
    const url = editing ? `/api/care-programs/${editing.id}` : "/api/care-programs"
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

  const columns: ColumnDef<CareProgram, unknown>[] = [
    { accessorKey: "name", header: "Care Program Name", cell: ({ row }) => (
      <span className="font-medium">{row.original.name}</span>
    )},
    { accessorKey: "therapyType", header: "Therapy Type", cell: ({ row }) => {
      const v = row.original.therapyType
      return <Badge variant={v === "Commercial" ? "info" : "purple"}>{v}</Badge>
    }},
    { accessorKey: "country", header: "Country", cell: ({ row }) => (
      <span className="text-gray-600">{row.original.country || "-"}</span>
    )},
    { accessorKey: "product.name", header: "Product", cell: ({ row }) => (
      <code className="rounded bg-gray-100 px-2 py-0.5 text-xs font-mono">{row.original.product?.name || "-"}</code>
    )},
    { accessorKey: "active", header: "Status", cell: ({ row }) => (
      <Badge variant={row.original.active ? "success" : "secondary"}>{row.original.active ? "Active" : "Inactive"}</Badge>
    )},
  ]

  const productOptions = products.map(p => ({ value: String(p.id), label: `${p.name} (${p.code})` }))

  return (
    <div>
      <PageHeader title="Care Programs" description="Manage therapy care program configurations" createLabel="New Care Program" onCreateClick={openCreate} />
      <DataTable columns={columns} data={data} searchPlaceholder="Search care programs..." showActiveOnly={showActiveOnly} onActiveFilterChange={setShowActiveOnly} exportFilename="care-programs.csv" onRowClick={openEdit} />
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogHeader><DialogTitle>{editing ? "Edit Care Program" : "New Care Program"}</DialogTitle></DialogHeader>
        <DialogContent>
          <div className="space-y-4">
            {editing && (
              <div>
                <Label>Care Program Name</Label>
                <Input value={editing.name} disabled className="bg-gray-50" />
                <p className="text-xs text-gray-400 mt-1">Name is auto-generated and read-only</p>
              </div>
            )}
            <div>
              <Label>Therapy Type *</Label>
              <Select
                value={form.therapyType}
                onChange={e => setForm(f => ({ ...f, therapyType: e.target.value, country: e.target.value === "Clinical" ? "" : f.country }))}
                options={therapyTypeOptions}
                disabled={!!editing}
                className={editing ? "bg-gray-50" : ""}
              />
              {editing && <p className="text-xs text-gray-400 mt-1">Therapy type cannot be changed after creation</p>}
            </div>
            {form.therapyType === "Commercial" && (
              <div>
                <Label>Country *</Label>
                <Select
                  value={form.country}
                  onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                  options={countryOptions}
                  placeholder="Select country..."
                  disabled={!!editing}
                  className={editing ? "bg-gray-50" : ""}
                />
                {editing && <p className="text-xs text-gray-400 mt-1">Country cannot be changed after creation</p>}
              </div>
            )}
            <div>
              <Label>Product *</Label>
              <Select
                value={String(form.productId)}
                onChange={e => setForm(f => ({ ...f, productId: parseInt(e.target.value) }))}
                options={productOptions}
                placeholder="Select product..."
                disabled={!!editing}
                className={editing ? "bg-gray-50" : ""}
              />
              {editing && <p className="text-xs text-gray-400 mt-1">Product cannot be changed after creation</p>}
            </div>
            <div className="flex items-center gap-2">
              <Label>Active</Label>
              <Switch checked={form.active} onCheckedChange={v => setForm(f => ({ ...f, active: v }))} />
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">{editing ? "Save Changes" : "Create Care Program"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
