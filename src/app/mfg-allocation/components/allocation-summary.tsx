"use client"
import { useEffect, useState, useCallback } from "react"
import { Select } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { cn, formatDate, utilizationColor, remainingColor } from "@/lib/utils"
import { BarChart3, TrendingUp, AlertTriangle, Zap, Check, X } from "lucide-react"

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

export function AllocationSummary({ siteType }: { siteType: string }) {
  const [data, setData] = useState<DailyCapacity[]>([])
  const [sites, setSites] = useState<{ id: number; name: string; alias: string }[]>([])
  const [selectedSite, setSelectedSite] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [filterType, setFilterType] = useState("")

  const fetchSites = useCallback(async () => {
    const res = await fetch(`/api/accounts?siteType=${siteType}&active=true`)
    const s = await res.json()
    setSites(s)
  }, [siteType])

  const fetchData = useCallback(async () => {
    const params = new URLSearchParams({ siteType })
    if (selectedSite) params.set("siteId", selectedSite)
    if (dateFrom) params.set("dateFrom", dateFrom)
    if (dateTo) params.set("dateTo", dateTo)
    if (filterType) params.set("capacityType", filterType)
    const res = await fetch(`/api/daily-capacity?${params}`)
    setData(await res.json())
  }, [siteType, selectedSite, dateFrom, dateTo, filterType])

  useEffect(() => { fetchSites() }, [fetchSites])
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

  return (
    <div className="space-y-6">
      {/* KPI Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-white p-5 shadow-sm metric-card glow-blue">
          <div className="flex items-center gap-2 mb-2">
            <div className="rounded-lg bg-blue-50 p-2"><BarChart3 className="h-4 w-4 text-blue-600" /></div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Base</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{grandTotal.base.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-1">{data.length} capacity records</p>
        </div>
        <div className="rounded-xl border bg-white p-5 shadow-sm metric-card glow-green">
          <div className="flex items-center gap-2 mb-2">
            <div className="rounded-lg bg-green-50 p-2"><TrendingUp className="h-4 w-4 text-green-600" /></div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Booked</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{grandTotal.booked.toLocaleString()}</p>
          <div className="mt-1 h-1.5 rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-gradient-to-r from-green-400 to-emerald-500" style={{ width: `${Math.min(overallUtil, 100)}%` }} />
          </div>
        </div>
        <div className="rounded-xl border bg-white p-5 shadow-sm metric-card glow-amber">
          <div className="flex items-center gap-2 mb-2">
            <div className="rounded-lg bg-amber-50 p-2"><AlertTriangle className="h-4 w-4 text-amber-600" /></div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Remaining</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{grandTotal.remaining.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border bg-white p-5 shadow-sm metric-card glow-purple">
          <div className="flex items-center gap-2 mb-2">
            <div className="rounded-lg bg-purple-50 p-2"><Zap className="h-4 w-4 text-purple-600" /></div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Utilization</span>
          </div>
          <p className={cn("text-3xl font-bold", overallUtil >= 96 ? "text-green-600" : overallUtil >= 91 ? "text-amber-600" : "text-red-600")}>
            {overallUtil}%
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-end flex-wrap rounded-xl border bg-white p-4 shadow-sm">
        <div className="min-w-[180px]">
          <Label className="text-xs text-gray-500">{siteType} Site</Label>
          <Select value={selectedSite} onChange={e => setSelectedSite(e.target.value)}
            options={sites.map(s => ({ value: String(s.id), label: s.name }))} placeholder="All sites" />
        </div>
        <div>
          <Label className="text-xs text-gray-500">From</Label>
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-40" />
        </div>
        <div>
          <Label className="text-xs text-gray-500">To</Label>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-40" />
        </div>
        <div className="min-w-[150px]">
          <Label className="text-xs text-gray-500">Capacity Type</Label>
          <Select value={filterType} onChange={e => setFilterType(e.target.value)}
            options={capacityTypes} placeholder="All types" />
        </div>
      </div>

      {/* Weekly Utilization Heatmap */}
      {weekSummaries.length > 0 && (
        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b bg-gray-50/80">
            <h3 className="text-sm font-semibold text-gray-700">Weekly Utilization Heatmap</h3>
          </div>
          <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/50">
                  <TableHead className="text-xs font-semibold">Week</TableHead>
                  <TableHead className="text-xs font-semibold">{isMfg ? "Commercial" : "Patient"}</TableHead>
                  {isMfg && <TableHead className="text-xs font-semibold">Clinical</TableHead>}
                  {isMfg && <TableHead className="text-xs font-semibold">Non-Patient</TableHead>}
                  <TableHead className="text-xs font-semibold">Reserve</TableHead>
                  <TableHead className="text-xs font-semibold">Grand Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {weekSummaries.map((w) => (
                  <TableRow key={w.weekStart}>
                    <TableCell className="font-medium text-sm">
                      <div>{w.week}</div>
                      <div className="text-[10px] text-gray-400">{w.weekStartDisplay} – {w.weekEnd}</div>
                    </TableCell>
                    <TableCell>
                      <div className={cn("rounded-lg px-3 py-1.5 text-center text-sm font-medium heatmap-cell", utilizationColor(w.commercial.pct))}>
                        {w.commercial.booked}/{w.commercial.base}
                        <div className="text-[10px] font-normal">{w.commercial.pct}%</div>
                      </div>
                    </TableCell>
                    {isMfg && (
                      <TableCell>
                        <div className={cn("rounded-lg px-3 py-1.5 text-center text-sm font-medium heatmap-cell", utilizationColor(w.clinical.pct))}>
                          {w.clinical.booked}/{w.clinical.base}
                          <div className="text-[10px] font-normal">{w.clinical.pct}%</div>
                        </div>
                      </TableCell>
                    )}
                    {isMfg && (
                      <TableCell>
                        <div className={cn("rounded-lg px-3 py-1.5 text-center text-sm font-medium heatmap-cell", utilizationColor(w.nonPatient.pct))}>
                          {w.nonPatient.booked}/{w.nonPatient.base}
                          <div className="text-[10px] font-normal">{w.nonPatient.pct}%</div>
                        </div>
                      </TableCell>
                    )}
                    <TableCell>
                      <div className={cn("rounded-lg px-3 py-1.5 text-center text-sm font-medium heatmap-cell", utilizationColor(w.reserve.pct))}>
                        {w.reserve.booked}/{w.reserve.base}
                        <div className="text-[10px] font-normal">{w.reserve.pct}%</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className={cn("rounded-lg px-3 py-1.5 text-center text-sm font-bold heatmap-cell", utilizationColor(w.total.pct))}>
                        {w.total.booked}/{w.total.base}
                        <div className="text-[10px] font-normal">{w.total.pct}%</div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Detailed Daily View — Inline Editable */}
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

  const sorted = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return (
    <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b bg-gray-50/80">
        <h3 className="text-sm font-semibold text-gray-700">Daily Capacity Detail</h3>
        <p className="text-[10px] text-gray-400">{data.length} records &middot; click a row to edit Base, Booked, Over-alloc, or Mfgtype</p>
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
                    isEditing ? "bg-blue-50/50 ring-1 ring-blue-200 ring-inset" : remainingColor(d.remainingCapacity),
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

                  {/* Remaining — computed, read-only */}
                  <TableCell className={cn("text-right font-bold", remaining <= 0 ? "text-red-600" : remaining === 1 ? "text-amber-600" : "text-green-600")}>
                    {remaining}
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
              <TableRow><TableCell colSpan={isMfg ? 9 : 7} className="text-center py-8 text-gray-400">No capacity records found. Generate allocations first.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
