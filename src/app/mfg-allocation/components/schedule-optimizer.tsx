"use client"
import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import {
  Zap, ArrowRight, Building2, Layers, GripVertical, Save,
  Play, Loader2, CheckCircle2, AlertTriangle, ArrowLeftRight,
  ChevronRight, BarChart3, Target, Calendar
} from "lucide-react"
import { cn, formatDate } from "@/lib/utils"

interface Site { id: number; name: string; alias: string }
interface AllocationFilters { selectedSite: string; selectedProduct: string; dateFrom: string; dateTo: string }

interface Move {
  orderId: string; orderName: string
  fromSlotId: number; fromSlotName: string; fromDate: string
  toSlotId: number; toSlotName: string; toDate: string
  fromSiteId?: number; fromSiteName?: string
  toSiteId?: number; toSiteName?: string
}

interface OptimizerResult {
  moves: Move[]
  summary: { totalOrders: number; rescheduled: number; unchanged: number }
  utilizationBefore: Record<number, { siteId: number; siteName: string; booked: number; base: number; pct: number }>
  utilizationAfter: Record<number, { siteId: number; siteName: string; booked: number; base: number; pct: number }>
  applied?: { applied: number; errors: string[] }
}

const FACTORS = ["Apheresis Completed", "Aph Received at Manufacturing", "Original PDD"] as const
type Factor = typeof FACTORS[number]

type Mode = null | "SingleSite" | "MultiSite"
type SubMode = "FIFO" | "DayByDay"

