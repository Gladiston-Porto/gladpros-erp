/**
 * ReceitaDataTable Component - SIMPLIFIED VERSION
 */

'use client';

import { useMemo } from 'react';
import { DataTable } from '@/shared/components/data-table';
import type { ColumnDef } from '@tanstack/react-table';

export type ReceitaTableRow = {
  id: number;
  descricao: string;
  valor: number;
};

type ReceitaDataTableProps = {
  receitas: ReceitaTableRow[];
};

export default function ReceitaDataTable({ receitas }: ReceitaDataTableProps) {
  const columns = useMemo<ColumnDef<ReceitaTableRow>[]>(
    () => [
      {
        accessorKey: 'descricao',
        header: 'Descrição',
      },
      {
        accessorKey: 'valor',
        header: 'Valor',
      },
    ],
    []
  );

  return <DataTable columns={columns} data={receitas} searchable pageSize={10} />;
}
