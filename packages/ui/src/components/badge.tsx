import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../utils/cn"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        // Soft variants — pastel bg + dark text (professional look)
        success:
          "border-green-200 bg-green-50 text-green-700 dark:border-green-800/30 dark:bg-green-900/20 dark:text-green-400 [a&]:hover:bg-green-100",
        error:
          "border-red-200 bg-red-50 text-red-700 dark:border-red-800/30 dark:bg-red-900/20 dark:text-red-400 [a&]:hover:bg-red-100",
        warning:
          "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-800/30 dark:bg-yellow-900/20 dark:text-yellow-400 [a&]:hover:bg-yellow-100",
        info:
          "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/30 dark:bg-blue-900/20 dark:text-blue-400 [a&]:hover:bg-blue-100",
        // Project-specific variants (soft style)
        projectPlanning:
          "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/30 dark:bg-blue-900/20 dark:text-blue-400",
        projectActive:
          "border-green-200 bg-green-50 text-green-700 dark:border-green-800/30 dark:bg-green-900/20 dark:text-green-400",
        projectOnHold:
          "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-800/30 dark:bg-yellow-900/20 dark:text-yellow-400",
        projectCompleted:
          "border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700/30 dark:bg-gray-800/20 dark:text-gray-400",
        projectCancelled:
          "border-red-200 bg-red-50 text-red-700 dark:border-red-800/30 dark:bg-red-900/20 dark:text-red-400",
        // Finance-specific variants (soft style)
        financePending:
          "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-800/30 dark:bg-yellow-900/20 dark:text-yellow-400",
        financePaid:
          "border-green-200 bg-green-50 text-green-700 dark:border-green-800/30 dark:bg-green-900/20 dark:text-green-400",
        financeOverdue:
          "border-red-200 bg-red-50 text-red-700 dark:border-red-800/30 dark:bg-red-900/20 dark:text-red-400",
        financeIncome:
          "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/30 dark:bg-blue-900/20 dark:text-blue-400",
        financeExpense:
          "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800/30 dark:bg-orange-900/20 dark:text-orange-400",
        financeScheduled:
          "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800/30 dark:bg-purple-900/20 dark:text-purple-400",
        primary:
          "border-transparent bg-blue-500 text-white [a&]:hover:bg-blue-600",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
