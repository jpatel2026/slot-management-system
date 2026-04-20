import * as React from "react"
import { cn } from "@/lib/utils"

// SLDS Input
const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        "flex h-9 w-full rounded border border-[#DDDBDA] bg-white px-3 py-1 text-sm text-[#181818]",
        "placeholder:text-[#706E6B]",
        "transition-colors",
        "focus-visible:outline-none focus-visible:border-[#0176D3] focus-visible:ring-1 focus-visible:ring-[#0176D3]",
        "disabled:cursor-not-allowed disabled:bg-[#F3F3F3] disabled:text-[#706E6B]",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium",
        className
      )}
      ref={ref}
      {...props}
    />
  )
)
Input.displayName = "Input"

export { Input }
