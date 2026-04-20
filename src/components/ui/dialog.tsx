"use client"
import * as React from "react"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

// SLDS Modal
export function Dialog({ open, onOpenChange, children }: DialogProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#181818]/50 backdrop-blur-[1px]"
        onClick={() => onOpenChange(false)}
      />
      {/* Modal container */}
      <div className="relative z-50 w-full max-w-2xl max-h-[85vh] overflow-auto rounded border border-[#DDDBDA] bg-white shadow-xl animate-fade-in">
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 rounded p-1 text-[#706E6B] hover:bg-[#F3F3F3] hover:text-[#181818] transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
        {children}
      </div>
    </div>
  )
}

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col space-y-1 border-b border-[#DDDBDA] px-6 py-4 bg-[#FAFAF9]",
        className
      )}
      {...props}
    />
  )
}

export function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn("text-base font-bold text-[#181818] leading-snug", className)}
      {...props}
    />
  )
}

export function DialogContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("p-6 space-y-4", className)} {...props} />
  )
}
