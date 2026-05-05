'use client'

import { Button } from '@gladpros/ui/button'
import { StockBadge } from '@gladpros/ui/stock-badge'
import { DataTable } from '@/shared/components/data-table'
import { ColumnDef } from '@tanstack/react-table'
import { useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Boxes } from 'lucide-react'
import EmptyState from '../shared/EmptyState'

export type MaterialTableRow = {
  id: number
  codigo: string
  nome: string
  fabricante?: string | null
  modelo?: string | null
  categoria?: string | null
  unidadeCodigo?: string | null
  unidadeNome?: string | null
  saldoTotal: number
  estoqueMinimo: number
  pontoReposicao: number
  ativo: boolean
}

type MaterialDataTableProps = {
  materials: MaterialTableRow[]
}

export function MaterialDataTable({ materials }: MaterialDataTableProps) {
  const router = useRouter()

  const handleRowClick = useCallback(
    (row: MaterialTableRow) => {
      router.push(`/estoque/materiais/${row.id}`)
    },
    [router]
  )

  const columns = useMemo<ColumnDef<MaterialTableRow>[]>(
    () => [
      {
        accessorKey: 'codigo',
        header: 'Código',
      },
      {
        accessorKey: 'nome',
        header: 'Material',
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.getValue('nome')}</p>
            {row.original.fabricante && (
              <p className="text-[11px] text-muted-foreground">
                {row.original.fabricante}
              </p>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'categoria',
        header: 'Categoria',
        cell: ({ row }) => row.getValue('categoria') || '—',
      },
      {
        accessorKey: 'unidadeNome',
        header: 'Unidade',
        cell: ({ row }) => row.getValue('unidadeNome') || row.getValue('unidadeCodigo') || '—',
      },
      {
        accessorKey: 'saldoTotal',
        header: 'Saldo',
        cell: ({ row }) => row.getValue('saldoTotal'),
      },
      {
        accessorKey: 'estoqueMinimo',
        header: 'Estoque mínimo',
      },
      {
        accessorKey: 'pontoReposicao',
        header: 'Ponto de reposição',
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <StockBadge
            quantity={row.original.saldoTotal}
            minStock={row.original.estoqueMinimo}
            criticalStock={row.original.pontoReposicao}
            className="text-xs"
          />
        ),
      },
      {
        id: 'acoes',
        header: 'Ações',
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            className="h-10"
            onClick={() => handleRowClick(row.original)}
          >
            Ver detalhes
          </Button>
        ),
      },
    ],
    [handleRowClick]
  )

  return (
    <div className="rounded-2xl border border-border bg-background p-4 shadow-lg">
      {materials.length === 0 ? (
        <EmptyState
          title="Nenhum material encontrado"
          description="Cadastre materiais para começar a controlar o estoque."
          icon={Boxes}
        />
      ) : (
        <DataTable
          columns={columns}
          data={materials}
          searchable
          searchPlaceholder="Buscar por código, nome ou categoria..."
          pageSize={10}
          onRowClick={handleRowClick}
          className="bg-white"
        />
      )}
    </div>
  )
}
