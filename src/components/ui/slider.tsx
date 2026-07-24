import * as React from "react"
import { cn } from "@/src/lib/utils"

export interface SliderProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  value: number
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className, value, min = 0, max = 100, ...props }, ref) => {
    
    // Calculate percentage for background fill
    const percentage = ((value - Number(min)) / (Number(max) - Number(min))) * 100
    
    return (
      <div className={cn("relative w-full flex items-center h-4", className)}>
        <input
          type="range"
          ref={ref}
          value={value}
          min={min}
          max={max}
          className="absolute w-full h-2 appearance-none bg-muted rounded-full outline-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:relative [&::-webkit-slider-thumb]:z-10"
          style={{
            background: `linear-gradient(to right, var(--primary) ${percentage}%, var(--muted) ${percentage}%)`
          }}
          {...props}
        />
      </div>
    )
  }
)
Slider.displayName = "Slider"

export { Slider }
