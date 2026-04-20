import * as React from "react"
import { cn } from "@/lib/utils"

// SLDS Form Label
const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        "text-[11px] font-semibold text-[#3E3E3C] uppercase tracking-wide leading-none",
        "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
)
Label.displayName = "Label"

export { Label }