export function ScheduleOptimizer({ filters }: { filters: AllocationFilters }) {
  const [mode, setMode] = useState<Mode>(null)
  const [subMode, setSubMode] = useState<SubMode>("FIFO")
  const [sites, setSites] = useState<Site[]>([])
  const [selectedSites, setSelectedSites] = useState<number[]>([])
  const [products, setProducts] = useState<{ code: string; name: string }[]>([])
  const [selectedProduct, setSelectedProduct] = useState(filters.selectedProduct || "")

  // Date range: today+2 to max 90 days out
  const today = new Date()
  const minDate = new Date(today); minDate.setDate(today.getDate() + 2)
  const maxDate = new Date(today); maxDate.setDate(today.getDate() + 90)
  const [dateFrom, setDateFrom] = useState(minDate.toISOString().split("T")[0])
  const [dateTo, setDateTo] = useState(maxDate.toISOString().split("T")[0])

  // Priority factors
  const [factor1, setFactor1] = useState<Factor>("Apheresis Completed")
  const [factor2, setFactor2] = useState<Factor>("Aph Received at Manufacturing")
  const [factor3, setFactor3] = useState<Factor>("Original PDD")
  const [configSaved, setConfigSaved] = useState(false)

  // Results
  const [result, setResult] = useState<OptimizerResult | null>(null)
  const [running, setRunning] = useState(false)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch("/api/accounts?siteType=Manufacturing&active=true").then(r => r.json()).then(setSites)
    fetch("/api/products?active=true").then(r => r.json()).then(setProducts)
  }, [])

  // Auto-select site from filters
  useEffect(() => {
    if (filters.selectedSite && mode === "SingleSite") {
      setSelectedSites([parseInt(filters.selectedSite)])
    }
  }, [filters.selectedSite, mode])

  useEffect(() => { if (filters.selectedProduct) setSelectedProduct(filters.selectedProduct) }, [filters.selectedProduct])

  // Load saved priority config when site+product changes
  const loadConfig = useCallback(async () => {
    if (selectedSites.length === 1 && selectedProduct) {
      const res = await fetch(`/api/optimizer-config?mfgSiteId=${selectedSites[0]}&productCode=${selectedProduct}`)
      const configs = await res.json()
      if (configs.length > 0) {
        setFactor1(configs[0].factor1)
        setFactor2(configs[0].factor2)
        setFactor3(configs[0].factor3)
      }
    }
  }, [selectedSites, selectedProduct])

  useEffect(() => { loadConfig() }, [loadConfig])

  const saveConfig = async () => {
    if (selectedSites.length !== 1 || !selectedProduct) return
    await fetch("/api/optimizer-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mfgSiteId: selectedSites[0],
        productCode: selectedProduct,
        factor1, factor2, factor3,
      }),
    })
    setConfigSaved(true)
    setTimeout(() => setConfigSaved(false), 2000)
  }

  const handleRun = async () => {
    setRunning(true)
    setError("")
    setResult(null)
    try {
      const res = await fetch("/api/optimizer/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: mode === "MultiSite" ? "MultiSite" : subMode,
          siteIds: selectedSites,
          productCode: selectedProduct,
          dateFrom, dateTo,
          factors: [factor1, factor2, factor3],
        }),
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
      setResult(await res.json())
    } catch (e) {
      setError((e as Error).message)
    }
    setRunning(false)
  }

  const handleApply = async () => {
    if (!result) return
    setApplying(true)
    try {
      const res = await fetch("/api/optimizer/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: mode === "MultiSite" ? "MultiSite" : subMode,
          siteIds: selectedSites,
          productCode: selectedProduct,
          dateFrom, dateTo,
          factors: [factor1, factor2, factor3],
          apply: true,
        }),
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
      setResult(await res.json())
    } catch (e) {
      setError((e as Error).message)
    }
    setApplying(false)
  }

  const toggleSite = (siteId: number) => {
    setSelectedSites(prev =>
      prev.includes(siteId) ? prev.filter(id => id !== siteId) : [...prev, siteId]
    )
  }

  // ── Phase 1: Mode Selection ──
  if (!mode) {
    return (
      <div className="max-w-3xl mx-auto mt-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-100 px-4 py-1.5 mb-4">
            <Target className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-semibold text-blue-700">Schedule Optimizer</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Choose Optimization Mode</h2>
          <p className="text-gray-500 mt-1">Select how you want to rebalance manufacturing capacity</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button onClick={() => setMode("SingleSite")}
            className="group text-left rounded-2xl border-2 border-gray-200 bg-white p-8 shadow-sm transition-all hover:border-blue-400 hover:shadow-xl hover:-translate-y-1">
            <div className="rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 p-4 w-14 h-14 flex items-center justify-center mb-4 shadow-lg shadow-blue-500/20">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">Single-Site</h3>
            <p className="text-sm text-gray-500 mt-2 leading-relaxed">
              Optimize within one manufacturing site. Choose FIFO (across full horizon) or Day-by-Day prioritization.
            </p>
            <div className="flex items-center gap-2 mt-4 text-sm text-blue-600 font-medium">
              Select <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          <button onClick={() => setMode("MultiSite")}
            className="group text-left rounded-2xl border-2 border-gray-200 bg-white p-8 shadow-sm transition-all hover:border-purple-400 hover:shadow-xl hover:-translate-y-1">
            <div className="rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 p-4 w-14 h-14 flex items-center justify-center mb-4 shadow-lg shadow-purple-500/20">
              <Layers className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 group-hover:text-purple-600 transition-colors">Multi-Site</h3>
            <p className="text-sm text-gray-500 mt-2 leading-relaxed">
              Balance utilization across multiple sites. Level-load schedule to equalize capacity usage.
            </p>
            <div className="flex items-center gap-2 mt-4 text-sm text-purple-600 font-medium">
              Select <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        </div>
      </div>
    )
  }

  // ── Phase 3: Results ──
  if (result) {
    const isMulti = mode === "MultiSite"
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => { setResult(null); setMode(null) }}>
            &larr; New Optimization
          </Button>
          <Badge variant="info" className="text-xs">{mode === "MultiSite" ? "Multi-Site" : subMode}</Badge>
          {result.applied && <Badge variant="success" className="text-xs">Applied {result.applied.applied} moves</Badge>}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 p-5 text-white shadow-lg">
            <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Total Orders</span>
            <p className="text-3xl font-bold mt-1">{result.summary.totalOrders}</p>
          </div>
          <div className="rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 p-5 text-white shadow-lg">
            <span className="text-[10px] uppercase tracking-wider text-blue-200 font-semibold">Rescheduled</span>
            <p className="text-3xl font-bold mt-1">{result.summary.rescheduled}</p>
          </div>
          <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 p-5 text-white shadow-lg">
            <span className="text-[10px] uppercase tracking-wider text-emerald-200 font-semibold">Unchanged</span>
            <p className="text-3xl font-bold mt-1">{result.summary.unchanged}</p>
          </div>
        </div>

        {/* Utilization Before/After */}
        <div className="rounded-xl border bg-white shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-blue-500" /> Utilization Comparison
          </h3>
          <div className="space-y-3">
            {Object.values(result.utilizationBefore).map(before => {
              const after = result.utilizationAfter[before.siteId] || before
              return (
                <div key={before.siteId} className="flex items-center gap-4">
                  <span className="text-sm font-medium w-40 truncate">{before.siteName}</span>
                  <div className="flex-1 flex items-center gap-3">
                    {/* Before */}
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-[10px] text-gray-400 mb-0.5">
                        <span>Before</span><span className="font-bold text-gray-600">{before.pct}%</span>
                      </div>
                      <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full rounded-full bg-gray-400 transition-all" style={{ width: `${before.pct}%` }} />
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-300 shrink-0" />
                    {/* After */}
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-[10px] text-gray-400 mb-0.5">
                        <span>After</span><span className="font-bold" style={{ color: after.pct >= 80 ? "#22c55e" : "#f59e0b" }}>{after.pct}%</span>
                      </div>
                      <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${after.pct}%`, backgroundColor: after.pct >= 80 ? "#22c55e" : "#f59e0b" }} />
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Move Log */}
        {result.moves.length > 0 && (
          <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b bg-gray-50/80 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <ArrowLeftRight className="h-4 w-4 text-blue-500" /> Move Log
                <Badge variant="secondary" className="text-[10px]">{result.moves.length} moves</Badge>
              </h3>
              {!result.applied && (
                <Button onClick={handleApply} disabled={applying} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  {applying ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1.5" />}
                  Apply Changes
                </Button>
              )}
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-gray-50/95">
                  <TableRow>
                    <TableHead className="text-xs">Order</TableHead>
                    <TableHead className="text-xs">From Date</TableHead>
                    <TableHead className="text-xs">To Date</TableHead>
                    {isMulti && <TableHead className="text-xs">From Site</TableHead>}
                    {isMulti && <TableHead className="text-xs">To Site</TableHead>}
                    <TableHead className="text-xs">From Slot</TableHead>
                    <TableHead className="text-xs">To Slot</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.moves.map((m, i) => (
                    <TableRow key={i} className="animate-fade-in">
                      <TableCell className="font-mono text-xs text-blue-600">{m.orderName}...</TableCell>
                      <TableCell className="text-sm">{formatDate(m.fromDate)}</TableCell>
                      <TableCell className="text-sm font-medium text-green-700">{formatDate(m.toDate)}</TableCell>
                      {isMulti && <TableCell className="text-xs">{m.fromSiteName}</TableCell>}
                      {isMulti && <TableCell className="text-xs font-medium text-purple-700">{m.toSiteName}</TableCell>}
                      <TableCell className="font-mono text-[10px] text-gray-500">{m.fromSlotName}</TableCell>
                      <TableCell className="font-mono text-[10px] text-gray-500">{m.toSlotName}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {result.moves.length === 0 && (
          <div className="rounded-xl border bg-white p-12 text-center">
            <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">Schedule is already optimal — no moves needed.</p>
          </div>
        )}
      </div>
    )
  }

  // ── Phase 2: Configuration ──
  const canRun = selectedSites.length > 0 && selectedProduct && dateFrom && dateTo
  const isMulti = mode === "MultiSite"

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => setMode(null)}>&larr; Back</Button>
        <Badge variant={isMulti ? "purple" : "info"} className="text-xs gap-1">
          {isMulti ? <><Layers className="h-3 w-3" /> Multi-Site</> : <><Building2 className="h-3 w-3" /> Single-Site</>}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Configuration */}
        <div className="lg:col-span-2 space-y-5">
          {/* Sub-mode (Single-Site only) */}
          {!isMulti && (
            <div className="rounded-xl border bg-white shadow-sm p-5">
              <Label className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Optimization Strategy</Label>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <button onClick={() => setSubMode("FIFO")}
                  className={cn("rounded-xl border-2 p-4 text-left transition-all",
                    subMode === "FIFO" ? "border-blue-500 bg-blue-50 ring-1 ring-blue-200" : "border-gray-200 hover:border-blue-300")}>
                  <div className="font-semibold text-sm">{subMode === "FIFO" && "✓ "}Prioritize by FIFO</div>
                  <p className="text-xs text-gray-500 mt-1">Rank all orders across the entire date horizon, then fill slots from earliest to latest.</p>
                </button>
                <button onClick={() => setSubMode("DayByDay")}
                  className={cn("rounded-xl border-2 p-4 text-left transition-all",
                    subMode === "DayByDay" ? "border-blue-500 bg-blue-50 ring-1 ring-blue-200" : "border-gray-200 hover:border-blue-300")}>
                  <div className="font-semibold text-sm">{subMode === "DayByDay" && "✓ "}Prioritize Day-by-Day</div>
                  <p className="text-xs text-gray-500 mt-1">Process each day independently. Over-capacity days push orders to next day, under-capacity pulls from future.</p>
                </button>
              </div>
            </div>
          )}

          {/* Site Selection */}
          <div className="rounded-xl border bg-white shadow-sm p-5">
            <Label className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
              {isMulti ? "Select Manufacturing Sites" : "Manufacturing Site"}
            </Label>
            {isMulti ? (
              <div className="grid grid-cols-2 gap-2 mt-3">
                {sites.map(s => (
                  <label key={s.id} className={cn(
                    "flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-all",
                    selectedSites.includes(s.id) ? "border-purple-400 bg-purple-50" : "border-gray-200 hover:border-purple-200"
                  )}>
                    <Checkbox checked={selectedSites.includes(s.id)} onCheckedChange={() => toggleSite(s.id)} />
                    <div>
                      <div className="text-sm font-medium">{s.name}</div>
                      <div className="text-[10px] text-gray-400">{s.alias}</div>
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <Select value={selectedSites[0] ? String(selectedSites[0]) : ""} className="mt-2"
                onChange={e => setSelectedSites(e.target.value ? [parseInt(e.target.value)] : [])}
                options={sites.map(s => ({ value: String(s.id), label: `${s.name} (${s.alias})` }))}
                placeholder="Select site" />
            )}
          </div>

          {/* Product + Date Range */}
          <div className="rounded-xl border bg-white shadow-sm p-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs text-gray-500">Product</Label>
                <Select value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)}
                  options={products.map(p => ({ value: p.code, label: `${p.name} (${p.code})` }))}
                  placeholder="Select product" />
              </div>
              <div>
                <Label className="text-xs text-gray-500 flex items-center gap-1"><Calendar className="h-3 w-3" /> From (today+2)</Label>
                <Input type="date" value={dateFrom} min={minDate.toISOString().split("T")[0]}
                  max={maxDate.toISOString().split("T")[0]}
                  onChange={e => setDateFrom(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs text-gray-500 flex items-center gap-1"><Calendar className="h-3 w-3" /> To (max 90d)</Label>
                <Input type="date" value={dateTo} min={dateFrom}
                  max={maxDate.toISOString().split("T")[0]}
                  onChange={e => setDateTo(e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Priority Factors Panel */}
        <div className="rounded-xl border bg-white shadow-sm p-5 h-fit">
          <div className="flex items-center justify-between mb-4">
            <Label className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Priority Factors</Label>
            <Button variant="ghost" size="sm" onClick={saveConfig} disabled={selectedSites.length !== 1 || !selectedProduct}
              className="text-xs gap-1 h-7">
              {configSaved ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : <Save className="h-3 w-3" />}
              {configSaved ? "Saved!" : "Save Default"}
            </Button>
          </div>
          <p className="text-xs text-gray-400 mb-4">Drag to reorder. Earlier dates = higher priority.</p>

          <div className="space-y-3">
            {[
              { rank: 1, value: factor1, setter: setFactor1, color: "from-blue-500 to-blue-600" },
              { rank: 2, value: factor2, setter: setFactor2, color: "from-purple-500 to-purple-600" },
              { rank: 3, value: factor3, setter: setFactor3, color: "from-amber-500 to-amber-600" },
            ].map(({ rank, value, setter, color }) => (
              <div key={rank} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
                <div className={cn("rounded-lg bg-gradient-to-br text-white text-xs font-bold w-7 h-7 flex items-center justify-center shrink-0", color)}>
                  {rank}
                </div>
                <GripVertical className="h-4 w-4 text-gray-300 shrink-0" />
                <Select value={value} onChange={e => setter(e.target.value as Factor)}
                  options={FACTORS.map(f => ({ value: f, label: f }))} className="flex-1 text-sm" />
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t text-[10px] text-gray-400 space-y-1">
            <p>• Uses <strong>actual date</strong> if milestone is completed</p>
            <p>• Falls back to <strong>planned date</strong> otherwise</p>
            <p>• Ties resolved randomly</p>
          </div>
        </div>
      </div>

      {/* Run Button */}
      <div className="flex items-center gap-3">
        <Button onClick={handleRun} disabled={!canRun || running}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg shadow-blue-500/20 px-8">
          {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
          Run Optimization
        </Button>
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertTriangle className="h-4 w-4" /> {error}
          </div>
        )}
        {!canRun && (
          <span className="text-xs text-gray-400">Select site, product, and date range to continue</span>
        )}
      </div>
    </div>
  )
}
