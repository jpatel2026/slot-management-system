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

interface Product {
  id: number; name: string; code: string; mfgType: string; active: boolean
}

interface Gdlt {
  id: number; name: string; siteId: number; productId: number; mfgType: string
  exactLt: number | null; minLt: number | null; maxLt: number | null
  site: Account; product: Product
  createdAt: string; updatedAt: string
}

const mfgTypeOptions = [
  { value: "Fresh", label: "Fresh" },
  { value: "Frozen", label: "Frozen" },
  { value: "Fresh & Frozen", label: "Fresh & Frozen" },
]

export default function GdltPage() {
  const [data, setData] = useState<Gdlt[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Gdlt | null>(null)
  const [form, setForm] = useState({
    name: "", siteId: "", productId: "", mfgType: "Fresh",
    exactLt: "", minLt: "", maxLt: "",
  })
  const [error, setError] = useState("")

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/gdlt")
    setData(await res.json())
  }, [])

  const fetchLookups = useCallback(async () => {
    const [accRes, prodRes] = await Promise.all([
      fetch("/api/accounts?active=true"),
      fetch("/api/products?active=true"),
    ])
    setAccounts(await accRes.json())
    setProducts(await prodRes.json())
  }, [])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { fetchLookups() }, [fetchLookups])

  const openCreate = () => {
    setEditing(null)
    setForm({ name: "", siteId: "", productId: "", mfgType: "Fresh", exactLt: "", minLt: "", maxLt: "" })
    setError("")
    setDialogOpen(true)
  }

  const openEdit = (g: Gdlt) => {
    setEditing(g)
    setForm({
      name: g.name,
      siteId: String(g.siteId),
      productId: String(g.productId),
      mfgType: g.mfgType,
      exactLt: g.exactLt != null ? String(g.exactLt) : "",
      minLt: g.minLt != null ? String(g.minLt) : "",
      maxLt: g.maxLt != null ? String(g.maxLt) : "",
    })
    setError("")
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.siteId || !form.productId || !form.mfgType) {
      setError("Name, site, product, and mfg type are required"); return
    }
    const hasExact = form.exactLt !== ""
    const hasRange = form.minLt !== "" || form.maxLt !== ""
    if (!hasExact && !hasRange) {
      setError("Provide either an exact lead time or a min/max range"); return
    }
    if (hasRange && (form.minLt === "" || form.maxLt === "")) {
      setError("Both min and max lead times are required for range"); return
    }
    if (hasRange && parseInt(form.minLt) > parseInt(form.maxLt)) {
      setError("Min lead time cannot exceed max lead time"); return
    }
    setError("")
    const payload = {
      name: form.name,
      siteId: parseInt(form.siteId),
      productId: parseInt(form.productId),
      mfgType: form.mfgType,
      exactLt: form.exactLt ? parseInt(form.exactLt) : null,
      minLt: form.minLt ? parseInt(form.minLt) : null,
      maxLt: form.maxLt ? parseInt(form.maxLt) : null,
    }
    const url = editing ? `/api/gdlt/${editing.id}` : "/api/gdlt"
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

  const columns: ColumnDef<Gdlt, unknown>[] = [
    { accessorKey: "name", header: "GDLT Name", cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
    { accessorKey: "site.alias", header: "Site", cell: ({ row }) => (
      <code className="rounded bg-gray-100 px-2 py-0.5 text-xs font-mono">{row.original.site?.alias || "-"}</code>
    )},
    { accessorKey: "product.code", header: "Product", cell: ({ row }) => (
      <code className="rounded bg-blue-50 px-2 py-0.5 text-xs font-mono text-blue-700">{row.original.product?.code || "-"}</code>
    )},
    { accessorKey: "mfgType", header: "Mfgtype", cell: ({ row }) => {
      const v = row.original.mfgType
      const variant = v === "Fresh" ? "info" : v === "Frozen" ? "purple" : "secondary"
      return <Badge variant={variant}>{v}</Badge>
    }},
    { accessorKey: "exactLt", header: "Exact LT", cell: ({ row }) => {
      const v = row.original.exactLt
      return v != null
        ? <span className="inline-flex h-7 min-w-[2rem] items-center justify-center rounded-md bg-green-50 px-2 text-sm font-semibold text-green-700">{v}</span>
        : <span className="text-gray-300">-</span>
    }},
    { accessorKey: "minLt", header: "Min LT", cell: ({ row }) => {
      const v = row.original.minLt
      return v != null
        ? <span className="inline-flex h-7 min-w-[2rem] items-center justify-center rounded-md bg-yellow-50 px-2 text-sm font-semibold text-yellow-700">{v}</span>
        : <span className="text-gray-300">-</span>
    }},
    { accessorKey: "maxLt", header: "Max LT", cell: ({ row }) => {
      const v = row.original.maxLt
      return v != null
        ? <span className="inline-flex h-7 min-w-[2rem] items-center justify-center rounded-md bg-red-50 px-2 text-sm font-semibold text-red-700">{v}</span>
        : <span className="text-gray-300">-</span>
    }},
  ]

  const siteOptions = accounts.map(a => ({ value: String(a.id), label: `${a.name} (${a.alias})` }))
  const productOptions = products.map(p => ({ value: String(p.id), label: `${p.name} (${p.code})` }))

  return (
    <div>
      <PageHeader title="GDLT" description="Generic Default Lead Times for site-product combinations" createLabel="New GDLT" onCreateClick={openCreate} />
      <DataTable columns={columns} data={data} searchPlaceholder="Search GDLT..." showActiveFilter={false} exportFilename="gdlt.csv" onRowClick={openEdit} />
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogHeader><DialogTitle>{editing ? "Edit GDLT" : "New GDLT"}</DialogTitle></DialogHeader>
        <DialogContent>
          <div className="space-y-4">
            <div>
              <Label>GDLT Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. APH-BOS-Fresh-CA1" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Site *</Label>
                <Select value={form.siteId} onChange={e => setForm(f => ({ ...f, siteId: e.target.value }))} options={siteOptions} placeholder="Select site..." />
              </div>
              <div>
                <Label>Product *</Label>
                <Select value={form.productId} onChange={e => setForm(f => ({ ...f, productId: e.target.value }))} options={productOptions} placeholder="Select product..." />
              </div>
            </div>
            <div>
              <Label>Mfgtype *</Label>
              <Select value={form.mfgType} onChange={e => setForm(f => ({ ...f, mfgType: e.target.value }))} options={mfgTypeOptions} />
            </div>
            <div className="rounded-lg border border-gray-200 bg-gradient-to-r from-green-50/30 to-yellow-50/30 p-4 space-y-3">
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Lead Times (days)</h3>
              <div>
                <Label>Exact Lead Time</Label>
                <Input type="number" min="0" value={form.exactLt} onChange={e => setForm(f => ({ ...f, exactLt: e.target.value }))} placeholder="Exact days" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Min Lead Time</Label>
                  <Input type="number" min="0" value={form.minLt} onChange={e => setForm(f => ({ ...f, minLt: e.target.value }))} placeholder="Min days" />
                </div>
                <div>
                  <Label>Max Lead Time</Label>
                  <Input type="number" min="0" value={form.maxLt} onChange={e => setForm(f => ({ ...f, maxLt: e.target.value }))} placeholder="Max days" />
                </div>
              </div>
              <p className="text-xs text-gray-400">Provide either an exact lead time, or a min/max range.</p>
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">{editing ? "Save Changes" : "Create GDLT"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
