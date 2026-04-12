"use client"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { PageHeader } from "@/components/page-header"
import { AllocationSummary } from "./components/allocation-summary"
import { UtilizationTargets } from "./components/utilization-targets"
import { QueueCaps } from "./components/queue-caps"
import { GenerateAllocations } from "./components/generate-allocations"

export default function MfgAllocationPage() {
  return (
    <div>
      <PageHeader
        title="Manufacturing Allocation"
        description="Manage manufacturing capacity, utilization targets, and generate daily allocations"
      />
      <Tabs defaultValue="summary">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="summary">Allocation Summary</TabsTrigger>
          <TabsTrigger value="weekly-util">Weekly Utilization</TabsTrigger>
          <TabsTrigger value="monthly-util">Monthly Utilization</TabsTrigger>
          <TabsTrigger value="queue">Queue Caps</TabsTrigger>
          <TabsTrigger value="generate">Generate Allocations</TabsTrigger>
        </TabsList>
        <TabsContent value="summary"><AllocationSummary siteType="Manufacturing" /></TabsContent>
        <TabsContent value="weekly-util"><UtilizationTargets siteType="Manufacturing" rangeType="Weekly" /></TabsContent>
        <TabsContent value="monthly-util"><UtilizationTargets siteType="Manufacturing" rangeType="Monthly" /></TabsContent>
        <TabsContent value="queue"><QueueCaps /></TabsContent>
        <TabsContent value="generate"><GenerateAllocations siteType="Manufacturing" /></TabsContent>
      </Tabs>
    </div>
  )
}
