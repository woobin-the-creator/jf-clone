import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        first_step:
          "border-transparent bg-amber-100 text-amber-800 hover:bg-amber-100/90 dark:bg-amber-950 dark:text-amber-200 dark:hover:bg-amber-950/90",

        second_step:
          "border-transparent bg-cyan-100 text-cyan-800 hover:bg-cyan-100/90 dark:bg-cyan-950 dark:text-cyan-200 dark:hover:bg-cyan-950/90",

        third_step:
          "border-transparent bg-indigo-100 text-indigo-800 hover:bg-indigo-100/90 dark:bg-indigo-950 dark:text-indigo-200 dark:hover:bg-indigo-950/90",

        reject_step:
          "border-transparent bg-red-100 text-red-800 hover:bg-red-100/90 dark:bg-red-950 dark:text-red-200 dark:hover:bg-red-950/90",

        complete_step:
          "border-transparent bg-emerald-100 text-emerald-800 hover:bg-emerald-100/90 dark:bg-emerald-950 dark:text-emerald-200 dark:hover:bg-emerald-950/90",

        cancel_step:
          "border-transparent bg-gray-100 text-gray-800 hover:bg-gray-100/90 dark:bg-gray-950 dark:text-gray-200 dark:hover:bg-gray-950/90",
      },
    },
    defaultVariants: {
      variant: "default",
    },
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
