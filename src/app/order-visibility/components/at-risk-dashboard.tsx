"use client"
import { useEffect, useState, useCallback, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  CheckCircle2, AlertTriangle, Clock, Layers, Activity,
  TrendingUp, Bot, Zap, Shield, X, Search,
  ChevronLeft, ChevronRight, Download, Package2,
  BarChart2, ArrowRight
} from "lucide-react"
import { cn, formatDate } from "@/lib/utils"

// ── Types ─────────────────────────────────────────────────────────────────────
interface Site { id: number; name: string; siteType?: string }
interface Product { id: number; name: string; code: string }
interface Milestone {
  milestoneName: string; plannedDate: string; actualDate: string | null; sequentialLeg: number
}
interface Order {
  id: string; status: string
  country: string; therapyType: string; cryoType: string
  plannedPdd: string; originalPdd: string
  product: Product | null
  aphSite: Site | null; cryoSite: Site | null; mfgSite: Site | null
  wdcSite: Site | null; infusionSite: Site | null
  milestones: Milestone[]
}
type RiskLevel = "onTrack" | "atRisk" | "delayed" | "completed" | "excluded"
interface DrillConfig {
  title: string; subtitle: string; icon: React.ElementType
  filterFn: (o: Order) => boolean
  headerClass: string
  milestoneName?: string   // set → show that milestone's own planned/actual dates
}

// ── Pure helpers ──────────────────────────────────────────────────────────────
function getRiskLevel(order: Order): RiskLevel {
  if (order.status === "Cancelled" || order.status === "On Hold") return "excluded"
  const delivered = order.milestones?.find(m => m.milestoneName.toLowerCase().includes("deliver"))
  if (delivered?.actualDate) return "completed"
  const now = new Date()
  const unachieved = [...(order.milestones ?? [])]
    .filter(m => !m.actualDate).sort((a, b) => a.sequentialLeg - b.sequentialLeg)
  if (!unachieved.length) return "onTrack"
  if (new Date(unachieved[0].plannedDate) < now) return "delayed"
  const hasLateAchieved = (order.milestones ?? []).filter(m => m.actualDate)
    .some(m => new Date(m.actualDate!) > new Date(m.plannedDate))
  return hasLateAchieved ? "atRisk" : "onTrack"
}
function getActiveMilestone(order: Order): Milestone | null {
  return [...(order.milestones ?? [])].filter(m => !m.actualDate)
    .sort((a, b) => a.sequentialLeg - b.sequentialLeg)[0] ?? null
}
function isActive(o: Order) {
  const r = getRiskLevel(o); return r !== "excluded" && r !== "completed"
}
function getRiskDescription(order: Order, msName?: string): string {
  const now = new Date()
  if (msName) {
    const ms = order.milestones?.find(m => m.milestoneName === msName)
    if (!ms) return "—"
    if (ms.actualDate) {
      const d = Math.round((new Date(ms.actualDate).getTime() - new Date(ms.plannedDate).getTime()) / 86400000)
      if (d > 0) return `Completed ${d}d late`
      if (d < 0) return `Completed ${Math.abs(d)}d early`
      return "Completed on time"
    }
    const d = Math.round((now.getTime() - new Date(ms.plannedDate).getTime()) / 86400000)
    if (d > 0) return `${d}d past due`
    if (d === 0) return "Due today"
    return `Due in ${Math.abs(d)}d`
  }
  const r = getRiskLevel(order)
  const active = getActiveMilestone(order)
  if (r === "delayed" && active) {
    const d = Math.round((now.getTime() - new Date(active.plannedDate).getTime()) / 86400000)
    return `${d}d past due`
  }
  if (r === "atRisk") {
    const late = order.milestones?.filter(m => m.actualDate)
      .find(m => new Date(m.actualDate!) > new Date(m.plannedDate))
    if (late) {
      const d = Math.round((new Date(late.actualDate!).getTime() - new Date(late.plannedDate).getTime()) / 86400000)
      return `Prior milestone ${d}d late`
    }
    return "Prior delays detected"
  }
  if (r === "onTrack" && active) {
    const d = Math.round((new Date(active.plannedDate).getTime() - now.getTime()) / 86400000)
    return d > 0 ? `Due in ${d}d` : "Completing soon"
  }
  return "—"
}

