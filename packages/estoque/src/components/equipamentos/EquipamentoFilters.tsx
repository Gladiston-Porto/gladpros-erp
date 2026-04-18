/**
 * EquipamentoFilters Component
 * Filtros para listagem de equipamentos
 */

'use client';

import { Button } from '@/shared/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Categoria } from '@gladpros/estoque/lib/types';

type EquipamentoFiltersProps = {
  categorias: Pick<Categoria, 'id' | 'nome'>[];
};

const TIPOS = [
  { value: 'FERRAMENTA_MANUAL', label: 'Ferramenta Manual' },
  { value: 'FERRAMENTA_ELETRICA', label: 'Ferramenta ElÃ©trica' },
  { value: 'EQUIPAMENTO_MEDICAO', label: 'Equipamento de MediÃ§Ã£o' },
  { value: 'EQUIPAMENTO_SEGURANCA', label: 'Equipamento de SeguranÃ§a' },
  { value: 'ANDAIME', label: 'Andaime' },
  { value: 'ESCADA', label: 'Escada' },
  { value: 'VEICULO', label: 'VeÃ­culo' },
  { value: 'OUTRO', label: 'Outro' },
];

const STATUS = [
  { value: 'DISPONIVEL', label: 'DisponÃ­vel' },
  { value: 'EM_USO', label: 'Em Uso' },
  { value: 'EM_MANUTENCAO', label: 'Em ManutenÃ§Ã£o' },
  { value: 'CALIBRACAO', label: 'CalibraÃ§Ã£o' },
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
    
    params.set('page', '1'); // Reset para primeira pÃ¡gina
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
        <SelectTrigger className="w-[180px]">
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
        <SelectTrigger className="w-[200px]">
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
        <SelectTrigger className="w-[180px]">
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

      {/* Filtro: Requer CalibraÃ§Ã£o */}
      <Select value={requerCalibracao || 'all'} onValueChange={(v) => updateFilter('requerCalibracao', v === 'all' ? '' : v)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="CalibraÃ§Ã£o" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="true">Requer calibraÃ§Ã£o</SelectItem>
          <SelectItem value="false">NÃ£o requer</SelectItem>
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

