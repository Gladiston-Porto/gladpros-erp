"use client"

import * as React from "react"
import { cn } from "../utils/cn"

export interface FinanceCardProps {
    title: string
    value: number | string
    description?: string
    trend?: "up" | "down" | "neutral" | "stable"
    icon?: React.ReactNode
    variant?: "income" | "expense" | "neutral" | "error"
    className?: string
    // Add change for compatibility if needed, although the original file didn't have it.
    // The error showed usages like value={kpis.saldoPeriodo} change={kpis.crescimentoReceita}
    // So the usage in ExecutiveTab has "change" prop but the definition I found in src/components/design-system/FinanceCard.tsx DOES NOT have it.
    // This means ExecutiveTab might have been using a DIFFERENT FinanceCard or the types were loose.
    // Let me check ExecutiveTab usage again.
    change?: number
}

export function FinanceCard({
    title,
    value,
    description,
    trend,
    icon,
    variant = "neutral",
    className = "",
    change,
}: FinanceCardProps) {
    // Format value if it's a number
    const formatValue = (val: number | string) => {
        if (typeof val === "number") {
            return new Intl.NumberFormat("pt-BR", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
                style: "currency",
                currency: "BRL",
            }).format(val)
        }
        return val
    }

    // Custom logic to handle just numbers being passed as value without formatting in props?
    // The usage used formatCurrency helper in ExecutiveTab, but also passed raw numbers to FinanceCard.
    // In ExecutiveTab: value={kpis.saldoPeriodo} (number)
    // The original component had logic: 
    /*
      if (typeof val === 'number') {
        return new Intl.NumberFormat('pt-BR', { ... }).format(val)
      }
    */
    // So I should keep that.

    // Icon background gradient based on variant
    const getIconGradient = () => {
        switch (variant) {
            case "income":
                return "linear-gradient(135deg, #4ade80 0%, #16a34a 100%)"
            case "expense":
                return "linear-gradient(135deg, #f87171 0%, #dc2626 100%)"
            case "error":
                return "linear-gradient(135deg, rgba(255, 140, 0, 0.8) 0%, #FF8C00 100%)"
            default:
                return "linear-gradient(135deg, rgba(0, 152, 218, 0.8) 0%, #0098DA 100%)"
        }
    }

    return (
        <div
            className={cn(
                "rounded-xl border bg-card text-card-foreground p-6 shadow-card hover:shadow-card-hover transition-shadow duration-200",
                className
            )}
        >
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                        {title}
                    </p>
                    <p className="text-3xl font-bold text-foreground">
                        {formatValue(value)}
                    </p>
                    {(description || change !== undefined) && (
                        <div className="flex flex-col gap-1">
                            {change !== undefined && (
                                <span className={cn("text-xs font-medium", change >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                                    {change > 0 ? "+" : ""}{change.toFixed(1)}% vs período anterior
                                </span>
                            )}
                            {description && (
                                <p className="text-sm text-muted-foreground">
                                    {description}
                                </p>
                            )}
                        </div>
                    )}
                </div>
                {icon && (
                    <div
                        className="p-3 rounded-xl shrink-0 text-white shadow-sm"
                        style={{
                            background: getIconGradient(),
                        }}
                    >
                        {icon}
                    </div>
                )}
            </div>
        </div>
    )
}
