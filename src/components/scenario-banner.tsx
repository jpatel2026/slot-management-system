"use client"
import { useScenarioContext } from "./scenario-context"
import { GitBranch, X, AlertTriangle, Zap } from "lucide-react"
import Link from "next/link"

export function ScenarioBanner() {
  const { scenarioId, scenarioName, scenarioStatus, setScenario } = useScenarioContext()

  if (!scenarioId) return null

  return (
    <div className="mb-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-500/20 px-4 py-3 flex items-center gap-3 animate-fade-in">
      <div className="flex items-center gap-2 rounded-full bg-amber-500/20 px-2.5 py-1">
        <GitBranch className="h-3.5 w-3.5 text-amber-500" />
        <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Scenario Mode</span>
      </div>
      <div className="flex-1">
        <span className="text-sm font-semibold text-amber-800">{scenarioName}</span>
        <span className="ml-2 text-xs text-amber-600/80 bg-amber-500/10 rounded-full px-2 py-0.5">{scenarioStatus}</span>
      </div>
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
        <span className="text-xs text-amber-700">Changes are isolated from production</span>
      </div>
      <Link href={`/scenarios`} className="text-xs text-amber-600 hover:text-amber-800 font-medium underline-offset-2 hover:underline flex items-center gap-1">
        <Zap className="h-3 w-3" /> Manage
      </Link>
      <button onClick={() => setScenario(null)} className="rounded-full p-1 hover:bg-amber-500/20 transition">
        <X className="h-3.5 w-3.5 text-amber-600" />
      </button>
    </div>
  )
}
