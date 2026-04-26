"use client";
import React, { useMemo } from 'react';
import { Eye, Pencil, Trash2, ArrowUpDown, Building2, User } from 'lucide-react';
import { EmptyState } from '@gladpros/ui/empty-state';
import type { ClienteDTO } from '@/shared/types/cliente';

const AVATAR_BG_CLASSES = [
  "bg-sky-600",
  "bg-teal-600",
  "bg-orange-600",
  "bg-indigo-600",
  "bg-emerald-600",
  "bg-rose-600",
];

function avatarColorClass(name: string): string {
  const idx = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % AVATAR_BG_CLASSES.length;
  return AVATAR_BG_CLASSES[idx];
}

function ClienteAvatar({ name, tipo }: { name: string; tipo: "PF" | "PJ" }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div
      className={`flex shrink-0 h-9 w-9 items-center justify-center rounded-full text-[13px] text-white font-semibold select-none ${avatarColorClass(name)}`}
      aria-label={name}
      title={name}
    >
      {initials || (tipo === "PF" ? <User className="h-4 w-4" /> : <Building2 className="h-4 w-4" />)}
    </div>
  );
}

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
          <tr className="border-b border-border">
            {showSelection ? (
              <th className="w-10 px-3 py-3">
                <input
                  aria-label="Selecionar todos"
                  type="checkbox"
                  checked={allSelected}
                  className="h-4 w-4 rounded border-border accent-brand-primary"
                  onChange={(e) => {
                    const ids = rows.map(c => c.id);
                    onSelectedChange?.(e.target.checked ? ids : []);
                  }}
                />
              </th>
            ) : null}
            <Th label="Cliente" onClick={() => onSortChange('nome', sortKey === 'nome' && sortDir === 'asc' ? 'desc' : 'asc')} active={sortKey === 'nome'} dir={sortDir} ariaSort={sortKey === 'nome' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'} className="min-w-[200px]" />
            <Th label="Tipo" onClick={() => onSortChange('tipo', sortKey === 'tipo' && sortDir === 'asc' ? 'desc' : 'asc')} active={sortKey === 'tipo'} dir={sortDir} ariaSort={sortKey === 'tipo' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'} className="w-[110px]" />
            <Th label="E-mail / Telefone" onClick={() => onSortChange('email', sortKey === 'email' && sortDir === 'asc' ? 'desc' : 'asc')} active={sortKey === 'email'} dir={sortDir} ariaSort={sortKey === 'email' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'} className="min-w-[200px]" />
            {showDocumentoColumn ? <Th label="Documento" onClick={() => onSortChange('documento', sortKey === 'documento' && sortDir === 'asc' ? 'desc' : 'asc')} active={sortKey === 'documento'} dir={sortDir} ariaSort={sortKey === 'documento' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'} className="w-[140px]" /> : null}
            {showEnderecoColumn ? <Th label="Cidade / Estado" onClick={() => onSortChange('cidadeEstado', sortKey === 'cidadeEstado' && sortDir === 'asc' ? 'desc' : 'asc')} active={sortKey === 'cidadeEstado'} dir={sortDir} ariaSort={sortKey === 'cidadeEstado' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'} className="w-[150px]" /> : null}
            <Th label="Status" onClick={() => onSortChange('status', sortKey === 'status' && sortDir === 'asc' ? 'desc' : 'asc')} active={sortKey === 'status'} dir={sortDir} ariaSort={sortKey === 'status' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'} className="w-[90px]" />
            <th className="w-[100px] px-3 py-3 text-right">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Ações</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((cliente) => {
            const checked = selected.has(cliente.id);
            const city = cliente.addressCity || cliente.cidade;
            const state = cliente.addressState || cliente.estado;
            const location = city && state ? `${city}, ${state}` : city || state || null;

            return (
              <tr
                key={cliente.id}
                data-testid={`cliente-row-${cliente.id}`}
                className={`border-b border-border/50 transition-colors hover:bg-muted/40 ${checked ? "bg-brand-primary/5" : ""}`}
              >
                {showSelection ? (
                  <td className="px-3 py-3">
                    <input
                      aria-label={`Selecionar ${cliente.nomeCompletoOuRazao}`}
                      type="checkbox"
                      checked={checked}
                      className="h-4 w-4 rounded border-border accent-brand-primary"
                      onChange={(e) => {
                        const next = new Set(selected);
                        if ((e.target as HTMLInputElement).checked) next.add(cliente.id);
                        else next.delete(cliente.id);
                        onSelectedChange?.(Array.from(next));
                      }}
                    />
                  </td>
                ) : null}
                {/* Avatar + nome */}
                <td className="px-3 py-3">
                  <div className="flex items-center gap-3">
                    <ClienteAvatar name={cliente.nomeCompletoOuRazao} tipo={cliente.tipo} />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{cliente.nomeCompletoOuRazao}</p>
                      {cliente.nomeFantasia && cliente.tipo === "PJ" && (
                        <p className="truncate text-xs text-muted-foreground">{cliente.razaoSocial}</p>
                      )}
                    </div>
                  </div>
                </td>
                {/* Tipo badge */}
                <td className="px-3 py-3">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border ${
                      cliente.tipo === "PF"
                        ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20"
                        : "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20"
                    }`}
                  >
                    {cliente.tipo === "PF" ? <User className="h-3 w-3" /> : <Building2 className="h-3 w-3" />}
                    {cliente.tipo}
                  </span>
                </td>
                {/* Email + telefone stacked */}
                <td className="px-3 py-3">
                  <p className="text-sm text-foreground">{cliente.email}</p>
                  {cliente.telefone && (
                    <p className="text-xs text-muted-foreground">{cliente.telefone}</p>
                  )}
                </td>
                {showDocumentoColumn ? (
                  <td className="px-3 py-3 font-mono text-sm text-muted-foreground">
                    {cliente.documentoMasked}
                  </td>
                ) : null}
                {showEnderecoColumn ? (
                  <td className="px-3 py-3 text-sm text-muted-foreground">
                    {location ?? <span className="text-muted-foreground/40">—</span>}
                  </td>
                ) : null}
                {/* Status badge */}
                <td className="px-3 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${
                      cliente.ativo
                        ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20"
                        : "bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/20"
                    }`}
                  >
                    {cliente.ativo ? "Ativo" : "Inativo"}
                  </span>
                </td>
                {/* Actions */}
                <td className="px-3 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {onView && (
                      <button
                        onClick={() => onView(cliente.id)}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-brand-primary transition hover:bg-brand-primary/10"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Ver
                      </button>
                    )}
                    {onEdit && (
                      <button
                        onClick={() => onEdit(cliente.id)}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Editar
                      </button>
                    )}
                    {onToggleStatus && (
                      <button
                        onClick={() => onToggleStatus(cliente.id, cliente.ativo)}
                        className={`inline-flex items-center rounded-lg px-2 py-1.5 text-xs font-medium transition ${
                          cliente.ativo
                            ? "text-brand-secondary hover:bg-brand-secondary/10"
                            : "text-green-600 hover:bg-green-500/10"
                        }`}
                      >
                        {cliente.ativo ? "Desativar" : "Ativar"}
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(cliente.id)}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-destructive transition hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Excluir
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Th({
  label,
  onClick,
  active,
  dir,
  ariaSort,
  className = "",
}: {
  label: string;
  onClick: () => void;
  active: boolean;
  dir: "asc" | "desc";
  ariaSort?: "ascending" | "descending" | "none" | "other";
  className?: string;
}) {
  const sortVal = ariaSort ?? "none";
  return (
    <th
      className={`px-3 py-3 ${className}`}
      {...{ "aria-sort": sortVal as "ascending" | "descending" | "none" | "other" }}
    >
      <button
        onClick={onClick}
        aria-label={`Ordenar por ${label}`}
        className={`inline-flex items-center gap-1 rounded px-1 py-0.5 text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground ${active ? "text-foreground" : ""}`}
      >
        {label}
        <ArrowUpDown className={`h-3 w-3 ${active ? "opacity-100" : "opacity-40"}`} />
        <span className="sr-only">{dir === "asc" ? "asc" : "desc"}</span>
      </button>
    </th>
  );
}

export default React.memo(ClientesTable);
