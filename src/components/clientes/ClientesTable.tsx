"use client";
import React, { useMemo } from 'react';
import { Eye, Pencil, Trash2, ArrowUpDown } from 'lucide-react';
import { Badge } from "@gladpros/ui/badge";
import { Button } from '@gladpros/ui/button';
import { EmptyState } from '@gladpros/ui/empty-state';
import type { ClienteDTO } from '@/shared/types/cliente';

interface ClientesTableProps {
  data: ClienteDTO[];
  onView?: (id: number) => void;
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
  onToggleStatus?: (id: number, currentStatus: boolean) => void;
  sortKey: 'nome' | 'tipo' | 'email' | 'telefone' | 'documento' | 'cidadeEstado' | 'status' | 'criadoEm';
  sortDir: 'asc' | 'desc';
  onSortChange: (key: ClientesTableProps['sortKey'], dir: ClientesTableProps['sortDir']) => void;
  selectedIds?: number[];
  onSelectedChange?: (ids: number[]) => void;
  showSelection?: boolean;
  showDocumentoColumn?: boolean;
  showEnderecoColumn?: boolean;
}

function ClientesTable({
  data,
  onView,
  onEdit,
  onDelete,
  onToggleStatus,
  sortKey,
  sortDir,
  onSortChange,
  selectedIds = [],
  onSelectedChange,
  showSelection = true,
  showDocumentoColumn = true,
  showEnderecoColumn = true,
}: ClientesTableProps) {
  const rows = useMemo(() => data ?? [], [data]);
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allSelected = showSelection && selected.size > 0 && selected.size === rows.length;

  if (rows.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          title="Nenhum cliente encontrado"
          description="Ajuste os filtros ou cadastre um novo cliente para visualizar resultados."
        />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card" data-testid="clientes-table">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-muted-foreground">
            {showSelection ? (
              <th className="px-3 py-2">
                <input
                  aria-label="Selecionar todos"
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => {
                    const ids = rows.map(c => c.id);
                    onSelectedChange?.(e.target.checked ? ids : []);
                  }}
                />
              </th>
            ) : null}
            <Th label="Nome/Razão Social" onClick={() => onSortChange('nome', sortKey === 'nome' && sortDir === 'asc' ? 'desc' : 'asc')} active={sortKey === 'nome'} dir={sortDir} ariaSort={sortKey === 'nome' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'} />
            <Th label="Tipo" onClick={() => onSortChange('tipo', sortKey === 'tipo' && sortDir === 'asc' ? 'desc' : 'asc')} active={sortKey === 'tipo'} dir={sortDir} ariaSort={sortKey === 'tipo' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'} />
            <Th label="E-mail" onClick={() => onSortChange('email', sortKey === 'email' && sortDir === 'asc' ? 'desc' : 'asc')} active={sortKey === 'email'} dir={sortDir} ariaSort={sortKey === 'email' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'} />
            <Th label="Telefone" onClick={() => onSortChange('telefone', sortKey === 'telefone' && sortDir === 'asc' ? 'desc' : 'asc')} active={sortKey === 'telefone'} dir={sortDir} ariaSort={sortKey === 'telefone' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'} />
            {showDocumentoColumn ? <Th label="Documento" onClick={() => onSortChange('documento', sortKey === 'documento' && sortDir === 'asc' ? 'desc' : 'asc')} active={sortKey === 'documento'} dir={sortDir} ariaSort={sortKey === 'documento' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'} /> : null}
            {showEnderecoColumn ? <Th label="Cidade/Estado" onClick={() => onSortChange('cidadeEstado', sortKey === 'cidadeEstado' && sortDir === 'asc' ? 'desc' : 'asc')} active={sortKey === 'cidadeEstado'} dir={sortDir} ariaSort={sortKey === 'cidadeEstado' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'} /> : null}
            <Th label="Status" onClick={() => onSortChange('status', sortKey === 'status' && sortDir === 'asc' ? 'desc' : 'asc')} active={sortKey === 'status'} dir={sortDir} ariaSort={sortKey === 'status' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'} />
            <th className="px-3 py-2 text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((cliente, index) => (
            <tr
              key={cliente.id}
              data-testid={`cliente-row-${cliente.id}`}
              className={`border-t border-border/70 hover:bg-muted/40 ${index === 0 ? '' : ''}`}
            >
              {showSelection ? (
                <td className="px-3 py-3">
                  <input
                    aria-label={`Selecionar ${cliente.nomeCompletoOuRazao}`}
                    type="checkbox"
                    checked={selected.has(cliente.id)}
                    onChange={(e) => {
                      const next = new Set(selected);
                      if ((e.target as HTMLInputElement).checked) next.add(cliente.id);
                      else next.delete(cliente.id);
                      onSelectedChange?.(Array.from(next));
                    }}
                  />
                </td>
              ) : null}
              <td className="px-3 py-3 font-medium">
                <div className="font-medium text-foreground dark:text-white">
                  {cliente.nomeCompletoOuRazao}
                </div>
              </td>
              <td className="px-3 py-3">
                <Badge variant={cliente.tipo === 'PF' ? 'primary' : 'default'}>
                  {cliente.tipo}
                </Badge>
              </td>
              <td className="px-3 py-3 text-muted-foreground">
                {cliente.email}
              </td>
              <td className="px-3 py-3 text-muted-foreground">
                {cliente.telefone}
              </td>
              {showDocumentoColumn ? <td className="px-3 py-3 text-muted-foreground">{cliente.documentoMasked}</td> : null}
              {showEnderecoColumn ? (
                <td className="px-3 py-3 text-muted-foreground">
                  {(cliente.addressCity || cliente.cidade) && (cliente.addressState || cliente.estado)
                    ? `${cliente.addressCity || cliente.cidade}, ${cliente.addressState || cliente.estado}`
                    : cliente.addressCity || cliente.cidade || cliente.addressState || cliente.estado || '-'
                  }
                </td>
              ) : null}
              <td className="px-3 py-3">
                <Badge variant={cliente.ativo ? 'success' : 'error'}>
                  {cliente.ativo ? 'Ativo' : 'Inativo'}
                </Badge>
              </td>
              <td className="px-3 py-2">
                <div className="flex items-center justify-end gap-1">
                  {onView && (
                    <Button variant="ghost" size="sm" onClick={() => onView(cliente.id)} className="text-brand-primary">
                      <span className="sr-only">Ver</span>
                      <Eye className="h-3.5 w-3.5" />
                      Ver
                    </Button>
                  )}
                  {onEdit ? (
                    <Button variant="ghost" size="sm" onClick={() => onEdit(cliente.id)} className="min-h-12">
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </Button>
                  ) : null}
                  {onToggleStatus ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onToggleStatus(cliente.id, cliente.ativo)}
                      className={`min-h-12 ${cliente.ativo ? 'text-brand-secondary hover:text-brand-secondary' : 'text-green-600 hover:text-green-700'}`}
                    >
                      {cliente.ativo ? 'Desativar' : 'Ativar'}
                    </Button>
                  ) : null}
                  {onDelete ? (
                    <Button variant="ghost" size="sm" onClick={() => onDelete(cliente.id)} className="min-h-12 text-red-600 hover:text-red-700">
                      <Trash2 className="h-3.5 w-3.5" />
                      Excluir
                    </Button>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({ label, onClick, active, dir, ariaSort }: { label: string; onClick: () => void; active: boolean; dir: 'asc' | 'desc'; ariaSort?: 'ascending' | 'descending' | 'none' | 'other' }) {
  const sortVal = ariaSort ?? 'none';
  return (
    <th className="px-3 py-2" {...{ 'aria-sort': sortVal as 'ascending' | 'descending' | 'none' | 'other' }}>
      <button onClick={onClick} aria-label={`Ordenar por ${label}`} className={`inline-flex min-h-12 items-center gap-1 rounded-2xl px-2 py-2 hover:bg-muted ${active ? 'font-medium text-foreground' : ''}`}>
        {label} <ArrowUpDown className={`h-3.5 w-3.5 ${active ? 'opacity-100' : 'opacity-50'}`} />
        <span className="sr-only">{dir === 'asc' ? 'asc' : 'desc'}</span>
      </button>
    </th>
  );
}

export default React.memo(ClientesTable);
