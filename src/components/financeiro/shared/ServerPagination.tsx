import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ServerPaginationProps {
  currentPage: number;
  totalPages: number;
  total: number;
  pageSize: number;
  basePath: string;
}

/**
 * URL-based pagination for Server Components.
 * Uses <Link> instead of useRouter — safe in RSC/SSR context.
 */
export function ServerPagination({
  currentPage,
  totalPages,
  total,
  pageSize,
  basePath,
}: ServerPaginationProps) {
  if (totalPages <= 1) return null;

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, total);

  const prevHref = currentPage > 1 ? `${basePath}?page=${currentPage - 1}` : null;
  const nextHref = currentPage < totalPages ? `${basePath}?page=${currentPage + 1}` : null;

  const pages: number[] = [];
  const delta = 2;
  for (let i = Math.max(1, currentPage - delta); i <= Math.min(totalPages, currentPage + delta); i++) {
    pages.push(i);
  }

  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-border">
      <p className="text-sm text-muted-foreground">
        {start}–{end} de {total} registros
      </p>
      <div className="flex items-center gap-1">
        {prevHref ? (
          <Link
            href={prevHref}
            className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-colors"
            aria-label="Página anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
        ) : (
          <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-border bg-muted/30 text-muted-foreground cursor-not-allowed">
            <ChevronLeft className="h-4 w-4" />
          </span>
        )}

        {pages.map((p) => (
          <Link
            key={p}
            href={`${basePath}?page=${p}`}
            className={`inline-flex items-center justify-center h-8 min-w-[2rem] px-2 rounded-lg border text-sm font-medium transition-colors ${
              p === currentPage
                ? "bg-brand-primary border-brand-primary text-white"
                : "border-border bg-background hover:bg-muted text-foreground"
            }`}
            aria-current={p === currentPage ? "page" : undefined}
          >
            {p}
          </Link>
        ))}

        {nextHref ? (
          <Link
            href={nextHref}
            className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-colors"
            aria-label="Próxima página"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        ) : (
          <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-border bg-muted/30 text-muted-foreground cursor-not-allowed">
            <ChevronRight className="h-4 w-4" />
          </span>
        )}
      </div>
    </div>
  );
}
