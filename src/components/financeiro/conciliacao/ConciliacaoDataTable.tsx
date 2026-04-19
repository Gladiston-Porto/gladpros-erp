"use client"

import { Button } from '@gladpros/ui/button'
import { DataTable } from '@/shared/components/data-table'
import { Badge } from "@gladpros/ui/badge"
import { ColumnDef } from '@tanstack/react-table'
import {
  Building2,
  Calendar,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
} from "lucide-react";
import { formatCurrency, formatDate } from "../shared/formatters";

export type ConciliacaoTableRow = {
  id: number;
  periodo: string;
  contaNome: string;
  contaBanco: string;
  saldoInicial: number;
  totalCreditos: number;
  totalDebitos: number;
  saldoFinal: number;
  saldoEsperado: number;
  diferencas: number;
  transacoesReconciliadas: number;
  transacoesPendentes: number;
  status: string;
  dataInicio: Date;
  dataConclusao: Date | null;
};

// Configuração de status
const STATUS_CONFIG: Record<
  string,
  {
    label: string
    variant: 'financePending' | 'info' | 'success' | 'warning' | 'error'
    icon: typeof Clock
  }
> = {
  PENDENTE: {
    label: 'Pendente',
    variant: 'financePending',
    icon: Clock,
  },
  EM_ANDAMENTO: {
    label: 'Em andamento',
    variant: 'info',
    icon: AlertCircle,
  },
  CONCLUIDA: {
    label: 'Concluída',
    variant: 'success',
    icon: CheckCircle2,
  },
  COM_DIFERENCAS: {
    label: 'Com diferenças',
    variant: 'warning',
    icon: AlertCircle,
  },
}

export default function ConciliacaoDataTable({
  data,
}: {
  data: ConciliacaoTableRow[];
}) {
  const columns: ColumnDef<ConciliacaoTableRow>[] = [
    {
      accessorKey: "periodo",
      header: "Período",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="font-medium">{row.original.periodo}</p>
            <p className="text-xs text-muted-foreground">
              {formatDate(row.original.dataInicio)}
            </p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "conta",
      header: "Conta Bancária",
      cell: ({ row }) => (
        <div className="flex items-start gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
          <div>
            <p className="font-medium">{row.original.contaNome}</p>
            <p className="text-xs text-muted-foreground">
              {row.original.contaBanco}
            </p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "saldoInicial",
      header: "Saldo Inicial",
      cell: ({ row }) => (
        <span className="text-sm">{formatCurrency(row.original.saldoInicial)}</span>
      ),
    },
    {
      accessorKey: "movimentos",
      header: "Movimentos",
      cell: ({ row }) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-3 w-3 text-green-600 dark:text-green-400" />
            <span className="text-xs text-green-700 dark:text-green-400">
              {formatCurrency(row.original.totalCreditos)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingDown className="h-3 w-3 text-destructive" />
            <span className="text-xs text-destructive ">
              {formatCurrency(row.original.totalDebitos)}
            </span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "saldoFinal",
      header: "Saldo Final",
      cell: ({ row }) => {
        const saldo = row.original.saldoFinal;
        const esperado = row.original.saldoEsperado;
        const hasDiff = Math.abs(saldo - esperado) > 0.01;

        return (
          <div>
            <p className={`font-semibold ${hasDiff ? "text-yellow-700 dark:text-yellow-400" : ""}`}>
              {formatCurrency(saldo)}
            </p>
            {hasDiff && (
              <p className="text-xs text-muted-foreground">
                Esp: {formatCurrency(esperado)}
              </p>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "diferencas",
      header: "Diferenças",
      cell: ({ row }) => {
        const diff = row.original.diferencas;
        if (Math.abs(diff) < 0.01) {
          return (
            <Badge variant="success" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Sem diferenças
            </Badge>
          );
        }
        return (
          <Badge variant="warning" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            {formatCurrency(Math.abs(diff))}
          </Badge>
        );
      },
    },
    {
      accessorKey: "transacoes",
      header: "Transações",
      cell: ({ row }) => (
        <div className="text-sm">
          <p className="text-green-700 dark:text-green-400">
            ✓ {row.original.transacoesReconciliadas} reconciliadas
          </p>
          <p className="text-muted-foreground">
            ⏳ {row.original.transacoesPendentes} pendentes
          </p>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status;
        const config = STATUS_CONFIG[status] || {
          label: status,
          variant: "outline" as const,
          icon: Clock,
        };
        const Icon = config.icon;
        return (
          <Badge variant={config.variant} className="gap-1">
            <Icon className="h-3 w-3" />
            {config.label}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      header: "Ações",
      cell: ({ row }) => (
        <Button variant="ghost" size="sm">
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={data}
      searchable
      searchPlaceholder="Buscar conciliações..."
    />
  )
}
