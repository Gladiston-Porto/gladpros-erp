/**
 * AlertaDataTable Component
 * DataTable para listar alertas com cores por prioridade
 * Design System v2.0 - Semana 3
 */

'use client';

import { useMemo } from 'react';
import { Badge } from '@gladpros/ui/badge'
import { Button } from '@gladpros/ui/button';
import { DataTable } from '@/shared/components/data-table';
import type { ColumnDef } from '@tanstack/react-table';
import {
  AlertTriangle,
  XCircle,
  Clock,
  Calendar,
  Wrench,
  TrendingDown,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import { formatDate } from '@/lib/estoque/utils/formatters';
import { useRouter } from 'next/navigation';

export type AlertaTableRow = {
  id: bigint;
  tipo: string;
  prioridade: string;
  titulo: string;
  mensagem: string;
  dataAlerta: Date;
  dataResolvido: Date | null;
  materialNome: string | null;
  equipamentoNome: string | null;
  projetoNumero: string | null;
  ativo: boolean;
};

type AlertaDataTableProps = {
  alertas: AlertaTableRow[];
  onResolverClick?: (id: bigint) => void;
};

const TIPO_CONFIG = {
  ESTOQUE_MINIMO: { icon: TrendingDown, label: 'Estoque Mínimo', color: 'text-orange-600' },
  ESTOQUE_ZERO: { icon: XCircle, label: 'Estoque Zero', color: 'text-red-600' },
  VALIDADE_PROXIMA: { icon: Clock, label: 'Validade Próxima', color: 'text-yellow-600' },
  VALIDADE_VENCIDA: { icon: Calendar, label: 'Validade Vencida', color: 'text-red-600' },
  CALIBRACAO_PROXIMA: { icon: Wrench, label: 'Calibração Próxima', color: 'text-yellow-600' },
  CALIBRACAO_VENCIDA: { icon: Wrench, label: 'Calibração Vencida', color: 'text-red-600' },
  MANUTENCAO_PROXIMA: { icon: Wrench, label: 'Manutenção Próxima', color: 'text-yellow-600' },
  MANUTENCAO_VENCIDA: { icon: Wrench, label: 'Manutenção Vencida', color: 'text-red-600' },
  EQUIPAMENTO_NAO_DEVOLVIDO: {
    icon: AlertTriangle,
    label: 'Não Devolvido',
    color: 'text-red-600',
  },
  EQUIPAMENTO_DANIFICADO: { icon: XCircle, label: 'Equipamento Danificado', color: 'text-red-600' },
};

const PRIORIDADE_CONFIG = {
  BAIXA: { variant: 'outline' as const, label: 'Baixa', bgClass: 'bg-gray-50' },
  MEDIA: { variant: 'secondary' as const, label: 'Média', bgClass: 'bg-yellow-50' },
  ALTA: { variant: 'default' as const, label: 'Alta', bgClass: 'bg-orange-50' },
  CRITICA: { variant: 'destructive' as const, label: 'Crítica', bgClass: 'bg-red-50' },
};

export function AlertaDataTable({ alertas, onResolverClick }: AlertaDataTableProps) {
  const router = useRouter();

  const columns = useMemo<ColumnDef<AlertaTableRow>[]>(
    () => [
      {
        accessorKey: 'tipo',
        header: 'Tipo',
        cell: ({ row }) => {
          const tipo = row.original.tipo;
          const config = TIPO_CONFIG[tipo as keyof typeof TIPO_CONFIG];
          if (!config) return tipo;

          const Icon = config.icon;
          return (
            <div className="flex items-center gap-2">
              <Icon className={`h-4 w-4 ${config.color}`} />
              <span className="text-sm">{config.label}</span>
            </div>
          );
        },
      },
      {
        accessorKey: 'prioridade',
        header: 'Prioridade',
        cell: ({ row }) => {
          const prioridade = row.original.prioridade;
          const config = PRIORIDADE_CONFIG[prioridade as keyof typeof PRIORIDADE_CONFIG];
          if (!config) return prioridade;

          return (
            <Badge variant={config.variant} className="font-medium">
              {config.label}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'titulo',
        header: 'Título',
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-sm">{row.original.titulo}</p>
            <p className="text-xs text-muted-foreground truncate max-w-xs">
              {row.original.mensagem}
            </p>
          </div>
        ),
      },
      {
        accessorKey: 'materialNome',
        header: 'Material',
        cell: ({ row }) => {
          const nome = row.original.materialNome;
          return nome ? <span className="text-sm">{nome}</span> : <span className="text-muted-foreground">—</span>;
        },
      },
      {
        accessorKey: 'equipamentoNome',
        header: 'Equipamento',
        cell: ({ row }) => {
          const nome = row.original.equipamentoNome;
          return nome ? <span className="text-sm">{nome}</span> : <span className="text-muted-foreground">—</span>;
        },
      },
      {
        accessorKey: 'projetoNumero',
        header: 'Projeto',
        cell: ({ row }) => {
          const numero = row.original.projetoNumero;
          return numero ? <span className="text-sm">{numero}</span> : <span className="text-muted-foreground">—</span>;
        },
      },
      {
        accessorKey: 'dataAlerta',
        header: 'Data',
        cell: ({ row }) => <span className="text-sm">{formatDate(row.original.dataAlerta)}</span>,
      },
      {
        accessorKey: 'dataResolvido',
        header: 'Status',
        cell: ({ row }) => {
          const resolvido = row.original.dataResolvido;
          return resolvido ? (
            <div className="flex items-center gap-1 text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-xs">Resolvido</span>
            </div>
          ) : (
            <Badge variant="outline" className="text-orange-600 border-orange-600">
              Pendente
            </Badge>
          );
        },
      },
      {
        id: 'actions',
        header: 'Ações',
        cell: ({ row }) => {
          const alerta = row.original;
          const isResolvido = !!alerta.dataResolvido;

          return (
            <div className="flex gap-2">
              {!isResolvido && onResolverClick && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    onResolverClick(alerta.id);
                  }}
                >
                  Resolver
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  router.push(`/estoque/alertas/${alerta.id}`);
                }}
              >
                <Eye className="h-4 w-4" />
              </Button>
            </div>
          );
        },
      },
    ],
    [router, onResolverClick]
  );

  return (
    <DataTable
      data={alertas}
      columns={columns}
      searchKey="titulo"
      searchPlaceholder="Buscar por título..."
    />
  );
}
