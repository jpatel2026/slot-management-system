"use client"
import { useEffect, useState, useCallback } from "react"
import { DataTable } from "@/components/data-table"
import { PageHeader } from "@/components/page-header"
import { Dialog, DialogHeader, DialogTitle, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import type { ColumnDef } from "@tanstack/react-table"

interface CareProgram {
  id: number; name: string; therapyType: string; country: string | null; active: boolean
}

interface Account {
  id: number; name: string; siteId: string; alias: string; siteType: string; active: boolean
}

interface LtmConfig {
  id: number; milestoneName: string; leg: number; careProgramId: number
  cryoTypes: string; wdcApplicable: boolean; active: boolean
  cryoLeadTime: number | null; localLeadTime: number | null; mfgLeadTime: number | null
  aphSiteId: number | null; cryoSiteId: number | null; mfgSiteId: number | null
  wdcSiteId: number | null; infusionSiteId: number | null
  nonWorkingDay: string | null; holidaySiteAssociation: string | null
  updateLogicCentral: string | null; centralApplicability: string | null
  updateLogicMfg: string | null; mfgApplicability: string | null
  updateLogicLocal: string | null; localApplicability: string | null
  careProgram: CareProgram; mfgSite: Account | null
  createdAt: string; updatedAt: string
}

const updateLogicOptions = [
  { value: "Creation Date", label: "Creation Date" },
  { value: "Collection Date", label: "Collection Date" },
  { value: "Lead Time", label: "Lead Time" },
  { value: "Cryopreservation Daily Capacity", label: "Cryopreservation Daily Capacity" },
  { value: "Manufacturing Daily Capacity", label: "Manufacturing Daily Capacity" },
]

const applicabilityOptions = [
  { value: "Exact", label: "Exact" },
  { value: "Range", label: "Range" },
  { value: "N/A", label: "N/A" },
]

export default function LtmConfigPage() {
  const [data, setData] = useState<LtmConfig[]>([])
  const [carePrograms, setCarePrograms] = useState<CareProgram[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [showActiveOnly, setShowActiveOnly] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<LtmConfig | null>(null)
  const [form, setForm] = useState({
    milestoneName: "", leg: 1, careProgramId: 0,
    cryoCentral: false, cryoManufacturing: false, cryoLocal: false,
    wdcApplicable: false, active: true,
    cryoLeadTime: "", localLeadTime: "", mfgLeadTime: "",
    aphSiteId: "", cryoSiteId: "", mfgSiteId: "", wdcSiteId: "", infusionSiteId: "",
    nonWorkingDay: "", holidaySiteAssociation: "",
    updateLogicCentral: "", centralApplicability: "",
    updateLogicMfg: "", mfgApplicability: "",
    updateLogicLocal: "", localApplicability: "",
  })
  const [error, setError] = useState("")

  const fetchData = useCallback(async () => {
    const params = new URLSearchParams()
    if (showActiveOnly) params.set("active", "true")
    const res = await fetch(`/api/ltm-config?${params}`)
    setData(await res.json())
  }, [showActiveOnly])

  const fetchLookups = useCallback(async () => {
    const [cpRes, accRes] = await Promise.all([
      fetch("/api/care-programs?active=true"),
      fetch("/api/accounts?active=true"),
    ])
    setCarePrograms(await cpRes.json())
    setAccounts(await accRes.json())
  }, [])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { fetchLookups() }, [fetchLookups])

  const openCreate = () => {
    setEditing(null)
    setForm({
      milestoneName: "", leg: 1, careProgramId: carePrograms[0]?.id || 0,
      cryoCentral: false, cryoManufacturing: false, cryoLocal: false,
      wdcApplicable: false, active: true,
      cryoLeadTime: "", localLeadTime: "", mfgLeadTime: "",
      aphSiteId: "", cryoSiteId: "", mfgSiteId: "", wdcSiteId: "", infusionSiteId: "",
      nonWorkingDay: "", holidaySiteAssociation: "",
      updateLogicCentral: "", centralApplicability: "",
      updateLogicMfg: "", mfgApplicability: "",
      updateLogicLocal: "", localApplicability: "",
    })
    setError("")
    setDialogOpen(true)
  }

  const openEdit = (c: LtmConfig) => {
    const cryoArr = (c.cryoTypes || "").split(",").map(s => s.trim())
    setEditing(c)
    setForm({
      milestoneName: c.milestoneName, leg: c.leg, careProgramId: c.careProgramId,
      cryoCentral: cryoArr.includes("Central"), cryoManufacturing: cryoArr.includes("Manufacturing"),
      cryoLocal: cryoArr.includes("Local"),
      wdcApplicable: c.wdcApplicable, active: c.active,
      cryoLeadTime: c.cryoLeadTime != null ? String(c.cryoLeadTime) : "",
      localLeadTime: c.localLeadTime != null ? String(c.localLeadTime) : "",
      mfgLeadTime: c.mfgLeadTime != null ? String(c.mfgLeadTime) : "",
      aphSiteId: c.aphSiteId != null ? String(c.aphSiteId) : "",
      cryoSiteId: c.cryoSiteId != null ? String(c.cryoSiteId) : "",
      mfgSiteId: c.mfgSiteId != null ? String(c.mfgSiteId) : "",
      wdcSiteId: c.wdcSiteId != null ? String(c.wdcSiteId) : "",
      infusionSiteId: c.infusionSiteId != null ? String(c.infusionSiteId) : "",
      nonWorkingDay: c.nonWorkingDay || "", holidaySiteAssociation: c.holidaySiteAssociation || "",
      updateLogicCentral: c.updateLogicCentral || "", centralApplicability: c.centralApplicability || "",
      updateLogicMfg: c.updateLogicMfg || "", mfgApplicability: c.mfgApplicability || "",
      updateLogicLocal: c.updateLogicLocal || "", localApplicability: c.localApplicability || "",
    })
    setError("")
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.milestoneName || !form.careProgramId) {
      setError("Milestone name and care program are required"); return
    }
    setError("")
    const cryoTypes: string[] = []
    if (form.cryoCentral) cryoTypes.push("Central")
    if (form.cryoManufacturing) cryoTypes.push("Manufacturing")
    if (form.cryoLocal) cryoTypes.push("Local")

    const payload = {
      milestoneName: form.milestoneName,
      leg: form.leg,
      careProgramId: form.careProgramId,
      cryoTypes: cryoTypes.join(","),
      wdcApplicable: form.wdcApplicable,
      active: form.active,
      cryoLeadTime: form.cryoLeadTime ? parseInt(form.cryoLeadTime) : null,
      localLeadTime: form.localLeadTime ? parseInt(form.localLeadTime) : null,
      mfgLeadTime: form.mfgLeadTime ? parseInt(form.mfgLeadTime) : null,
      aphSiteId: form.aphSiteId ? parseInt(form.aphSiteId) : null,
      cryoSiteId: form.cryoSiteId ? parseInt(form.cryoSiteId) : null,
      mfgSiteId: form.mfgSiteId ? parseInt(form.mfgSiteId) : null,
      wdcSiteId: form.wdcSiteId ? parseInt(form.wdcSiteId) : null,
      infusionSiteId: form.infusionSiteId ? parseInt(form.infusionSiteId) : null,
      nonWorkingDay: form.nonWorkingDay || null,
      holidaySiteAssociation: form.holidaySiteAssociation || null,
      updateLogicCentral: form.updateLogicCentral || null,
      centralApplicability: form.centralApplicability || null,
      updateLogicMfg: form.updateLogicMfg || null,
      mfgApplicability: form.mfgApplicability || null,
      updateLogicLocal: form.updateLogicLocal || null,
      localApplicability: form.localApplicability || null,
    }
    const url = editing ? `/api/ltm-config/${editing.id}` : "/api/ltm-config"
    const method = editing ? "PUT" : "POST"
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
    if (!res.ok) {
      const err = await res.json()
      setError(err.error || "Save failed")
      return
    }
    setDialogOpen(false)
    fetchData()
  }

  const sitesByType = (type: string) => accounts.filter(a => a.siteType === type).map(a => ({ value: String(a.id), label: `${a.name} (${a.alias})` }))

  const columns: ColumnDef<LtmConfig, unknown>[] = [
    { accessorKey: "milestoneName", header: "Milestone Name", cell: ({ row }) => <span className="font-medium">{row.original.milestoneName}</span> },
    { accessorKey: "leg", header: "Leg", cell: ({ row }) => <Badge variant="secondary">{row.original.leg}</Badge> },
    { accessorKey: "careProgram.name", header: "Care Program", cell: ({ row }) => <span className="text-gray-600 text-sm">{row.original.careProgram?.name || "-"}</span> },
    { accessorKey: "cryoTypes", header: "Cryo Type", cell: ({ row }) => {
      const types = (row.original.cryoTypes || "").split(",").filter(Boolean)
      return <div className="flex gap-1 flex-wrap">{types.map(t => <Badge key={t} variant="purple" className="text-[10px]">{t.trim()}</Badge>)}</div>
    }},
    { accessorKey: "active", header: "Active", cell: ({ row }) => <Badge variant={row.original.active ? "success" : "secondary"}>{row.original.active ? "Active" : "Inactive"}</Badge> },
    { accessorKey: "cryoLeadTime", header: "Cryo LT", cell: ({ row }) => <span className="font-mono text-sm">{row.original.cryoLeadTime ?? "-"}</span> },
    { accessorKey: "localLeadTime", header: "Local LT", cell: ({ row }) => <span className="font-mono text-sm">{row.original.localLeadTime ?? "-"}</span> },
    { accessorKey: "mfgLeadTime", header: "Mfg LT", cell: ({ row }) => <span className="font-mono text-sm">{row.original.mfgLeadTime ?? "-"}</span> },
  ]

  const careProgramOptions = carePrograms.map(cp => ({ value: String(cp.id), label: cp.name }))

  return (
    <div>
      <PageHeader title="LTM Configuration" description="Lead Time Model milestone configuration" createLabel="New LTM Config" onCreateClick={openCreate} />
      <DataTable columns={columns} data={data} searchPlaceholder="Search milestones..." showActiveOnly={showActiveOnly} onActiveFilterChange={setShowActiveOnly} exportFilename="ltm-config.csv" onRowClick={openEdit} />
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogHeader><DialogTitle>{editing ? "Edit LTM Config" : "New LTM Config"}</DialogTitle></DialogHeader>
        <DialogContent>
          <div className="space-y-5">
            {/* Section: Basic Info */}
            <div className="rounded-lg border border-gray-200 bg-gradient-to-r from-blue-50/50 to-purple-50/50 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Basic Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Milestone Name *</Label>
                  <Input value={form.milestoneName} onChange={e => setForm(f => ({ ...f, milestoneName: e.target.value }))} placeholder="e.g. Apheresis Collection" />
                </div>
                <div>
                  <Label>Leg *</Label>
                  <Input type="number" value={form.leg} onChange={e => setForm(f => ({ ...f, leg: parseInt(e.target.value) || 1 }))} min={1} />
                </div>
              </div>
              <div>
                <Label>Care Program *</Label>
                <Select value={String(form.careProgramId)} onChange={e => setForm(f => ({ ...f, careProgramId: parseInt(e.target.value) }))} options={careProgramOptions} placeholder="Select care program..." />
              </div>
            </div>

            {/* Section: Cryo Types */}
            <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Cryo Types & Flags</h3>
              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <Checkbox checked={form.cryoCentral} onCheckedChange={v => setForm(f => ({ ...f, cryoCentral: v }))} />
                  <Label>Central</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={form.cryoManufacturing} onCheckedChange={v => setForm(f => ({ ...f, cryoManufacturing: v }))} />
                  <Label>Manufacturing</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={form.cryoLocal} onCheckedChange={v => setForm(f => ({ ...f, cryoLocal: v }))} />
                  <Label>Local</Label>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Label>WDC Applicable</Label>
                <Switch checked={form.wdcApplicable} onCheckedChange={v => setForm(f => ({ ...f, wdcApplicable: v }))} />
              </div>
            </div>

            {/* Section: Lead Times */}
            <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Lead Times (days)</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Cryo Lead Time</Label>
                  <Input type="number" value={form.cryoLeadTime} onChange={e => setForm(f => ({ ...f, cryoLeadTime: e.target.value }))} placeholder="0" />
                </div>
                <div>
                  <Label>Local Lead Time</Label>
                  <Input type="number" value={form.localLeadTime} onChange={e => setForm(f => ({ ...f, localLeadTime: e.target.value }))} placeholder="0" />
                </div>
                <div>
                  <Label>Mfg Lead Time</Label>
                  <Input type="number" value={form.mfgLeadTime} onChange={e => setForm(f => ({ ...f, mfgLeadTime: e.target.value }))} placeholder="0" />
                </div>
              </div>
            </div>

            {/* Section: Site Filters */}
            <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Site Filters</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Apheresis Site</Label>
                  <Select value={form.aphSiteId} onChange={e => setForm(f => ({ ...f, aphSiteId: e.target.value }))} options={sitesByType("Apheresis")} placeholder="Select..." />
                </div>
                <div>
                  <Label>Cryo Site</Label>
                  <Select value={form.cryoSiteId} onChange={e => setForm(f => ({ ...f, cryoSiteId: e.target.value }))} options={sitesByType("Cryopreservation")} placeholder="Select..." />
                </div>
                <div>
                  <Label>Manufacturing Site</Label>
                  <Select value={form.mfgSiteId} onChange={e => setForm(f => ({ ...f, mfgSiteId: e.target.value }))} options={sitesByType("Manufacturing")} placeholder="Select..." />
                </div>
                <div>
                  <Label>WDC Site</Label>
                  <Select value={form.wdcSiteId} onChange={e => setForm(f => ({ ...f, wdcSiteId: e.target.value }))} options={sitesByType("Distribution Center")} placeholder="Select..." />
                </div>
                <div>
                  <Label>Infusion Site</Label>
                  <Select value={form.infusionSiteId} onChange={e => setForm(f => ({ ...f, infusionSiteId: e.target.value }))} options={sitesByType("Infusion")} placeholder="Select..." />
                </div>
              </div>
            </div>

            {/* Section: Update Logic */}
            <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Update Logic</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Central Update Logic</Label>
                  <Select value={form.updateLogicCentral} onChange={e => setForm(f => ({ ...f, updateLogicCentral: e.target.value }))} options={updateLogicOptions} placeholder="Select..." />
                </div>
                <div>
                  <Label>Central Applicability</Label>
                  <Select value={form.centralApplicability} onChange={e => setForm(f => ({ ...f, centralApplicability: e.target.value }))} options={applicabilityOptions} placeholder="Select..." />
                </div>
                <div>
                  <Label>Mfg Update Logic</Label>
                  <Select value={form.updateLogicMfg} onChange={e => setForm(f => ({ ...f, updateLogicMfg: e.target.value }))} options={updateLogicOptions} placeholder="Select..." />
                </div>
                <div>
                  <Label>Mfg Applicability</Label>
                  <Select value={form.mfgApplicability} onChange={e => setForm(f => ({ ...f, mfgApplicability: e.target.value }))} options={applicabilityOptions} placeholder="Select..." />
                </div>
                <div>
                  <Label>Local Update Logic</Label>
                  <Select value={form.updateLogicLocal} onChange={e => setForm(f => ({ ...f, updateLogicLocal: e.target.value }))} options={updateLogicOptions} placeholder="Select..." />
                </div>
                <div>
                  <Label>Local Applicability</Label>
                  <Select value={form.localApplicability} onChange={e => setForm(f => ({ ...f, localApplicability: e.target.value }))} options={applicabilityOptions} placeholder="Select..." />
                </div>
              </div>
            </div>

            {/* Section: Other */}
            <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Other Settings</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Non-Working Days</Label>
                  <Input value={form.nonWorkingDay} onChange={e => setForm(f => ({ ...f, nonWorkingDay: e.target.value }))} placeholder="e.g. Sat,Sun" />
                </div>
                <div>
                  <Label>Holiday Site Association</Label>
                  <Input value={form.holidaySiteAssociation} onChange={e => setForm(f => ({ ...f, holidaySiteAssociation: e.target.value }))} placeholder="e.g. Apheresis" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Label>Active</Label>
                <Switch checked={form.active} onCheckedChange={v => setForm(f => ({ ...f, active: v }))} />
              </div>
            </div>

            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">{editing ? "Save Changes" : "Create LTM Config"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
