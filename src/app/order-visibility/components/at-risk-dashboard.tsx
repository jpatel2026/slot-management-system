"use client"
import { useEffect, useState, useCallback } from "react"
import { Badge } from "@/components/ui/badge"
import {
  CheckCircle2, AlertTriangle, Clock, Layers, Activity,
  TrendingUp, Bot, Zap, ArrowRight, Shield
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Order {
  id: string; status: string; plannedPdd: string
  milestones: Array<{
    milestoneName: string; plannedDate: string; actualDate: string | null; sequentialLeg: number
  }>
}

interface OrderClassification {
  total: number; onTrack: number; atRisk: number; delayed: number
}

function classifyOrders(orders: Order[]): OrderClassification {
  const now = new Date()
  let total = 0, onTrack = 0, atRisk = 0, delayed = 0

  for (const order of orders) {
    if (order.status === "Cancelled" || order.status === "On Hold") continue

    // Check if FP Delivery is achieved
    const fpDelivery = order.milestones?.find(m => m.milestoneName.toLowerCase().includes("delivered") || m.milestoneName.toLowerCase().includes("delivery"))
    if (fpDelivery?.actualDate) continue // Completed

    total++

    // Find latest unachieved milestone
    const unachieved = order.milestones
      ?.filter(m => !m.actualDate)
      ?.sort((a, b) => b.sequentialLeg - a.sequentialLeg)

    if (!unachieved || unachieved.length === 0) {
      onTrack++
      continue
    }

    const latestUnachieved = unachieved[0]
    const plannedDate = new Date(latestUnachieved.plannedDate)

    if (plannedDate < now) {
      delayed++
    } else {
      // Check if any past milestone was late (at-risk indicator)
      const achieved = order.milestones?.filter(m => m.actualDate) || []
      const hasLateAchieved = achieved.some(m => {
        const planned = new Date(m.plannedDate)
        const actual = new Date(m.actualDate!)
        return actual > planned
      })
      if (hasLateAchieved) {
        atRisk++
      } else {
        onTrack++
      }
    }
  }

  return { total, onTrack, atRisk, delayed }
}

const phases = [
  { name: "Apheresis", icon: "🧬", color: "from-blue-400 to-blue-600" },
  { name: "Cryopreservation", icon: "🧊", color: "from-purple-400 to-purple-600" },
  { name: "Manufacturing", icon: "🏭", color: "from-amber-400 to-amber-600" },
  { name: "Release & QC", icon: "🔬", color: "from-teal-400 to-teal-600" },
  { name: "Delivery", icon: "🚚", color: "from-green-400 to-green-600" },
]

export function AtRiskDashboard() {
  const [orders, setOrders] = useState<Order[]>([])
  const [classification, setClassification] = useState<OrderClassification>({ total: 0, onTrack: 0, atRisk: 0, delayed: 0 })

  const fetchOrders = useCallback(async () => {
    const res = await fetch("/api/orders")
    const data = await res.json()
    setOrders(data)
    setClassification(classifyOrders(data))
  }, [])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  const tiles = [
    {
      label: "Total Active", value: classification.total, icon: Layers,
      gradient: "from-gray-700 to-gray-900", glow: "", textColor: "text-white",
      subtext: "Excl. Cancelled & On Hold",
    },
    {
      label: "On Track", value: classification.onTrack, icon: CheckCircle2,
      gradient: "from-emerald-500 to-green-600", glow: "glow-green", textColor: "text-white",
      subtext: "All milestones within schedule",
    },
    {
      label: "At Risk", value: classification.atRisk, icon: AlertTriangle,
      gradient: "from-amber-400 to-orange-500", glow: "glow-amber", textColor: "text-white",
      subtext: "Past milestone delays detected",
    },
    {
      label: "Delayed", value: classification.delayed, icon: Clock,
      gradient: "from-red-500 to-rose-600", glow: "glow-red", textColor: "text-white",
      subtext: "Milestone planned date has passed",
    },
  ]

  // Compute per-phase counts (simplified)
  const getPhaseOrders = (phaseName: string) => {
    const activeOrders = orders.filter(o => o.status !== "Cancelled" && o.status !== "On Hold")
    let inPhase = 0, phaseOnTrack = 0, phaseAtRisk = 0, phaseDelayed = 0

    for (const order of activeOrders) {
      const ms = order.milestones || []
      const phaseMs = ms.filter(m => m.milestoneName.toLowerCase().includes(phaseName.toLowerCase().slice(0, 4)))
      if (phaseMs.length === 0) continue

      const hasUnachieved = phaseMs.some(m => !m.actualDate)
      const allAchieved = phaseMs.every(m => m.actualDate)
      if (!hasUnachieved && !allAchieved) continue
      if (hasUnachieved) {
        inPhase++
        const now = new Date()
        const lateMs = phaseMs.find(m => !m.actualDate && new Date(m.plannedDate) < now)
        if (lateMs) phaseDelayed++
        else phaseOnTrack++
      }
    }
    phaseAtRisk = inPhase - phaseOnTrack - phaseDelayed

    return { inPhase, onTrack: phaseOnTrack, atRisk: Math.max(0, phaseAtRisk), delayed: phaseDelayed }
  }

  return (
    <div className="space-y-8">
      {/* AI Agent Status Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-gray-900 via-blue-950 to-purple-950 p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm px-3 py-1 border border-white/10">
            <Bot className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-xs font-medium text-blue-300">Risk Intelligence</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-green-500/20 px-2.5 py-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[10px] font-medium text-green-300">Monitoring</span>
          </div>
        </div>

        {/* Summary Tiles */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
          {tiles.map((tile) => (
            <div
              key={tile.label}
              className={cn(
                "relative rounded-xl bg-gradient-to-br p-5 shadow-lg metric-card overflow-hidden",
                tile.gradient, tile.glow
              )}
            >
              <div className="absolute top-0 right-0 w-20 h-20 opacity-10">
                <tile.icon className="w-full h-full" />
              </div>
              <div className="relative">
                <div className="flex items-center gap-2 mb-1">
                  <tile.icon className={cn("h-4 w-4", tile.textColor)} />
                  <span className={cn("text-xs font-semibold uppercase tracking-wider opacity-80", tile.textColor)}>
                    {tile.label}
                  </span>
                </div>
                <p className={cn("text-4xl font-bold", tile.textColor)}>{tile.value}</p>
                <p className={cn("text-[10px] mt-1 opacity-60", tile.textColor)}>{tile.subtext}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Milestone Journey Visualization */}
      <div className="rounded-xl border bg-white shadow-sm p-6">
        <div className="flex items-center gap-2 mb-6">
          <Activity className="h-4 w-4 text-blue-500" />
          <h3 className="font-semibold text-gray-900">Patient Journey — Milestone Tracking</h3>
          <Badge variant="secondary" className="text-[10px] ml-2">Real-time</Badge>
        </div>

        <div className="flex items-center gap-1">
          {phases.map((phase, idx) => {
            const phaseData = getPhaseOrders(phase.name)
            return (
              <div key={phase.name} className="flex-1 flex items-center">
                <div className="flex-1">
                  <div className={cn("rounded-xl bg-gradient-to-r p-4 text-white relative overflow-hidden", phase.color)}>
                    <div className="absolute inset-0 bg-white/5" />
                    <div className="relative">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">{phase.icon}</span>
                        <span className="text-xs font-bold uppercase tracking-wider">{phase.name}</span>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="opacity-80">In Phase</span>
                          <span className="font-bold">{phaseData.inPhase}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1 opacity-80">
                            <CheckCircle2 className="h-2.5 w-2.5" /> On Track
                          </span>
                          <span className="font-medium">{phaseData.onTrack}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1 opacity-80">
                            <AlertTriangle className="h-2.5 w-2.5" /> At Risk
                          </span>
                          <span className="font-medium">{phaseData.atRisk}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1 opacity-80">
                            <Clock className="h-2.5 w-2.5" /> Delayed
                          </span>
                          <span className="font-medium">{phaseData.delayed}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {idx < phases.length - 1 && (
                  <ArrowRight className="h-4 w-4 text-gray-300 mx-1 shrink-0" />
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Alerts */}
        <div className="rounded-xl border bg-white shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-4 w-4 text-amber-500" />
            <h3 className="font-semibold text-gray-900">Recent Alerts</h3>
            <Zap className="h-3 w-3 text-amber-400 animate-pulse ml-auto" />
          </div>
          <div className="space-y-3">
            {orders.length > 0 ? (
              orders.slice(0, 5).map((order) => {
                const latestMs = order.milestones?.filter(m => !m.actualDate)?.[0]
                if (!latestMs) return null
                const isLate = new Date(latestMs.plannedDate) < new Date()
                return (
                  <div key={order.id} className={cn(
                    "flex items-center gap-3 rounded-lg border p-3 transition-all",
                    isLate ? "border-red-200 bg-red-50" : "border-gray-100"
                  )}>
                    <div className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                      isLate ? "bg-red-100" : "bg-amber-100"
                    )}>
                      {isLate ? <Clock className="h-4 w-4 text-red-500" /> : <AlertTriangle className="h-4 w-4 text-amber-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {order.id.slice(0, 16)}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {isLate ? "Delayed" : "Pending"}: {latestMs.milestoneName}
                      </p>
                    </div>
                    <Badge variant={isLate ? "destructive" : "warning"} className="text-[10px] shrink-0">
                      {isLate ? "DELAYED" : "AT RISK"}
                    </Badge>
                  </div>
                )
              })
            ) : (
              <div className="text-center py-8 text-gray-400 text-sm">
                No alerts. All systems nominal.
              </div>
            )}
          </div>
        </div>

        {/* Lead-Time Performance */}
        <div className="rounded-xl border bg-white shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-blue-500" />
            <h3 className="font-semibold text-gray-900">Lead-Time Performance</h3>
          </div>
          <div className="space-y-4">
            {[
              { label: "A2M (Aph to Mfg)", target: 5, actual: "—", color: "bg-blue-500" },
              { label: "A2R (Aph to Release)", target: 25, actual: "—", color: "bg-purple-500" },
              { label: "A2D (Aph to Delivery)", target: 30, actual: "—", color: "bg-green-500" },
            ].map((metric) => (
              <div key={metric.label} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-700">{metric.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">Target: {metric.target}d</span>
                    <span className="font-semibold">{metric.actual}</span>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-gray-100">
                  <div className={cn("h-full rounded-full", metric.color)} style={{ width: "0%" }} />
                </div>
              </div>
            ))}
            <div className="text-xs text-gray-400 text-center pt-2 border-t">
              Performance data populates as orders complete milestones
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
