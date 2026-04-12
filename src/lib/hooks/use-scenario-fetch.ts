"use client"
import { useCallback } from "react"
import { useScenarioContext } from "@/components/scenario-context"

export function useScenarioFetch() {
  const { scenarioId } = useScenarioContext()

  const scenarioFetch = useCallback(
    (url: string, options?: RequestInit) => {
      if (!scenarioId) return fetch(url, options)

      // Append scenarioId to URL
      const separator = url.includes("?") ? "&" : "?"
      const finalUrl = `${url}${separator}scenarioId=${scenarioId}`

      // Also add to body for POST/PUT
      if (options?.body && (options.method === "POST" || options.method === "PUT")) {
        try {
          const body = JSON.parse(options.body as string)
          body.scenarioId = scenarioId
          return fetch(finalUrl, { ...options, body: JSON.stringify(body) })
        } catch {
          return fetch(finalUrl, options)
        }
      }

      return fetch(finalUrl, options)
    },
    [scenarioId]
  )

  return { scenarioFetch, scenarioId }
}
