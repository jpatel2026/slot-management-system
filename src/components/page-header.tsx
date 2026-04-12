"use client"
import React from "react"
import { Button } from "@/components/ui/button"
import { Plus, Bot } from "lucide-react"

interface PageHeaderProps {
  title: string
  description?: string
  createLabel?: string
  onCreateClick?: () => void
  children?: React.ReactNode
}

export function PageHeader({ title, description, createLabel, onCreateClick, children }: PageHeaderProps) {
  return (
    <div className="mb-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">{title}</h1>
            <div className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-100 px-2.5 py-0.5">
              <Bot className="h-3 w-3 text-blue-500" />
              <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider">Live</span>
            </div>
          </div>
          {description && (
            <p className="mt-1 text-sm text-gray-500">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {children}
          {createLabel && onCreateClick && (
            <Button onClick={onCreateClick} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg shadow-blue-500/20">
              <Plus className="h-4 w-4 mr-1.5" />
              {createLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
