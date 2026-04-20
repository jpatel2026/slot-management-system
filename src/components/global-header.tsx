"use client"
import React from "react"
import { Grid3X3, Search, HelpCircle, Settings, Bell, ChevronDown, FlaskConical, GitBranch } from "lucide-react"
import { useScenarioContext } from "./scenario-context"
import { cn } from "@/lib/utils"

export function GlobalHeader() {
  const { scenarioId, scenarioName } = useScenarioContext()

  return (
    <header className={cn(
      "fixed top-0 left-0 right-0 z-50 h-[52px] flex items-center px-3 gap-2 shadow-md border-b",
      scenarioId
        ? "bg-[#BF7B00] border-[#7D5100]"
        : "bg-[#0176D3] border-[#014486]"
    )}>
      {/* App Launcher (waffle) */}
      <button
        className="h-9 w-9 flex items-center justify-center rounded hover:bg-white/20 text-white transition-colors shrink-0"
        title="App Launcher"
      >
        <Grid3X3 className="h-5 w-5" />
      </button>

      {/* Divider */}
      <div className="h-7 w-px bg-white/25 shrink-0" />

      {/* App identity */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="h-7 w-7 rounded bg-white/20 flex items-center justify-center">
          <FlaskConical className="h-4 w-4 text-white" />
        </div>
        <div className="leading-tight">
          <div className="text-white font-bold text-[13px] leading-none">NextGen</div>
          <div className="text-white/75 text-[10px] leading-none mt-0.5">Slot Manager</div>
        </div>
      </div>

      {/* Scenario indicator in header */}
      {scenarioId && (
        <>
          <div className="h-7 w-px bg-white/25 shrink-0 ml-2" />
          <div className="flex items-center gap-1.5">
            <GitBranch className="h-3.5 w-3.5 text-white/90" />
            <span className="text-white/90 text-xs font-semibold">{scenarioName}</span>
            <span className="text-[10px] bg-white/20 text-white px-1.5 py-0.5 rounded font-medium uppercase tracking-wide">Scenario</span>
          </div>
        </>
      )}

      {/* Global Search */}
      <div className="flex-1 max-w-xs mx-auto">
        <div className="flex items-center bg-white/15 hover:bg-white/25 rounded h-8 px-3 gap-2 transition-colors cursor-text group">
          <Search className="h-3.5 w-3.5 text-white/60 group-hover:text-white/80 shrink-0" />
          <span className="text-white/55 text-xs">Search...</span>
        </div>
      </div>

      {/* Utility icons */}
      <div className="flex items-center gap-0.5 ml-auto">
        <button
          className="h-9 w-9 flex items-center justify-center rounded hover:bg-white/20 text-white/75 hover:text-white transition-colors"
          title="Help"
        >
          <HelpCircle className="h-[18px] w-[18px]" />
        </button>
        <button
          className="h-9 w-9 flex items-center justify-center rounded hover:bg-white/20 text-white/75 hover:text-white transition-colors"
          title="Setup"
        >
          <Settings className="h-[18px] w-[18px]" />
        </button>
        <button
          className="h-9 w-9 flex items-center justify-center rounded hover:bg-white/20 text-white/75 hover:text-white transition-colors"
          title="Notifications"
        >
          <Bell className="h-[18px] w-[18px]" />
        </button>

        {/* Divider */}
        <div className="h-7 w-px bg-white/25 mx-1 shrink-0" />

        {/* User avatar */}
        <button className="flex items-center gap-1.5 h-9 px-2 rounded hover:bg-white/20 text-white transition-colors">
          <div className="h-7 w-7 rounded-full bg-white/25 border border-white/30 flex items-center justify-center text-[11px] font-bold text-white">
            JP
          </div>
          <ChevronDown className="h-3 w-3 text-white/75" />
        </button>
      </div>
    </header>
  )
}
