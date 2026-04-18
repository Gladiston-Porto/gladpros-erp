/**
 * MovimentacaoFilters Component
 * Filtros para movimentações
 */

'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from "@gladpros/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@gladpros/ui/select";
import { Input } from "@gladpros/ui/input";
import { Label } from "@gladpros/ui/label";
import { X } from 'lucide-react';

type MovimentacaoFiltersProps = {
  materiais: Array<{ id: string; nome: string }>;
  equipamentos: Array<{ id: string; nome: string }>;
  projetos: Array<{ id: string; nome: string }>;
};

const TIPOS = [
  { value: 'ENTRADA', label: 'Entrada' },
  { value: 'SAIDA', label: 'Saída' },
  { value: 'TRANSFERENCIA', label: 'Transferência' },
  { value: 'AJUSTE_POSITIVO', label: 'Ajuste Positivo' },
  { value: 'AJUSTE_NEGATIVO', label: 'Ajuste Negativo' },
  { value: 'RESERVA', label: 'Reserva' },
  { value: 'CANCELAMENTO_RESERVA', label: 'Cancelamento de Reserva' },
  { value: 'DEVOLUCAO', label: 'Devolução' },
  { value: 'PERDA', label: 'Perda' },
];

export function MovimentacaoFilters({ materiais, equipamentos, projetos }: MovimentacaoFiltersProps) {
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
    router.push('/estoque/movimentacoes');
  };

  const hasFilters =
    searchParams.get('tipo') ||
    searchParams.get('materialId') ||
    searchParams.get('equipamentoId') ||
    searchParams.get('projetoId') ||
    searchParams.get('dataInicio') ||
    searchParams.get('dataFim');

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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
          <Label>Material</Label>
          <Select
            value={searchParams.get('materialId') || 'all'}
            onValueChange={(v) => updateFilter('materialId', v === 'all' ? '' : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {materiais.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Equipamento</Label>
          <Select
            value={searchParams.get('equipamentoId') || 'all'}
            onValueChange={(v) => updateFilter('equipamentoId', v === 'all' ? '' : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {equipamentos.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.nome}
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

        <div className="space-y-2">
          <Label>Data Início</Label>
          <Input
            type="date"
            value={searchParams.get('dataInicio') || ''}
            onChange={(e) => updateFilter('dataInicio', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Data Fim</Label>
          <Input
            type="date"
            value={searchParams.get('dataFim') || ''}
            onChange={(e) => updateFilter('dataFim', e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
