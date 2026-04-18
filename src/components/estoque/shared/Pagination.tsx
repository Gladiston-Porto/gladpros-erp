/**
 * Pagination Component
 * Navegação entre páginas com informações
 */

'use client';

import { Button } from "@gladpros/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@gladpros/ui/select";
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

type PaginationProps = {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export function Pagination({ pagination }: PaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { page, pageSize, total, totalPages } = pagination;

  const updatePage = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.push(`?${params.toString()}`);
  };

  const updatePageSize = (newPageSize: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('pageSize', newPageSize);
    params.set('page', '1'); // Reset para primeira página
    router.push(`?${params.toString()}`);
  };

  if (total === 0) {
    return null;
  }

  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between border-t bg-background px-4 py-3 sm:px-6">
      {/* Info */}
      <div className="flex flex-1 items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Mostrando <span className="font-medium">{startItem}</span> até{' '}
            <span className="font-medium">{endItem}</span> de{' '}
            <span className="font-medium">{total}</span> resultados
          </p>
        </div>

        <div className="flex items-center gap-6">
          {/* Page Size Selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Itens por página:
            </span>
            <Select
              value={pageSize.toString()}
              onValueChange={updatePageSize}
            >
              <SelectTrigger className="w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => updatePage(page - 1)}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <span className="text-sm">
              Página <span className="font-medium">{page}</span> de{' '}
              <span className="font-medium">{totalPages}</span>
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => updatePage(page + 1)}
              disabled={page === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
