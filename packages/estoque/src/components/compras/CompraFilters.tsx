/**
 * CompraFilters Component
 * Filtros para compras
 */

'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/shared/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Label } from '@/shared/components/ui/label';
import { X } from 'lucide-react';

type CompraFiltersProps = {
  fornecedores: Array<{ id: string; nome: string }>;
  projetos: Array<{ id: string; nome: string }>;
};

const STATUS = [
  { value: 'PENDENTE', label: 'Pendente' },
  { value: 'PARCIAL', label: 'Parcialmente Recebida' },
  { value: 'RECEBIDA', label: 'Recebida' },
  { value: 'CANCELADA', label: 'Cancelada' },
];

const TIPOS = [
  { value: 'MATERIAL', label: 'Material' },
  { value: 'EQUIPAMENTO', label: 'Equipamento' },
  { value: 'AMBOS', label: 'Material + Equipamento' },
];

export function CompraFilters({ fornecedores, projetos }: CompraFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete('page');
    router.push(`?${params.toString()}`);
  };

  const clearFilters = () => {
    router.push('/estoque/compras');
  };

  const hasFilters =
    searchParams.get('status') ||
    searchParams.get('tipo') ||
    searchParams.get('fornecedorId') ||
    searchParams.get('projetoId');

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold">Filtros</h3>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="mr-1 h-4 w-4" />
            Limpar
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={searchParams.get('status') || 'all'} onValueChange={(v) => updateFilter('status', v === 'all' ? '' : v)}>
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {STATUS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Tipo</Label>
          <Select value={searchParams.get('tipo') || 'all'} onValueChange={(v) => updateFilter('tipo', v === 'all' ? '' : v)}>
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {TIPOS.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Fornecedor</Label>
          <Select
            value={searchParams.get('fornecedorId') || 'all'}
            onValueChange={(v) => updateFilter('fornecedorId', v === 'all' ? '' : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {fornecedores.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Projeto</Label>
          <Select
            value={searchParams.get('projetoId') || 'all'}
            onValueChange={(v) => updateFilter('projetoId', v === 'all' ? '' : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {projetos.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
