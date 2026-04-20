"use client"
import { useEffect, useState, useMemo } from "react"
import { ChevronLeft, ChevronRight, X, Calendar, Check, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"

interface CapSlot {
  id: number; name: string; date: string; siteId: number
  baseCapacity: number; bookedCapacity: number; remainingCapacity: number
  capacityType: string; siteType: string; mfgType?: string | null; productCode?: string | null
}

interface Site { id: number; name: string }
interface Product { id: number; name: string; code: string }

export interface CapacityCalendarPickerProps {
  orderId: string
  mode: "mfg" | "cryo"
  currentSlotId?: number | null
  currentSiteId?: number | null
  currentSlotDate?: string | null   // ISO date — used to default the calendar month
  currentSlotName?: string | null   // displayed in header as "current" reference
  onClose: () => void
  onApplied: () => void
}

// ── Availability colour for a list of slots on one day ─────────────────────────
function dayColor(slots: CapSlot[]): "green" | "yellow" | "grey" | "none" {
  if (!slots.length) return "none"
  const remaining = slots.reduce((s, c) => s + c.remainingCapacity, 0)
  const base      = slots.reduce((s, c) => s + c.baseCapacity, 0)
  if (remaining <= 0) return "grey"
  if (base > 0 && remaining / base <= 0.3) return "yellow"
  return "green"
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MFG_TYPES = ["Fresh", "Frozen", "Fresh & Frozen"]

// Hardcoded capacity type options — not derived from data so they're always visible
const CAP_TYPES_MFG  = ["Commercial", "Clinical", "Reserve", "Non-patient"]
const CAP_TYPES_CRYO = ["Patient", "Reserve"]

export function CapacityCalendarPicker({
  orderId, mode, currentSlotId, currentSiteId, currentSlotDate, currentSlotName, onClose, onApplied,
}: CapacityCalendarPickerProps) {
  const siteType = mode === "mfg" ? "Manufacturing" : "Cryopreservation"

  // Default calendar to the slot's month.
  // Parse date string directly (YYYY-MM-DD) to avoid UTC→local timezone shift.
  // Never go earlier than May 2026 (start of seed data).
  const defaultViewDate = useMemo(() => {
    const minDate = new Date(2026, 4, 1) // May 2026
    if (currentSlotDate) {
      const parts = currentSlotDate.slice(0, 10).split("-")
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1)
        if (!isNaN(d.getTime()) && d >= minDate) return d
      }
    }
    return minDate
  }, [currentSlotDate])

  const [sites, setSites]               = useState<Site[]>([])
  const [products, setProducts]         = useState<Product[]>([])
  const [selectedSiteId, setSite]       = useState<string>(currentSiteId ? String(currentSiteId) : "")
  const [capType, setCapType]           = useState<string>("")
  const [productCode, setProductCode]   = useState<string>("")
  const [mfgTypeFilter, setMfgType]     = useState<string>("")
  const [slots, setSlots]               = useState<CapSlot[]>([])
  const [loading, setLoading]           = useState(false)
  const [loadError, setLoadError]       = useState<string | null>(null)
  const [saving, setSaving]             = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const [viewDate, setViewDate]         = useState(defaultViewDate)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedSlotId, setPickedSlot] = useState<number | null>(null)

  // Load sites + products once
  useEffect(() => {
    fetch(`/api/accounts?siteType=${siteType}&active=true`).then(r => r.json()).then(setSites)
    if (mode === "mfg") fetch("/api/products?active=true").then(r => r.json()).then(setProducts)
  }, [siteType, mode])

  // Fetch capacity for current month
  useEffect(() => {
    if (!selectedSiteId) { setSlots([]); return }
    setLoading(true)
    const y = viewDate.getFullYear()
    const m = viewDate.getMonth()
    const from = new Date(y, m, 1).toISOString().slice(0, 10)
    const to   = new Date(y, m + 1, 0).toISOString().slice(0, 10)
    const p    = new URLSearchParams({ siteId: selectedSiteId, dateFrom: from, dateTo: to })
    if (capType)        p.set("capacityType", capType)
    if (productCode)    p.set("productCode", productCode)
    if (mfgTypeFilter)  p.set("mfgType", mfgTypeFilter)
    setLoadError(null)
    fetch(`/api/daily-capacity?${p}`)
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) {
          setSlots(d)
        } else {
          setSlots([])
          setLoadError(d?.error ?? 'Failed to load capacity data')
        }
        setLoading(false)
      })
      .catch(e => { setLoadError(String(e)); setLoading(false) })
  }, [selectedSiteId, viewDate, capType, productCode, mfgTypeFilter])

  const slotsByDate = useMemo(() => {
    const m = new Map<string, CapSlot[]>()
    for (const s of slots) {
      const d = s.date.slice(0, 10)
      m.set(d, [...(m.get(d) ?? []), s])
    }
    return m
  }, [slots])

  const daySlots = useMemo(
    () => (selectedDate ? slotsByDate.get(selectedDate) ?? [] : []),
    [slotsByDate, selectedDate],
  )

  const capTypeOptions = mode === "mfg" ? CAP_TYPES_MFG : CAP_TYPES_CRYO

  // Count of days in current view that have available slots (for "no data" hint)
  const availableDayCount = useMemo(
    () => [...slotsByDate.values()].filter(s => s.some(c => c.remainingCapacity > 0)).length,
    [slotsByDate],
  )

  // Build calendar cells
  const calendarCells = useMemo(() => {
    const y = viewDate.getFullYear()
    const m = viewDate.getMonth()
    const firstDow    = new Date(y, m, 1).getDay()
    const daysInMonth = new Date(y, m + 1, 0).getDate()
    const cells: (string | null)[] = Array(firstDow).fill(null)
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(`${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`)
    }
    return cells
  }, [viewDate])

  const today = new Date().toISOString().slice(0, 10)

  const apply = async () => {
    if (!selectedSlotId) return
    setSaving(true); setError(null)
    const body = mode === "mfg"
      ? { newMfgCapacityId: selectedSlotId }
      : { newCryoCapacityId: selectedSlotId }
    try {
      const res = await fetch(`/api/orders/${orderId}/reschedule`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (res.ok) { onApplied(); onClose() }
      else { const j = await res.json(); setError(j.error ?? "Reschedule failed") }
    } catch { setError("Network error — please try again") }
    setSaving(false)
  }

  const monthLabel = viewDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })

  const resetDaySelection = () => { setSelectedDate(null); setPickedSlot(null) }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-8 px-4">
      <div className="fixed inset-0 bg-[#181818]/70" onClick={onClose} />

      <div className="relative z-[60] w-full max-w-[660px] flex flex-col rounded-lg shadow-2xl overflow-hidden">

        {/* ── Dark SF header ──────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-5 py-4 bg-[#16213E] shrink-0">
          <div className="h-9 w-9 rounded bg-white/10 flex items-center justify-center shrink-0">
            <Calendar className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-[15px] font-bold text-white leading-tight">
              Change {mode === "mfg" ? "Manufacturing" : "Cryopreservation"} Slot
            </h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-[10px] text-white/40 uppercase tracking-wide">Order</span>
              <span className="text-[11px] text-white/70 font-mono truncate max-w-[180px]">{orderId.slice(0, 22)}</span>
              {currentSlotName && (
                <>
                  <span className="text-white/25">·</span>
                  <span className="text-[10px] text-white/40 uppercase tracking-wide">Current Slot</span>
                  <span className="text-[11px] font-semibold font-mono text-[#5DADE2] bg-white/10 rounded px-1.5 py-0.5 truncate max-w-[200px]">
                    {currentSlotName}
                  </span>
                </>
              )}
            </div>
          </div>
          <button onClick={onClose} className="rounded p-1.5 hover:bg-white/15 text-white/60 hover:text-white transition-colors shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Filters row ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 px-5 pt-3 pb-2 bg-white border-b border-[#DDDBDA]">
          {/* Site */}
          <div>
            <Label className="mb-1 block">{mode === "mfg" ? "Manufacturing" : "Cryo"} Site</Label>
            <select
              value={selectedSiteId}
              onChange={e => { setSite(e.target.value); resetDaySelection() }}
              className="w-full border border-[#DDDBDA] rounded text-sm px-3 py-1.5 focus:outline-none focus:border-[#0176D3] bg-white"
            >
              <option value="">Select site…</option>
              {sites.map(s => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
            </select>
          </div>

          {/* Capacity Type */}
          <div>
            <Label className="mb-1 block">Capacity Type</Label>
            <select
              value={capType}
              onChange={e => { setCapType(e.target.value); resetDaySelection() }}
              className="w-full border border-[#DDDBDA] rounded text-sm px-3 py-1.5 focus:outline-none focus:border-[#0176D3] bg-white"
            >
              <option value="">All types</option>
              {capTypeOptions.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Product — mfg only */}
          {mode === "mfg" && (
            <div>
              <Label className="mb-1 block">Product</Label>
              <select
                value={productCode}
                onChange={e => { setProductCode(e.target.value); resetDaySelection() }}
                className="w-full border border-[#DDDBDA] rounded text-sm px-3 py-1.5 focus:outline-none focus:border-[#0176D3] bg-white"
              >
                <option value="">All products</option>
                {products.map(p => <option key={p.code} value={p.code}>{p.name} ({p.code})</option>)}
              </select>
            </div>
          )}

          {/* Mfg Type — mfg only */}
          {mode === "mfg" && (
            <div>
              <Label className="mb-1 block">Mfg Type</Label>
              <select
                value={mfgTypeFilter}
                onChange={e => { setMfgType(e.target.value); resetDaySelection() }}
                className="w-full border border-[#DDDBDA] rounded text-sm px-3 py-1.5 focus:outline-none focus:border-[#0176D3] bg-white"
              >
                <option value="">All types</option>
                {MFG_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          )}

          {/* Active filter badge + clear link */}
          {(capType || productCode || mfgTypeFilter) && (
            <div className="col-span-2 flex items-center gap-2 pb-1">
              <span className="text-[10px] text-[#706E6B]">Filtered by:</span>
              {capType && <span className="text-[10px] rounded-full bg-[#EBF4FF] text-[#0176D3] px-2 py-0.5 font-semibold">{capType}</span>}
              {productCode && <span className="text-[10px] rounded-full bg-[#F0FDF4] text-[#166534] px-2 py-0.5 font-semibold">{productCode}</span>}
              {mfgTypeFilter && <span className="text-[10px] rounded-full bg-[#EEF2FF] text-[#4F46E5] px-2 py-0.5 font-semibold">{mfgTypeFilter}</span>}
              <button
                onClick={() => { setCapType(""); setProductCode(""); setMfgType(""); resetDaySelection() }}
                className="text-[10px] text-[#C23934] hover:underline ml-1"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>

        {/* ── Calendar ────────────────────────────────────────────────────── */}
        <div className="bg-white px-5 pt-4 pb-0">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => { setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1)); resetDaySelection() }}
              className="p-1.5 rounded hover:bg-[#F3F3F3] text-[#444444] transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold text-[#181818]">{monthLabel}</span>
            <button
              onClick={() => { setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1)); resetDaySelection() }}
              className="p-1.5 rounded hover:bg-[#F3F3F3] text-[#444444] transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map(d => (
              <div key={d} className="text-center text-[10px] font-semibold text-[#706E6B] uppercase py-1">{d}</div>
            ))}
          </div>

          {/* Grid body */}
          {!selectedSiteId ? (
            <div className="py-10 text-center text-sm text-[#706E6B]">Select a site to view capacity availability</div>
          ) : loading ? (
            <div className="py-10 flex items-center justify-center gap-2 text-[#706E6B]">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : !loading && slots.length === 0 ? (
            <div className="py-10 text-center">
              {loadError ? (
                <>
                  <p className="text-sm text-[#C23934] font-medium">Could not load capacity data</p>
                  <p className="text-xs text-[#B0AFAD] mt-1 font-mono max-w-xs mx-auto break-words">{loadError}</p>
                </>
              ) : (
                <>
                  <p className="text-sm text-[#706E6B] font-medium">No capacity slots found</p>
                  <p className="text-xs text-[#B0AFAD] mt-1">Try clearing the Product or Mfg Type filter, or navigate to a different month</p>
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1 pb-1">
              {calendarCells.map((dateStr, i) => {
                if (!dateStr) return <div key={`e-${i}`} className="min-h-[46px]" />
                const dayList    = slotsByDate.get(dateStr) ?? []
                const col        = dayColor(dayList)
                const isSelected = selectedDate === dateStr
                const isPast     = dateStr < today
                const canClick   = dayList.length > 0 && !isPast && col !== "grey"
                const remaining  = dayList.reduce((s, c) => s + c.remainingCapacity, 0)
                const dayNum     = parseInt(dateStr.slice(8))
                const isToday    = dateStr === today

                return (
                  <button
                    key={dateStr}
                    disabled={!canClick}
                    onClick={() => { setSelectedDate(dateStr); setPickedSlot(null) }}
                    className={cn(
                      "relative flex flex-col items-center justify-center rounded-lg border-2 py-1.5 transition-all min-h-[46px]",
                      isSelected && "ring-2 ring-[#0176D3] ring-offset-1",
                      isToday && "underline decoration-dotted",
                      !canClick
                        ? col === "grey"
                          ? "border-[#DDDBDA] bg-[#F3F3F3] text-[#B0AFAD] cursor-not-allowed"
                          : "border-transparent bg-[#FAFAF9] text-[#C8C8C8] cursor-not-allowed"
                        : col === "green"
                        ? "border-[#2E844A]/25 bg-[#EEF6EC] text-[#1A5C2E] hover:border-[#2E844A] hover:bg-[#D4EDDA] cursor-pointer"
                        : "border-[#E07900]/25 bg-[#FEF3C7] text-[#7E5400] hover:border-[#E07900] hover:bg-[#FDE68A] cursor-pointer"
                    )}
                  >
                    <span className="text-[13px] font-bold leading-none">{dayNum}</span>
                    {canClick && (
                      <span className="text-[9px] leading-none mt-0.5 font-medium opacity-75">{remaining}</span>
                    )}
                    {col === "grey" && dayList.length > 0 && !isPast && (
                      <span className="text-[8px] leading-none mt-0.5 opacity-60">Full</span>
                    )}
                    {isSelected && (
                      <div className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-[#0176D3] flex items-center justify-center shadow">
                        <Check className="h-2.5 w-2.5 text-white" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center gap-5 py-2.5 border-t border-[#F3F3F3] mt-1">
            <span className="text-[10px] text-[#706E6B] font-semibold uppercase tracking-wide">Legend</span>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded border-2 border-[#2E844A]/40 bg-[#EEF6EC]" />
              <span className="text-[10px] text-[#444444]">Available</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded border-2 border-[#E07900]/40 bg-[#FEF3C7]" />
              <span className="text-[10px] text-[#444444]">Few slots (&lt;30%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded border-2 border-[#DDDBDA] bg-[#F3F3F3]" />
              <span className="text-[10px] text-[#444444]">Full / none</span>
            </div>
          </div>
        </div>

        {/* ── Slot list for selected date ──────────────────────────────────── */}
        {selectedDate && daySlots.length > 0 && (
          <div className="bg-[#FAFAF9] border-t border-[#DDDBDA] px-5 py-3 max-h-[220px] overflow-y-auto">
            <p className="text-[11px] font-semibold text-[#3E3E3C] uppercase tracking-wide mb-2">
              Slots — {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
            </p>
            <div className="space-y-1.5">
              {daySlots.map(slot => {
                const pct       = slot.baseCapacity > 0 ? Math.round((slot.bookedCapacity / slot.baseCapacity) * 100) : 0
                const isCurrent = slot.id === currentSlotId
                const isPicked  = slot.id === selectedSlotId
                const isFull    = slot.remainingCapacity <= 0
                return (
                  <button
                    key={slot.id}
                    disabled={isFull}
                    onClick={() => setPickedSlot(slot.id)}
                    className={cn(
                      "w-full flex items-center gap-3 rounded border px-3 py-2 text-left transition-all",
                      isPicked   ? "border-[#0176D3] bg-[#EBF4FF]" :
                      isFull     ? "border-[#DDDBDA] bg-[#F3F3F3] opacity-50 cursor-not-allowed" :
                                   "border-[#DDDBDA] bg-white hover:border-[#0176D3]/50 hover:bg-[#EBF4FF]/40"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center flex-wrap gap-1.5 mb-1">
                        <span className="text-xs font-semibold text-[#181818] font-mono">{slot.name}</span>
                        {isCurrent && <span className="text-[9px] rounded-full bg-[#EBF4FF] text-[#0176D3] border border-[#0176D3]/30 px-1.5 py-0.5 font-semibold">Current</span>}
                        {slot.capacityType && <span className="text-[9px] rounded-full bg-[#F3F3F3] text-[#706E6B] border border-[#DDDBDA] px-1.5 py-0.5">{slot.capacityType}</span>}
                        {slot.mfgType && <span className="text-[9px] rounded-full bg-[#EEF2FF] text-[#4F46E5] border border-[#C7D2FE] px-1.5 py-0.5">{slot.mfgType}</span>}
                        {slot.productCode && <span className="text-[9px] rounded-full bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0] px-1.5 py-0.5">{slot.productCode}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-[#DDDBDA] overflow-hidden">
                          <div className={cn("h-full rounded-full transition-all", pct >= 100 ? "bg-[#C23934]" : pct > 70 ? "bg-[#E07900]" : "bg-[#2E844A]")} style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                        <span className="text-[10px] text-[#706E6B] shrink-0 tabular-nums">{slot.remainingCapacity}/{slot.baseCapacity} left</span>
                      </div>
                    </div>
                    {isPicked && <Check className="h-4 w-4 text-[#0176D3] shrink-0" />}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-3 bg-white border-t border-[#DDDBDA] shrink-0">
          <span className={cn("text-xs", error ? "text-[#C23934] font-medium" : "text-[#706E6B]")}>
            {error ?? (selectedSlotId ? "Ready to apply change" : "Select a date, then a slot")}
          </span>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-1.5 text-sm rounded border border-[#DDDBDA] text-[#444444] hover:bg-[#F3F3F3] transition-colors">
              Cancel
            </button>
            <button
              disabled={!selectedSlotId || saving}
              onClick={apply}
              className={cn(
                "flex items-center gap-1.5 px-4 py-1.5 text-sm rounded font-semibold transition-colors",
                selectedSlotId && !saving ? "bg-[#0176D3] text-white hover:bg-[#014486]" : "bg-[#DDDBDA] text-[#706E6B] cursor-not-allowed"
              )}
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
