"use client"
import * as React from "react"
import { cn } from "@/lib/utils"

interface TabsProps {
  defaultValue: string
  children: React.ReactNode
  className?: string
}

const TabsContext = React.createContext<{
  value: string
  setValue: (v: string) => void
}>({ value: "", setValue: () => {} })

export function Tabs({ defaultValue, children, className }: TabsProps) {
  const [value, setValue] = React.useState(defaultValue)
  return (
    <TabsContext.Provider value={{ value, setValue }}>
      <div className={cn("w-full", className)}>{children}</div>
    </TabsContext.Provider>
  )
}

// SLDS Tab Bar — white background, bottom-border active indicator
export function TabsList({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "flex items-end gap-0 border-b-2 border-[#DDDBDA] bg-white overflow-x-auto",
        className
      )}
    >
      {children}
    </div>
  )
}

export function TabsTrigger({
  value,
  children,
  className,
}: {
  value: string
  children: React.ReactNode
  className?: string
}) {
  const ctx = React.useContext(TabsContext)
  const active = ctx.value === value
  return (
    <button
      className={cn(
        "relative px-4 py-2.5 text-sm whitespace-nowrap transition-colors -mb-[2px] border-b-[3px]",
        active
          ? "border-[#0176D3] text-[#0176D3] font-semibold"
          : "border-transparent text-[#444444] hover:text-[#0176D3] hover:border-[#0176D3]/30 font-medium",
        className
      )}
      onClick={() => ctx.setValue(value)}
    >
      {children}
    </button>
  )
}

export function TabsContent({
  value,
  children,
  className,
}: {
  value: string
  children: React.ReactNode
  className?: string
}) {
  const ctx = React.useContext(TabsContext)
  if (ctx.value !== value) return null
  return (
    <div className={cn("mt-4", className)}>{children}</div>
  )
}
