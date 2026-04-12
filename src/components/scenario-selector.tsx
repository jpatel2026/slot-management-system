"use client"
import React, { useState, useEffect, useRef } from "react"
import { useScenarioContext } from "./scenario-context"
import { GitBranch, ChevronDown, Check, X, Zap } from "lucide-react"
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
      .then(data => setScenarios(data.filter((s: ScenarioOption) => s.status !== "Committed" && s.status !== "Archived")))
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
          "flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm transition-all",
          scenarioId
            ? "bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-200 hover:from-amber-500/30 hover:to-orange-500/30"
            : "bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10"
        )}
      >
        <GitBranch className={cn("h-3.5 w-3.5", scenarioId ? "text-amber-400" : "text-gray-500")} />
        <span className="flex-1 text-left truncate text-xs font-medium">
          {scenarioId ? scenarioName : "Production"}
        </span>
        {scenarioId && (
          <span className="flex items-center gap-1 rounded-full bg-amber-500/30 px-1.5 py-0.5 text-[9px] font-bold text-amber-300 uppercase">
            <Zap className="h-2 w-2" /> Scenario
          </span>
        )}
        <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="mt-1 rounded-lg border border-white/10 bg-gray-900 shadow-xl overflow-hidden max-h-64 overflow-y-auto">
          {/* Production option */}
          <button
            onClick={() => { setScenario(null); setOpen(false) }}
            className={cn(
              "flex items-center gap-2 w-full px-3 py-2 text-xs text-left hover:bg-white/5 transition",
              !scenarioId && "bg-white/5"
            )}
          >
            <span className="h-2 w-2 rounded-full bg-green-400" />
            <span className="flex-1 text-gray-300 font-medium">Production</span>
            {!scenarioId && <Check className="h-3 w-3 text-green-400" />}
          </button>

          {scenarios.length > 0 && <div className="border-t border-white/10" />}

          {scenarios.map(s => (
            <button
              key={s.id}
              onClick={() => { setScenario(s.id, s.name, s.status); setOpen(false) }}
              className={cn(
                "flex items-center gap-2 w-full px-3 py-2 text-xs text-left hover:bg-white/5 transition",
                scenarioId === s.id && "bg-amber-500/10"
              )}
              style={{ paddingLeft: `${12 + s.depth * 12}px` }}
            >
              <GitBranch className="h-3 w-3 text-amber-400/60" />
              <span className="flex-1 text-gray-300 truncate">{s.name}</span>
              <span className={cn(
                "text-[9px] font-medium px-1.5 py-0.5 rounded-full",
                s.status === "Draft" ? "bg-gray-700 text-gray-400" : "bg-blue-900 text-blue-300"
              )}>
                {s.status}
              </span>
              <span className="text-[9px] text-gray-500">{s._count.overrides}Δ</span>
              {scenarioId === s.id && <Check className="h-3 w-3 text-amber-400" />}
            </button>
          ))}

          {scenarios.length === 0 && (
            <div className="px-3 py-4 text-center text-xs text-gray-500">
              No scenarios yet
            </div>
          )}
        </div>
      )}
    </div>
  )
}
