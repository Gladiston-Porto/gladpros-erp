
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Badge } from "./badge"
import { cn } from "../utils"

interface StockBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
    quantity: number
    minStock?: number
    criticalStock?: number
}

export function StockBadge({
    quantity,
    minStock = 0,
    criticalStock = 0,
    className,
    ...props
}: StockBadgeProps) {
    let variant: "default" | "destructive" | "outline" | "secondary" = "outline"

    if (quantity <= criticalStock) {
        variant = "destructive"
    } else if (quantity <= minStock) {
        variant = "secondary" // Yellowish usually, or we can use custom logic
    } else {
        variant = "outline" // Greenish or default
    }

    // Custom styling wrapper if needed, but Badge usually handles it.
    // We can add custom colors via className if needed.

    const getStatusColor = () => {
        if (quantity <= criticalStock) return "bg-red-100 text-red-800 hover:bg-red-100 border-red-200"
        if (quantity <= minStock) return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-200"
        return "bg-green-100 text-green-800 hover:bg-green-100 border-green-200"
    }

    return (
        <Badge
            variant="outline"
            className={cn(getStatusColor(), className)}
            {...props}
        >
            {quantity}
        </Badge>
    )
}
