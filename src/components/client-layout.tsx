"use client"
import { Sidebar } from "./sidebar"
import { GlobalHeader } from "./global-header"
import { ScenarioProvider } from "./scenario-context"
import { ScenarioBanner } from "./scenario-banner"

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <ScenarioProvider>
      <GlobalHeader />
      <div className="flex min-h-screen pt-[52px]">
        <Sidebar />
        <main className="flex-1 ml-64 min-h-[calc(100vh-52px)] bg-[#F3F3F3]">
          <div className="p-6 max-w-[1600px]">
            <ScenarioBanner />
            {children}
          </div>
        </main>
      </div>
    </ScenarioProvider>
  )
}
