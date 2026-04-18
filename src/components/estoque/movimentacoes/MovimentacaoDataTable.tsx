'use client'

import { Badge } from '@gladpros/ui/badge'
import { Button } from '@gladpros/ui/button'
import { DataTable } from '@/shared/components/data-table'
import { ColumnDef } from '@tanstack/react-table'
import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowLeftRight,
  Plus,
  Minus,
  Lock,
  XCircle,
  RotateCcw,
  AlertTriangle,
  Eye,
} from 'lucide-react'
import { formatDate } from '@/lib/estoque/utils/formatters'

export type MovimentacaoTableRow = {
  id: number
  tipo: string
  dataMovimentacao: Date
  quantidade: number
  materialNome?: string | null
  equipamentoNome?: string | null
  projetoNumero?: string | null
  usuarioNome?: string | null
}

type MovimentacaoDataTableProps = {
  movimentacoes: MovimentacaoTableRow[]
}

const TIPO_CONFIG: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; color: string; label: string }
> = {
  ENTRADA: { icon: ArrowDownCircle, color: 'text-green-600', label: 'Entrada' },
  SAIDA: { icon: ArrowUpCircle, color: 'text-red-600', label: 'Saída' },
  TRANSFERENCIA: { icon: ArrowLeftRight, color: 'text-blue-600', label: 'Transferência' },
  AJUSTE_POSITIVO: { icon: Plus, color: 'text-green-600', label: 'Ajuste +' },
  AJUSTE_NEGATIVO: { icon: Minus, color: 'text-red-600', label: 'Ajuste -' },
  RESERVA: { icon: Lock, color: 'text-yellow-600', label: 'Reserva' },
  CANCELAMENTO_RESERVA: { icon: XCircle, color: 'text-gray-600', label: 'Cancel. Reserva' },
  DEVOLUCAO: { icon: RotateCcw, color: 'text-blue-600', label: 'Devolução' },
  PERDA: { icon: AlertTriangle, color: 'text-red-600', label: 'Perda' },
}

export function MovimentacaoDataTable({ movimentacoes }: MovimentacaoDataTableProps) {
  const router = useRouter()

  const columns = useMemo<ColumnDef<MovimentacaoTableRow>[]>(
    () => [
      {
        accessorKey: 'tipo',
        header: 'Tipo',
        cell: ({ row }) => {
          const config = TIPO_CONFIG[row.original.tipo]
          if (!config) return row.original.tipo
          const Icon = config.icon
          return (
            <div className="flex items-center gap-2">
              <Icon className={`h-4 w-4 ${config.color}`} />
              <span className="font-medium">{config.label}</span>
            </div>
          )
        },
      },
      {
        accessorKey: 'dataMovimentacao',
        header: 'Data',
        cell: ({ row }) => formatDate(row.original.dataMovimentacao),
      },
      {
        accessorKey: 'materialNome',
        header: 'Material',
        cell: ({ row }) => row.getValue('materialNome') || '—',
      },
      {
        accessorKey: 'equipamentoNome',
        header: 'Equipamento',
        cell: ({ row }) => row.getValue('equipamentoNome') || '—',
      },
      {
        accessorKey: 'quantidade',
        header: 'Quantidade',
        cell: ({ row }) => (
          <Badge variant="outline">
            {Number(row.getValue('quantidade')).toFixed(2)}
          </Badge>
        ),
      },
      {
        accessorKey: 'projetoNumero',
        header: 'Projeto',
        cell: ({ row }) => {
          const projeto = row.getValue('projetoNumero') as string | null;
          return projeto ? (
            <span className="text-xs font-mono">{projeto}</span>
          ) : (
            '—'
          );
        },
      },
      {
        accessorKey: 'usuarioNome',
        header: 'Usuário',
        cell: ({ row }) => {
          const usuario = row.getValue('usuarioNome') as string | null;
          return usuario ? (
            <span className="text-xs text-muted-foreground">{usuario}</span>
          ) : (
            '—'
          );
        },
      },
      {
        id: 'acoes',
        header: 'Ações',
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            className="h-10"
            onClick={() => router.push(`/estoque/movimentacoes/${row.original.id}`)}
          >
            <Eye className="h-4 w-4 mr-1" />
            Ver
          </Button>
        ),
      },
    ],
    [router]
  )

  return (
    <div className="rounded-2xl border border-border bg-background p-4 shadow-lg">
      <DataTable
        columns={columns}
        data={movimentacoes}
        searchable
        searchPlaceholder="Buscar por material, equipamento, projeto..."
        pageSize={15}
        className="bg-white"
      />
    </div>
  )
}
