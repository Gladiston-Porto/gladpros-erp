"use client"

import * as React from "react"
import { cn } from "../utils/cn"

export interface HeroSectionProps {
  title: string
  description?: string
  icon?: React.ReactNode
  actions?: React.ReactNode
  stats?: React.ReactNode
  className?: string
  compact?: boolean
}

export function HeroSection({
  title,
  description,
  icon,
  actions,
  stats,
  className,
  compact = false,
}: HeroSectionProps) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl bg-hero-gradient text-white dark:bg-hero-gradient",
        compact ? "px-6 py-6" : "px-6 py-8 sm:px-8 sm:py-10",
        className
      )}
    >
      {/* Background pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyem0wLTMwVjBoLTJ2NEgyNHYyaDEyVjR6TTI0IDI0aDEydi0ySDI0djJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          {icon && (
            <div className="hidden rounded-xl bg-white/10 p-3 backdrop-blur-sm sm:flex">
              {icon}
            </div>
          )}
          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold tracking-wide font-display sm:text-3xl">
              {title}
            </h1>
            {description && (
              <p className="text-sm text-white/80 max-w-2xl sm:text-base">
                {description}
              </p>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex items-center gap-2 shrink-0">
            {actions}
          </div>
        )}
      </div>

      {stats && (
        <div className="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
          {stats}
        </div>
      )}
    </section>
  )
}

export interface HeroStatProps {
  label: string
  value: string | number
  trend?: "up" | "down" | "neutral"
  trendValue?: string
  className?: string
}

export function HeroStat({
  label,
  value,
  trend,
  trendValue,
  className,
}: HeroStatProps) {
  return (
    <div
      className={cn(
        "rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm",
        className
      )}
    >
      <p className="text-xs font-medium text-white/60 uppercase tracking-wider">{label}</p>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-xl font-bold sm:text-2xl">{value}</span>
        {trend && trendValue && (
          <span
            className={cn(
              "text-xs font-medium",
              trend === "up" && "text-green-300",
              trend === "down" && "text-red-300",
              trend === "neutral" && "text-white/60"
            )}
          >
            {trendValue}
          </span>
        )}
      </div>
    </div>
  )
}
