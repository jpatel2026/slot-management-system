"use client"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { PageHeader } from "@/components/page-header"
import { OrderGrid } from "./components/order-grid"
import { AtRiskDashboard } from "./components/at-risk-dashboard"

export default function OrderVisibilityPage() {
  return (
    <div>
      <PageHeader
        title="Order Visibility"
        description="Track patient orders, milestone progress, and identify at-risk deliveries"
      />
      <Tabs defaultValue="grid">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="grid">Order Visibility</TabsTrigger>
          <TabsTrigger value="at-risk">At-Risk Dashboard</TabsTrigger>
        </TabsList>
        <TabsContent value="grid"><OrderGrid /></TabsContent>
        <TabsContent value="at-risk"><AtRiskDashboard /></TabsContent>
      </Tabs>
    </div>
  )
}
