import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, onCheckedChange, disabled, ...props }, ref) => {
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      onCheckedChange?.(event.target.checked)
    }

    return (
      <div className="relative inline-flex items-center">
        <input
          ref={ref}
          type="checkbox"
          className="sr-only"
          checked={checked}
          disabled={disabled}
          onChange={handleChange}
          {...props}
        />
        <div
          className={cn(
            "flex h-4 w-4 shrink-0 rounded-sm border border-gray-300 bg-white shadow-sm transition-all duration-200",
            "focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2",
            checked && "bg-blue-600 border-blue-600 text-white",
            disabled && "cursor-not-allowed opacity-50",
            !disabled && "cursor-pointer hover:border-gray-400",
            className
          )}
        >
          {checked && (
            <Check className="h-3 w-3 text-white m-0.5" />
          )}
        </div>
      </div>
    )
  }
)

Checkbox.displayName = "Checkbox"

export { Checkbox }