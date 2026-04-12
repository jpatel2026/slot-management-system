"use client"
import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { Zap, Bot, Send, Loader2, CheckCircle2 } from "lucide-react"

interface Site {
  id: number; name: string; alias: string; siteId: string; mfgType: string | null
}

interface Product {
  id: number; name: string; code: string
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

export function GenerateAllocations({ siteType }: { siteType: string }) {
  const [sites, setSites] = useState<Site[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [selectedSite, setSelectedSite] = useState("")
  const [selectedProduct, setSelectedProduct] = useState("")
  const [month, setMonth] = useState(String(new Date().getMonth() + 1))
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [showRules, setShowRules] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<{ count: number } | null>(null)

  const isMfg = siteType === "Manufacturing"
  const capacityRows = isMfg
    ? ["Commercial", "Clinical", "Reserve", "Non-patient"]
    : ["Patient", "Reserve", "Non-patient"]
  const checkboxRows = isMfg ? ["Fresh", "Frozen"] : []

  // Rules table state
  const [rules, setRules] = useState<Record<string, Record<string, number | boolean>>>(() => {
    const r: Record<string, Record<string, number | boolean>> = {}
    for (const row of [...capacityRows, ...checkboxRows]) {
      r[row] = {}
      for (const day of DAYS) {
        r[row][day] = checkboxRows.includes(row) ? false : 0
      }
    }
    return r
  })

  // Chat state
  const [chatMessages, setChatMessages] = useState<{ role: string; text: string }[]>([])
  const [chatInput, setChatInput] = useState("")
  const [chatLoading, setChatLoading] = useState(false)

  const fetchSites = useCallback(async () => {
    const res = await fetch(`/api/accounts?siteType=${siteType === "Manufacturing" ? "Manufacturing" : "Cryopreservation"}&active=true`)
    setSites(await res.json())
  }, [siteType])

  const fetchProducts = useCallback(async () => {
    const res = await fetch("/api/products?active=true")
    setProducts(await res.json())
  }, [])

  useEffect(() => { fetchSites(); fetchProducts() }, [fetchSites, fetchProducts])

  const handleRuleChange = (row: string, day: string, value: number | boolean) => {
    setRules(prev => ({
      ...prev,
      [row]: { ...prev[row], [day]: value },
    }))
  }

  const handleProceed = () => {
    if (!selectedSite) return
    if (isMfg && !selectedProduct) return
    setShowRules(true)
  }

  const handleChatSend = async () => {
    if (!chatInput.trim()) return
    const userMsg = chatInput.trim()
    setChatMessages(prev => [...prev, { role: "user", text: userMsg }])
    setChatInput("")
    setChatLoading(true)

    // Parse natural language rules locally (simple pattern matching)
    try {
      const lower = userMsg.toLowerCase()
      const newRules = { ...rules }

      // Pattern: "Put X only on Day1 & Day2"
      const onlyMatch = lower.match(/(?:put|set)\s+(\w[\w\s-]*?)\s+(?:only\s+)?on\s+(.+)/i)
      if (onlyMatch) {
        const typeKey = findCapacityType(onlyMatch[1])
        const days = parseDays(onlyMatch[2])
        if (typeKey && days.length > 0) {
          for (const day of DAYS) {
            if (typeof newRules[typeKey][day] === "number") {
              newRules[typeKey][day] = days.includes(day) ? (newRules[typeKey][day] || 1) : 0
            }
          }
          setRules(newRules)
          setChatMessages(prev => [...prev, { role: "ai", text: `Updated: ${typeKey} set to only ${days.join(", ")}. All other days set to 0.` }])
        }
      }

      // Pattern: "max of N for Type on Day1 & Day2"
      const maxMatch = lower.match(/(?:max|put)\s+(?:of\s+)?(\d+)\s+(?:for\s+)?(\w+)\s+(?:on\s+)?(.+)/i)
      if (maxMatch) {
        const value = parseInt(maxMatch[1])
        const typeKey = findCapacityType(maxMatch[2])
        const days = parseDays(maxMatch[3])
        if (typeKey && days.length > 0) {
          for (const day of days) {
            if (day in newRules[typeKey]) newRules[typeKey][day] = value
          }
          setRules(newRules)
          setChatMessages(prev => [...prev, { role: "ai", text: `Set ${typeKey} = ${value} for ${days.join(", ")}.` }])
        }
      }

      // Pattern: "set all X to N"
      const allMatch = lower.match(/set\s+all\s+(\w+)\s+to\s+(\d+)/i)
      if (allMatch) {
        const typeKey = findCapacityType(allMatch[1])
        const value = parseInt(allMatch[2])
        if (typeKey) {
          for (const day of DAYS) {
            if (typeof newRules[typeKey][day] === "number") newRules[typeKey][day] = value
          }
          setRules(newRules)
          setChatMessages(prev => [...prev, { role: "ai", text: `Set all ${typeKey} days to ${value}.` }])
        }
      }

      if (!onlyMatch && !maxMatch && !allMatch) {
        setChatMessages(prev => [...prev, { role: "ai", text: `I understood your request but couldn't parse it into specific rules. Try patterns like:\n- "Set all Commercial to 3"\n- "Put Reserve only on Sunday & Monday"\n- "Max of 5 for Clinical on Tuesday & Saturday"` }])
      }
    } catch {
      setChatMessages(prev => [...prev, { role: "ai", text: "I couldn't parse that rule. Try a simpler format." }])
    }
    setChatLoading(false)
  }

  const findCapacityType = (input: string): string | null => {
    const lower = input.toLowerCase().trim()
    const map: Record<string, string> = {
      commercial: "Commercial", clinical: "Clinical", reserve: "Reserve",
      "non-patient": "Non-patient", nonpatient: "Non-patient", patient: "Patient",
      fresh: "Fresh", frozen: "Frozen",
    }
    return map[lower] || null
  }

  const parseDays = (input: string): string[] => {
    const dayMap: Record<string, string> = {
      mon: "Monday", tue: "Tuesday", tues: "Tuesday", wed: "Wednesday",
      thu: "Thursday", thur: "Thursday", thurs: "Thursday", fri: "Friday",
      sat: "Saturday", sun: "Sunday",
      monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday",
      thursday: "Thursday", friday: "Friday", saturday: "Saturday", sunday: "Sunday",
    }
    const parts = input.split(/[,&]+|\band\b|\bthrough\b|\bto\b/i).map(s => s.trim().toLowerCase())
    const days: string[] = []
    for (const p of parts) {
      if (p.includes("rest")) {
        const existing = days.length > 0 ? days : []
        for (const d of DAYS) { if (!existing.includes(d)) days.push(d) }
      } else if (dayMap[p]) {
        days.push(dayMap[p])
      }
    }
    return days
  }

  const handleGenerate = async () => {
    setGenerating(true)
    setResult(null)
    try {
      const res = await fetch("/api/allocation-engine/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId: parseInt(selectedSite),
          month: parseInt(month),
          year: parseInt(year),
          rules,
          siteType,
          productCode: selectedProduct,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult(data)
    } catch (e) {
      setResult({ count: -1 })
    }
    setGenerating(false)
  }

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1),
    label: new Date(2026, i, 1).toLocaleString("en-US", { month: "long" }),
  }))

  if (!showRules) {
    return (
      <div className="max-w-md mx-auto mt-8">
        <div className="rounded-2xl border bg-white p-8 shadow-lg glow-blue">
          <div className="flex items-center gap-3 mb-6">
            <div className="rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 p-3">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-gray-900">Generate Allocations</h2>
              <p className="text-xs text-gray-500">Select site and period to configure rules</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">{siteType} Site *</Label>
              <Select value={selectedSite} onChange={e => setSelectedSite(e.target.value)}
                options={sites.map(s => ({ value: String(s.id), label: `${s.name} (${s.alias})` }))} placeholder="Select site..." />
            </div>
            {isMfg && (
              <div>
                <Label className="text-sm font-medium">Product *</Label>
                <Select value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)}
                  options={products.map(p => ({ value: p.code, label: `${p.name} (${p.code})` }))} placeholder="Select product..." />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-medium">Month</Label>
                <Select value={month} onChange={e => setMonth(e.target.value)} options={months} />
              </div>
              <div>
                <Label className="text-sm font-medium">Year</Label>
                <Input type="number" value={year} onChange={e => setYear(e.target.value)} />
              </div>
            </div>
            <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg" onClick={handleProceed}>
              Configure Rules
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Badge variant="outline" className="text-sm">
          {sites.find(s => String(s.id) === selectedSite)?.name}
        </Badge>
        <Badge variant="outline" className="text-sm">
          {months.find(m => m.value === month)?.label} {year}
        </Badge>
        {selectedProduct && <Badge variant="info" className="text-sm">{selectedProduct}</Badge>}
        <Button variant="ghost" size="sm" onClick={() => setShowRules(false)}>Change</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Rules Table */}
        <div className="lg:col-span-2 rounded-xl border bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b bg-gray-50/80 flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-700">Rules Configuration</h3>
            <Badge variant="secondary" className="text-[10px]">Day-of-Week x Capacity Type</Badge>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/50">
                  <TableHead className="text-xs font-semibold w-32">Capacity Type</TableHead>
                  {DAYS.map(d => (
                    <TableHead key={d} className="text-xs font-semibold text-center">{d.slice(0, 3)}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {capacityRows.map(row => (
                  <TableRow key={row}>
                    <TableCell className="font-medium text-sm">{row}</TableCell>
                    {DAYS.map(day => (
                      <TableCell key={day} className="text-center p-1">
                        <Input
                          type="number" min={0}
                          value={rules[row][day] as number}
                          onChange={e => handleRuleChange(row, day, parseInt(e.target.value) || 0)}
                          className="h-8 w-14 text-center text-sm mx-auto"
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
                {checkboxRows.map(row => (
                  <TableRow key={row} className="bg-blue-50/30">
                    <TableCell className="font-medium text-sm">
                      <Badge variant={row === "Fresh" ? "info" : "purple"} className="text-[10px]">{row} Mfgtype</Badge>
                    </TableCell>
                    {DAYS.map(day => (
                      <TableCell key={day} className="text-center">
                        <div className="flex justify-center">
                          <Checkbox
                            checked={rules[row][day] as boolean}
                            onCheckedChange={v => handleRuleChange(row, day, v)}
                          />
                        </div>
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="px-5 py-4 border-t flex justify-end gap-3">
            {result && (
              <div className="flex-1 flex items-center gap-2">
                {result.count >= 0 ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-green-700">Generated {result.count} capacity records</span>
                  </>
                ) : (
                  <span className="text-sm text-red-600">Generation failed. Check IBP/MPS records exist.</span>
                )}
              </div>
            )}
            <Button onClick={handleGenerate} disabled={generating}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg">
              {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
              Generate Allocations
            </Button>
          </div>
        </div>

        {/* AI Chat Panel */}
        <div className="rounded-xl border bg-white shadow-sm flex flex-col" style={{ minHeight: 500 }}>
          <div className="px-4 py-3 border-b bg-gradient-to-r from-blue-50 to-purple-50 flex items-center gap-2">
            <Bot className="h-4 w-4 text-blue-600" />
            <h3 className="text-sm font-semibold text-gray-700">AI Rules Assistant</h3>
            <Zap className="h-3 w-3 text-amber-500 ml-auto" />
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-800">
              <p className="font-medium mb-1">I can help configure rules!</p>
              <p className="text-xs">Try: &quot;Set all Commercial to 3&quot; or &quot;Put Reserve only on Sunday &amp; Monday&quot;</p>
            </div>
            {chatMessages.map((msg, i) => (
              <div key={i} className={`rounded-lg p-3 text-sm ${msg.role === "user" ? "bg-gray-100 ml-8" : "bg-gradient-to-r from-blue-50 to-purple-50 mr-8 border border-blue-100"}`}>
                {msg.role === "ai" && <Bot className="h-3 w-3 text-blue-500 mb-1" />}
                <p className="whitespace-pre-wrap">{msg.text}</p>
              </div>
            ))}
            {chatLoading && (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Loader2 className="h-3 w-3 animate-spin" /> Processing...
              </div>
            )}
          </div>
          <div className="p-3 border-t">
            <div className="flex gap-2">
              <Textarea
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Type a rule in plain English..."
                className="min-h-[40px] text-sm resize-none"
                rows={1}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleChatSend() } }}
              />
              <Button size="icon" onClick={handleChatSend} disabled={chatLoading} className="bg-gradient-to-r from-blue-600 to-purple-600">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
