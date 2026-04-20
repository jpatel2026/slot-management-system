"use client"
import React, { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Package, Building2, Settings2, Calendar, Link2, BarChart3,
  Factory, Snowflake, Eye, ChevronDown, ChevronRight,
  Database, FlaskConical, Truck, ClipboardList, Timer, Gauge,
  Layers, GitBranch
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
      { label: "Products",          href: "/master-data/products",           icon: Package },
      { label: "Care Programs",     href: "/master-data/care-programs",      icon: FlaskConical },
      { label: "Sites",             href: "/master-data/accounts",           icon: Building2 },
      { label: "LTM Config",        href: "/master-data/ltm-config",         icon: Settings2 },
      { label: "Holidays",          href: "/master-data/holidays",           icon: Calendar },
      { label: "Site Relationships",href: "/master-data/site-relationships", icon: Link2 },
      { label: "IBP",               href: "/master-data/ibp",                icon: BarChart3 },
      { label: "MPS",               href: "/master-data/mps",                icon: ClipboardList },
      { label: "GDLT",              href: "/master-data/gdlt",               icon: Timer },
      { label: "Daily Capacity",    href: "/master-data/daily-capacity",     icon: Layers },
      { label: "Orders",            href: "/master-data/orders",             icon: Truck },
      { label: "Utilization",       href: "/master-data/utilization",        icon: Gauge },
    ],
  },
  { label: "Mfg Capacity Management",  href: "/mfg-allocation",  icon: Factory },
  { label: "Cryo Capacity Management", href: "/cryo-allocation", icon: Snowflake },
  { label: "Order Visibility",         href: "/order-visibility",icon: Eye },
  { label: "Scenarios",                href: "/scenarios",       icon: GitBranch },
]

function NavGroup({ item }: { item: NavItem }) {
  const pathname = usePathname()
  const isChildActive = item.children?.some(c => c.href && pathname.startsWith(c.href)) ?? false
  const [open, setOpen] = useState(isChildActive)

  if (item.children) {
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className={cn(
            "flex w-full items-center gap-2 rounded px-3 py-2 text-[11px] font-bold uppercase tracking-widest transition-colors",
            isChildActive ? "text-[#0176D3]" : "text-[#706E6B] hover:text-[#181818] hover:bg-[#F3F3F3]"
          )}
        >
          <item.icon className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1 text-left">{item.label}</span>
          {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </button>
        {open && (
          <div className="ml-0 mt-0.5 space-y-px">
            {item.children.map(child => (
              <NavLink key={child.href} item={child} indent />
            ))}
          </div>
        )}
      </div>
    )
  }
  return <NavLink item={item} />
}

function NavLink({ item, indent }: { item: NavItem; indent?: boolean }) {
  const pathname = usePathname()
  const active = item.href
    ? pathname === item.href || pathname.startsWith(item.href + "/")
    : false

  return (
    <Link
      href={item.href || "#"}
      className={cn(
        "flex items-center gap-2.5 py-[7px] text-[13px] transition-colors rounded border-l-[3px]",
        indent ? "pl-8 pr-3" : "px-3",
        active
          ? "bg-[#EBF4FF] text-[#0176D3] font-semibold border-[#0176D3]"
          : "text-[#444444] border-transparent hover:bg-[#F3F3F3] hover:text-[#181818]"
      )}
    >
      <item.icon className={cn("h-4 w-4 shrink-0", active ? "text-[#0176D3]" : "text-[#706E6B]")} />
      <span className="truncate">{item.label}</span>
    </Link>
  )
}

export function Sidebar() {
  const { scenarioId } = useScenarioContext()
  return (
    <aside className="fixed left-0 top-[52px] z-40 h-[calc(100vh-52px)] w-64 border-r border-[#DDDBDA] bg-white flex flex-col">
      {/* Scenario Selector */}
      <div className="border-b border-[#DDDBDA]">
        <ScenarioSelector />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {navigation.map(item => (
          <NavGroup key={item.label} item={item} />
        ))}
      </nav>

      {/* Status Footer */}
      <div className="border-t border-[#DDDBDA] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className={cn(
            "h-2 w-2 rounded-full shrink-0",
            scenarioId ? "bg-[#E07900]" : "bg-[#2E844A]"
          )} />
          <span className="text-[11px] text-[#706E6B]">
            {scenarioId ? "Scenario Mode Active" : "Production · System Online"}
          </span>
        </div>
      </div>
    </aside>
  )
}
