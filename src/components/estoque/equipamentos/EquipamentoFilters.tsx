/**
 * EquipamentoFilters Component
 * Filtros para listagem de equipamentos
 */

'use client';

import { Button } from "@gladpros/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@gladpros/ui/select";
import { X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Categoria } from '@/lib/estoque/types';

type EquipamentoFiltersProps = {
  categorias: Categoria[];
};

const TIPOS = [
  { value: 'FERRAMENTA_MANUAL', label: 'Ferramenta Manual' },
  { value: 'FERRAMENTA_ELETRICA', label: 'Ferramenta Elétrica' },
  { value: 'EQUIPAMENTO_MEDICAO', label: 'Equipamento de Medição' },
  { value: 'EQUIPAMENTO_SEGURANCA', label: 'Equipamento de Segurança' },
  { value: 'ANDAIME', label: 'Andaime' },
  { value: 'ESCADA', label: 'Escada' },
  { value: 'VEICULO', label: 'Veículo' },
  { value: 'OUTRO', label: 'Outro' },
];

const STATUS = [
  { value: 'DISPONIVEL', label: 'Disponível' },
  { value: 'EM_USO', label: 'Em Uso' },
  { value: 'EM_MANUTENCAO', label: 'Em Manutenção' },
  { value: 'CALIBRACAO', label: 'Calibração' },
  { value: 'DANIFICADO', label: 'Danificado' },
  { value: 'PERDIDO', label: 'Perdido' },
  { value: 'DESCARTADO', label: 'Descartado' },
];

export function EquipamentoFilters({ categorias }: EquipamentoFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const categoriaId = searchParams.get('categoriaId') || '';
  const tipo = searchParams.get('tipo') || '';
  const status = searchParams.get('status') || '';
  const requerCalibracao = searchParams.get('requerCalibracao') || '';

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    
    params.set('page', '1'); // Reset para primeira página
    router.push(`?${params.toString()}`);
  };

  const clearFilters = () => {
    const params = new URLSearchParams();
    const search = searchParams.get('search');
    if (search) {
      params.set('search', search);
    }
    router.push(`?${params.toString()}`);
  };

  const hasActiveFilters = !!(categoriaId || tipo || status || requerCalibracao);

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Filtro: Categoria */}
      <Select value={categoriaId || 'all'} onValueChange={(v) => updateFilter('categoriaId', v === 'all' ? '' : v)}>
        <SelectTrigger className="w-[180px]" aria-label="Filtrar por categoria">
          <SelectValue placeholder="Categoria" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas categorias</SelectItem>
          {categorias.map((cat) => (
            <SelectItem key={cat.id} value={cat.id.toString()}>
              {cat.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Filtro: Tipo */}
      <Select value={tipo || 'all'} onValueChange={(v) => updateFilter('tipo', v === 'all' ? '' : v)}>
        <SelectTrigger className="w-[200px]" aria-label="Filtrar por tipo de equipamento">
          <SelectValue placeholder="Tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os tipos</SelectItem>
          {TIPOS.map((t) => (
            <SelectItem key={t.value} value={t.value}>
              {t.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Filtro: Status */}
      <Select value={status || 'all'} onValueChange={(v) => updateFilter('status', v === 'all' ? '' : v)}>
        <SelectTrigger className="w-[180px]" aria-label="Filtrar por status do equipamento">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os status</SelectItem>
          {STATUS.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Filtro: Requer Calibração */}
      <Select value={requerCalibracao || 'all'} onValueChange={(v) => updateFilter('requerCalibracao', v === 'all' ? '' : v)}>
        <SelectTrigger className="w-[180px]" aria-label="Filtrar por necessidade de calibração">
          <SelectValue placeholder="Calibração" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="true">Requer calibração</SelectItem>
          <SelectItem value="false">Não requer</SelectItem>
        </SelectContent>
      </Select>

      {/* Limpar Filtros */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="h-9 px-2 lg:px-3"
        >
          Limpar
          <X className="ml-2 h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
