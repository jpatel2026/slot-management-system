"use client"
import { useEffect, useState, useCallback } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { PageHeader } from "@/components/page-header"
import { Select } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AllocationSummary } from "./components/allocation-summary"
import { UtilizationTargets } from "./components/utilization-targets"
import { QueueCaps } from "./components/queue-caps"
import { GenerateAllocations } from "./components/generate-allocations"
import { Filter } from "lucide-react"

export interface AllocationFilters {
  selectedSite: string
  selectedProduct: string
  dateFrom: string
  dateTo: string
}

export default function MfgAllocationPage() {
  const [sites, setSites] = useState<{ id: number; name: string }[]>([])
  const [products, setProducts] = useState<{ id: number; name: string; code: string }[]>([])
  const [filters, setFilters] = useState<AllocationFilters>({
    selectedSite: "", selectedProduct: "", dateFrom: "", dateTo: "",
  })

  useEffect(() => {
    fetch("/api/accounts?siteType=Manufacturing&active=true").then(r => r.json()).then(setSites)
    fetch("/api/products?active=true").then(r => r.json()).then(setProducts)
  }, [])

  return (
    <div>
      <PageHeader
        title="Manufacturing Allocation"
        description="Manage manufacturing capacity, utilization targets, and generate daily allocations"
      />

      {/* Global Filters — above tabs, applies to all sub-tabs */}
      <div className="flex gap-3 items-end flex-wrap rounded-xl border bg-white p-4 shadow-sm mb-4">
        <Filter className="h-4 w-4 text-gray-400 shrink-0 mb-2" />
        <div className="min-w-[200px]">
          <Label className="text-xs text-gray-500">Manufacturing Site</Label>
          <Select
            value={filters.selectedSite}
            onChange={e => setFilters(f => ({ ...f, selectedSite: e.target.value }))}
            options={sites.map(s => ({ value: String(s.id), label: s.name }))}
            placeholder="All sites"
          />
        </div>
        <div className="min-w-[180px]">
          <Label className="text-xs text-gray-500">Product</Label>
          <Select
            value={filters.selectedProduct}
            onChange={e => setFilters(f => ({ ...f, selectedProduct: e.target.value }))}
            options={products.map(p => ({ value: p.code, label: `${p.name} (${p.code})` }))}
            placeholder="All products"
          />
        </div>
        <div>
          <Label className="text-xs text-gray-500">From</Label>
          <Input type="date" value={filters.dateFrom} onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))} className="w-40" />
        </div>
        <div>
          <Label className="text-xs text-gray-500">To</Label>
          <Input type="date" value={filters.dateTo} onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))} className="w-40" />
        </div>
      </div>

      <Tabs defaultValue="summary">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="summary">Allocation Summary</TabsTrigger>
          <TabsTrigger value="weekly-util">Weekly Utilization</TabsTrigger>
          <TabsTrigger value="monthly-util">Monthly Utilization</TabsTrigger>
          <TabsTrigger value="queue">Queue Caps</TabsTrigger>
          <TabsTrigger value="generate">Generate Allocations</TabsTrigger>
        </TabsList>
        <TabsContent value="summary"><AllocationSummary siteType="Manufacturing" filters={filters} /></TabsContent>
        <TabsContent value="weekly-util"><UtilizationTargets siteType="Manufacturing" rangeType="Weekly" filters={filters} /></TabsContent>
        <TabsContent value="monthly-util"><UtilizationTargets siteType="Manufacturing" rangeType="Monthly" filters={filters} /></TabsContent>
        <TabsContent value="queue"><QueueCaps filters={filters} /></TabsContent>
        <TabsContent value="generate"><GenerateAllocations siteType="Manufacturing" /></TabsContent>
      </Tabs>
    </div>
  )
}
