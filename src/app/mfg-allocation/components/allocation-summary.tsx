"use client"
import { useEffect, useState, useCallback } from "react"
import { Select } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { cn, formatDate, utilizationColor, remainingColor } from "@/lib/utils"
import { BarChart3, TrendingUp, AlertTriangle, Zap, Check, X, CalendarRange } from "lucide-react"

interface DailyCapacity {
  id: number; name: string; date: string; capacityType: string; siteType: string
  baseCapacity: number; bookedCapacity: number; overallocationCapacity: number
  remainingCapacity: number; mfgType: string | null; siteId: number; productCode: string | null
}

interface WeekSummary {
  week: string; weekStart: string; weekStartDisplay: string; weekEnd: string
  commercial: { base: number; booked: number; pct: number }
  clinical: { base: number; booked: number; pct: number }
  nonPatient: { base: number; booked: number; pct: number }
  reserve: { base: number; booked: number; pct: number }
  total: { base: number; booked: number; pct: number }
}

interface AllocationFilters {
  selectedSite: string; selectedProduct: string; dateFrom: string; dateTo: string
}

export function AllocationSummary({ siteType, filters }: { siteType: string; filters: AllocationFilters }) {
  const [data, setData] = useState<DailyCapacity[]>([])
  const [filterType, setFilterType] = useState("")

  const fetchData = useCallback(async () => {
    const params = new URLSearchParams({ siteType })
    if (filters.selectedSite) params.set("siteId", filters.selectedSite)
    if (filters.selectedProduct) params.set("productCode", filters.selectedProduct)
    // Expand date range to full week boundaries so partial weeks show complete data
    if (filters.dateFrom) {
      const from = new Date(filters.dateFrom)
      from.setDate(from.getDate() - from.getDay()) // snap to Sunday (week start)
      params.set("dateFrom", from.toISOString().split("T")[0])
    }
    if (filters.dateTo) {
      const to = new Date(filters.dateTo)
      to.setDate(to.getDate() + (6 - to.getDay())) // snap to Saturday (week end)
      params.set("dateTo", to.toISOString().split("T")[0])
    }
    if (filterType) params.set("capacityType", filterType)
    const res = await fetch(`/api/daily-capacity?${params}`)
    setData(await res.json())
  }, [siteType, filters, filterType])

  useEffect(() => { fetchData() }, [fetchData])

  // Group by week for summary
  const weekSummaries: WeekSummary[] = (() => {
    const weeks = new Map<string, DailyCapacity[]>()
    data.forEach(d => {
      const date = new Date(d.date)
      const weekStart = new Date(date)
      weekStart.setDate(date.getDate() - date.getDay())
      const key = weekStart.toISOString().split("T")[0]
      if (!weeks.has(key)) weeks.set(key, [])
      weeks.get(key)!.push(d)
    })

    return Array.from(weeks.entries()).map(([weekStart, items]) => {
      const ws = new Date(weekStart)
      const we = new Date(ws)
      we.setDate(ws.getDate() + 6)

      const summarize = (type: string) => {
        const filtered = items.filter(i => i.capacityType === type)
        const base = filtered.reduce((s, i) => s + i.baseCapacity, 0)
        const booked = filtered.reduce((s, i) => s + i.bookedCapacity, 0)
        return { base, booked, pct: base > 0 ? Math.round((booked / base) * 100) : 0 }
      }

      const commercial = summarize("Commercial")
      const clinical = summarize("Clinical")
      const nonPatient = summarize("Non-patient")
      const reserve = summarize("Reserve")
      const patient = siteType === "Cryopreservation" ? summarize("Patient") : { base: 0, booked: 0, pct: 0 }

      const totalBase = items.reduce((s, i) => s + i.baseCapacity, 0)
      const totalBooked = items.reduce((s, i) => s + i.bookedCapacity, 0)

      return {
        week: `W${Math.ceil((ws.getDate()) / 7)}`,
        weekStart: ws.toISOString().split("T")[0],
        weekStartDisplay: formatDate(ws),
        weekEnd: formatDate(we),
        commercial: siteType === "Manufacturing" ? commercial : patient,
        clinical,
        nonPatient,
        reserve,
        total: { base: totalBase, booked: totalBooked, pct: totalBase > 0 ? Math.round((totalBooked / totalBase) * 100) : 0 },
      }
    }).sort((a, b) => {
      // Ascending by actual date (earliest week first)
      const da = new Date(a.weekStart)
      const db = new Date(b.weekStart)
      return da.getTime() - db.getTime()
    })
  })()

  const grandTotal = {
    base: data.reduce((s, d) => s + d.baseCapacity, 0),
    booked: data.reduce((s, d) => s + d.bookedCapacity, 0),
    remaining: data.reduce((s, d) => s + d.remainingCapacity, 0),
  }
  const overallUtil = grandTotal.base > 0 ? Math.round((grandTotal.booked / grandTotal.base) * 100) : 0

  const isMfg = siteType === "Manufacturing"
  const capacityTypes = isMfg
    ? [{ value: "Commercial", label: "Commercial" }, { value: "Clinical", label: "Clinical" }, { value: "Reserve", label: "Reserve" }, { value: "Non-patient", label: "Non-patient" }]
    : [{ value: "Patient", label: "Patient" }, { value: "Reserve", label: "Reserve" }, { value: "Non-patient", label: "Non-patient" }]

  // Utilization ring gauge helpers
  const ringSize = 100
  const ringStroke = 10
  const ringRadius = (ringSize - ringStroke) / 2
  const ringCircumference = 2 * Math.PI * ringRadius
  const ringOffset = ringCircumference - (Math.min(overallUtil, 100) / 100) * ringCircumference
  const utilColor = overallUtil >= 96 ? "#22c55e" : overallUtil >= 80 ? "#f59e0b" : "#ef4444"

  // Capacity type breakdown for donut
  const typeBreakdown = isMfg
    ? [
        { label: "Commercial", value: data.filter(d => d.capacityType === "Commercial").reduce((s, d) => s + d.baseCapacity, 0), color: "#0ea5e9" },
        { label: "Clinical", value: data.filter(d => d.capacityType === "Clinical").reduce((s, d) => s + d.baseCapacity, 0), color: "#d946ef" },
        { label: "Reserve", value: data.filter(d => d.capacityType === "Reserve").reduce((s, d) => s + d.baseCapacity, 0), color: "#f97316" },
        { label: "Non-patient", value: data.filter(d => d.capacityType === "Non-patient").reduce((s, d) => s + d.baseCapacity, 0), color: "#14b8a6" },
      ]
    : [
        { label: "Patient", value: data.filter(d => d.capacityType === "Patient").reduce((s, d) => s + d.baseCapacity, 0), color: "#0ea5e9" },
        { label: "Reserve", value: data.filter(d => d.capacityType === "Reserve").reduce((s, d) => s + d.baseCapacity, 0), color: "#f97316" },
        { label: "Non-patient", value: data.filter(d => d.capacityType === "Non-patient").reduce((s, d) => s + d.baseCapacity, 0), color: "#14b8a6" },
      ]

  // Helper to render a utilization bar cell
  const UtilBar = ({ base, booked, pct, color }: { base: number; booked: number; pct: number; color: string }) => (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-bold" style={{ color }}>{pct}%</span>
        <span className="text-[10px] text-gray-400">{booked}/{base}</span>
      </div>
      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }} />
      </div>
    </div>
  )

  const pctColor = (pct: number) => pct >= 96 ? "#22c55e" : pct >= 80 ? "#f59e0b" : pct >= 50 ? "#f97316" : "#ef4444"

  // Max base across weeks for bar chart scaling
  const maxWeekBase = Math.max(...weekSummaries.map(w => w.total.base), 1)

  const hasDateFilter = filters.dateFrom || filters.dateTo
  const hasSiteFilter = filters.selectedSite
  const hasProductFilter = filters.selectedProduct
  const hasAnyFilter = hasDateFilter || hasSiteFilter || hasProductFilter

  return (
    <div className="space-y-6">
      {/* Active filter pills */}
      {hasAnyFilter && (
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="text-[#706E6B] font-medium">Filtered by:</span>
          {hasDateFilter && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#EBF4FF] border border-[#0176D3]/20 px-2.5 py-0.5 text-[#0176D3] font-medium">
              <CalendarRange className="h-3 w-3" />
              {filters.dateFrom ? formatDate(filters.dateFrom) : "Start"} — {filters.dateTo ? formatDate(filters.dateTo) : "End"}
            </span>
          )}
          {hasSiteFilter && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#EBF4FF] border border-[#0176D3]/20 px-2.5 py-0.5 text-[#0176D3] font-medium">
              Site #{filters.selectedSite}
            </span>
          )}
          {hasProductFilter && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#EBF4FF] border border-[#0176D3]/20 px-2.5 py-0.5 text-[#0176D3] font-medium">
              {filters.selectedProduct}
            </span>
          )}
        </div>
      )}

      {/* ── SLDS KPI Stat Tiles ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Overall Utilization tile */}
        <div className="rounded border border-[#DDDBDA] bg-white p-4 shadow-sm metric-card col-span-1">
          <p className="text-[11px] font-semibold text-[#706E6B] uppercase tracking-wider mb-2">Overall Utilization</p>
          <div className="flex items-end gap-2 mb-2">
            <span className="text-3xl font-bold" style={{ color: utilColor }}>{overallUtil}%</span>
          </div>
          <div className="h-2 rounded-full bg-[#F3F3F3] overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${Math.min(overallUtil, 100)}%`, backgroundColor: utilColor }} />
          </div>
          <p className="text-[10px] text-[#706E6B] mt-1">{data.length} records</p>
        </div>

        {/* Base Capacity */}
        <div className="rounded border border-[#DDDBDA] bg-white p-4 shadow-sm metric-card">
          <p className="text-[11px] font-semibold text-[#706E6B] uppercase tracking-wider mb-1">Total Base</p>
          <p className="text-3xl font-bold text-[#181818]">{grandTotal.base.toLocaleString()}</p>
          <p className="text-[11px] text-[#706E6B] mt-1">Configured capacity</p>
        </div>

        {/* Booked */}
        <div className="rounded border border-[#0176D3]/30 bg-[#EBF4FF] p-4 shadow-sm metric-card">
          <p className="text-[11px] font-semibold text-[#0176D3] uppercase tracking-wider mb-1">Booked</p>
          <p className="text-3xl font-bold text-[#0176D3]">{grandTotal.booked.toLocaleString()}</p>
          <p className="text-[11px] text-[#0176D3]/70 mt-1">{overallUtil}% of base</p>
        </div>

        {/* Remaining */}
        <div className="rounded border border-[#DDDBDA] bg-white p-4 shadow-sm metric-card">
          <p className="text-[11px] font-semibold text-[#706E6B] uppercase tracking-wider mb-1">Remaining</p>
          <p className="text-3xl font-bold text-[#2E844A]">{grandTotal.remaining.toLocaleString()}</p>
          <p className="text-[11px] text-[#706E6B] mt-1">
            {grandTotal.base > 0 ? Math.round((grandTotal.remaining / grandTotal.base) * 100) : 0}% available
          </p>
        </div>

        {/* Capacity Mix */}
        <div className="rounded border border-[#DDDBDA] bg-white p-4 shadow-sm metric-card">
          <p className="text-[11px] font-semibold text-[#706E6B] uppercase tracking-wider mb-2">Capacity Mix</p>
          <div className="space-y-1.5">
            {typeBreakdown.filter(t => t.value > 0).map(t => (
              <div key={t.label} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: t.color }} />
                <span className="text-[11px] text-[#444444] flex-1 truncate">{t.label}</span>
                <span className="text-[11px] font-semibold text-[#181818]">{t.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Capacity Type Filter ── */}
      <div className="flex gap-3 items-end">
        <div className="min-w-[180px]">
          <Label className="text-[11px] font-medium text-[#3E3E3C] mb-1 block">Capacity Type</Label>
          <Select value={filterType} onChange={e => setFilterType(e.target.value)}
            options={capacityTypes} placeholder="All types" />
        </div>
      </div>

      {/* ── Weekly Stacked Bar Chart + Utilization Table ── */}
      {weekSummaries.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Visual bar chart */}
          <div className="rounded border border-[#DDDBDA] bg-white shadow-sm p-5">
            <h3 className="text-sm font-semibold text-[#181818] mb-4 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-[#0176D3]" /> Weekly Capacity Overview
            </h3>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {weekSummaries.map(w => (
                <div key={w.weekStart} className="group">
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <span className="text-xs font-semibold text-gray-700">{w.week}</span>
                      <span className="text-[10px] text-gray-400 ml-2">{w.weekStartDisplay} – {w.weekEnd}</span>
                    </div>
                    <span className="text-xs font-bold" style={{ color: pctColor(w.total.pct) }}>{w.total.pct}%</span>
                  </div>
                  {/* Stacked bar */}
                  <div className="h-6 rounded-lg bg-gray-100 overflow-hidden flex relative">
                    {(() => {
                      const types = isMfg
                        ? [{ d: w.commercial, color: "#0ea5e9" }, { d: w.clinical, color: "#d946ef" }, { d: w.reserve, color: "#f97316" }, { d: w.nonPatient, color: "#14b8a6" }]
                        : [{ d: w.commercial, color: "#0ea5e9" }, { d: w.reserve, color: "#f97316" }]
                      return types.map((t, i) => (
                        <div key={i} className="h-full transition-all duration-500 relative group/seg"
                          style={{ width: `${(t.d.base / maxWeekBase) * 100}%`, backgroundColor: t.color, opacity: 0.25 }}>
                          <div className="absolute inset-y-0 left-0 transition-all duration-500"
                            style={{ width: `${t.d.pct}%`, backgroundColor: t.color }} />
                        </div>
                      ))
                    })()}
                    {/* Booked overlay text */}
                    <div className="absolute inset-0 flex items-center px-2">
                      <span className="text-[10px] font-bold text-white drop-shadow-sm">{w.total.booked} booked</span>
                      <span className="text-[10px] text-white/60 ml-auto drop-shadow-sm">of {w.total.base}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* Legend */}
            <div className="flex items-center gap-4 mt-4 pt-3 border-t">
              {typeBreakdown.filter(t => t.value > 0).map(t => (
                <div key={t.label} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: t.color }} />
                  <span className="text-[10px] text-gray-500">{t.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Utilization progress table */}
          <div className="rounded border border-[#DDDBDA] bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-[#DDDBDA] bg-[#FAFAF9]">
              <h3 className="text-sm font-semibold text-[#181818] flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[#2E844A]" /> Weekly Utilization Breakdown
              </h3>
            </div>
            <div className="max-h-[420px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur-sm">
                  <TableRow className="bg-gray-50/95">
                    <TableHead className="text-xs font-semibold">Week</TableHead>
                    <TableHead className="text-xs font-semibold">{isMfg ? "Commercial" : "Patient"}</TableHead>
                    {isMfg && <TableHead className="text-xs font-semibold">Clinical</TableHead>}
                    {isMfg && <TableHead className="text-xs font-semibold">Non-Patient</TableHead>}
                    <TableHead className="text-xs font-semibold">Reserve</TableHead>
                    <TableHead className="text-xs font-semibold">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {weekSummaries.map(w => (
                    <TableRow key={w.weekStart} className="hover:bg-gray-50/50">
                      <TableCell className="align-top">
                        <div className="font-semibold text-sm">{w.week}</div>
                        <div className="text-[10px] text-gray-400">{w.weekStartDisplay}</div>
                        <div className="text-[10px] text-gray-400">{w.weekEnd}</div>
                      </TableCell>
                      <TableCell className="min-w-[110px]">
                        <UtilBar base={w.commercial.base} booked={w.commercial.booked} pct={w.commercial.pct} color="#0ea5e9" />
                      </TableCell>
                      {isMfg && (
                        <TableCell className="min-w-[110px]">
                          <UtilBar base={w.clinical.base} booked={w.clinical.booked} pct={w.clinical.pct} color="#d946ef" />
                        </TableCell>
                      )}
                      {isMfg && (
                        <TableCell className="min-w-[110px]">
                          <UtilBar base={w.nonPatient.base} booked={w.nonPatient.booked} pct={w.nonPatient.pct} color="#14b8a6" />
                        </TableCell>
                      )}
                      <TableCell className="min-w-[110px]">
                        <UtilBar base={w.reserve.base} booked={w.reserve.booked} pct={w.reserve.pct} color="#f97316" />
                      </TableCell>
                      <TableCell className="min-w-[110px]">
                        <UtilBar base={w.total.base} booked={w.total.booked} pct={w.total.pct} color={pctColor(w.total.pct)} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}

      {weekSummaries.length === 0 && data.length === 0 && (
        <div className="rounded-xl border bg-white p-12 text-center text-gray-400">
          <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">No capacity data found. Generate allocations or adjust filters.</p>
        </div>
      )}

      {/* ── Daily Capacity Detail — Inline Editable ── */}
      <DailyCapacityDetail data={data} isMfg={isMfg} onRefresh={fetchData} />
    </div>
  )
}

// ── Inline-editable Daily Capacity Detail sub-component ──
const MFGTYPE_OPTIONS = [
  { value: "Fresh", label: "Fresh" },
  { value: "Frozen", label: "Frozen" },
  { value: "Fresh & Frozen", label: "Fresh & Frozen" },
]

function DailyCapacityDetail({ data, isMfg, onRefresh }: { data: DailyCapacity[]; isMfg: boolean; onRefresh: () => void }) {
  const [editId, setEditId] = useState<number | null>(null)
  const [editValues, setEditValues] = useState<{ baseCapacity: number; bookedCapacity: number; overallocationCapacity: number; mfgType: string | null }>({
    baseCapacity: 0, bookedCapacity: 0, overallocationCapacity: 0, mfgType: null,
  })
  const [saving, setSaving] = useState(false)

  const startEdit = (d: DailyCapacity) => {
    setEditId(d.id)
    setEditValues({
      baseCapacity: d.baseCapacity,
      bookedCapacity: d.bookedCapacity,
      overallocationCapacity: d.overallocationCapacity,
      mfgType: d.mfgType,
    })
  }

  const cancelEdit = () => setEditId(null)

  const saveEdit = async (id: number) => {
    setSaving(true)
    await fetch(`/api/daily-capacity/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editValues),
    })
    setSaving(false)
    setEditId(null)
    onRefresh()
  }

  const calcRemaining = () => {
    if (isMfg) return editValues.baseCapacity - editValues.bookedCapacity + editValues.overallocationCapacity
    return editValues.baseCapacity - editValues.bookedCapacity
  }

  // Color coding: green = fully booked, red = far from booked
  const bookingRowColor = (d: DailyCapacity) => {
    if (d.baseCapacity === 0) return ""
    const pct = (d.bookedCapacity / d.baseCapacity) * 100
    if (pct >= 100) return "bg-green-50"
    if (pct >= 80) return "bg-emerald-50/50"
    if (pct >= 50) return "bg-amber-50/50"
    return "bg-red-50/50"
  }

  const bookingTextColor = (base: number, booked: number) => {
    if (base === 0) return "text-gray-400"
    const pct = (booked / base) * 100
    if (pct >= 100) return "text-green-600"
    if (pct >= 80) return "text-emerald-600"
    if (pct >= 50) return "text-amber-600"
    return "text-red-600"
  }

  const sorted = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return (
    <div className="rounded border border-[#DDDBDA] bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-[#DDDBDA] bg-[#FAFAF9]">
        <h3 className="text-sm font-semibold text-[#181818]">Daily Capacity Detail</h3>
        <p className="text-[11px] text-[#706E6B]">{data.length} records · click a row to edit Base, Booked, Over-alloc, or Mfgtype</p>
      </div>
      <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur-sm">
            <TableRow className="bg-gray-50/95">
              <TableHead className="text-xs">Date</TableHead>
              <TableHead className="text-xs">Capacity Name</TableHead>
              <TableHead className="text-xs">Type</TableHead>
              <TableHead className="text-xs text-right">Base</TableHead>
              <TableHead className="text-xs text-right">Booked</TableHead>
              {isMfg && <TableHead className="text-xs text-right">Over-alloc</TableHead>}
              <TableHead className="text-xs text-right">Remaining</TableHead>
              <TableHead className="text-xs min-w-[100px]">Fill</TableHead>
              {isMfg && <TableHead className="text-xs">Mfgtype</TableHead>}
              <TableHead className="text-xs w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((d) => {
              const isEditing = editId === d.id
              const remaining = isEditing ? calcRemaining() : d.remainingCapacity

              return (
                <TableRow
                  key={d.id}
                  className={cn(
                    isEditing ? "bg-blue-50/50 ring-1 ring-blue-200 ring-inset" : bookingRowColor(d),
                    !isEditing && "cursor-pointer hover:bg-gray-50"
                  )}
                  onClick={() => { if (!isEditing) startEdit(d) }}
                >
                  <TableCell className="text-sm">{formatDate(d.date)}</TableCell>
                  <TableCell className="font-mono text-xs text-gray-600">{d.name}</TableCell>
                  <TableCell><Badge variant="secondary" className="text-[10px]">{d.capacityType}</Badge></TableCell>

                  {/* Base — editable */}
                  <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                    {isEditing ? (
                      <Input type="number" min={0} value={editValues.baseCapacity}
                        onChange={e => setEditValues(v => ({ ...v, baseCapacity: parseInt(e.target.value) || 0 }))}
                        className="h-7 w-16 text-right text-sm ml-auto" />
                    ) : (
                      <span className="font-medium">{d.baseCapacity}</span>
                    )}
                  </TableCell>

                  {/* Booked — editable */}
                  <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                    {isEditing ? (
                      <Input type="number" min={0} value={editValues.bookedCapacity}
                        onChange={e => setEditValues(v => ({ ...v, bookedCapacity: parseInt(e.target.value) || 0 }))}
                        className="h-7 w-16 text-right text-sm ml-auto" />
                    ) : (
                      <span>{d.bookedCapacity}</span>
                    )}
                  </TableCell>

                  {/* Over-alloc — editable (Mfg only) */}
                  {isMfg && (
                    <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                      {isEditing ? (
                        <Input type="number" min={0} value={editValues.overallocationCapacity}
                          onChange={e => setEditValues(v => ({ ...v, overallocationCapacity: parseInt(e.target.value) || 0 }))}
                          className="h-7 w-16 text-right text-sm ml-auto" />
                      ) : (
                        <span>{d.overallocationCapacity}</span>
                      )}
                    </TableCell>
                  )}

                  {/* Remaining — computed, read-only. Green = fully booked, Red = far from booked */}
                  <TableCell className={cn("text-right font-bold", isEditing
                    ? bookingTextColor(editValues.baseCapacity, editValues.bookedCapacity)
                    : bookingTextColor(d.baseCapacity, d.bookedCapacity)
                  )}>
                    {remaining}
                  </TableCell>

                  {/* Fill bar — visual booking progress */}
                  <TableCell>
                    {(() => {
                      const base = isEditing ? editValues.baseCapacity : d.baseCapacity
                      const booked = isEditing ? editValues.bookedCapacity : d.bookedCapacity
                      const pct = base > 0 ? Math.min(Math.round((booked / base) * 100), 100) : 0
                      const barColor = pct >= 96 ? "#22c55e" : pct >= 80 ? "#f59e0b" : pct >= 50 ? "#f97316" : "#ef4444"
                      return (
                        <div className="flex items-center gap-1.5">
                          <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden min-w-[60px]">
                            <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, backgroundColor: barColor }} />
                          </div>
                          <span className="text-[10px] font-semibold w-8 text-right" style={{ color: barColor }}>{pct}%</span>
                        </div>
                      )
                    })()}
                  </TableCell>

                  {/* Mfgtype — editable (Mfg only) */}
                  {isMfg && (
                    <TableCell onClick={e => e.stopPropagation()}>
                      {isEditing ? (
                        <Select value={editValues.mfgType || ""} onChange={e => setEditValues(v => ({ ...v, mfgType: e.target.value || null }))}
                          options={MFGTYPE_OPTIONS} placeholder="—" className="h-7 text-[10px] w-28" />
                      ) : (
                        d.mfgType && <Badge variant={d.mfgType === "Fresh" ? "info" : "purple"} className="text-[10px]">{d.mfgType}</Badge>
                      )}
                    </TableCell>
                  )}

                  {/* Save / Cancel actions */}
                  <TableCell onClick={e => e.stopPropagation()}>
                    {isEditing && (
                      <div className="flex gap-0.5">
                        <button onClick={() => saveEdit(d.id)} disabled={saving}
                          className="rounded p-1 hover:bg-green-100 text-green-600 transition">
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={cancelEdit}
                          className="rounded p-1 hover:bg-red-100 text-red-500 transition">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
            {data.length === 0 && (
              <TableRow><TableCell colSpan={isMfg ? 10 : 8} className="text-center py-8 text-gray-400">No capacity records found. Generate allocations first.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