// ── Milestone stats per name ──────────────────────────────────────────────────
function getMilestoneStats(orders: Order[], msName: string) {
  const now = new Date()
  let total = 0, completed = 0, onTrack = 0, atRisk = 0, delayed = 0
  for (const o of orders.filter(isActive)) {
    const ms = o.milestones?.find(m => m.milestoneName === msName)
    if (!ms) continue
    total++
    if (ms.actualDate) {
      completed++
      const late = new Date(ms.actualDate) > new Date(ms.plannedDate)
      if (late) { atRisk++ } else { onTrack++ }
    } else {
      if (new Date(ms.plannedDate) < now) { delayed++ } else { onTrack++ }
    }
  }
  return { total, completed, onTrack, atRisk, delayed }
}

// ── Milestone color palette ───────────────────────────────────────────────────
const MS_COLORS = [
  { bar: "#0176D3", bg: "#EBF4FF", text: "#014486", header: "bg-[#0176D3]" },
  { bar: "#4F46E5", bg: "#EEF2FF", text: "#3730A3", header: "bg-[#4F46E5]" },
  { bar: "#7C3AED", bg: "#F5F3FF", text: "#5B21B6", header: "bg-[#7C3AED]" },
  { bar: "#BE185D", bg: "#FCE7F3", text: "#9D174D", header: "bg-[#BE185D]" },
  { bar: "#B45309", bg: "#FEF3C7", text: "#92400E", header: "bg-[#B45309]" },
  { bar: "#C2410C", bg: "#FFF7ED", text: "#9A3412", header: "bg-[#C2410C]" },
  { bar: "#0F766E", bg: "#F0FDFA", text: "#115E59", header: "bg-[#0F766E]" },
  { bar: "#166534", bg: "#F0FDF4", text: "#14532D", header: "bg-[#166534]" },
  { bar: "#1D4ED8", bg: "#EFF6FF", text: "#1E40AF", header: "bg-[#1D4ED8]" },
  { bar: "#15803D", bg: "#F0FDF4", text: "#14532D", header: "bg-[#15803D]" },
]

// ── SF LSC–style Drill Modal ──────────────────────────────────────────────────
const ROWS_PER_PAGE = 10

