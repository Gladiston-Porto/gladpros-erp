'use client'

import { Badge } from '@gladpros/ui/badge'
import { Button } from '@gladpros/ui/button'
import { DataTable } from '@/shared/components/data-table'
import { ColumnDef } from '@tanstack/react-table'
import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, Package, Wrench, FileText, ShoppingCart } from 'lucide-react'
import EmptyState from '../shared/EmptyState'
import { formatDate, formatCurrency } from '@/lib/estoque/utils/formatters'

export type CompraTableRow = {
  id: number
  numeroCompra: string
  tipo: string
  status: string
  dataCompra: Date
  valorTotal: number
  fornecedorNome?: string | null
  projetoNumero?: string | null
  totalItens: number
}

type CompraDataTableProps = {
  compras: CompraTableRow[];
};

const STATUS_CONFIG: Record<
  string,
  { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string }
> = {
  PENDENTE: { variant: 'secondary', label: 'Pendente' },
  PARCIAL: { variant: 'default', label: 'Parcialmente Recebida' },
  RECEBIDA: { variant: 'outline', label: 'Recebida' },
  CANCELADA: { variant: 'destructive', label: 'Cancelada' },
};

const TIPO_CONFIG: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; label: string }
> = {
  MATERIAL: { icon: Package, label: 'Material' },
  EQUIPAMENTO: { icon: Wrench, label: 'Equipamento' },
  AMBOS: { icon: FileText, label: 'Ambos' },
};

export function CompraDataTable({ compras }: CompraDataTableProps) {
  const router = useRouter()

  const columns = useMemo<ColumnDef<CompraTableRow>[]>(
    () => [
      {
        accessorKey: 'numeroCompra',
        header: 'Número',
        cell: ({ row }) => (
          <span className="font-mono text-sm font-medium">
            {row.getValue('numeroCompra')}
          </span>
        ),
      },
      {
        accessorKey: 'tipo',
        header: 'Tipo',
        cell: ({ row }) => {
          const config = TIPO_CONFIG[row.original.tipo]
          if (!config) return row.original.tipo
          const Icon = config.icon
          return (
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <span>{config.label}</span>
            </div>
          )
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const config = STATUS_CONFIG[row.original.status]
          if (!config) return row.original.status
          return (
            <Badge variant={config.variant}>
              {config.label}
            </Badge>
          )
        },
      },
      {
        accessorKey: 'dataCompra',
        header: 'Data',
        cell: ({ row }) => formatDate(row.original.dataCompra),
      },
      {
        accessorKey: 'fornecedorNome',
        header: 'Fornecedor',
        cell: ({ row }) => row.getValue('fornecedorNome') || '—',
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
        accessorKey: 'totalItens',
        header: 'Itens',
        cell: ({ row }) => (
          <Badge variant="outline">
            {row.getValue('totalItens')}
          </Badge>
        ),
      },
      {
        accessorKey: 'valorTotal',
        header: 'Valor Total',
        cell: ({ row }) => (
          <span className="font-semibold">
            {formatCurrency(row.getValue('valorTotal'))}
          </span>
        ),
      },
      {
        id: 'acoes',
        header: 'Ações',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            {(row.original.status === 'PENDENTE' || row.original.status === 'PARCIAL') && (
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                onClick={(e) => {
                  e.stopPropagation()
                  router.push(`/estoque/compras/${row.original.id}/receber`)
                }}
              >
                <Package className="h-3.5 w-3.5 mr-1.5" />
                Receber
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-8"
              aria-label={`Ver detalhes da compra ${row.original.numeroCompra}`}
              onClick={() => router.push(`/estoque/compras/${row.original.id}`)}
            >
              <Eye className="h-4 w-4 mr-1" />
              Ver
            </Button>
          </div>
        ),
      },
    ],
    [router]
  )

  return (
    <div className="rounded-2xl border border-border bg-background p-4 shadow-lg">
      {compras.length === 0 ? (
        <EmptyState
          title="Nenhuma compra encontrada"
          description="Registre uma nova ordem de compra para acompanhar aqui."
          icon={ShoppingCart}
        />
      ) : (
        <DataTable
          columns={columns}
          data={compras}
          searchable
          searchPlaceholder="Buscar por número, fornecedor ou projeto..."
          pageSize={15}
          className="bg-white"
        />
      )}
    </div>
  )
}
