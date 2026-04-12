"use client"
import { useEffect, useState } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AllocationSummary } from "../mfg-allocation/components/allocation-summary"
import { UtilizationTargets } from "../mfg-allocation/components/utilization-targets"
import { GenerateAllocations } from "../mfg-allocation/components/generate-allocations"
import { Filter, Search, X } from "lucide-react"
import type { AllocationFilters } from "../mfg-allocation/page"

const EMPTY_FILTERS: AllocationFilters = { selectedSite: "", selectedProduct: "", dateFrom: "", dateTo: "" }

export default function CryoAllocationPage() {
  const [sites, setSites] = useState<{ id: number; name: string }[]>([])
  const [products, setProducts] = useState<{ id: number; name: string; code: string }[]>([])
  const [draft, setDraft] = useState<AllocationFilters>({ ...EMPTY_FILTERS })
  const [applied, setApplied] = useState<AllocationFilters>({ ...EMPTY_FILTERS })

  useEffect(() => {
    fetch("/api/accounts?siteType=Cryopreservation&active=true").then(r => r.json()).then(setSites)
    fetch("/api/products?active=true").then(r => r.json()).then(setProducts)
  }, [])

  const handleApply = () => setApplied({ ...draft })
  const handleClear = () => { setDraft({ ...EMPTY_FILTERS }); setApplied({ ...EMPTY_FILTERS }) }
  const hasFilters = applied.selectedSite || applied.selectedProduct || applied.dateFrom || applied.dateTo
  const draftChanged = JSON.stringify(draft) !== JSON.stringify(applied)

  return (
    <div>
      <PageHeader
        title="Cryopreservation Allocation"
        description="Manage cryopreservation capacity and generate daily slot allocations"
      />

      {/* Global Filters */}
      <div className="flex gap-3 items-end flex-wrap rounded-xl border bg-white p-4 shadow-sm mb-4">
        <Filter className="h-4 w-4 text-gray-400 shrink-0 mb-2" />
        <div className="min-w-[200px]">
          <Label className="text-xs text-gray-500">Cryopreservation Site</Label>
          <Select
            value={draft.selectedSite}
            onChange={e => setDraft(f => ({ ...f, selectedSite: e.target.value }))}
            options={sites.map(s => ({ value: String(s.id), label: s.name }))}
            placeholder="All sites"
          />
        </div>
        <div className="min-w-[180px]">
          <Label className="text-xs text-gray-500">Product</Label>
          <Select
            value={draft.selectedProduct}
            onChange={e => setDraft(f => ({ ...f, selectedProduct: e.target.value }))}
            options={products.map(p => ({ value: p.code, label: `${p.name} (${p.code})` }))}
            placeholder="All products"
          />
        </div>
        <div>
          <Label className="text-xs text-gray-500">From</Label>
          <Input type="date" value={draft.dateFrom} onChange={e => setDraft(f => ({ ...f, dateFrom: e.target.value }))} className="w-40" />
        </div>
        <div>
          <Label className="text-xs text-gray-500">To</Label>
          <Input type="date" value={draft.dateTo} onChange={e => setDraft(f => ({ ...f, dateTo: e.target.value }))} className="w-40" />
        </div>
        <Button onClick={handleApply} className={draftChanged
          ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg shadow-blue-500/20"
          : "bg-gray-900 hover:bg-gray-800"
        }>
          <Search className="h-3.5 w-3.5 mr-1.5" />
          Apply Filters
        </Button>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={handleClear} className="text-gray-500 hover:text-red-600">
            <X className="h-3.5 w-3.5 mr-1" /> Clear
          </Button>
        )}
      </div>

      <Tabs defaultValue="summary">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="summary">Allocation Summary</TabsTrigger>
          <TabsTrigger value="weekly-util">Weekly Utilization</TabsTrigger>
          <TabsTrigger value="monthly-util">Monthly Utilization</TabsTrigger>
          <TabsTrigger value="generate">Generate Allocations</TabsTrigger>
        </TabsList>
        <TabsContent value="summary"><AllocationSummary siteType="Cryopreservation" filters={applied} /></TabsContent>
        <TabsContent value="weekly-util"><UtilizationTargets siteType="Cryopreservation" rangeType="Weekly" filters={applied} /></TabsContent>
        <TabsContent value="monthly-util"><UtilizationTargets siteType="Cryopreservation" rangeType="Monthly" filters={applied} /></TabsContent>
        <TabsContent value="generate"><GenerateAllocations siteType="Cryopreservation" /></TabsContent>
      </Tabs>
    </div>
  )
}