function DrillModal({ config, allOrders, onClose }: {
  config: DrillConfig; allOrders: Order[]; onClose: () => void
}) {
  const [riskTab, setRiskTab] = useState<"all" | "onTrack" | "atRisk" | "delayed">("all")
  const [search, setSearch]   = useState("")
  const [page, setPage]       = useState(1)
  const Icon = config.icon

  // Base: orders matching the tile's filter
  const base = useMemo(() => {
    return allOrders.filter(isActive).filter(config.filterFn)
      .sort((a, b) => {
        const ord: Record<RiskLevel, number> = { delayed: 0, atRisk: 1, onTrack: 2, completed: 3, excluded: 4 }
        return (ord[getRiskLevel(a)] ?? 9) - (ord[getRiskLevel(b)] ?? 9) ||
          new Date(a.plannedPdd ?? 0).getTime() - new Date(b.plannedPdd ?? 0).getTime()
      })
  }, [allOrders, config])

  const counts = useMemo(() => ({
    all: base.length,
    onTrack: base.filter(o => getRiskLevel(o) === "onTrack").length,
    atRisk:  base.filter(o => getRiskLevel(o) === "atRisk").length,
    delayed: base.filter(o => getRiskLevel(o) === "delayed").length,
  }), [base])

  const filtered = useMemo(() => {
    let rows = base
    if (riskTab !== "all") rows = rows.filter(o => getRiskLevel(o) === riskTab)
    if (search.trim()) {
      const q = search.toLowerCase()
      rows = rows.filter(o =>
        o.id.toLowerCase().includes(q) ||
        (o.mfgSite?.name ?? "").toLowerCase().includes(q) ||
        (o.infusionSite?.name ?? "").toLowerCase().includes(q) ||
        (o.country ?? "").toLowerCase().includes(q) ||
        (o.product?.code ?? "").toLowerCase().includes(q) ||
        (getActiveMilestone(o)?.milestoneName ?? "").toLowerCase().includes(q)
      )
    }
    return rows
  }, [base, riskTab, search])

  const pageCount = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE))
  const pageRows  = filtered.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE)

  // Reset page when filters change
  useMemo(() => setPage(1), [riskTab, search])

  const riskBadge = (o: Order) => {
    const r = getRiskLevel(o)
    if (r === "delayed") return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#FDECEA] text-[#C23934] text-[10px] font-semibold px-2 py-0.5">
        <Clock className="h-2.5 w-2.5" /> Delayed
      </span>
    )
    if (r === "atRisk") return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF0C7] text-[#7E5400] text-[10px] font-semibold px-2 py-0.5">
        <AlertTriangle className="h-2.5 w-2.5" /> At Risk
      </span>
    )
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#EEF6EC] text-[#2E844A] text-[10px] font-semibold px-2 py-0.5">
        <CheckCircle2 className="h-2.5 w-2.5" /> On Track
      </span>
    )
  }

  const tabs: { key: typeof riskTab; label: string; dot: string }[] = [
    { key: "all",     label: "All Orders", dot: "bg-[#706E6B]" },
    { key: "onTrack", label: "On Track",   dot: "bg-[#2E844A]" },
    { key: "atRisk",  label: "At Risk",    dot: "bg-[#E07900]" },
    { key: "delayed", label: "Delayed",    dot: "bg-[#C23934]" },
  ]

  const exportCSV = () => {
    const cols = ["Order ID", "Risk", "Product", "Mfg Site", "Infusion Site", "Country",
      config.milestoneName ? "Milestone" : "Active Milestone",
      "Planned Date", "Actual Date", "Planned PDD", "Risk Description"]
    const rows = filtered.map(o => {
      const ms = config.milestoneName
        ? o.milestones?.find(m => m.milestoneName === config.milestoneName)
        : getActiveMilestone(o)
      return [o.id, getRiskLevel(o), o.product?.code ?? "", o.mfgSite?.name ?? "",
        o.infusionSite?.name ?? "", o.country,
        ms?.milestoneName ?? "", ms?.plannedDate?.slice(0,10) ?? "",
        ms?.actualDate?.slice(0,10) ?? "", o.plannedPdd?.slice(0,10) ?? "",
        getRiskDescription(o, config.milestoneName)]
    })
    const csv = [cols, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n")
    const a = document.createElement("a"); a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv)
    a.download = `${config.title.replace(/\s+/g, "_")}.csv`; a.click()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 px-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-[#181818]/60" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-50 w-full max-w-[1100px] max-h-[88vh] flex flex-col rounded-lg shadow-2xl overflow-hidden animate-fade-in">

        {/* ── SF Dark Header ──────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-5 py-4 bg-[#16213E] shrink-0">
          <div className="h-9 w-9 rounded bg-white/10 flex items-center justify-center shrink-0">
            <Icon className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-[15px] font-bold text-white leading-tight truncate">{config.title}</h2>
            <p className="text-[11px] text-white/55 mt-0.5">{config.subtitle}</p>
          </div>
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 rounded border border-white/20 px-3 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/10 hover:text-white transition-colors shrink-0"
          >
            <Download className="h-3.5 w-3.5" /> Export
          </button>
          <button
            onClick={onClose}
            className="rounded p-1.5 hover:bg-white/15 text-white/60 hover:text-white transition-colors shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Filter tabs + Search ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-[#DDDBDA] shrink-0 flex-wrap gap-2">
          <div className="flex items-center gap-0">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setRiskTab(t.key)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-sm border-b-2 transition-colors whitespace-nowrap",
                  riskTab === t.key
                    ? "border-[#0176D3] text-[#0176D3]"
                    : "border-transparent text-[#444444] hover:text-[#0176D3]"
                )}
              >
                <span className={cn("h-2 w-2 rounded-full", t.dot)} />
                {t.label}
                <span className={cn(
                  "ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                  riskTab === t.key ? "bg-[#EBF4FF] text-[#0176D3]" : "bg-[#F3F3F3] text-[#706E6B]"
                )}>
                  {counts[t.key]}
                </span>
              </button>
            ))}
          </div>
          <div className="relative shrink-0 w-52">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#706E6B]" />
            <Input
              placeholder="Search orders..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs w-full"
            />
          </div>
        </div>

        {/* ── Table (horizontally scrollable) ─────────────────────────────── */}
        <div className="flex-1 overflow-auto bg-white">
          <table className="w-full text-sm border-collapse min-w-[900px]">
            <thead className="sticky top-0 bg-white border-b-2 border-[#DDDBDA] z-10">
              <tr>
                {[
                  "ORDER NAME",
                  config.milestoneName ? "MILESTONE" : "ACTIVE MILESTONE",
                  "PRODUCT",
                  "MFG SITE",
                  "INFUSION SITE",
                  "COUNTRY",
                  "PLANNED DATE",
                  "ACTUAL DATE",
                  "STATUS",
                  "RISK DESCRIPTION",
                ].map(col => (
                  <th key={col} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-[#706E6B] whitespace-nowrap border-b border-[#DDDBDA]">
                    <span className="flex items-center gap-0.5">
                      {col}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((order, idx) => {
                const ms = config.milestoneName
                  ? order.milestones?.find(m => m.milestoneName === config.milestoneName) ?? null
                  : getActiveMilestone(order)
                const riskDesc = getRiskDescription(order, config.milestoneName)
                return (
                  <tr
                    key={order.id}
                    className={cn(
                      "border-b border-[#F3F3F3] transition-colors",
                      getRiskLevel(order) === "delayed" ? "bg-red-50/40 hover:bg-red-50/70" :
                      getRiskLevel(order) === "atRisk"  ? "bg-amber-50/40 hover:bg-amber-50/70" :
                      idx % 2 === 0 ? "bg-white hover:bg-[#EBF4FF]/60" : "bg-[#FAFAF9] hover:bg-[#EBF4FF]/60"
                    )}
                  >
                    {/* ORDER NAME */}
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-[12px] font-semibold text-[#0176D3] hover:underline cursor-pointer whitespace-nowrap">
                        {order.id.length > 20 ? order.id.slice(0, 20) + "…" : order.id}
                      </span>
                    </td>
                    {/* MILESTONE */}
                    <td className="px-4 py-2.5">
                      <span className="text-xs text-[#181818] whitespace-nowrap block max-w-[180px] truncate" title={ms?.milestoneName}>
                        {ms?.milestoneName ?? "—"}
                      </span>
                    </td>
                    {/* PRODUCT */}
                    <td className="px-4 py-2.5">
                      <span className="text-[11px] font-medium text-[#444444] whitespace-nowrap">{order.product?.code ?? "—"}</span>
                    </td>
                    {/* MFG SITE */}
                    <td className="px-4 py-2.5">
                      <span className="text-xs text-[#444444] whitespace-nowrap block max-w-[130px] truncate" title={order.mfgSite?.name}>
                        {order.mfgSite?.name ?? "—"}
                      </span>
                    </td>
                    {/* INFUSION SITE */}
                    <td className="px-4 py-2.5">
                      <span className="text-xs text-[#444444] whitespace-nowrap block max-w-[130px] truncate" title={order.infusionSite?.name}>
                        {order.infusionSite?.name ?? "—"}
                      </span>
                    </td>
                    {/* COUNTRY */}
                    <td className="px-4 py-2.5">
                      <span className="text-xs text-[#444444] whitespace-nowrap">{order.country ?? "—"}</span>
                    </td>
                    {/* PLANNED DATE */}
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span className="text-xs text-[#444444]">{ms?.plannedDate ? ms.plannedDate.slice(0, 10) : "—"}</span>
                    </td>
                    {/* ACTUAL DATE */}
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span className={cn("text-xs", ms?.actualDate ? "text-[#2E844A] font-medium" : "text-[#706E6B]")}>
                        {ms?.actualDate ? ms.actualDate.slice(0, 10) : "—"}
                      </span>
                    </td>
                    {/* STATUS */}
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {riskBadge(order)}
                    </td>
                    {/* RISK DESCRIPTION */}
                    <td className="px-4 py-2.5">
                      <span className={cn("text-xs whitespace-nowrap",
                        riskDesc.includes("past due") ? "text-[#C23934] font-medium" :
                        riskDesc.includes("late") ? "text-[#E07900] font-medium" :
                        riskDesc.includes("early") ? "text-[#2E844A] font-medium" :
                        "text-[#706E6B]"
                      )}>
                        {riskDesc}
                      </span>
                    </td>
                  </tr>
                )
              })}
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-sm text-[#706E6B]">
                    No orders match this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ───────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-2.5 border-t border-[#DDDBDA] bg-white shrink-0">
          <span className="text-xs text-[#706E6B]">
            Showing {filtered.length === 0 ? 0 : (page - 1) * ROWS_PER_PAGE + 1}–{Math.min(page * ROWS_PER_PAGE, filtered.length)} of {filtered.length} orders
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-0.5 px-2.5 py-1.5 rounded border border-[#DDDBDA] text-xs text-[#444444] hover:bg-[#F3F3F3] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Previous
            </button>
            {Array.from({ length: Math.min(5, pageCount) }, (_, i) => {
              const start = Math.max(1, Math.min(page - 2, pageCount - 4))
              const p = start + i
              if (p > pageCount) return null
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={cn(
                    "h-7 w-7 rounded border text-xs font-semibold transition-colors",
                    page === p
                      ? "bg-[#0176D3] border-[#0176D3] text-white"
                      : "border-[#DDDBDA] text-[#444444] hover:bg-[#EBF4FF] hover:border-[#0176D3]/30"
                  )}
                >
                  {p}
                </button>
              )
            })}
            <button
              onClick={() => setPage(p => Math.min(pageCount, p + 1))}
              disabled={page === pageCount}
              className="flex items-center gap-0.5 px-2.5 py-1.5 rounded border border-[#DDDBDA] text-xs text-[#444444] hover:bg-[#F3F3F3] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export function AtRiskDashboard() {
  const [orders, setOrders] = useState<Order[]>([])
  const [drillConfig, setDrillConfig] = useState<DrillConfig | null>(null)

  const fetchOrders = useCallback(async () => {
    const res = await fetch("/api/orders")
    setOrders(await res.json())
  }, [])
  useEffect(() => { fetchOrders() }, [fetchOrders])

  const classification = useMemo(() => {
    const active = orders.filter(isActive)
    return {
      total:   active.length,
      onTrack: active.filter(o => getRiskLevel(o) === "onTrack").length,
      atRisk:  active.filter(o => getRiskLevel(o) === "atRisk").length,
      delayed: active.filter(o => getRiskLevel(o) === "delayed").length,
    }
  }, [orders])

  // Derive unique milestones sorted by avg sequentialLeg
  const milestoneDefinitions = useMemo(() => {
    const map = new Map<string, { sum: number; n: number }>()
    for (const o of orders) {
      for (const m of o.milestones ?? []) {
        const e = map.get(m.milestoneName) ?? { sum: 0, n: 0 }
        map.set(m.milestoneName, { sum: e.sum + m.sequentialLeg, n: e.n + 1 })
      }
    }
    return [...map.entries()]
      .map(([name, { sum, n }]) => ({ name, avgLeg: sum / n }))
      .sort((a, b) => a.avgLeg - b.avgLeg)
  }, [orders])

  // Summary tiles
  const summaryTiles = [
    {
      label: "Total Active", value: classification.total, icon: Layers,
      gradient: "from-gray-700 to-gray-900",
      drill: { title: "All Active Orders", subtitle: "Order Lifecycle – Milestone Tracking",
        icon: Layers, filterFn: () => true,
        headerClass: "bg-gradient-to-r from-gray-700 to-gray-900" },
    },
    {
      label: "On Track", value: classification.onTrack, icon: CheckCircle2,
      gradient: "from-emerald-500 to-green-600",
      drill: { title: "On Track Orders", subtitle: "All milestones within schedule",
        icon: CheckCircle2, filterFn: (o: Order) => getRiskLevel(o) === "onTrack",
        headerClass: "bg-gradient-to-r from-emerald-500 to-green-600" },
    },
    {
      label: "At Risk", value: classification.atRisk, icon: AlertTriangle,
      gradient: "from-amber-400 to-orange-500",
      drill: { title: "At Risk Orders", subtitle: "Past milestone delays detected",
        icon: AlertTriangle, filterFn: (o: Order) => getRiskLevel(o) === "atRisk",
        headerClass: "bg-gradient-to-r from-amber-400 to-orange-500" },
    },
    {
      label: "Delayed", value: classification.delayed, icon: Clock,
      gradient: "from-red-500 to-rose-600",
      drill: { title: "Delayed Orders", subtitle: "Milestone planned date has passed",
        icon: Clock, filterFn: (o: Order) => getRiskLevel(o) === "delayed",
        headerClass: "bg-gradient-to-r from-red-500 to-rose-600" },
    },
  ]

  return (
    <div className="space-y-6">

      {/* ── Summary Tiles ─────────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-gradient-to-r from-gray-900 via-blue-950 to-purple-950 p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 border border-white/10">
            <Bot className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-xs font-medium text-blue-300">Risk Intelligence</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-green-500/20 px-2.5 py-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[10px] font-medium text-green-300">Monitoring</span>
          </div>
          <span className="text-[10px] text-white/40 ml-auto">Click tile to view orders</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          {summaryTiles.map(tile => (
            <button
              key={tile.label}
              onClick={() => setDrillConfig(tile.drill)}
              className={cn(
                "relative rounded-xl bg-gradient-to-br p-5 shadow-lg overflow-hidden text-left",
                "transition-all duration-150 hover:scale-[1.03] hover:shadow-xl active:scale-[0.98]",
                "ring-0 hover:ring-2 hover:ring-white/40",
                tile.gradient
              )}
            >
              <div className="absolute top-0 right-0 w-20 h-20 opacity-10">
                <tile.icon className="w-full h-full" />
              </div>
              <div className="relative">
                <div className="flex items-center gap-2 mb-1">
                  <tile.icon className="h-4 w-4 text-white" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-white/80">{tile.label}</span>
                </div>
                <p className="text-4xl font-bold text-white">{tile.value}</p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-[10px] text-white/60">
                    {tile.label === "Total Active" ? "Excl. Cancelled & On Hold" :
                     tile.label === "On Track" ? "All milestones on schedule" :
                     tile.label === "At Risk" ? "Past delays detected" : "Planned date passed"}
                  </p>
                  <ChevronRight className="h-3.5 w-3.5 text-white/50" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Patient Journey — Individual Milestone Tiles ───────────────────── */}
      <div className="rounded-xl border border-[#DDDBDA] bg-white shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-4 w-4 text-[#0176D3]" />
          <h3 className="font-semibold text-[#181818]">Patient Journey — Milestone Tracking</h3>
          <Badge variant="info" className="text-[10px] ml-1">Real-time</Badge>
          <span className="text-[10px] text-[#706E6B] ml-auto">Click any tile · scroll horizontally →</span>
        </div>

        {/* Horizontal scroll container */}
        <div className="overflow-x-auto pb-3 -mx-1 px-1">
          <div className="flex items-stretch gap-2" style={{ minWidth: "max-content" }}>
            {milestoneDefinitions.map((ms, idx) => {
              const col   = MS_COLORS[idx % MS_COLORS.length]
              const stats = getMilestoneStats(orders, ms.name)
              const completePct = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0

              return (
                <div key={ms.name} className="flex items-center gap-1.5">
                  <button
                    onClick={() => setDrillConfig({
                      title: ms.name,
                      subtitle: `Order Lifecycle – Milestone Tracking · ${stats.total} orders`,
                      icon: Activity,
                      milestoneName: ms.name,
                      filterFn: (o: Order) => (o.milestones ?? []).some(m => m.milestoneName === ms.name),
                      headerClass: col.header,
                    })}
                    className="flex flex-col rounded-lg border-2 overflow-hidden transition-all duration-150 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] text-left w-[170px] shrink-0"
                    style={{ borderColor: col.bar + "40", backgroundColor: col.bg }}
                  >
                    {/* Colored top bar */}
                    <div className="w-full h-1.5" style={{ backgroundColor: col.bar }} />

                    {/* Card body */}
                    <div className="px-3 py-2.5 flex-1">
                      <p className="text-[11px] font-bold leading-tight mb-2 line-clamp-2"
                         style={{ color: col.text }}>
                        {ms.name}
                      </p>
                      <p className="text-2xl font-bold mb-1" style={{ color: col.bar }}>
                        {stats.total}
                      </p>
                      <div className="space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1 text-[10px] text-[#2E844A]">
                            <CheckCircle2 className="h-2.5 w-2.5" /> On Track
                          </span>
                          <span className="text-[10px] font-semibold text-[#2E844A]">{stats.onTrack}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1 text-[10px] text-[#E07900]">
                            <AlertTriangle className="h-2.5 w-2.5" /> At Risk
                          </span>
                          <span className="text-[10px] font-semibold text-[#E07900]">{stats.atRisk}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1 text-[10px] text-[#C23934]">
                            <Clock className="h-2.5 w-2.5" /> Delayed
                          </span>
                          <span className="text-[10px] font-semibold text-[#C23934]">{stats.delayed}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1 text-[10px] text-[#706E6B]">
                            <CheckCircle2 className="h-2.5 w-2.5 opacity-50" /> Completed
                          </span>
                          <span className="text-[10px] font-semibold text-[#706E6B]">{stats.completed}</span>
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div className="mt-2 h-1 rounded-full bg-[#DDDBDA] overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${completePct}%`, backgroundColor: col.bar }} />
                      </div>
                      <p className="text-[9px] text-right mt-0.5" style={{ color: col.text }}>
                        {completePct}% done
                      </p>
                    </div>
                  </button>

                  {/* Arrow connector */}
                  {idx < milestoneDefinitions.length - 1 && (
                    <ArrowRight className="h-3.5 w-3.5 text-[#DDDBDA] shrink-0" />
                  )}
                </div>
              )
            })}
            {milestoneDefinitions.length === 0 && (
              <div className="text-sm text-[#706E6B] py-8 px-4">Loading milestone data…</div>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom panels ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Alerts */}
        <div className="rounded-xl border border-[#DDDBDA] bg-white shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-4 w-4 text-[#E07900]" />
            <h3 className="font-semibold text-[#181818]">Recent Alerts</h3>
            <Zap className="h-3 w-3 text-[#E07900] animate-pulse ml-auto" />
          </div>
          <div className="space-y-2">
            {orders.filter(o => { const r = getRiskLevel(o); return r === "delayed" || r === "atRisk" })
              .slice(0, 6).map(order => {
                const r = getRiskLevel(order)
                const ms = getActiveMilestone(order)
                if (!ms) return null
                return (
                  <button
                    key={order.id}
                    onClick={() => setDrillConfig({
                      title: r === "delayed" ? "Delayed Orders" : "At Risk Orders",
                      subtitle: r === "delayed" ? "Milestone planned date has passed" : "Past milestone delays detected",
                      icon: r === "delayed" ? Clock : AlertTriangle,
                      filterFn: (o: Order) => getRiskLevel(o) === r,
                      headerClass: r === "delayed" ? "bg-gradient-to-r from-red-500 to-rose-600" : "bg-gradient-to-r from-amber-400 to-orange-500",
                    })}
                    className={cn(
                      "flex items-center gap-3 rounded border p-2.5 w-full text-left transition-all hover:shadow-sm",
                      r === "delayed" ? "border-red-200 bg-red-50/60 hover:bg-red-50" : "border-amber-200 bg-amber-50/60 hover:bg-amber-50"
                    )}
                  >
                    <div className={cn("h-7 w-7 rounded-full flex items-center justify-center shrink-0",
                      r === "delayed" ? "bg-red-100" : "bg-amber-100")}>
                      {r === "delayed" ? <Clock className="h-3.5 w-3.5 text-[#C23934]" /> : <AlertTriangle className="h-3.5 w-3.5 text-[#E07900]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[#181818] truncate font-mono">{order.id.slice(0, 22)}</p>
                      <p className="text-[10px] text-[#706E6B] truncate">{r === "delayed" ? "Delayed" : "At Risk"}: {ms.milestoneName}</p>
                    </div>
                    <span className={cn("text-[10px] font-bold rounded-full px-2 py-0.5 shrink-0",
                      r === "delayed" ? "bg-[#FDECEA] text-[#C23934]" : "bg-[#FEF0C7] text-[#7E5400]")}>
                      {getRiskDescription(order)}
                    </span>
                  </button>
                )
              })}
            {orders.filter(o => { const r = getRiskLevel(o); return r === "delayed" || r === "atRisk" }).length === 0 && (
              <div className="text-center py-8 text-[#706E6B] text-sm">No alerts. All systems nominal.</div>
            )}
          </div>
        </div>

        {/* Lead-Time Performance */}
        <div className="rounded-xl border border-[#DDDBDA] bg-white shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-[#0176D3]" />
            <h3 className="font-semibold text-[#181818]">Lead-Time Performance</h3>
          </div>
          <div className="space-y-4">
            {[
              { label: "A2M (Aph → Mfg)",     target: 5,  color: "#0176D3" },
              { label: "A2R (Aph → Release)",  target: 25, color: "#7C3AED" },
              { label: "A2D (Aph → Delivery)", target: 30, color: "#2E844A" },
            ].map(m => (
              <div key={m.label} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[#181818]">{m.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#706E6B]">Target: {m.target}d</span>
                    <span className="text-sm font-semibold text-[#706E6B]">—</span>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-[#F3F3F3]">
                  <div className="h-full rounded-full" style={{ width: "0%", backgroundColor: m.color }} />
                </div>
              </div>
            ))}
            <p className="text-xs text-[#706E6B] text-center pt-2 border-t border-[#F3F3F3]">
              Performance data populates as orders complete milestones
            </p>
          </div>
        </div>
      </div>

      {/* Drill modal */}
      {drillConfig && (
        <DrillModal config={drillConfig} allOrders={orders} onClose={() => setDrillConfig(null)} />
      )}
    </div>
  )
}
