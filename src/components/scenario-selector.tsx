"use client"
import React, { useState, useEffect, useRef } from "react"
import { useScenarioContext } from "./scenario-context"
import { GitBranch, ChevronDown, Check, Zap } from "lucide-react"
import { cn } from "@/lib/utils"

interface ScenarioOption {
  id: number
  name: string
  status: string
  depth: number
  _count: { overrides: number; children: number }
  parent?: { name: string } | null
}

export function ScenarioSelector() {
  const { scenarioId, scenarioName, setScenario } = useScenarioContext()
  const [open, setOpen] = useState(false)
  const [scenarios, setScenarios] = useState<ScenarioOption[]>([])
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch("/api/scenarios")
      .then(r => r.json())
      .then(data => setScenarios(data.filter((s: ScenarioOption) =>
        s.status !== "Committed" && s.status !== "Archived"
      )))
      .catch(() => {})
  }, [open])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  return (
    <div className="px-3 py-2" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-2 w-full rounded border px-3 py-2 text-xs transition-colors",
          scenarioId
            ? "bg-[#FEF0C7] border-[#E07900]/40 text-[#7E5400] hover:bg-[#FDE58A]/40"
            : "bg-[#F3F3F3] border-[#DDDBDA] text-[#444444] hover:bg-[#EBF4FF] hover:border-[#0176D3]/30 hover:text-[#0176D3]"
        )}
      >
        <GitBranch className={cn("h-3.5 w-3.5 shrink-0", scenarioId ? "text-[#E07900]" : "text-[#706E6B]")} />
        <span className="flex-1 text-left truncate font-medium">
          {scenarioId ? scenarioName : "Production"}
        </span>
        {scenarioId && (
          <span className="flex items-center gap-0.5 rounded-sm bg-[#E07900] px-1.5 py-0.5 text-[9px] font-bold text-white uppercase">
            <Zap className="h-2 w-2" /> Scenario
          </span>
        )}
        <ChevronDown className={cn("h-3 w-3 shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="mt-1 rounded border border-[#DDDBDA] bg-white shadow-lg overflow-hidden max-h-64 overflow-y-auto z-50">
          {/* Production option */}
          <button
            onClick={() => { setScenario(null); setOpen(false) }}
            className={cn(
              "flex items-center gap-2 w-full px-3 py-2 text-xs text-left hover:bg-[#EBF4FF] transition-colors",
              !scenarioId && "bg-[#EBF4FF] text-[#0176D3]"
            )}
          >
            <span className="h-2 w-2 rounded-full bg-[#2E844A] shrink-0" />
            <span className="flex-1 font-medium text-[#181818]">Production</span>
            {!scenarioId && <Check className="h-3 w-3 text-[#0176D3]" />}
          </button>

          {scenarios.length > 0 && <div className="border-t border-[#DDDBDA]" />}

          {scenarios.map(s => (
            <button
              key={s.id}
              onClick={() => { setScenario(s.id, s.name, s.status); setOpen(false) }}
              className={cn(
                "flex items-center gap-2 w-full px-3 py-2 text-xs text-left hover:bg-[#EBF4FF] transition-colors",
                scenarioId === s.id && "bg-[#FEF0C7]"
              )}
              style={{ paddingLeft: `${12 + s.depth * 12}px` }}
            >
              <GitBranch className="h-3 w-3 text-[#706E6B] shrink-0" />
              <span className="flex-1 text-[#181818] truncate">{s.name}</span>
              <span className={cn(
                "text-[10px] font-medium px-1.5 py-0.5 rounded",
                s.status === "Draft"
                  ? "bg-[#F3F3F3] text-[#706E6B]"
                  : "bg-[#EBF4FF] text-[#0176D3]"
              )}>
                {s.status}
              </span>
              <span className="text-[10px] text-[#706E6B]">{s._count.overrides}Δ</span>
              {scenarioId === s.id && <Check className="h-3 w-3 text-[#E07900]" />}
            </button>
          ))}

          {scenarios.length === 0 && (
            <div className="px-3 py-4 text-center text-xs text-[#706E6B]">
              No scenarios yet
            </div>
          )}
        </div>
      )}
    </div>
  )
}
