"use client"
import Link from "next/link"
import {
  Factory, Snowflake, Eye, Database, Zap, TrendingUp, AlertTriangle,
  CheckCircle2, Clock, Activity, Bot, ArrowRight, Layers, BarChart3
} from "lucide-react"

const quickLinks = [
  {
    title: "Mfg Allocation",
    description: "Manage manufacturing capacity and generate daily allocations",
    href: "/mfg-allocation",
    icon: Factory,
    gradient: "from-blue-500 to-cyan-500",
    glow: "glow-blue",
  },
  {
    title: "Cryo Allocation",
    description: "Manage cryopreservation capacity and slot allocation",
    href: "/cryo-allocation",
    icon: Snowflake,
    gradient: "from-purple-500 to-pink-500",
    glow: "glow-purple",
  },
  {
    title: "Order Visibility",
    description: "Track orders, milestones, and identify at-risk deliveries",
    href: "/order-visibility",
    icon: Eye,
    gradient: "from-amber-500 to-orange-500",
    glow: "glow-amber",
  },
  {
    title: "Master Data",
    description: "Products, sites, care programs, and scheduling configuration",
    href: "/master-data/products",
    icon: Database,
    gradient: "from-emerald-500 to-teal-500",
    glow: "glow-green",
  },
]

const stats = [
  { label: "Active Orders", value: "—", icon: Layers, color: "text-blue-600", bg: "bg-blue-50" },
  { label: "On Track", value: "—", icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
  { label: "At Risk", value: "—", icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50" },
  { label: "Delayed", value: "—", icon: Clock, color: "text-red-600", bg: "bg-red-50" },
]

export default function Home() {
  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-blue-950 to-purple-950 p-8 lg:p-12 shadow-2xl">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.03%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-50" />

        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-400 to-purple-500 shadow-lg shadow-blue-500/30">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <div className="flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm px-3 py-1 border border-white/10">
              <Zap className="h-3 w-3 text-green-400" />
              <span className="text-xs font-medium text-green-300">AI-Powered Scheduling</span>
            </div>
          </div>

          <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">
            Slot Management System
          </h1>
          <p className="text-gray-400 max-w-2xl text-lg">
            Orchestrate cell &amp; gene therapy supply chain — from apheresis through manufacturing to patient delivery. Intelligent capacity management with real-time risk visibility.
          </p>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 p-4 metric-card"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`rounded-lg p-1.5 ${stat.bg}`}>
                    <stat.icon className={`h-3.5 w-3.5 ${stat.color}`} />
                  </div>
                  <span className="text-xs font-medium text-gray-400">{stat.label}</span>
                </div>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-4 w-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Quick Access</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`group relative rounded-xl border border-gray-200/80 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${link.glow}`}
            >
              <div className={`inline-flex rounded-xl bg-gradient-to-br ${link.gradient} p-3 shadow-lg`}>
                <link.icon className="h-5 w-5 text-white" />
              </div>
              <h3 className="mt-4 font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                {link.title}
              </h3>
              <p className="mt-1 text-sm text-gray-500 leading-relaxed">{link.description}</p>
              <ArrowRight className="absolute right-4 bottom-6 h-4 w-4 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
            </Link>
          ))}
        </div>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200/80 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="h-4 w-4 text-blue-500" />
            <h3 className="font-semibold text-gray-900">Engines</h3>
          </div>
          <div className="space-y-2">
            {["Allocation Engine", "Aph Availability Engine", "Lead-Time Management", "Exception Engine"].map((e) => (
              <div key={e} className="flex items-center gap-2 text-sm">
                <span className="h-2 w-2 rounded-full bg-green-400" />
                <span className="text-gray-600">{e}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200/80 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-purple-500" />
            <h3 className="font-semibold text-gray-900">Capacity Pipeline</h3>
          </div>
          <div className="space-y-3">
            {[
              { step: "Apheresis", color: "bg-blue-400" },
              { step: "Cryopreservation", color: "bg-purple-400" },
              { step: "Manufacturing", color: "bg-amber-400" },
              { step: "Delivery", color: "bg-green-400" },
            ].map((s) => (
              <div key={s.step} className="flex items-center gap-3">
                <div className={`h-2 w-2 rounded-full ${s.color}`} />
                <span className="text-sm text-gray-600 flex-1">{s.step}</span>
                <span className="text-xs text-gray-400">—</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200/80 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Database className="h-4 w-4 text-emerald-500" />
            <h3 className="font-semibold text-gray-900">Master Data</h3>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {["Products", "Care Programs", "Sites", "LTM Config", "Holidays", "Site Rels", "IBP", "MPS", "GDLT", "Daily Cap"].map((item) => (
              <div key={item} className="flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-gray-300" />
                <span className="text-gray-500 truncate">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
