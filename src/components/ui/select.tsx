import * as React from "react"
import { cn } from "@/lib/utils"

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: { value: string; label: string }[]
  placeholder?: string
}

// SLDS Select (combobox)
const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options, placeholder, ...props }, ref) => (
    <select
      className={cn(
        "flex h-9 w-full rounded border border-[#DDDBDA] bg-white px-3 py-1 text-sm text-[#181818]",
        "focus-visible:outline-none focus-visible:border-[#0176D3] focus-visible:ring-1 focus-visible:ring-[#0176D3]",
        "disabled:cursor-not-allowed disabled:bg-[#F3F3F3] disabled:text-[#706E6B]",
        "transition-colors",
        className
      )}
      ref={ref}
      {...props}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  )
)
Select.displayName = "Select"

export { Select }
