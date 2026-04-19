/**
 * ReceitaDataTable Component
 * DataTable para listar receitas com status e formas de recebimento
 * Design System v2.0 - Financeiro
 */

'use client'

import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Button } from '@gladpros/ui/button'
import { Badge } from "@gladpros/ui/badge"
import { DataTable } from '@/shared/components/data-table'
import type { LucideIcon } from 'lucide-react'
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  TrendingUp,
  Calendar,
} from 'lucide-react'
import { useRouter } from 'next/navigation'

export type ReceitaTableRow = {
  id: number;
  descricao: string;
  valor: number;
  tipo: string;
  status: string;
  dataEmissao: Date;
  dataVencimento: Date;
  dataRecebimento: Date | null;
  categoriaNome: string;
  categoriaCor: string | null;
  clienteNome: string | null;
  formaRecebimento: string;
};

type ReceitaDataTableProps = {
  receitas: ReceitaTableRow[];
};

const STATUS_CONFIG: Record<
  string,
  {
    icon: LucideIcon
    variant: 'financePending' | 'financeIncome' | 'error' | 'financeOverdue'
    label: string
  }
> = {
  PENDENTE: { icon: Clock, variant: 'financePending', label: 'Pendente' },
  RECEBIDA: { icon: CheckCircle, variant: 'financeIncome', label: 'Recebida' },
  CANCELADA: { icon: XCircle, variant: 'error', label: 'Cancelada' },
  VENCIDA: { icon: AlertTriangle, variant: 'financeOverdue', label: 'Vencida' },
}

const TIPO_LABELS: Record<string, string> = {
  VENDAS: 'Vendas',
  SERVICOS: 'Serviços',
  INVESTIMENTOS: 'Investimentos',
  OUTRA: 'Outra',
};

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
};

const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

export default function ReceitaDataTable({ receitas }: ReceitaDataTableProps) {
  const router = useRouter();

  const columns = useMemo<ColumnDef<ReceitaTableRow>[]>(
    () => [
      {
        accessorKey: 'descricao',
        header: 'Descrição',
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-sm">{row.original.descricao}</p>
            {row.original.clienteNome && (
              <p className="text-xs text-muted-foreground">{row.original.clienteNome}</p>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'valor',
        header: 'Valor',
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <TrendingUp className="h-4 w-4 text-green-600" />
            <span className="font-semibold text-sm text-green-600">
              {formatCurrency(row.original.valor)}
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'categoriaNome',
        header: 'Categoria',
        cell: ({ row }) => {
          const cor = row.original.categoriaCor;
          return (
            <Badge
              variant="outline"
              className="text-xs"
              style={cor ? { borderColor: cor, color: cor } : undefined}
            >
              {row.original.categoriaNome}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'tipo',
        header: 'Tipo',
        cell: ({ row }) => {
          const tipo = row.original.tipo;
          return <span className="text-sm">{TIPO_LABELS[tipo] || tipo}</span>;
        },
      },
      {
        accessorKey: 'dataEmissao',
        header: 'Emissão',
        cell: ({ row }) => <span className="text-sm">{formatDate(row.original.dataEmissao)}</span>,
      },
      {
        accessorKey: 'dataVencimento',
        header: 'Vencimento',
        cell: ({ row }) => {
          const hoje = new Date();
          hoje.setHours(0, 0, 0, 0);
          const vencimento = new Date(row.original.dataVencimento);
          vencimento.setHours(0, 0, 0, 0);
          const diasAteVencimento = Math.ceil(
            (vencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)
          );

          const isVencida = diasAteVencimento < 0 && row.original.status !== 'RECEBIDA';
          const isProximaVencer = diasAteVencimento >= 0 && diasAteVencimento <= 7;

          return (
            <div className="flex items-center gap-2">
              {(isVencida || isProximaVencer) && (
                <Calendar
                  className={`h-4 w-4 ${isVencida ? 'text-destructive' : 'text-orange-600'}`}
                />
              )}
              <span className={`text-sm ${isVencida ? 'text-destructive font-medium' : ''}`}>
                {formatDate(row.original.dataVencimento)}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: 'dataRecebimento',
        header: 'Recebimento',
        cell: ({ row }) => {
          const data = row.original.dataRecebimento;
          return data ? (
            <span className="text-sm text-green-600">{formatDate(data)}</span>
          ) : (
            <span className="text-muted-foreground text-xs">—</span>
          );
        },
      },
      {
        accessorKey: 'formaRecebimento',
        header: 'Forma',
        cell: ({ row }) => <span className="text-xs">{row.original.formaRecebimento}</span>,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const status = row.original.status;
          const config = STATUS_CONFIG[status];
          if (!config) return status;

          const Icon = config.icon;
          return (
            <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
              <Icon className="h-3 w-3" />
              {config.label}
            </Badge>
          );
        },
      },
      {
        id: 'actions',
        header: 'Ações',
        cell: ({ row }) => {
          const receita = row.original;
          return (
            <Button
              size="sm"
              variant="ghost"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation()
                router.push(`/dashboard/financeiro/receitas/${receita.id}`)
              }}
            >
              <Eye className="h-4 w-4" />
            </Button>
          );
        },
      },
    ],
    [router]
  );

  return (
    <DataTable
      data={receitas}
      columns={columns}
      searchable
      searchPlaceholder="Buscar por descrição..."
      onRowClick={(row: ReceitaTableRow) => router.push(`/dashboard/financeiro/receitas/${row.id}`)}
    />
  );
}
