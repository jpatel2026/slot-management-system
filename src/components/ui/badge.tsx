import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

// SLDS Pills — rounded-full, minimal border, semantic colors
const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default:     "bg-[#706E6B] text-white",
        secondary:   "bg-[#F3F3F3] text-[#444444] border border-[#DDDBDA]",
        outline:     "border border-[#DDDBDA] text-[#444444] bg-transparent",
        success:     "bg-[#EEF6EC] text-[#2E844A]",
        warning:     "bg-[#FEF0C7] text-[#7E5400]",
        destructive: "bg-[#FDECEA] text-[#C23934]",
        info:        "bg-[#EBF4FF] text-[#0176D3]",
        purple:      "bg-purple-50 text-purple-700",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
