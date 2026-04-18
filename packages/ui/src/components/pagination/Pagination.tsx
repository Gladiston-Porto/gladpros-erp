"use client"

import * as React from "react"

export interface PaginationProps {
  total: number
  page: number
  pageSize: number
  onPageChange: (p: number) => void
  onPageSizeChange?: (s: number) => void
  pageSizeOptions?: number[]
  siblingCount?: number
  compact?: boolean
}

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v))
}

function range(start: number, end: number) {
  const r: number[] = []
  for (let i = start; i <= end; i++) r.push(i)
  return r
}

export default function Pagination({
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  siblingCount = 1,
  compact = false,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const first = 1
  const last = totalPages

  const left = clamp(page - siblingCount, first, last)
  const right = clamp(page + siblingCount, first, last)

  let pages: Array<number | string> = []

  if (totalPages <= 7) {
    pages = range(1, totalPages)
  } else {
    if (page <= 4) {
      pages = [...range(1, 5), "...", last]
    } else if (page >= totalPages - 3) {
      pages = [first, "...", ...range(totalPages - 4, totalPages)]
    } else {
      pages = [first, "...", ...range(page - 1, page + 1), "...", last]
    }
  }

  const btnBase =
    "inline-flex items-center justify-center px-3 py-1.5 text-sm rounded-2xl border border-neutral-200 bg-white text-gray-800 hover:bg-brand-primary hover:text-white transition-colors dark:bg-white/5 dark:border-white/10"

  return (
    <div className={`flex items-center justify-between gap-3 ${compact ? "text-sm" : "text-base"}`}>
      <div className="flex items-center gap-2">
        <button
          className={`${btnBase} ${page === 1 ? "opacity-50 cursor-not-allowed" : ""}`}
          onClick={() => onPageChange(1)}
          disabled={page === 1}
          aria-label="Ir para primeira página"
        >
          «
        </button>
        <button
          className={`${btnBase} ${page === 1 ? "opacity-50 cursor-not-allowed" : ""}`}
          onClick={() => onPageChange(clamp(page - 1, 1, totalPages))}
          disabled={page === 1}
          aria-label="Página anterior"
        >
          ‹
        </button>

        <nav aria-label="paginação" className="flex items-center gap-2">
          {pages.map((p, i) =>
            typeof p === "string" ? (
              <span key={i} className="px-2 text-sm text-gray-400">
                {p}
              </span>
            ) : (
              <button
                key={i}
                className={`${btnBase} ${p === page ? "bg-brand-primary text-white border-brand-primary" : ""}`}
                onClick={() => onPageChange(p)}
                aria-current={p === page ? "page" : undefined}
                aria-label={`Ir para página ${p}`}
              >
                {p}
              </button>
            )
          )}
        </nav>

        <button
          className={`${btnBase} ${page === totalPages ? "opacity-50 cursor-not-allowed" : ""}`}
          onClick={() => onPageChange(clamp(page + 1, 1, totalPages))}
          disabled={page === totalPages}
          aria-label="Próxima página"
        >
          ›
        </button>
        <button
          className={`${btnBase} ${page === totalPages ? "opacity-50 cursor-not-allowed" : ""}`}
          onClick={() => onPageChange(totalPages)}
          disabled={page === totalPages}
          aria-label="Ir para última página"
        >
          »
        </button>
      </div>

      <div className="flex items-center gap-2">
        {onPageSizeChange && (
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <span>Por página</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-9 rounded-2xl border border-neutral-200 bg-white px-2 text-sm dark:bg-white/5 dark:border-white/10"
              aria-label="Itens por página"
            >
              {pageSizeOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="text-sm text-gray-600 dark:text-gray-300">
          {total === 0 ? "Nenhum resultado" : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} de ${total}`}
        </div>
      </div>
    </div>
  )
}
