/**
 * DespesaDataTable Component
 * DataTable para listar despesas com status e categorias
 * Design System v2.0 - Financeiro
 */

'use client'

import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Button } from '@gladpros/ui/button'
import { DataTable } from '@/shared/components/data-table'
import { Badge } from "@gladpros/ui/badge"
import type { LucideIcon } from 'lucide-react'
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  CreditCard,
  Calendar,
} from 'lucide-react'
import { useRouter } from 'next/navigation'

export type DespesaTableRow = {
  id: number;
  descricao: string;
  valor: number;
  tipo: string;
  status: string;
  dataVencimento: Date;
  dataPagamento: Date | null;
  categoriaNome: string;
  categoriaCor: string | null;
  fornecedorNome: string | null;
  formaPagamento: string;
  requerAprovacao: boolean;
};

type DespesaDataTableProps = {
  despesas: DespesaTableRow[];
};

const STATUS_CONFIG: Record<
  string,
  {
    icon: LucideIcon
    variant:
    | 'financePending'
    | 'financePaid'
    | 'financeOverdue'
    | 'success'
    | 'error'
    label: string
  }
> = {
  PENDENTE: { icon: Clock, variant: 'financePending', label: 'Pendente' },
  APROVADA: { icon: CheckCircle, variant: 'success', label: 'Aprovada' },
  PAGA: { icon: CheckCircle, variant: 'financePaid', label: 'Paga' },
  CANCELADA: { icon: XCircle, variant: 'error', label: 'Cancelada' },
  VENCIDA: { icon: AlertTriangle, variant: 'financeOverdue', label: 'Vencida' },
}

const TIPO_LABELS: Record<string, string> = {
  OPERACIONAL: 'Operacional',
  ADMINISTRATIVA: 'Administrativa',
  PESSOAL: 'Pessoal',
  TRIBUTARIA: 'Tributária',
  FINANCEIRA: 'Financeira',
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

export default function DespesaDataTable({ despesas }: DespesaDataTableProps) {
  const router = useRouter();

  const columns = useMemo<ColumnDef<DespesaTableRow>[]>(
    () => [
      {
        accessorKey: 'descricao',
        header: 'Descrição',
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-sm">{row.original.descricao}</p>
            {row.original.fornecedorNome && (
              <p className="text-xs text-muted-foreground">{row.original.fornecedorNome}</p>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'valor',
        header: 'Valor',
        cell: ({ row }) => (
          <span className="font-semibold text-sm">{formatCurrency(row.original.valor)}</span>
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

          const isVencida = diasAteVencimento < 0 && row.original.status !== 'PAGA';
          const isProximaVencer = diasAteVencimento >= 0 && diasAteVencimento <= 7;

          return (
            <div className="flex items-center gap-2">
              {(isVencida || isProximaVencer) && (
                <Calendar
                  className={`h-4 w-4 ${isVencida ? 'text-red-600' : 'text-orange-600'}`}
                />
              )}
              <span className={`text-sm ${isVencida ? 'text-red-600 font-medium' : ''}`}>
                {formatDate(row.original.dataVencimento)}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: 'dataPagamento',
        header: 'Pagamento',
        cell: ({ row }) => {
          const data = row.original.dataPagamento;
          return data ? (
            <span className="text-sm text-green-600">{formatDate(data)}</span>
          ) : (
            <span className="text-muted-foreground text-xs">—</span>
          );
        },
      },
      {
        accessorKey: 'formaPagamento',
        header: 'Forma',
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <CreditCard className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs">{row.original.formaPagamento}</span>
          </div>
        ),
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
          const despesa = row.original;
          return (
            <Button
              size="sm"
              variant="ghost"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                router.push(`/dashboard/financeiro/despesas/${despesa.id}`);
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
      data={despesas}
      columns={columns}
      searchable
      searchPlaceholder="Buscar por descrição..."
      onRowClick={(row: DespesaTableRow) =>
        router.push(`/dashboard/financeiro/despesas/${row.id}`)
      }
    />
  );
}
