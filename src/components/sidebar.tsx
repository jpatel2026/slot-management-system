"use client"
import React, { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Package, Building2, Settings2, Calendar, Link2, BarChart3,
  Factory, Snowflake, Eye, ChevronDown, ChevronRight, Zap,
  Database, FlaskConical, Truck, ClipboardList, Timer, Gauge,
  Bot, Layers, GitBranch
} from "lucide-react"
import { ScenarioSelector } from "./scenario-selector"
import { useScenarioContext } from "./scenario-context"

interface NavItem {
  label: string
  href?: string
  icon: React.ElementType
  children?: NavItem[]
}

const navigation: NavItem[] = [
  {
    label: "Master Data",
    icon: Database,
    children: [
      { label: "Products", href: "/master-data/products", icon: Package },
      { label: "Care Programs", href: "/master-data/care-programs", icon: FlaskConical },
      { label: "Sites", href: "/master-data/accounts", icon: Building2 },
      { label: "LTM Config", href: "/master-data/ltm-config", icon: Settings2 },
      { label: "Holidays", href: "/master-data/holidays", icon: Calendar },
      { label: "Site Relationships", href: "/master-data/site-relationships", icon: Link2 },
      { label: "IBP", href: "/master-data/ibp", icon: BarChart3 },
      { label: "MPS", href: "/master-data/mps", icon: ClipboardList },
      { label: "GDLT", href: "/master-data/gdlt", icon: Timer },
      { label: "Daily Capacity", href: "/master-data/daily-capacity", icon: Layers },
      { label: "Orders", href: "/master-data/orders", icon: Truck },
      { label: "Utilization", href: "/master-data/utilization", icon: Gauge },
    ],
  },
  { label: "Mfg Allocation", href: "/mfg-allocation", icon: Factory },
  { label: "Cryo Allocation", href: "/cryo-allocation", icon: Snowflake },
  { label: "Order Visibility", href: "/order-visibility", icon: Eye },
  { label: "Scenarios", href: "/scenarios", icon: GitBranch },
]

function NavGroup({ item }: { item: NavItem }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(
    item.children?.some(c => c.href && pathname.startsWith(c.href)) ?? false
  )

  if (item.children) {
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-300 hover:bg-white/5 hover:text-white transition-all duration-200"
        >
          <item.icon className="h-4 w-4 text-gray-500" />
          <span className="flex-1 text-left">{item.label}</span>
          {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </button>
        {open && (
          <div className="ml-4 mt-1 space-y-0.5 border-l border-white/10 pl-3">
            {item.children.map((child) => (
              <NavLink key={child.href} item={child} />
            ))}
          </div>
        )}
      </div>
    )
  }

  return <NavLink item={item} />
}

function NavLink({ item }: { item: NavItem }) {
  const pathname = usePathname()
  const active = item.href ? pathname === item.href || pathname.startsWith(item.href + "/") : false

  return (
    <Link
      href={item.href || "#"}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-200",
        active
          ? "bg-gradient-to-r from-blue-600/20 to-purple-600/20 text-white font-medium border border-blue-500/20"
          : "text-gray-400 hover:bg-white/5 hover:text-white"
      )}
    >
      <item.icon className={cn("h-4 w-4", active ? "text-blue-400" : "text-gray-500")} />
      <span>{item.label}</span>
      {active && (
        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
      )}
    </Link>
  )
}

export function Sidebar() {
  const { scenarioId } = useScenarioContext()
  return (
    <aside className={cn(
      "fixed left-0 top-0 z-40 h-screen w-64 border-r bg-gray-950 flex flex-col transition-colors",
      scenarioId ? "border-amber-500/30" : "border-white/10"
    )}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/20">
          <Bot className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-white tracking-tight">Slot Manager</h1>
        </div>
        <Zap className="ml-auto h-3 w-3 text-green-400 animate-pulse" />
      </div>

      {/* Scenario Selector */}
      <ScenarioSelector />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navigation.map((item) => (
          <NavGroup key={item.label} item={item} />
        ))}
      </nav>

      {/* Status Footer */}
      <div className="border-t border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className={cn("h-2 w-2 rounded-full animate-pulse", scenarioId ? "bg-amber-400" : "bg-green-400")} />
          <span className="text-xs text-gray-500">
            {scenarioId ? "Scenario Mode" : "System Online"}
          </span>
        </div>
      </div>
    </aside>
  )
}
