"use client"
import React, { createContext, useContext, useState, useEffect, useCallback } from "react"

interface ScenarioContextValue {
  scenarioId: number | null
  scenarioName: string | null
  scenarioStatus: string | null
  setScenario: (id: number | null, name?: string | null, status?: string | null) => void
}

const ScenarioContext = createContext<ScenarioContextValue>({
  scenarioId: null,
  scenarioName: null,
  scenarioStatus: null,
  setScenario: () => {},
})

export function ScenarioProvider({ children }: { children: React.ReactNode }) {
  const [scenarioId, setScenarioId] = useState<number | null>(null)
  const [scenarioName, setScenarioName] = useState<string | null>(null)
  const [scenarioStatus, setScenarioStatus] = useState<string | null>(null)

  useEffect(() => {
    // Restore from sessionStorage
    const stored = sessionStorage.getItem("activeScenario")
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setScenarioId(parsed.id)
        setScenarioName(parsed.name)
        setScenarioStatus(parsed.status)
      } catch { /* ignore */ }
    }
  }, [])

  const setScenario = useCallback((id: number | null, name?: string | null, status?: string | null) => {
    setScenarioId(id)
    setScenarioName(name || null)
    setScenarioStatus(status || null)
    if (id) {
      sessionStorage.setItem("activeScenario", JSON.stringify({ id, name, status }))
    } else {
      sessionStorage.removeItem("activeScenario")
    }
  }, [])

  return (
    <ScenarioContext.Provider value={{ scenarioId, scenarioName, scenarioStatus, setScenario }}>
      {children}
    </ScenarioContext.Provider>
  )
}

export function useScenarioContext() {
  return useContext(ScenarioContext)
}
