import * as React from "react"
import { cn } from "@/src/lib/utils"
import { ChevronDown } from "lucide-react"

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  icon?: React.ReactNode
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, icon, ...props }, ref) => {
    return (
      <div className="relative w-full">
        <select
          className={cn(
            "appearance-none flex h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2 pr-10 text-sm text-zinc-900 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:focus-visible:ring-primary transition-all",
            className
          )}
          ref={ref}
          {...props}
        >
          {children}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center justify-center text-zinc-500">
          {icon || <ChevronDown className="h-4 w-4" />}
        </div>
      </div>
    )
  }
)
Select.displayName = "Select"

export { Select }
