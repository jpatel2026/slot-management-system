import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0176D3] focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        // SLDS Brand button — primary action
        default:     "bg-[#0176D3] text-white shadow-sm hover:bg-[#014486] active:bg-[#014486]",
        // SLDS Neutral button
        outline:     "border border-[#DDDBDA] bg-white text-[#181818] shadow-sm hover:bg-[#F3F3F3] hover:border-[#9E9E9E]",
        secondary:   "bg-[#F3F3F3] border border-[#DDDBDA] text-[#444444] hover:bg-[#DDDBDA]",
        ghost:       "text-[#0176D3] hover:bg-[#EBF4FF] hover:text-[#014486]",
        // SLDS Destructive
        destructive: "bg-[#C23934] text-white shadow-sm hover:bg-[#A52019]",
        link:        "text-[#0176D3] underline-offset-4 hover:underline p-0 h-auto",
        // Keep for backward compat if any page uses className override
        brand:       "bg-[#0176D3] text-white shadow-sm hover:bg-[#014486]",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm:      "h-7 rounded px-3 text-xs",
        lg:      "h-10 rounded px-6",
        icon:    "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  )
)
Button.displayName = "Button"

export { Button, buttonVariants }
