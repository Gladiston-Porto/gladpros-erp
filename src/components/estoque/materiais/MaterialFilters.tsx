/**
 * MaterialFilters Component
 * Filtros para listagem de materiais
 */

'use client';

import { Button } from "@gladpros/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@gladpros/ui/select";
import { Label } from "@gladpros/ui/label";
import { X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';

type MaterialFiltersProps = {
  categorias: Array<{ id: number; nome: string }>;
};

export function MaterialFilters({ categorias }: MaterialFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [categoriaId, setCategoriaId] = useState(
    searchParams.get('categoriaId') || ''
  );
  const [ativo, setAtivo] = useState(searchParams.get('ativo') || 'all');

  const hasActiveFilters =
    categoriaId !== '' || ativo !== 'all' || searchParams.get('search');

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());

    // Atualiza categoriaId
    if (categoriaId) {
      params.set('categoriaId', categoriaId);
    } else {
      params.delete('categoriaId');
    }

    // Atualiza ativo
    if (ativo !== 'all') {
      params.set('ativo', ativo);
    } else {
      params.delete('ativo');
    }

    // Reseta para página 1
    params.set('page', '1');

    router.push(`?${params.toString()}`);
  }, [categoriaId, ativo, router, searchParams]);

  const handleClearFilters = () => {
    setCategoriaId('');
    setAtivo('all');

    const params = new URLSearchParams();
    params.set('page', '1');

    router.push(`?${params.toString()}`);
  };

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Filtros</h3>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="h-auto p-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="mr-1 h-3 w-3" />
            Limpar
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Filtro: Categoria */}
        <div className="space-y-2">
          <Label htmlFor="categoriaId" className="text-xs">
            Categoria
          </Label>
          <Select value={categoriaId || 'all'} onValueChange={(value) => setCategoriaId(value === 'all' ? '' : value)}>
            <SelectTrigger id="categoriaId">
              <SelectValue placeholder="Todas as categorias" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {categorias.map((categoria) => (
                <SelectItem key={categoria.id} value={String(categoria.id)}>
                  {categoria.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filtro: Status */}
        <div className="space-y-2">
          <Label htmlFor="ativo" className="text-xs">
            Status
          </Label>
          <Select value={ativo} onValueChange={setAtivo}>
            <SelectTrigger id="ativo">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="true">Ativos</SelectItem>
              <SelectItem value="false">Inativos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
