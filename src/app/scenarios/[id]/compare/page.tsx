"use client"
import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { ArrowLeft, GitBranch, Plus, Minus, Pencil, Layers } from "lucide-react"
import { cn } from "@/lib/utils"

interface Override {
  id: number; scenarioId: number; objectType: string; recordId: string
  action: string; field: string | null; newValue: string | null; baseValue: string | null
}

interface Summary {
  [objectType: string]: { updates: number; creates: number; deletes: number }
}

export default function ComparePage() {
  const params = useParams()
  const router = useRouter()
  const scenarioId = params.id as string
  const [overrides, setOverrides] = useState<Override[]>([])
  const [summary, setSummary] = useState<Summary>({})
  const [total, setTotal] = useState(0)
  const [filter, setFilter] = useState<string | null>(null)

  const fetchOverrides = useCallback(async () => {
    const res = await fetch(`/api/scenarios/${scenarioId}/overrides`)
    const data = await res.json()
    setOverrides(data.overrides || [])
    setSummary(data.summary || {})
    setTotal(data.total || 0)
  }, [scenarioId])

  useEffect(() => { fetchOverrides() }, [fetchOverrides])

  const formatValue = (v: string | null) => {
    if (v === null || v === undefined) return "—"
    try {
      const parsed = JSON.parse(v)
      if (typeof parsed === "object" && parsed !== null) {
        return JSON.stringify(parsed, null, 2)
      }
      return String(parsed)
    } catch { return v }
  }

  const actionIcon = (action: string) => {
    if (action === "create") return <Plus className="h-3 w-3 text-green-500" />
    if (action === "delete") return <Minus className="h-3 w-3 text-red-500" />
    return <Pencil className="h-3 w-3 text-amber-500" />
  }

  const actionBg = (action: string) => {
    if (action === "create") return "bg-green-50 border-green-200"
    if (action === "delete") return "bg-red-50 border-red-200"
    return "bg-white border-gray-200"
  }

  const filtered = filter ? overrides.filter(o => o.objectType === filter) : overrides

  return (
    <div>
      <PageHeader title="Scenario Diff" description={`Comparing scenario #${scenarioId} against its parent`}>
        <Button variant="outline" onClick={() => router.push("/scenarios")} className="gap-1">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Button>
      </PageHeader>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
        <button
          onClick={() => setFilter(null)}
          className={cn(
            "rounded-xl border p-4 text-left transition-all hover:shadow-md",
            !filter ? "border-blue-300 bg-blue-50 ring-1 ring-blue-200" : "bg-white border-gray-200"
          )}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <Layers className="h-3 w-3 text-blue-500" />
            <span className="text-[10px] font-semibold text-gray-500 uppercase">All</span>
          </div>
          <p className="text-lg font-bold text-gray-900">{total}</p>
        </button>

        {Object.entries(summary).map(([type, counts]) => (
          <button
            key={type}
            onClick={() => setFilter(filter === type ? null : type)}
            className={cn(
              "rounded-xl border p-4 text-left transition-all hover:shadow-md",
              filter === type ? "border-purple-300 bg-purple-50 ring-1 ring-purple-200" : "bg-white border-gray-200"
            )}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <GitBranch className="h-3 w-3 text-purple-500" />
              <span className="text-[10px] font-semibold text-gray-500 uppercase truncate">{type}</span>
            </div>
            <div className="flex items-center gap-2">
              {counts.updates > 0 && <span className="text-xs"><span className="font-bold text-amber-600">{counts.updates}</span> <span className="text-gray-400">upd</span></span>}
              {counts.creates > 0 && <span className="text-xs"><span className="font-bold text-green-600">{counts.creates}</span> <span className="text-gray-400">new</span></span>}
              {counts.deletes > 0 && <span className="text-xs"><span className="font-bold text-red-600">{counts.deletes}</span> <span className="text-gray-400">del</span></span>}
            </div>
          </button>
        ))}
      </div>

      {/* Override details */}
      {filtered.length > 0 ? (
        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b bg-gray-50/80 flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-700">Override Details</h3>
            <Badge variant="secondary" className="text-[10px]">{filtered.length} overrides</Badge>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/50">
                <TableHead className="text-xs font-semibold w-16">Action</TableHead>
                <TableHead className="text-xs font-semibold">Object Type</TableHead>
                <TableHead className="text-xs font-semibold">Record ID</TableHead>
                <TableHead className="text-xs font-semibold">Field</TableHead>
                <TableHead className="text-xs font-semibold">Base Value</TableHead>
                <TableHead className="text-xs font-semibold">New Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((ov) => (
                <TableRow key={ov.id} className={cn("animate-fade-in", actionBg(ov.action))}>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {actionIcon(ov.action)}
                      <span className={cn(
                        "text-[10px] font-bold uppercase",
                        ov.action === "create" ? "text-green-600" :
                        ov.action === "delete" ? "text-red-600" : "text-amber-600"
                      )}>
                        {ov.action}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="secondary" className="text-[10px]">{ov.objectType}</Badge></TableCell>
                  <TableCell className="font-mono text-xs text-gray-600 max-w-[120px] truncate">{ov.recordId}</TableCell>
                  <TableCell className="text-sm font-medium">{ov.field || "—"}</TableCell>
                  <TableCell className="text-xs font-mono max-w-[150px] truncate">
                    {ov.action === "create" ? (
                      <span className="text-gray-300 italic">new</span>
                    ) : ov.action === "delete" ? (
                      <span className="text-red-400 line-through">{formatValue(ov.baseValue)}</span>
                    ) : (
                      <span className="text-gray-500">{formatValue(ov.baseValue)}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs font-mono max-w-[200px]">
                    {ov.action === "delete" ? (
                      <span className="text-red-500 italic">deleted</span>
                    ) : ov.action === "create" ? (
                      <span className="text-green-600 max-w-[200px] truncate block">{formatValue(ov.newValue)}</span>
                    ) : (
                      <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">{formatValue(ov.newValue)}</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="rounded-xl border bg-white p-12 text-center text-gray-400">
          <GitBranch className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No overrides in this scenario yet. Enter the scenario and make changes to see them here.</p>
        </div>
      )}
    </div>
  )
}
