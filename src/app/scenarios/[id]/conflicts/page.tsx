"use client"
import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { AlertTriangle, CheckCircle2, GitMerge, ArrowLeft, Shield } from "lucide-react"
import { cn } from "@/lib/utils"

interface Conflict {
  objectType: string; recordId: string; field: string
  baseValue: string | null; parentValue: string | null; childValue: string | null
  overrideId: number
  resolution?: string; customValue?: string
}

export default function ConflictsPage() {
  const params = useParams()
  const router = useRouter()
  const scenarioId = params.id as string
  const [conflicts, setConflicts] = useState<Conflict[]>([])
  const [resolutions, setResolutions] = useState<Record<number, { action: string; value?: string }>>({})
  const [committing, setCommitting] = useState(false)
  const [result, setResult] = useState<{ committed?: number; skipped?: number } | null>(null)

  const fetchConflicts = useCallback(async () => {
    const res = await fetch(`/api/scenarios/${scenarioId}/conflicts`)
    const data = await res.json()
    setConflicts(data.conflicts || [])
  }, [scenarioId])

  useEffect(() => { fetchConflicts() }, [fetchConflicts])

  const setResolution = (overrideId: number, action: string, value?: string) => {
    setResolutions(prev => ({ ...prev, [overrideId]: { action, value } }))
  }

  const allResolved = conflicts.length > 0 && conflicts.every(c => resolutions[c.overrideId])

  const handleCommit = async () => {
    setCommitting(true)
    const res = await fetch(`/api/scenarios/${scenarioId}/commit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolutions }),
    })
    if (res.ok) {
      const data = await res.json()
      setResult(data)
    }
    setCommitting(false)
  }

  const formatValue = (v: string | null) => {
    if (v === null || v === undefined) return "—"
    try {
      const parsed = JSON.parse(v)
      return typeof parsed === "object" ? JSON.stringify(parsed, null, 2) : String(parsed)
    } catch { return v }
  }

  if (result) {
    return (
      <div className="max-w-lg mx-auto mt-12 text-center">
        <div className="rounded-2xl border bg-white p-8 shadow-lg glow-green">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Scenario Committed</h2>
          <p className="text-gray-500 mb-4">{result.committed} changes committed, {result.skipped} skipped</p>
          <Button onClick={() => router.push("/scenarios")} className="bg-gradient-to-r from-blue-600 to-purple-600">
            Back to Scenarios
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Conflict Resolution" description={`Scenario #${scenarioId} — resolve conflicts before committing`}>
        <Button variant="outline" onClick={() => router.push("/scenarios")} className="gap-1">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Button>
      </PageHeader>

      {conflicts.length === 0 ? (
        <div className="rounded-2xl border bg-white p-12 shadow-sm text-center">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">No Conflicts</h2>
          <p className="text-gray-500 mb-4">This scenario is ready to commit with no conflicts.</p>
          <Button onClick={handleCommit} className="bg-gradient-to-r from-blue-600 to-purple-600 gap-1">
            <GitMerge className="h-4 w-4" /> Commit Now
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            <div>
              <p className="font-semibold text-amber-800">{conflicts.length} conflict{conflicts.length > 1 ? "s" : ""} detected</p>
              <p className="text-xs text-amber-600">The parent has changed the same fields you modified in this scenario. Resolve each conflict before committing.</p>
            </div>
          </div>

          <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/80">
                  <TableHead className="text-xs font-semibold">Object</TableHead>
                  <TableHead className="text-xs font-semibold">Record</TableHead>
                  <TableHead className="text-xs font-semibold">Field</TableHead>
                  <TableHead className="text-xs font-semibold">Base (snapshot)</TableHead>
                  <TableHead className="text-xs font-semibold">Parent (current)</TableHead>
                  <TableHead className="text-xs font-semibold">Your Value</TableHead>
                  <TableHead className="text-xs font-semibold">Resolution</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {conflicts.map((c, idx) => {
                  const res = resolutions[c.overrideId]
                  return (
                    <TableRow key={idx} className={cn("animate-fade-in", res ? "bg-green-50/30" : "bg-amber-50/30")}>
                      <TableCell><Badge variant="secondary" className="text-[10px]">{c.objectType}</Badge></TableCell>
                      <TableCell className="font-mono text-xs">{c.recordId.length > 16 ? c.recordId.slice(0, 16) + "..." : c.recordId}</TableCell>
                      <TableCell className="font-medium text-sm">{c.field}</TableCell>
                      <TableCell className="text-xs text-gray-400 font-mono">{formatValue(c.baseValue)}</TableCell>
                      <TableCell className="text-xs font-mono">
                        <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">{formatValue(c.parentValue)}</span>
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">{formatValue(c.childValue)}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant={res?.action === "keep-child" ? "default" : "outline"} className="text-[10px] h-7 px-2"
                            onClick={() => setResolution(c.overrideId, "keep-child")}>Mine</Button>
                          <Button size="sm" variant={res?.action === "keep-parent" ? "default" : "outline"} className="text-[10px] h-7 px-2"
                            onClick={() => setResolution(c.overrideId, "keep-parent")}>Parent</Button>
                          <Input
                            className="h-7 w-20 text-[10px]"
                            placeholder="Custom"
                            value={res?.action === "custom" ? res.value || "" : ""}
                            onChange={e => setResolution(c.overrideId, "custom", e.target.value)}
                          />
                          {res && <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => {
              const resolved: Record<number, { action: string }> = {}
              conflicts.forEach(c => { resolved[c.overrideId] = { action: "keep-child" } })
              setResolutions(resolved)
            }}>
              <Shield className="h-3.5 w-3.5 mr-1" /> Keep All Mine
            </Button>
            <Button
              onClick={handleCommit}
              disabled={!allResolved || committing}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 gap-1"
            >
              <GitMerge className="h-4 w-4" />
              {committing ? "Committing..." : `Commit ${conflicts.length} Resolved`}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
