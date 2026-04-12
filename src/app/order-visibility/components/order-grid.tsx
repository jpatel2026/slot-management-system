"use client"
import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Select } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { ChevronDown, ChevronUp, Download, ExternalLink, Filter } from "lucide-react"
import { cn, formatDate, exportToCSV } from "@/lib/utils"

interface Order {
  id: string; status: string; country: string; therapyType: string; cryoType: string
  product: { name: string; code: string; mfgType: string }
  mfgSite: { name: string; alias: string }
  cryoSite?: { name: string } | null
  mfgCapacity: { name: string; date: string; mfgType: string | null }
  cryoCapacity?: { name: string; date: string } | null
  plannedPdd: string
  milestones: Array<{ milestoneName: string; plannedDate: string; actualDate: string | null; sequentialLeg: number }>
}

const statusColors: Record<string, string> = {
  "Booked": "info",
  "In Progress": "warning",
  "Completed": "success",
  "Cancelled": "secondary",
  "On Hold": "destructive",
}

export function OrderGrid() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filters, setFilters] = useState({
    status: "", therapyType: "", cryoType: "", country: "", mfgSiteId: "",
  })

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v) })
    const res = await fetch(`/api/orders?${params}`)
    setOrders(await res.json())
    setLoading(false)
  }, [filters])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  const getMilestoneDate = (order: Order, name: string): string => {
    const ms = order.milestones?.find(m => m.milestoneName.toLowerCase().includes(name.toLowerCase()))
    if (!ms) return "—"
    return ms.actualDate ? formatDate(ms.actualDate) : formatDate(ms.plannedDate)
  }

  const calcDaysBetween = (order: Order, from: string, to: string): string => {
    const fromMs = order.milestones?.find(m => m.milestoneName.toLowerCase().includes(from.toLowerCase()))
    const toMs = order.milestones?.find(m => m.milestoneName.toLowerCase().includes(to.toLowerCase()))
    if (!fromMs || !toMs) return "—"
    const d1 = new Date(fromMs.actualDate || fromMs.plannedDate)
    const d2 = new Date(toMs.actualDate || toMs.plannedDate)
    return String(Math.round((d2.getTime() - d1.getTime()) / 86400000))
  }

  return (
    <div className="space-y-4">
      {/* Filter Accordion */}
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <button
          onClick={() => setFiltersOpen(!filtersOpen)}
          className="flex items-center gap-2 w-full px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
        >
          <Filter className="h-4 w-4 text-gray-400" />
          Filters
          <Badge variant="secondary" className="ml-2 text-[10px]">{Object.values(filters).filter(Boolean).length} active</Badge>
          {filtersOpen ? <ChevronUp className="ml-auto h-4 w-4" /> : <ChevronDown className="ml-auto h-4 w-4" />}
        </button>
        {filtersOpen && (
          <div className="px-5 pb-4 grid grid-cols-2 md:grid-cols-5 gap-3 border-t pt-3">
            <div>
              <Label className="text-xs text-gray-500">Status</Label>
              <Select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
                options={["Booked", "In Progress", "Completed", "Cancelled", "On Hold"].map(s => ({ value: s, label: s }))}
                placeholder="All" />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Therapy Type</Label>
              <Select value={filters.therapyType} onChange={e => setFilters(f => ({ ...f, therapyType: e.target.value }))}
                options={[{ value: "Commercial", label: "Commercial" }, { value: "Clinical", label: "Clinical" }]}
                placeholder="All" />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Cryo Type</Label>
              <Select value={filters.cryoType} onChange={e => setFilters(f => ({ ...f, cryoType: e.target.value }))}
                options={[{ value: "Central", label: "Central" }, { value: "Local", label: "Local" }, { value: "Manufacturing", label: "Manufacturing" }]}
                placeholder="All" />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Country</Label>
              <Input value={filters.country} onChange={e => setFilters(f => ({ ...f, country: e.target.value }))}
                placeholder="e.g. US" className="h-9" />
            </div>
            <div className="flex items-end">
              <Button variant="outline" size="sm" onClick={() => setFilters({ status: "", therapyType: "", cryoType: "", country: "", mfgSiteId: "" })}>
                Clear All
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Results bar */}
      <div className="flex items-center justify-between">
        <Badge variant="secondary" className="font-mono text-xs">{orders.length} orders</Badge>
        <Button variant="outline" size="sm" onClick={() => exportToCSV(orders.map(o => ({
          orderId: o.id, status: o.status, product: o.product?.code, therapyType: o.therapyType,
          cryoType: o.cryoType, mfgSite: o.mfgSite?.name, plannedPdd: o.plannedPdd,
        })), "orders.csv")}>
          <Download className="h-3.5 w-3.5 mr-1.5" /> Export
        </Button>
      </div>

      {/* Order Table */}
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/80">
                <TableHead className="text-xs font-semibold">Order</TableHead>
                <TableHead className="text-xs font-semibold">Status</TableHead>
                <TableHead className="text-xs font-semibold">Mfgtype</TableHead>
                <TableHead className="text-xs font-semibold">Aph Pickup</TableHead>
                <TableHead className="text-xs font-semibold">Cryo Type</TableHead>
                <TableHead className="text-xs font-semibold">Cryo ID</TableHead>
                <TableHead className="text-xs font-semibold">Mfg ID</TableHead>
                <TableHead className="text-xs font-semibold">FP Release</TableHead>
                <TableHead className="text-xs font-semibold">FP Delivery</TableHead>
                <TableHead className="text-xs font-semibold text-center">A2M</TableHead>
                <TableHead className="text-xs font-semibold text-center">A2R</TableHead>
                <TableHead className="text-xs font-semibold text-center">A2D</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id} className="animate-fade-in hover:bg-blue-50/30">
                  <TableCell>
                    <Link href={`/master-data/orders/${order.id}`} className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center gap-1">
                      {order.id.slice(0, 12)}...
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusColors[order.status] as "info" | "warning" | "success" | "secondary" | "destructive"}>
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {order.mfgCapacity?.mfgType && (
                      <Badge variant={order.mfgCapacity.mfgType === "Fresh" ? "info" : "purple"} className="text-[10px]">
                        {order.mfgCapacity.mfgType}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{getMilestoneDate(order, "Apheresis Picked Up")}</TableCell>
                  <TableCell><span className="text-sm">{order.cryoType}</span></TableCell>
                  <TableCell>
                    {order.cryoCapacity ? (
                      <span className="font-mono text-xs text-purple-600">{order.cryoCapacity.name}</span>
                    ) : "—"}
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs text-blue-600">{order.mfgCapacity?.name}</span>
                  </TableCell>
                  <TableCell className="text-sm">{getMilestoneDate(order, "FP Released")}</TableCell>
                  <TableCell className="text-sm">{getMilestoneDate(order, "FP Delivered")}</TableCell>
                  <TableCell className="text-center font-mono text-sm">{calcDaysBetween(order, "Apheresis Picked", "Manufacturing Started")}</TableCell>
                  <TableCell className="text-center font-mono text-sm">{calcDaysBetween(order, "Apheresis Picked", "FP Released")}</TableCell>
                  <TableCell className="text-center font-mono text-sm">{calcDaysBetween(order, "Apheresis Picked", "FP Delivered")}</TableCell>
                </TableRow>
              ))}
              {orders.length === 0 && !loading && (
                <TableRow><TableCell colSpan={12} className="text-center py-12 text-gray-400">No orders found. Orders are created via TCP booking.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
