/**
 * ContaBancariaDataTable Component
 * DataTable para listar contas bancárias com saldos
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
  Building2,
  CreditCard,
  Eye,
  Wallet,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'
import { useRouter } from 'next/navigation'

export type ContaBancariaTableRow = {
  id: number;
  nome: string;
  banco: string;
  agencia: string;
  conta: string;
  tipo: string;
  saldoAtual: number;
  saldoInicial: number;
  ativo: boolean;
};

type ContaBancariaDataTableProps = {
  contas: ContaBancariaTableRow[];
};

const TIPO_CONFIG: Record<string, { icon: LucideIcon; label: string }> = {
  CORRENTE: { icon: Building2, label: 'Conta Corrente' },
  POUPANCA: { icon: Wallet, label: 'Poupança' },
  INVESTIMENTO: { icon: TrendingUp, label: 'Investimento' },
  CAIXA: { icon: CreditCard, label: 'Caixa' },
};

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
};

export default function ContaBancariaDataTable({ contas }: ContaBancariaDataTableProps) {
  const router = useRouter();

  const columns = useMemo<ColumnDef<ContaBancariaTableRow>[]>(
    () => [
      {
        accessorKey: 'nome',
        header: 'Nome',
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-sm">{row.original.nome}</p>
            <p className="text-xs text-muted-foreground">
              {row.original.banco} • Ag: {row.original.agencia} • Cc: {row.original.conta}
            </p>
          </div>
        ),
      },
      {
        accessorKey: 'tipo',
        header: 'Tipo',
        cell: ({ row }) => {
          const tipo = row.original.tipo;
          const config = TIPO_CONFIG[tipo];
          if (!config) return tipo;

          const Icon = config.icon;
          return (
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{config.label}</span>
            </div>
          );
        },
      },
      {
        accessorKey: 'saldoAtual',
        header: 'Saldo Atual',
        cell: ({ row }) => {
          const saldo = row.original.saldoAtual;
          const isPositivo = saldo >= 0;

          return (
            <div className="flex items-center gap-1">
              {isPositivo ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
              <span
                className={`font-semibold text-sm ${isPositivo ? 'text-green-600' : 'text-destructive'
                  }`}
              >
                {formatCurrency(saldo)}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: 'saldoInicial',
        header: 'Saldo Inicial',
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {formatCurrency(row.original.saldoInicial)}
          </span>
        ),
      },
      {
        id: 'variacao',
        header: 'Variação',
        cell: ({ row }) => {
          const saldoAtual = row.original.saldoAtual;
          const saldoInicial = row.original.saldoInicial;
          const variacao = saldoAtual - saldoInicial;
          const percentual =
            saldoInicial !== 0 ? ((variacao / Math.abs(saldoInicial)) * 100).toFixed(1) : '0';

          const isPositivo = variacao >= 0;

          return (
            <div className="text-sm">
              <span className={isPositivo ? 'text-green-600' : 'text-destructive'}>
                {isPositivo ? '+' : ''}
                {formatCurrency(variacao)}
              </span>
              <span className="text-muted-foreground text-xs ml-1">
                ({isPositivo ? '+' : ''}
                {percentual}%)
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: 'ativo',
        header: 'Status',
        cell: ({ row }) => {
          const ativo = row.original.ativo;
          return (
            <Badge variant={ativo ? 'success' : 'secondary'}>
              {ativo ? 'Ativa' : 'Inativa'}
            </Badge>
          );
        },
      },
      {
        id: 'actions',
        header: 'Ações',
        cell: ({ row }) => {
          const conta = row.original;
          return (
            <Button
              size="sm"
              variant="ghost"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                router.push(`/dashboard/financeiro/contas/${conta.id}`);
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
      data={contas}
      columns={columns}
      searchable
      searchPlaceholder="Buscar por nome ou banco..."
      onRowClick={(row: ContaBancariaTableRow) =>
        router.push(`/dashboard/financeiro/contas/${row.id}`)
      }
    />
  );
}
