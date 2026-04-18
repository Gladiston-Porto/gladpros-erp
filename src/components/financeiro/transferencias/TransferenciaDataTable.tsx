"use client"

import { useRouter } from 'next/navigation'
import { Button } from '@gladpros/ui/button'
import { DataTable } from '@/shared/components/data-table'
import { Badge } from "@gladpros/ui/badge"
import { ColumnDef } from '@tanstack/react-table'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowRightLeft,
  Building2,
  Calendar,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react'
import { formatCurrency, formatDate } from '../shared/formatters'

export type TransferenciaTableRow = {
  id: number;
  contaOrigemNome: string;
  contaOrigemBanco: string;
  contaDestinoNome: string;
  contaDestinoBanco: string;
  valor: number;
  descricao: string;
  status: string;
  dataAgendamento: Date;
  dataExecucao: Date | null;
  dataConclusao: Date | null;
};

// Configuração de status
const STATUS_CONFIG: Record<
  string,
  {
    label: string
    variant:
    | 'financePending'
    | 'financePaid'
    | 'financeExpense'
    | 'financeScheduled'
    | 'info'
    | 'error'
    icon: LucideIcon
  }
> = {
  PENDENTE: {
    label: 'Pendente',
    variant: 'financePending',
    icon: Clock,
  },
  PROCESSANDO: {
    label: 'Processando',
    variant: 'financeScheduled',
    icon: Clock,
  },
  CONCLUIDA: {
    label: 'Concluída',
    variant: 'financePaid',
    icon: CheckCircle2,
  },
  CANCELADA: {
    label: 'Cancelada',
    variant: 'error',
    icon: XCircle,
  },
  FALHOU: {
    label: 'Falhou',
    variant: 'financeExpense',
    icon: XCircle,
  },
  ESTORNADA: {
    label: 'Estornada',
    variant: 'info',
    icon: XCircle,
  },
}

export default function TransferenciaDataTable({
  data,
}: {
  data: TransferenciaTableRow[];
}) {
  const router = useRouter()

  const columns: ColumnDef<TransferenciaTableRow>[] = [
    {
      accessorKey: "dataAgendamento",
      header: "Data",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="font-medium">
              {formatDate(row.original.dataAgendamento)}
            </p>
            {row.original.dataExecucao && (
              <p className="text-xs text-muted-foreground">
                Exec: {formatDate(row.original.dataExecucao)}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "contaOrigem",
      header: "Conta Origem",
      cell: ({ row }) => (
        <div className="flex items-start gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
          <div>
            <p className="font-medium">{row.original.contaOrigemNome}</p>
            <p className="text-xs text-muted-foreground">
              {row.original.contaOrigemBanco}
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "arrow",
      header: "",
      cell: () => (
        <ArrowRightLeft className="h-4 w-4 text-muted-foreground mx-2" />
      ),
    },
    {
      accessorKey: "contaDestino",
      header: "Conta Destino",
      cell: ({ row }) => (
        <div className="flex items-start gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
          <div>
            <p className="font-medium">{row.original.contaDestinoNome}</p>
            <p className="text-xs text-muted-foreground">
              {row.original.contaDestinoBanco}
            </p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "descricao",
      header: "Descrição",
      cell: ({ row }) => (
        <div className="max-w-[250px] truncate">
          <span className="text-sm">{row.original.descricao}</span>
        </div>
      ),
    },
    {
      accessorKey: "valor",
      header: "Valor",
      cell: ({ row }) => (
        <span className="font-bold text-blue-700 dark:text-blue-400">
          {formatCurrency(row.original.valor)}
        </span>
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
      id: 'actions',
      header: 'Ações',
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(event) => {
            event.stopPropagation()
            router.push(`/dashboard/financeiro/transferencias/${row.original.id}`)
          }}
        >
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
      searchPlaceholder="Buscar por conta ou descrição..."
      onRowClick={(row: TransferenciaTableRow) =>
        router.push(`/dashboard/financeiro/transferencias/${row.id}`)
      }
    />
  )
}
