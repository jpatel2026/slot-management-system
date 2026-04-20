"use client"
import { useScenarioContext } from "./scenario-context"
import { GitBranch, X, AlertTriangle } from "lucide-react"
import Link from "next/link"

export function ScenarioBanner() {
  const { scenarioId, scenarioName, scenarioStatus, setScenario } = useScenarioContext()

  if (!scenarioId) return null

  return (
    <div className="mb-4 flex items-center gap-3 rounded border-l-4 border-[#E07900] bg-[#FEF0C7] px-4 py-2.5 animate-fade-in">
      <AlertTriangle className="h-4 w-4 text-[#E07900] shrink-0" />
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <GitBranch className="h-3.5 w-3.5 text-[#7E5400] shrink-0" />
        <span className="text-sm font-semibold text-[#7E5400] truncate">{scenarioName}</span>
        <span className="text-[10px] font-medium bg-[#E07900]/15 text-[#7E5400] px-2 py-0.5 rounded-full shrink-0">
          {scenarioStatus}
        </span>
        <span className="text-xs text-[#7E5400]/80 shrink-0">· Changes are isolated from production</span>
      </div>
      <Link
        href="/scenarios"
        className="text-xs font-semibold text-[#0176D3] hover:text-[#014486] hover:underline underline-offset-2 shrink-0"
      >
        Manage
      </Link>
      <button
        onClick={() => setScenario(null)}
        className="rounded p-1 hover:bg-[#E07900]/15 transition-colors text-[#7E5400]"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
