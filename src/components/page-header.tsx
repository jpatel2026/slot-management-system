"use client"
import React from "react"
import { Button } from "@/components/ui/button"
import { Plus, ChevronRight } from "lucide-react"

interface PageHeaderProps {
  title: string
  description?: string
  createLabel?: string
  onCreateClick?: () => void
  children?: React.ReactNode
  objectType?: string
  breadcrumb?: string[]
}

export function PageHeader({
  title,
  description,
  createLabel,
  onCreateClick,
  children,
  objectType,
  breadcrumb,
}: PageHeaderProps) {
  return (
    <div className="mb-5 pb-4 border-b border-[#DDDBDA]">
      {/* Breadcrumb */}
      {breadcrumb && breadcrumb.length > 0 && (
        <nav className="flex items-center gap-1 text-xs text-[#706E6B] mb-2" aria-label="breadcrumb">
          {breadcrumb.map((crumb, i) => (
            <React.Fragment key={i}>
              {i > 0 && <ChevronRight className="h-3 w-3 text-[#DDDBDA]" />}
              <span
                className={
                  i === breadcrumb.length - 1
                    ? "text-[#181818] font-medium"
                    : "hover:text-[#0176D3] cursor-pointer transition-colors"
                }
              >
                {crumb}
              </span>
            </React.Fragment>
          ))}
        </nav>
      )}

      {/* Header row */}
      <div className="flex items-start justify-between gap-4">
        <div>
          {objectType && (
            <p className="text-[11px] font-semibold text-[#0176D3] uppercase tracking-wider mb-0.5">
              {objectType}
            </p>
          )}
          <h1 className="text-[22px] font-bold text-[#181818] leading-tight">{title}</h1>
          {description && (
            <p className="mt-0.5 text-sm text-[#706E6B]">{description}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-0.5 shrink-0">
          {children}
          {createLabel && onCreateClick && (
            <Button
              onClick={onCreateClick}
              className="bg-[#0176D3] hover:bg-[#014486] text-white shadow-sm"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              {createLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
