"use client"
import { Sidebar } from "./sidebar"
import { ScenarioProvider } from "./scenario-context"
import { ScenarioBanner } from "./scenario-banner"

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <ScenarioProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 ml-64">
          <div className="p-6 lg:p-8">
            <ScenarioBanner />
            {children}
          </div>
        </main>
      </div>
    </ScenarioProvider>
  )
}
