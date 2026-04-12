"use client"
import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { formatDate } from "@/lib/utils"
import { ArrowLeft, RefreshCw, XCircle, ArrowRightLeft, PauseCircle } from "lucide-react"

interface Product {
  id: number; name: string; code: string
}

interface Account {
  id: number; name: string; alias: string; siteType: string
}

interface DailyCapacity {
  id: number; name: string; date: string; capacityType: string
}

interface Milestone {
  id: number; milestoneId: string; milestoneName: string; leg: number
  sequentialLeg: number; plannedDate: string; actualDate: string | null
  orderReservationId: string
}

interface OrderDetail {
  id: string; status: string; country: string; productId: number
  therapyType: string; cryoType: string; originalPdd: string; plannedPdd: string
  remanufacturingFlag: boolean; reapheresisFlag: boolean; aphPickupDate: string | null
  product: Product
  aphSite: Account; cryoSite: Account | null; mfgSite: Account
  wdcSite: Account | null; infusionSite: Account | null
  cryoCapacity: DailyCapacity | null; mfgCapacity: DailyCapacity
  milestones: Milestone[]
  createdAt: string; updatedAt: string
}

const statusBadge: Record<string, "info" | "warning" | "success" | "secondary" | "destructive"> = {
  Booked: "info",
  "In Progress": "warning",
  Completed: "success",
  Cancelled: "secondary",
  "On Hold": "warning",
}

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const orderId = params.id as string
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [loading, setLoading] = useState(true)

  const fetchOrder = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/orders/${orderId}`)
    if (res.ok) {
      const data = await res.json()
      setOrder(data)
    }
    setLoading(false)
  }, [orderId])

  const fetchMilestones = useCallback(async () => {
    const res = await fetch(`/api/milestones?orderReservationId=${orderId}`)
    if (res.ok) {
      setMilestones(await res.json())
    }
  }, [orderId])

  useEffect(() => { fetchOrder() }, [fetchOrder])
  useEffect(() => { fetchMilestones() }, [fetchMilestones])

  const handleAction = async (action: string) => {
    const res = await fetch(`/api/orders/${orderId}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    })
    if (res.ok) {
      fetchOrder()
      fetchMilestones()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 mb-4">Order not found</p>
        <Button variant="outline" onClick={() => router.push("/master-data/orders")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Orders
        </Button>
      </div>
    )
  }

  const allMilestones = milestones.length > 0 ? milestones : order.milestones || []
  const sortedMilestones = [...allMilestones].sort((a, b) => a.sequentialLeg - b.sequentialLeg)

  return (
    <div>
      <PageHeader title={`Order ${order.id.slice(0, 12)}...`} description="Order reservation detail view">
        <Button variant="outline" onClick={() => router.push("/master-data/orders")}>
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
        </Button>
      </PageHeader>

      {/* Status Bar */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-gradient-to-r from-white to-blue-50/50 p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Badge variant={statusBadge[order.status] || "secondary"} className={`text-base px-3 py-1 ${order.status === "On Hold" ? "bg-orange-100 text-orange-800" : ""}`}>
            {order.status}
          </Badge>
          <span className="text-sm text-gray-500">Created {formatDate(order.createdAt)}</span>
          {order.remanufacturingFlag && <Badge variant="destructive">Remanufacturing</Badge>}
          {order.reapheresisFlag && <Badge variant="destructive">Reapheresis</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleAction("reschedule")} disabled={order.status === "Cancelled" || order.status === "Completed"}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Reschedule
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleAction("swap")} disabled={order.status === "Cancelled" || order.status === "Completed"}>
            <ArrowRightLeft className="h-3.5 w-3.5 mr-1.5" /> Swap
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleAction("hold")} disabled={order.status === "Cancelled" || order.status === "Completed" || order.status === "On Hold"}>
            <PauseCircle className="h-3.5 w-3.5 mr-1.5" /> Hold
          </Button>
          <Button variant="outline" size="sm" className="text-red-600 hover:bg-red-50 border-red-200" onClick={() => handleAction("cancel")} disabled={order.status === "Cancelled" || order.status === "Completed"}>
            <XCircle className="h-3.5 w-3.5 mr-1.5" /> Cancel
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Order Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Order Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Order ID</span>
                <code className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded">{order.id}</code>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Country</span>
                <span className="font-medium">{order.country}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Product</span>
                <code className="text-xs font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{order.product?.code} - {order.product?.name}</code>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Therapy Type</span>
                <Badge variant={order.therapyType === "Commercial" ? "info" : "purple"}>{order.therapyType}</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Cryo Type</span>
                <Badge variant="secondary">{order.cryoType}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dates */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Key Dates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Original PDD</span>
                <span className="font-medium">{formatDate(order.originalPdd)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Planned PDD</span>
                <span className="font-semibold text-blue-700">{formatDate(order.plannedPdd)}</span>
              </div>
              {order.aphPickupDate && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Aph Pickup Date</span>
                  <span>{formatDate(order.aphPickupDate)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Last Updated</span>
                <span className="text-gray-600">{formatDate(order.updatedAt)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sites */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Site Routing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Apheresis</span>
                <code className="text-xs font-mono bg-purple-50 text-purple-700 px-2 py-0.5 rounded">{order.aphSite?.alias || "-"}</code>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Cryopreservation</span>
                <code className="text-xs font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{order.cryoSite?.alias || "N/A"}</code>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Manufacturing</span>
                <code className="text-xs font-mono bg-amber-50 text-amber-700 px-2 py-0.5 rounded">{order.mfgSite?.alias || "-"}</code>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">WDC</span>
                <code className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded">{order.wdcSite?.alias || "N/A"}</code>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Infusion</span>
                <code className="text-xs font-mono bg-green-50 text-green-700 px-2 py-0.5 rounded">{order.infusionSite?.alias || "-"}</code>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Capacity */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Capacity Slots</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Mfg Capacity Slot</span>
                <span className="font-mono text-xs">{order.mfgCapacity?.name || "-"}</span>
              </div>
              {order.cryoCapacity && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Cryo Capacity Slot</span>
                  <span className="font-mono text-xs">{order.cryoCapacity.name}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Milestone Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Milestone Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedMilestones.length === 0 ? (
            <p className="text-center text-gray-400 py-8">No milestones found for this order</p>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-gradient-to-b from-blue-300 via-purple-300 to-green-300" />
              <div className="space-y-4">
                {sortedMilestones.map((m, idx) => {
                  const isCompleted = !!m.actualDate
                  const isCurrent = !isCompleted && idx > 0 && !!sortedMilestones[idx - 1]?.actualDate
                  return (
                    <div key={m.id || idx} className="relative flex items-start gap-4 pl-3">
                      <div className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${
                        isCompleted ? "border-green-500 bg-green-500 text-white" :
                        isCurrent ? "border-blue-500 bg-blue-500 text-white animate-pulse" :
                        "border-gray-300 bg-white text-gray-400"
                      }`}>
                        {m.sequentialLeg}
                      </div>
                      <div className={`flex-1 rounded-lg border p-3 ${
                        isCompleted ? "border-green-200 bg-green-50/50" :
                        isCurrent ? "border-blue-200 bg-blue-50/50 shadow-sm" :
                        "border-gray-200 bg-white"
                      }`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium text-sm">{m.milestoneName}</span>
                            <span className="ml-2 text-xs text-gray-400">Leg {m.leg}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs">
                            <div>
                              <span className="text-gray-400">Planned: </span>
                              <span className="font-medium">{formatDate(m.plannedDate)}</span>
                            </div>
                            {m.actualDate && (
                              <div>
                                <span className="text-gray-400">Actual: </span>
                                <span className="font-semibold text-green-700">{formatDate(m.actualDate)}</span>
                              </div>
                            )}
                            {isCompleted && <Badge variant="success" className="text-[10px]">Done</Badge>}
                            {isCurrent && <Badge variant="info" className="text-[10px]">Current</Badge>}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
