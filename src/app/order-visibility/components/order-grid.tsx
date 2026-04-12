"use client"
import { useEffect, useState, useCallback, useMemo } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Select } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { ChevronDown, ChevronUp, ChevronsUpDown, Download, ExternalLink, Filter } from "lucide-react"
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

type SortKey = "order" | "status" | "mfgType" | "aphPickup" | "cryoType" | "cryoId" | "mfgId" | "fpRelease" | "fpDelivery" | "a2m" | "a2r" | "a2d"
type SortDir = "asc" | "desc"

function getMilestoneDate(order: Order, name: string): string {
  const ms = order.milestones?.find(m => m.milestoneName.toLowerCase().includes(name.toLowerCase()))
  if (!ms) return "—"
  return ms.actualDate ? formatDate(ms.actualDate) : formatDate(ms.plannedDate)
}

function getMilestoneDateRaw(order: Order, name: string): number {
  const ms = order.milestones?.find(m => m.milestoneName.toLowerCase().includes(name.toLowerCase()))
  if (!ms) return 0
  return new Date(ms.actualDate || ms.plannedDate).getTime()
}

function calcDaysBetween(order: Order, from: string, to: string): string {
  const fromMs = order.milestones?.find(m => m.milestoneName.toLowerCase().includes(from.toLowerCase()))
  const toMs = order.milestones?.find(m => m.milestoneName.toLowerCase().includes(to.toLowerCase()))
  if (!fromMs || !toMs) return "—"
  const d1 = new Date(fromMs.actualDate || fromMs.plannedDate)
  const d2 = new Date(toMs.actualDate || toMs.plannedDate)
  return String(Math.round((d2.getTime() - d1.getTime()) / 86400000))
}

function calcDaysBetweenRaw(order: Order, from: string, to: string): number {
  const fromMs = order.milestones?.find(m => m.milestoneName.toLowerCase().includes(from.toLowerCase()))
  const toMs = order.milestones?.find(m => m.milestoneName.toLowerCase().includes(to.toLowerCase()))
  if (!fromMs || !toMs) return 99999
  const d1 = new Date(fromMs.actualDate || fromMs.plannedDate)
  const d2 = new Date(toMs.actualDate || toMs.plannedDate)
  return Math.round((d2.getTime() - d1.getTime()) / 86400000)
}

export function OrderGrid() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filters, setFilters] = useState({
    status: "", therapyType: "", cryoType: "", country: "", mfgSiteId: "",
  })
  const [sortKey, setSortKey] = useState<SortKey>("mfgId")
  const [sortDir, setSortDir] = useState<SortDir>("asc")

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v) })
    const res = await fetch(`/api/orders?${params}`)
    setOrders(await res.json())
    setLoading(false)
  }, [filters])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc")
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ChevronsUpDown className="h-3 w-3 opacity-30" />
    return sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
  }

  const sortedOrders = useMemo(() => {
    const sorted = [...orders]
    const dir = sortDir === "asc" ? 1 : -1

    sorted.sort((a, b) => {
      switch (sortKey) {
        case "order": return dir * a.id.localeCompare(b.id)
        case "status": return dir * a.status.localeCompare(b.status)
        case "mfgType": return dir * ((a.mfgCapacity?.mfgType || "").localeCompare(b.mfgCapacity?.mfgType || ""))
        case "aphPickup": return dir * (getMilestoneDateRaw(a, "Apheresis Picked") - getMilestoneDateRaw(b, "Apheresis Picked"))
        case "cryoType": return dir * a.cryoType.localeCompare(b.cryoType)
        case "cryoId": return dir * ((a.cryoCapacity?.date || "").localeCompare(b.cryoCapacity?.date || ""))
        // Mfg ID sorts by Mfg date
        case "mfgId": return dir * (new Date(a.mfgCapacity?.date || 0).getTime() - new Date(b.mfgCapacity?.date || 0).getTime())
        case "fpRelease": return dir * (getMilestoneDateRaw(a, "FP Released") - getMilestoneDateRaw(b, "FP Released"))
        case "fpDelivery": return dir * (getMilestoneDateRaw(a, "FP Delivered") - getMilestoneDateRaw(b, "FP Delivered"))
        case "a2m": return dir * (calcDaysBetweenRaw(a, "Apheresis Picked", "Manufacturing Started") - calcDaysBetweenRaw(b, "Apheresis Picked", "Manufacturing Started"))
        case "a2r": return dir * (calcDaysBetweenRaw(a, "Apheresis Picked", "FP Released") - calcDaysBetweenRaw(b, "Apheresis Picked", "FP Released"))
        case "a2d": return dir * (calcDaysBetweenRaw(a, "Apheresis Picked", "FP Delivered") - calcDaysBetweenRaw(b, "Apheresis Picked", "FP Delivered"))
        default: return 0
      }
    })
    return sorted
  }, [orders, sortKey, sortDir])

  const colHeader = (label: string, key: SortKey, className?: string) => (
    <TableHead
      className={cn("text-xs font-semibold cursor-pointer select-none hover:text-gray-700", className)}
      onClick={() => handleSort(key)}
    >
      <div className="flex items-center gap-1">
        {label}
        <SortIcon col={key} />
      </div>
    </TableHead>
  )

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
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="font-mono text-xs">{orders.length} orders</Badge>
          {sortKey && (
            <span className="text-[10px] text-gray-400">
              Sorted by <span className="font-medium text-gray-600">{sortKey}</span> {sortDir === "asc" ? "↑" : "↓"}
            </span>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => exportToCSV(orders.map(o => ({
          orderId: o.id, status: o.status, product: o.product?.code, therapyType: o.therapyType,
          cryoType: o.cryoType, mfgSite: o.mfgSite?.name, plannedPdd: o.plannedPdd,
        })), "orders.csv")}>
          <Download className="h-3.5 w-3.5 mr-1.5" /> Export
        </Button>
      </div>

      {/* Order Table — scrollable */}
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur-sm">
              <TableRow className="bg-gray-50/95">
                {colHeader("Order", "order")}
                {colHeader("Status", "status")}
                {colHeader("Mfgtype", "mfgType")}
                {colHeader("Aph Pickup", "aphPickup")}
                {colHeader("Cryo Type", "cryoType")}
                {colHeader("Cryo ID", "cryoId")}
                {colHeader("Mfg ID", "mfgId")}
                {colHeader("FP Release", "fpRelease")}
                {colHeader("FP Delivery", "fpDelivery")}
                {colHeader("A2M", "a2m", "text-center")}
                {colHeader("A2R", "a2r", "text-center")}
                {colHeader("A2D", "a2d", "text-center")}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedOrders.map((order) => (
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
                    <div>
                      <span className="font-mono text-xs text-blue-600">{order.mfgCapacity?.name}</span>
                      <div className="text-[10px] text-gray-400">{order.mfgCapacity?.date ? formatDate(order.mfgCapacity.date) : ""}</div>
                    </div>
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
