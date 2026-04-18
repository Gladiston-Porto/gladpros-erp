"use client";
import React, { useMemo, useState } from 'react';
import { ClienteDTO } from '../types/cliente';
import { Pencil, Trash2, ArrowUpDown } from 'lucide-react';

interface ClientesTableProps {
  data: ClienteDTO[];
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onToggleStatus: (id: number, currentStatus: boolean) => void;
  sortKey: 'nome' | 'tipo' | 'email' | 'telefone' | 'documento' | 'cidadeEstado' | 'status';
  sortDir: 'asc' | 'desc';
  onSortChange: (key: ClientesTableProps['sortKey'], dir: ClientesTableProps['sortDir']) => void;
  onSelectedChange?: (ids: number[]) => void;
  onBulkComplete?: () => void;
}

export default function ClientesTable({ data, onEdit, onDelete, onToggleStatus, sortKey, sortDir, onSortChange, onSelectedChange, onBulkComplete }: ClientesTableProps) {
  const rows = useMemo(() => data ?? [], [data]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const allSelected = selected.size > 0 && selected.size === rows.length;
  const sorted = rows;

  async function performBulk(action: 'activate' | 'deactivate' | 'delete') {
    const ids = Array.from(selected);
    if (ids.length === 0) return;

    try {
      const res = await fetch('/api/clientes/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action, scope: 'selected', ids }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error('Bulk operation failed', payload);
        // show a simple feedback; keep non-blocking
        alert(payload?.message || 'Falha na operação em lote');
        return;
      }

      // success: clear selection and notify parent to reload
      setSelected(new Set());
      onSelectedChange?.([]);
      onBulkComplete?.();
    } catch (err) {
      console.error('Bulk request error', err);
      alert('Erro de rede ao executar operação em lote');
    }
  }

  if (rows.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-sm">Nenhum cliente encontrado</div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-black/10 bg-white dark:border-white/10 dark:bg-white/5">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left opacity-70">
            <th className="px-3 py-2">
              <input
                aria-label="Selecionar todos"
                type="checkbox"
                checked={allSelected}
                onChange={(e) => {
                  const ids = rows.map(c => c.id);
                  const next = e.target.checked ? new Set(ids) : new Set<number>();
                  setSelected(next);
                  onSelectedChange?.(Array.from(next));
                }}
              />
            </th>
            <Th label="Nome/Razão Social" onClick={() => onSortChange('nome', sortKey === 'nome' && sortDir === 'asc' ? 'desc' : 'asc')} active={sortKey === 'nome'} dir={sortDir} ariaSort={sortKey === 'nome' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'} />
            <Th label="Tipo" onClick={() => onSortChange('tipo', sortKey === 'tipo' && sortDir === 'asc' ? 'desc' : 'asc')} active={sortKey === 'tipo'} dir={sortDir} ariaSort={sortKey === 'tipo' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'} />
            <Th label="E-mail" onClick={() => onSortChange('email', sortKey === 'email' && sortDir === 'asc' ? 'desc' : 'asc')} active={sortKey === 'email'} dir={sortDir} ariaSort={sortKey === 'email' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'} />
            <Th label="Telefone" onClick={() => onSortChange('telefone', sortKey === 'telefone' && sortDir === 'asc' ? 'desc' : 'asc')} active={sortKey === 'telefone'} dir={sortDir} ariaSort={sortKey === 'telefone' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'} />
            <Th label="Documento" onClick={() => onSortChange('documento', sortKey === 'documento' && sortDir === 'asc' ? 'desc' : 'asc')} active={sortKey === 'documento'} dir={sortDir} ariaSort={sortKey === 'documento' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'} />
            <Th label="Cidade/Estado" onClick={() => onSortChange('cidadeEstado', sortKey === 'cidadeEstado' && sortDir === 'asc' ? 'desc' : 'asc')} active={sortKey === 'cidadeEstado'} dir={sortDir} ariaSort={sortKey === 'cidadeEstado' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'} />
            <Th label="Status" onClick={() => onSortChange('status', sortKey === 'status' && sortDir === 'asc' ? 'desc' : 'asc')} active={sortKey === 'status'} dir={sortDir} ariaSort={sortKey === 'status' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'} />
            <th className="px-3 py-2 text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((cliente, index) => (
            <tr
              key={cliente.id}
              className={`border-t border-black/5 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 ${index === 0 ? '' : ''}`}
            >
              <td className="px-3 py-3">
                <input
                  aria-label={`Selecionar ${cliente.nomeCompletoOuRazao}`}
                  type="checkbox"
                  checked={selected.has(cliente.id)}
                  onChange={(e) => {
                    const cp = new Set(selected);
                    if ((e.target as HTMLInputElement).checked) cp.add(cliente.id);
                    else cp.delete(cliente.id);
                    setSelected(cp);
                    onSelectedChange?.(Array.from(cp));
                  }}
                />
              </td>
              <td className="px-3 py-3 font-medium">
                <div className="font-medium text-foreground dark:text-white">
                  {cliente.nomeCompletoOuRazao}
                </div>
              </td>
              <td className="px-3 py-3">
                <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                  cliente.tipo === 'PF'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
                    : 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300'
                }`}>
                  {cliente.tipo}
                </span>
              </td>
              <td className="px-3 py-3 text-gray-600 dark:text-gray-300">
                {cliente.email}
              </td>
              <td className="px-3 py-3 text-gray-600 dark:text-gray-300">
                {cliente.telefone}
              </td>
              <td className="px-3 py-3 text-gray-600 dark:text-gray-300">
                {cliente.documentoMasked}
              </td>
              <td className="px-3 py-3 text-gray-600 dark:text-gray-300">
                {cliente.endereco?.cidade && cliente.endereco?.estado
                  ? `${cliente.endereco.cidade}, ${cliente.endereco.estado}`
                  : cliente.endereco?.cidade || cliente.endereco?.estado || '-'
                }
              </td>
              <td className="px-3 py-3">
                <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                  cliente.ativo
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                }`}>
                  {cliente.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </td>
              <td className="px-3 py-2">
                <div className="flex items-center justify-end gap-2">
                  <button onClick={() => onEdit(cliente.id)} className="rounded-lg px-2 py-1 text-xs hover:bg-black/5 dark:hover:bg-white/10">
                    <Pencil className="mr-1 inline h-3.5 w-3.5" /> Editar
                  </button>
                  <button
                    onClick={() => onToggleStatus(cliente.id, cliente.ativo)}
                    className={`rounded-lg px-2 py-1 text-xs hover:bg-opacity-20 ${
                      cliente.ativo
                        ? 'text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20'
                        : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                    }`}
                  >
                    {cliente.ativo ? '⏸️ Desativar' : '▶️ Ativar'}
                  </button>
                  <button onClick={() => onDelete(cliente.id)} className="rounded-lg px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                    <Trash2 className="mr-1 inline h-3.5 w-3.5" /> Excluir
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selected.size > 0 && (
        <div className="flex items-center justify-between gap-2 border-t border-black/10 p-3 text-xs dark:border-white/10">
          <div>{selected.size} selecionado(s)</div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => performBulk('activate')}
              className="rounded-lg px-2 py-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
            >
              ▶️ Ativar Selecionados
            </button>
            <button
              onClick={() => performBulk('deactivate')}
              className="rounded-lg px-2 py-1 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20"
            >
              ⏸️ Desativar Selecionados
            </button>
            <button
              onClick={() => performBulk('delete')}
              className="rounded-lg px-2 py-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              🗑️ Excluir Selecionados
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Th({ label, onClick, active, dir, ariaSort = 'none' }: { label: string; onClick: () => void; active: boolean; dir: 'asc' | 'desc'; ariaSort?: 'ascending' | 'descending' | 'none' | 'other' }) {
  return (
    <th className="px-3 py-2" aria-sort={ariaSort}>
      <button onClick={onClick} aria-label={`Ordenar por ${label}`} className={`inline-flex items-center gap-1 rounded px-1 py-0.5 hover:bg-black/5 dark:hover:bg-white/10 ${active ? 'font-medium' : ''}`}>
        {label} <ArrowUpDown className={`h-3.5 w-3.5 ${active ? 'opacity-100' : 'opacity-50'}`} />
        <span className="sr-only">{dir === 'asc' ? 'asc' : 'desc'}</span>
      </button>
    </th>
  );
}