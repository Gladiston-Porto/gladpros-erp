/**
 * ContaBancariaDataTable Component - SIMPLIFIED VERSION
 * Versão simplificada APENAS com DataTable para debug
 */

'use client';

import { useMemo } from 'react';
import { DataTable } from '@/shared/components/data-table';
import type { ColumnDef } from '@tanstack/react-table';

export type ContaBancariaTableRow = {
  id: number;
  nome: string;
  banco: string;
  ativo: boolean;
};

type ContaBancariaDataTableProps = {
  contas: ContaBancariaTableRow[];
};

export default function ContaBancariaDataTable({ contas }: ContaBancariaDataTableProps) {
  const columns = useMemo<ColumnDef<ContaBancariaTableRow>[]>(
    () => [
      {
        accessorKey: 'nome',
        header: 'Nome',
      },
      {
        accessorKey: 'banco',
        header: 'Banco',
      },
    ],
    []
  );

  return <DataTable columns={columns} data={contas} searchable pageSize={10} />;
}
