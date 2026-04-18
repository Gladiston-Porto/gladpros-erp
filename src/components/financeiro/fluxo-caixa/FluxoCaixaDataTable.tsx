"use client"

import { Button } from '@gladpros/ui/button'
import { DataTable } from '@/shared/components/data-table'
import { Badge } from "@gladpros/ui/badge"
import { ColumnDef } from '@tanstack/react-table'
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Tag,
  FileText,
  Eye,
} from "lucide-react";
import { formatCurrency, formatDate } from "../shared/formatters";

export type FluxoCaixaTableRow = {
  id: number;
  tipo: string;
  categoria: string | null;
  descricao: string;
  valor: number;
  saldoAnterior: number;
  saldoPosterior: number;
  dataTransacao: Date;
  reconciliada: boolean;
  contaNome: string;
  contaTipo: string;
};

// Configuração de tipos de transação
const TIPO_CONFIG: Record<
  string,
  {
    label: string
    variant:
    | 'financeIncome'
    | 'financeExpense'
    | 'financePending'
    | 'financeScheduled'
    | 'info'
  }
> = {
  CREDITO: { label: 'Crédito', variant: 'financeIncome' },
  DEBITO: { label: 'Débito', variant: 'financeExpense' },
  TRANSFERENCIA_ENTRADA: { label: 'Transf. Entrada', variant: 'info' },
  TRANSFERENCIA_SAIDA: { label: 'Transf. Saída', variant: 'financePending' },
  TAXA: { label: 'Taxa', variant: 'financeExpense' },
  JUROS: { label: 'Juros', variant: 'financeIncome' },
  ESTORNO: { label: 'Estorno', variant: 'financeScheduled' },
}

export default function FluxoCaixaDataTable({
  data,
}: {
  data: FluxoCaixaTableRow[];
}) {
  const columns: ColumnDef<FluxoCaixaTableRow>[] = [
    {
      accessorKey: "dataTransacao",
      header: "Data",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">
            {formatDate(row.original.dataTransacao)}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "tipo",
      header: "Tipo",
      cell: ({ row }) => {
        const tipo = row.original.tipo;
        const config = TIPO_CONFIG[tipo] || {
          label: tipo,
          variant: "outline" as const,
        };
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
    },
    {
      accessorKey: "categoria",
      header: "Categoria",
      cell: ({ row }) => {
        const categoria = row.original.categoria;
        return categoria ? (
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{categoria}</span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">Sem categoria</span>
        );
      },
    },
    {
      accessorKey: "descricao",
      header: "Descrição",
      cell: ({ row }) => (
        <div className="max-w-[300px]">
          <div className="flex items-start gap-2">
            <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium truncate">{row.original.descricao}</p>
              <p className="text-xs text-muted-foreground">
                {row.original.contaNome} ({row.original.contaTipo})
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "valor",
      header: "Valor",
      cell: ({ row }) => {
        const valor = row.original.valor;
        const tipo = row.original.tipo;
        const isCredito =
          tipo === "CREDITO" ||
          tipo === "TRANSFERENCIA_ENTRADA" ||
          tipo === "JUROS";
        const isDebito =
          tipo === "DEBITO" ||
          tipo === "TRANSFERENCIA_SAIDA" ||
          tipo === "TAXA";

        return (
          <div className="flex items-center gap-2">
            {isCredito && (
              <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
            )}
            {isDebito && (
              <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
            )}
            <span
              className={`font-bold ${isCredito
                  ? "text-green-700 dark:text-green-400"
                  : isDebito
                    ? "text-red-700 dark:text-red-400"
                    : ""
                }`}
            >
              {isDebito ? "-" : "+"} {formatCurrency(valor)}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "saldoAnterior",
      header: "Saldo Anterior",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {formatCurrency(row.original.saldoAnterior)}
        </span>
      ),
    },
    {
      accessorKey: "saldoPosterior",
      header: "Saldo Posterior",
      cell: ({ row }) => {
        const saldo = row.original.saldoPosterior;
        const isPositive = saldo >= 0;
        return (
          <span
            className={`font-semibold ${isPositive
                ? "text-green-700 dark:text-green-400"
                : "text-red-700 dark:text-red-400"
              }`}
          >
            {formatCurrency(saldo)}
          </span>
        );
      },
    },
    {
      accessorKey: "reconciliada",
      header: "Reconciliada",
      cell: ({ row }) => {
        const reconciliada = row.original.reconciliada;
        return (
          <Badge variant={reconciliada ? 'success' : 'secondary'}>
            {reconciliada ? 'Sim' : 'Não'}
          </Badge>
        )
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

  return <DataTable columns={columns} data={data} searchable searchPlaceholder="Buscar movimentações..." />
}
