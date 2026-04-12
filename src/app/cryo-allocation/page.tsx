"use client"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { PageHeader } from "@/components/page-header"
import { AllocationSummary } from "../mfg-allocation/components/allocation-summary"
import { UtilizationTargets } from "../mfg-allocation/components/utilization-targets"
import { GenerateAllocations } from "../mfg-allocation/components/generate-allocations"

export default function CryoAllocationPage() {
  return (
    <div>
      <PageHeader
        title="Cryopreservation Allocation"
        description="Manage cryopreservation capacity and generate daily slot allocations"
      />
      <Tabs defaultValue="summary">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="summary">Allocation Summary</TabsTrigger>
          <TabsTrigger value="weekly-util">Weekly Utilization</TabsTrigger>
          <TabsTrigger value="monthly-util">Monthly Utilization</TabsTrigger>
          <TabsTrigger value="generate">Generate Allocations</TabsTrigger>
        </TabsList>
        <TabsContent value="summary"><AllocationSummary siteType="Cryopreservation" /></TabsContent>
        <TabsContent value="weekly-util"><UtilizationTargets siteType="Cryopreservation" rangeType="Weekly" /></TabsContent>
        <TabsContent value="monthly-util"><UtilizationTargets siteType="Cryopreservation" rangeType="Monthly" /></TabsContent>
        <TabsContent value="generate"><GenerateAllocations siteType="Cryopreservation" /></TabsContent>
      </Tabs>
    </div>
  )
}
