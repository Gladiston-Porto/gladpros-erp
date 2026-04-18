/**
 * EquipamentoDataTable Component
 * DataTable para listar equipamentos com status badges
 * Design System v2.0 - Semana 3
 */

'use client';

import { useMemo } from 'react';
import { Badge } from '@gladpros/ui/badge'
import { Button } from '@gladpros/ui/button';
import { DataTable } from '@/shared/components/data-table';
import type { ColumnDef } from '@tanstack/react-table';
import {
  Wrench,
  Package,
  Hammer,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Eye,
  Calendar,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export type EquipamentoTableRow = {
  id: number;
  codigo: string;
  nome: string;
  tipo: string;
  status: string;
  marca: string | null;
  modelo: string | null;
  numeroSerie: string | null;
  categoriaNome: string | null;
  requerCalibracao: boolean;
  diasParaCalibracao: number | null;
  diasParaManutencao: number | null;
};

type EquipamentoDataTableProps = {
  equipamentos: EquipamentoTableRow[];
};

const STATUS_CONFIG: Record<
  string,
  {
    icon: React.ComponentType<{ className?: string }>;
    variant: 'default' | 'secondary' | 'outline' | 'destructive';
    label: string;
  }
> = {
  DISPONIVEL: { icon: CheckCircle, variant: 'outline', label: 'Disponível' },
  EM_USO: { icon: Package, variant: 'default', label: 'Em Uso' },
  EM_MANUTENCAO: { icon: Wrench, variant: 'secondary', label: 'Em Manutenção' },
  DANIFICADO: { icon: AlertTriangle, variant: 'destructive', label: 'Danificado' },
  INATIVO: { icon: XCircle, variant: 'outline', label: 'Inativo' },
};

const TIPO_CONFIG: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; label: string }
> = {
  FERRAMENTA: { icon: Hammer, label: 'Ferramenta' },
  EQUIPAMENTO: { icon: Wrench, label: 'Equipamento' },
  INSTRUMENTO: { icon: Package, label: 'Instrumento' },
};

export function EquipamentoDataTable({ equipamentos }: EquipamentoDataTableProps) {
  const router = useRouter();

  const columns = useMemo<ColumnDef<EquipamentoTableRow>[]>(
    () => [
      {
        accessorKey: 'codigo',
        header: 'Código',
        cell: ({ row }) => (
          <span className="font-mono text-sm font-medium">{row.original.codigo}</span>
        ),
      },
      {
        accessorKey: 'nome',
        header: 'Nome',
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-sm">{row.original.nome}</p>
            {row.original.numeroSerie && (
              <p className="text-xs text-muted-foreground font-mono">
                S/N: {row.original.numeroSerie}
              </p>
            )}
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
        accessorKey: 'marca',
        header: 'Marca/Modelo',
        cell: ({ row }) => {
          const marca = row.original.marca;
          const modelo = row.original.modelo;
          if (!marca && !modelo) return <span className="text-muted-foreground">—</span>;
          return (
            <div className="text-sm">
              {marca && <p>{marca}</p>}
              {modelo && <p className="text-xs text-muted-foreground">{modelo}</p>}
            </div>
          );
        },
      },
      {
        accessorKey: 'categoriaNome',
        header: 'Categoria',
        cell: ({ row }) => {
          const nome = row.original.categoriaNome;
          return nome ? (
            <span className="text-sm">{nome}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
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
        id: 'manutencao',
        header: 'Manutenção',
        cell: ({ row }) => {
          const dias = row.original.diasParaManutencao;
          if (dias === null) return <span className="text-muted-foreground text-xs">—</span>;

          if (dias < 0) {
            return (
              <Badge variant="destructive" className="text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Atrasado
              </Badge>
            );
          }
          if (dias <= 7) {
            return (
              <Badge variant="secondary" className="text-xs">
                <Calendar className="h-3 w-3 mr-1" />
                {dias}d
              </Badge>
            );
          }
          return (
            <Badge variant="outline" className="text-xs">
              {dias}d
            </Badge>
          );
        },
      },
      {
        id: 'calibracao',
        header: 'Calibração',
        cell: ({ row }) => {
          if (!row.original.requerCalibracao) {
            return <span className="text-muted-foreground text-xs">N/A</span>;
          }

          const dias = row.original.diasParaCalibracao;
          if (dias === null) return <span className="text-muted-foreground text-xs">—</span>;

          if (dias < 0) {
            return (
              <Badge variant="destructive" className="text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Vencida
              </Badge>
            );
          }
          if (dias <= 30) {
            return (
              <Badge variant="secondary" className="text-xs">
                <Calendar className="h-3 w-3 mr-1" />
                {dias}d
              </Badge>
            );
          }
          return (
            <Badge variant="outline" className="text-xs">
              {dias}d
            </Badge>
          );
        },
      },
      {
        id: 'actions',
        header: 'Ações',
        cell: ({ row }) => {
          const equipamento = row.original;
          return (
            <Button
              size="sm"
              variant="ghost"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                router.push(`/estoque/equipamentos/${equipamento.id}`);
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
      data={equipamentos}
      columns={columns}
      searchKey="nome"
      searchPlaceholder="Buscar por nome, código ou série..."
      onRowClick={(row: EquipamentoTableRow) => router.push(`/estoque/equipamentos/${row.id}`)}
    />
  );
}
