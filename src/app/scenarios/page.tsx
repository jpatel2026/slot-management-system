"use client"
import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/page-header"
import { useScenarioContext } from "@/components/scenario-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogHeader, DialogTitle, DialogContent } from "@/components/ui/dialog"
import {
  GitBranch, Plus, Play, RefreshCw, GitMerge, Trash2, Eye,
  ChevronRight, Layers, ArrowRight, AlertTriangle, CheckCircle2,
  Clock, Bot, Zap, BarChart3
} from "lucide-react"
import { cn, formatDate } from "@/lib/utils"

interface Scenario {
  id: number; name: string; description: string | null; status: string
  parentId: number | null; depth: number; createdBy: string
  lastRefreshedAt: string; committedAt: string | null
  createdAt: string; updatedAt: string
  parent?: { id: number; name: string; status?: string } | null
  children?: Scenario[]
  _count: { overrides: number; children: number }
}

const statusConfig: Record<string, { variant: string; icon: typeof Clock }> = {
  Draft: { variant: "secondary", icon: Clock },
  Active: { variant: "info", icon: Play },
  Committed: { variant: "success", icon: CheckCircle2 },
  Archived: { variant: "outline", icon: Layers },
}

export default function ScenariosPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ name: "", description: "", parentId: "" })
  const [committing, setCommitting] = useState<number | null>(null)
  const [refreshing, setRefreshing] = useState<number | null>(null)
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null)
  const { setScenario } = useScenarioContext()
  const router = useRouter()

  const fetchScenarios = useCallback(async () => {
    const res = await fetch("/api/scenarios")
    setScenarios(await res.json())
  }, [])

  useEffect(() => { fetchScenarios() }, [fetchScenarios])

  const handleCreate = async () => {
    if (!form.name) return
    await fetch("/api/scenarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        description: form.description,
        parentId: form.parentId ? parseInt(form.parentId) : null,
      }),
    })
    setDialogOpen(false)
    setForm({ name: "", description: "", parentId: "" })
    fetchScenarios()
  }

  const handleDelete = async (id: number) => {
    const res = await fetch(`/api/scenarios/${id}`, { method: "DELETE" })
    if (!res.ok) {
      const err = await res.json()
      setMessage({ type: "error", text: err.error })
    } else {
      fetchScenarios()
    }
  }

  const handleEnter = (s: Scenario) => {
    setScenario(s.id, s.name, s.status)
    router.push("/")
  }

  const handleCommit = async (id: number) => {
    setCommitting(id)
    const res = await fetch(`/api/scenarios/${id}/commit`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })
    if (res.status === 409) {
      router.push(`/scenarios/${id}/conflicts`)
    } else if (res.ok) {
      const data = await res.json()
      setMessage({ type: "success", text: `Committed ${data.committed} changes to ${scenarios.find(s => s.id === id)?.parentId ? "parent scenario" : "production"}` })
      fetchScenarios()
    } else {
      const err = await res.json()
      setMessage({ type: "error", text: err.error })
    }
    setCommitting(null)
  }

  const handleRefresh = async (id: number) => {
    setRefreshing(id)
    const res = await fetch(`/api/scenarios/${id}/refresh`, { method: "POST" })
    const data = await res.json()
    if (data.conflicts?.length > 0) {
      router.push(`/scenarios/${id}/conflicts`)
    } else {
      setMessage({ type: "success", text: `Refreshed. ${data.updated} base values updated.` })
      fetchScenarios()
    }
    setRefreshing(null)
  }

  // Build tree structure
  const rootScenarios = scenarios.filter(s => !s.parentId)
  const childMap = new Map<number, Scenario[]>()
  for (const s of scenarios) {
    if (s.parentId) {
      if (!childMap.has(s.parentId)) childMap.set(s.parentId, [])
      childMap.get(s.parentId)!.push(s)
    }
  }

  const activeScenarios = scenarios.filter(s => s.status !== "Committed" && s.status !== "Archived")
  const parentOptions = [{ value: "", label: "Production (Root)" }, ...activeScenarios.map(s => ({
    value: String(s.id), label: `${"─".repeat(s.depth)}${s.depth > 0 ? " " : ""}${s.name}`,
  }))]

  function renderTree(nodes: Scenario[], depth = 0) {
    return nodes.map(s => {
      const cfg = statusConfig[s.status] || statusConfig.Draft
      const children = childMap.get(s.id) || []
      const isActive = s.status !== "Committed" && s.status !== "Archived"

      return (
        <div key={s.id}>
          <div
            className={cn(
              "flex items-center gap-3 rounded-xl border p-4 transition-all hover:shadow-md animate-fade-in",
              s.status === "Draft" ? "bg-white border-gray-200" :
              s.status === "Active" ? "bg-blue-50/50 border-blue-200" :
              s.status === "Committed" ? "bg-green-50/50 border-green-200" :
              "bg-gray-50 border-gray-200"
            )}
            style={{ marginLeft: `${depth * 32}px` }}
          >
            {/* Tree connector */}
            {depth > 0 && (
              <div className="flex items-center text-gray-300">
                <ChevronRight className="h-3 w-3" />
              </div>
            )}

            <div className="flex items-center gap-2">
              <div className={cn(
                "rounded-lg p-2",
                s.status === "Active" ? "bg-blue-100" : s.status === "Committed" ? "bg-green-100" : "bg-gray-100"
              )}>
                <GitBranch className={cn(
                  "h-4 w-4",
                  s.status === "Active" ? "text-blue-600" : s.status === "Committed" ? "text-green-600" : "text-gray-500"
                )} />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900 truncate">{s.name}</h3>
                <Badge variant={cfg.variant as any} className="text-[10px]">{s.status}</Badge>
              </div>
              <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                {s.parent && (
                  <span className="flex items-center gap-1">
                    <ArrowRight className="h-2.5 w-2.5" /> from {s.parent.name}
                  </span>
                )}
                {!s.parent && <span>from Production</span>}
                <span>{s._count.overrides} changes</span>
                <span>{s._count.children} children</span>
                <span>Updated {formatDate(s.updatedAt)}</span>
              </div>
              {s.description && (
                <p className="text-xs text-gray-400 mt-1 truncate">{s.description}</p>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {isActive && (
                <>
                  <Button size="sm" variant="outline" onClick={() => handleEnter(s)} className="gap-1 text-xs">
                    <Play className="h-3 w-3" /> Enter
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleRefresh(s.id)} disabled={refreshing === s.id} className="gap-1 text-xs">
                    <RefreshCw className={cn("h-3 w-3", refreshing === s.id && "animate-spin")} /> Refresh
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleCommit(s.id)} disabled={committing === s.id || s._count.overrides === 0} className="gap-1 text-xs">
                    <GitMerge className="h-3 w-3" /> Commit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => router.push(`/scenarios/${s.id}/compare`)} className="gap-1 text-xs">
                    <Eye className="h-3 w-3" /> Diff
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => handleDelete(s.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
              {!isActive && (
                <Badge variant="secondary" className="text-[10px]">
                  {s.status === "Committed" ? `Committed ${s.committedAt ? formatDate(s.committedAt) : ""}` : "Archived"}
                </Badge>
              )}
            </div>
          </div>

          {/* Render children recursively */}
          {children.length > 0 && (
            <div className="mt-2 space-y-2">
              {renderTree(children, depth + 1)}
            </div>
          )}
        </div>
      )
    })
  }

  return (
    <div>
      <PageHeader
        title="Scenario Planning"
        description="Create what-if scenarios, branch capacity plans, and commit changes back to production"
        createLabel="New Scenario"
        onCreateClick={() => setDialogOpen(true)}
      />

      {message && (
        <div className={cn(
          "mb-4 rounded-xl px-4 py-3 flex items-center gap-2 text-sm animate-fade-in",
          message.type === "success" ? "bg-green-50 border border-green-200 text-green-800" : "bg-red-50 border border-red-200 text-red-800"
        )}>
          {message.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {message.text}
          <button className="ml-auto text-xs underline" onClick={() => setMessage(null)}>Dismiss</button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Scenarios", value: scenarios.length, icon: GitBranch, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Active / Draft", value: scenarios.filter(s => s.status === "Draft" || s.status === "Active").length, icon: Zap, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Total Overrides", value: scenarios.reduce((s, sc) => s + sc._count.overrides, 0), icon: BarChart3, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "Committed", value: scenarios.filter(s => s.status === "Committed").length, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
        ].map(stat => (
          <div key={stat.label} className="rounded-xl border bg-white p-4 shadow-sm metric-card">
            <div className="flex items-center gap-2 mb-1">
              <div className={cn("rounded-lg p-1.5", stat.bg)}>
                <stat.icon className={cn("h-3.5 w-3.5", stat.color)} />
              </div>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Scenario Tree */}
      <div className="rounded-xl border bg-white/50 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Bot className="h-4 w-4 text-blue-500" />
          <h2 className="font-semibold text-gray-900">Scenario Tree</h2>
          <Badge variant="secondary" className="text-[10px]">{scenarios.length} scenarios</Badge>
        </div>

        {/* Production root node */}
        <div className="flex items-center gap-3 rounded-xl border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 p-4 mb-4">
          <div className="rounded-lg bg-green-100 p-2">
            <Layers className="h-4 w-4 text-green-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-green-900">Production</h3>
            <p className="text-xs text-green-600">Live environment — all committed changes are reflected here</p>
          </div>
          <Badge variant="success" className="text-[10px]">LIVE</Badge>
        </div>

        {/* Tree */}
        <div className="space-y-2 ml-4">
          {rootScenarios.length > 0 ? (
            renderTree(rootScenarios)
          ) : (
            <div className="text-center py-12 text-gray-400">
              <GitBranch className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No scenarios yet. Create one to start planning.</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogHeader><DialogTitle>Create New Scenario</DialogTitle></DialogHeader>
        <DialogContent>
          <div className="space-y-4">
            <div>
              <Label>Scenario Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Q3 Capacity Increase, What-if MfgWest Expansion" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Describe the purpose of this scenario..." rows={3} />
            </div>
            <div>
              <Label>Branch From</Label>
              <Select value={form.parentId} onChange={e => setForm(f => ({ ...f, parentId: e.target.value }))}
                options={parentOptions} placeholder="Production (Root)" />
              <p className="text-xs text-gray-400 mt-1">Select a parent scenario or leave empty to branch from production</p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={!form.name}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                <GitBranch className="h-4 w-4 mr-1.5" /> Create Scenario
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
