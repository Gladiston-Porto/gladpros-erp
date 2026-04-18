/**
 * AlertaFilters Component
 * Filtros para alertas
 */

'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from "@gladpros/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@gladpros/ui/select";
import { Label } from "@gladpros/ui/label";
import { X } from 'lucide-react';

type AlertaFiltersProps = {
  materiais: Array<{ id: string; nome: string }>;
  equipamentos: Array<{ id: string; nome: string }>;
};

const TIPOS = [
  { value: 'ESTOQUE_MINIMO', label: 'Estoque Mínimo' },
  { value: 'ESTOQUE_ZERO', label: 'Estoque Zero' },
  { value: 'VALIDADE_PROXIMA', label: 'Validade Próxima' },
  { value: 'VALIDADE_VENCIDA', label: 'Validade Vencida' },
  { value: 'CALIBRACAO_PROXIMA', label: 'Calibração Próxima' },
  { value: 'CALIBRACAO_VENCIDA', label: 'Calibração Vencida' },
  { value: 'MANUTENCAO_PROXIMA', label: 'Manutenção Próxima' },
  { value: 'MANUTENCAO_VENCIDA', label: 'Manutenção Vencida' },
  { value: 'EQUIPAMENTO_NAO_DEVOLVIDO', label: 'Não Devolvido' },
  { value: 'EQUIPAMENTO_DANIFICADO', label: 'Danificado' },
];

const PRIORIDADES = [
  { value: 'BAIXA', label: 'Baixa' },
  { value: 'MEDIA', label: 'Média' },
  { value: 'ALTA', label: 'Alta' },
  { value: 'CRITICA', label: 'Crítica' },
];

const STATUS = [
  { value: 'pendente', label: 'Pendentes' },
  { value: 'resolvido', label: 'Resolvidos' },
];

export function AlertaFilters({ materiais, equipamentos }: AlertaFiltersProps) {
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
    router.push('/estoque/alertas');
  };

  const hasFilters =
    searchParams.get('tipo') ||
    searchParams.get('prioridade') ||
    searchParams.get('status') ||
    searchParams.get('materialId') ||
    searchParams.get('equipamentoId');

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
          <Label>Prioridade</Label>
          <Select
            value={searchParams.get('prioridade') || 'all'}
            onValueChange={(v) => updateFilter('prioridade', v === 'all' ? '' : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {PRIORIDADES.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={searchParams.get('status') || 'all'}
            onValueChange={(v) => updateFilter('status', v === 'all' ? '' : v)}
          >
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
      </div>
    </div>
  );
}
