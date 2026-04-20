"use client"
import { useEffect, useState } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AllocationSummary } from "./components/allocation-summary"
import { UtilizationTargets } from "./components/utilization-targets"
import { QueueCaps } from "./components/queue-caps"
import { GenerateAllocations } from "./components/generate-allocations"
import { ScheduleOptimizer } from "./components/schedule-optimizer"
import { Filter, Search, X } from "lucide-react"

export interface AllocationFilters {
  selectedSite: string
  selectedProduct: string
  dateFrom: string
  dateTo: string
}

const EMPTY_FILTERS: AllocationFilters = { selectedSite: "", selectedProduct: "", dateFrom: "", dateTo: "" }

export default function MfgAllocationPage() {
  const [sites, setSites] = useState<{ id: number; name: string }[]>([])
  const [products, setProducts] = useState<{ id: number; name: string; code: string }[]>([])
  const [draft, setDraft] = useState<AllocationFilters>({ ...EMPTY_FILTERS })
  const [applied, setApplied] = useState<AllocationFilters>({ ...EMPTY_FILTERS })

  useEffect(() => {
    fetch("/api/accounts?siteType=Manufacturing&active=true").then(r => r.json()).then(setSites)
    fetch("/api/products?active=true").then(r => r.json()).then(setProducts)
  }, [])

  const handleApply = () => setApplied({ ...draft })
  const handleClear = () => { setDraft({ ...EMPTY_FILTERS }); setApplied({ ...EMPTY_FILTERS }) }
  const hasFilters = applied.selectedSite || applied.selectedProduct || applied.dateFrom || applied.dateTo
  const draftChanged = JSON.stringify(draft) !== JSON.stringify(applied)

  return (
    <div>
      <PageHeader
        title="Mfg Capacity Management"
        description="Manage manufacturing capacity, utilization targets, and generate daily allocations"
      />

      {/* Global Filters — SLDS filter bar */}
      <div className="flex gap-3 items-end flex-wrap rounded border border-[#DDDBDA] bg-white px-4 py-3 shadow-sm mb-4">
        <Filter className="h-4 w-4 text-[#706E6B] shrink-0 mb-2" />
        <div className="min-w-[200px]">
          <Label className="text-[11px] font-medium text-[#3E3E3C] mb-1 block">Manufacturing Site</Label>
          <Select
            value={draft.selectedSite}
            onChange={e => setDraft(f => ({ ...f, selectedSite: e.target.value }))}
            options={sites.map(s => ({ value: String(s.id), label: s.name }))}
            placeholder="All sites"
          />
        </div>
        <div className="min-w-[180px]">
          <Label className="text-[11px] font-medium text-[#3E3E3C] mb-1 block">Product</Label>
          <Select
            value={draft.selectedProduct}
            onChange={e => setDraft(f => ({ ...f, selectedProduct: e.target.value }))}
            options={products.map(p => ({ value: p.code, label: `${p.name} (${p.code})` }))}
            placeholder="Select product"
          />
        </div>
        <div>
          <Label className="text-[11px] font-medium text-[#3E3E3C] mb-1 block">From</Label>
          <Input type="date" value={draft.dateFrom} onChange={e => setDraft(f => ({ ...f, dateFrom: e.target.value }))} className="w-40" />
        </div>
        <div>
          <Label className="text-[11px] font-medium text-[#3E3E3C] mb-1 block">To</Label>
          <Input type="date" value={draft.dateTo} onChange={e => setDraft(f => ({ ...f, dateTo: e.target.value }))} className="w-40" />
        </div>
        <Button
          onClick={handleApply}
          className={draftChanged ? "bg-[#0176D3] hover:bg-[#014486] text-white" : "bg-[#706E6B] hover:bg-[#444444] text-white"}
        >
          <Search className="h-3.5 w-3.5 mr-1.5" />
          Apply Filters
        </Button>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={handleClear} className="text-[#706E6B] hover:text-[#C23934]">
            <X className="h-3.5 w-3.5 mr-1" /> Clear
          </Button>
        )}
      </div>

      <Tabs defaultValue="summary">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="summary">Allocation Summary</TabsTrigger>
          <TabsTrigger value="weekly-util">Weekly Utilization</TabsTrigger>
          <TabsTrigger value="monthly-util">Monthly Utilization</TabsTrigger>
          <TabsTrigger value="queue">Queue Caps</TabsTrigger>
          <TabsTrigger value="optimizer">Schedule Optimizer</TabsTrigger>
          <TabsTrigger value="generate">Generate Allocations</TabsTrigger>
        </TabsList>
        <TabsContent value="summary"><AllocationSummary siteType="Manufacturing" filters={applied} /></TabsContent>
        <TabsContent value="weekly-util"><UtilizationTargets siteType="Manufacturing" rangeType="Weekly" filters={applied} /></TabsContent>
        <TabsContent value="monthly-util"><UtilizationTargets siteType="Manufacturing" rangeType="Monthly" filters={applied} /></TabsContent>
        <TabsContent value="queue"><QueueCaps filters={applied} /></TabsContent>
        <TabsContent value="optimizer"><ScheduleOptimizer filters={applied} /></TabsContent>
        <TabsContent value="generate"><GenerateAllocations siteType="Manufacturing" /></TabsContent>
      </Tabs>
    </div>
  )
}
