// packages/auth/src/components/UsersTable.tsx
"use client";

import * as React from "react";
import { useMemo, useState } from "react";
import { MoreVertical, ArrowUpDown, Trash2, Pencil } from "lucide-react";

type UserRole = "ADMIN" | "GERENTE" | "USUARIO" | "FINANCEIRO" | "ESTOQUE" | "CLIENTE";
type UserStatus = "ATIVO" | "INATIVO";

export type Usuario = {
  id: number;
  email: string;
  nomeCompleto: string;
  dataNascimento?: string | Date;
  role: UserRole;
  status: UserStatus;
  telefone?: string;
  ativo?: boolean;
  endereco1?: string;
  endereco2?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  anotacoes?: string;
  mfaEnabled?: boolean;
  mfaChannel?: "EMAIL" | "TOTP";
  mustResetPassword?: boolean;
  ultimoLoginEm?: string | Date;
  criadoEm?: string | Date;
  atualizadoEm?: string | Date;
};

type SortKey = "nome" | "email" | "role" | "ativo" | "criadoEm";

type UsersList = Usuario[] | { items: Usuario[] };
const isWrapped = (d: UsersList): d is { items: Usuario[] } => !Array.isArray(d) && d !== null && typeof d === 'object' && 'items' in d && Array.isArray((d as { items: unknown }).items);
const unwrap = (d?: UsersList): Usuario[] => {
  if (!d) return [];
  return Array.isArray(d) ? d : isWrapped(d) ? d.items : [];
};

type UsersTableProps = {
  data?: UsersList;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onToggleStatus: (id: number, currentStatus: boolean) => void;
  onSelectedChange?: (ids: number[]) => void;
  sortKey?: SortKey;
  sortDir?: "asc" | "desc";
  onSortChange?: (key: SortKey, dir: "asc" | "desc") => void;
};

export default function UsersTable({ data, onEdit, onDelete, onToggleStatus, onSelectedChange, sortKey = "criadoEm", sortDir = "desc", onSortChange }: UsersTableProps) {
  const [selected, setSelected] = useState<Set<number>>(new Set());

  function toggleSort(key: SortKey) {
    const nextDir = sortKey === key ? (sortDir === "asc" ? "desc" : "asc") : "asc";
    onSortChange?.(key, nextDir);
  }

  const rows = useMemo(() => unwrap(data), [data]);

  const sorted = useMemo(() => rows.slice(), [rows]);

  const rowsLen = unwrap(data).length;
  const allSelected = selected.size > 0 && selected.size === rowsLen;

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
                  const ids = unwrap(data).map(u => u.id);
                  const next = e.target.checked ? new Set(ids) : new Set<number>();
                  setSelected(next);
                  onSelectedChange?.(Array.from(next));
                }}
              />
            </th>
            <Th label="Nome" onClick={() => toggleSort("nome")} active={sortKey === "nome"} dir={sortDir} />
            <Th label="E-mail" onClick={() => toggleSort("email")} active={sortKey === "email"} dir={sortDir} />
            <Th label="Nível" onClick={() => toggleSort("role")} active={sortKey === "role"} dir={sortDir} />
            <th className="px-3 py-2">Status Online</th>
            <Th label="Status" onClick={() => toggleSort("ativo")} active={sortKey === "ativo"} dir={sortDir} />
            <Th label="Criado" onClick={() => toggleSort("criadoEm")} active={sortKey === "criadoEm"} dir={sortDir} />
            <th className="px-3 py-2 text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((u: Usuario) => {
            const checked = selected.has(u.id);
            return (
              <tr key={u.id} className="border-t border-black/5 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10">
                <td className="px-3 py-3">
                  <input
                    aria-label={`Selecionar ${u.nomeCompleto}`}
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const cp = new Set(selected);
                      if (e.target.checked) cp.add(u.id);
                      else cp.delete(u.id);
                      setSelected(cp);
                      onSelectedChange?.(Array.from(cp));
                    }}
                  />
                </td>
                <td className="px-3 py-3 font-medium">{u.nomeCompleto}</td>
                <td className="px-3 py-3">{u.email}</td>
                <td className="px-3 py-3"><RoleBadge role={u.role} /></td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    {(() => {
                      const lastLogin = u.ultimoLoginEm ? new Date(u.ultimoLoginEm) : null;
                      const now = new Date();
                      const isOnline = lastLogin && (now.getTime() - lastLogin.getTime()) < 15 * 60 * 1000;

                      return (
                        <>
                          <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`} title={isOnline ? 'Online' : 'Offline'}></div>
                          <span className="text-xs text-gray-500">
                            {lastLogin ? lastLogin.toLocaleDateString('pt-BR') : 'Nunca'}
                          </span>
                        </>
                      );
                    })()}
                  </div>
                </td>
                <td className="px-3 py-3">
                  {(() => {
                    const isActive = u.ativo ?? (u.status === 'ATIVO');
                    return (
                      <span className={`rounded-full px-2 py-1 text-xs ${isActive ? "bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20" : "bg-neutral-500/15 text-neutral-600 dark:bg-neutral-500/20"}`}>
                        {isActive ? "Ativo" : "Inativo"}
                      </span>
                    );
                  })()}
                </td>
                <td className="px-3 py-3 text-xs opacity-70">
                  {u.criadoEm ? new Date(u.criadoEm).toLocaleDateString('pt-BR') : '-'}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => onEdit(u.id)} className="rounded-lg px-2 py-1 text-xs hover:bg-black/5 dark:hover:bg-white/10">
                      <Pencil className="mr-1 inline h-3.5 w-3.5" /> Editar
                    </button>
                    <button
                      onClick={() => onToggleStatus(u.id, (u.ativo ?? (u.status === 'ATIVO')))}
                      className={`rounded-lg px-2 py-1 text-xs hover:bg-opacity-20 ${
                        (u.ativo ?? (u.status === 'ATIVO'))
                          ? 'text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20'
                          : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                      }`}
                    >
                      {(u.ativo ?? (u.status === 'ATIVO')) ? '⏸️ Desativar' : '▶️ Ativar'}
                    </button>
                    <button onClick={() => onDelete(u.id)} className="rounded-lg px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                      <Trash2 className="mr-1 inline h-3.5 w-3.5" /> Excluir
                    </button>
                    <button className="rounded-lg p-1 hover:bg-black/5 dark:hover:bg-white/10" aria-label="Mais ações">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
      {sorted.length === 0 && (
            <tr>
        <td colSpan={8} className="px-3 py-8 text-center opacity-60">Nenhum usuário encontrado.</td>
            </tr>
          )}
        </tbody>
      </table>

      {selected.size > 0 && (
        <div className="flex items-center justify-between gap-2 border-t border-black/10 p-3 text-xs dark:border-white/10">
          <div>{selected.size} selecionado(s)</div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const selectedIds = Array.from(selected);
                selectedIds.forEach(id => {
                  const user = rows.find((u: Usuario) => u.id === id);
                  if (user && !(user.ativo ?? (user.status === 'ATIVO'))) {
                    onToggleStatus(id, false);
                  }
                });
                setSelected(new Set());
              }}
              className="rounded-lg px-2 py-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
            >
              ▶️ Ativar Selecionados
            </button>
            <button
              onClick={() => {
                const selectedIds = Array.from(selected);
                selectedIds.forEach(id => {
                  const user = rows.find((u: Usuario) => u.id === id);
                  if (user && (user.ativo ?? (user.status === 'ATIVO'))) {
                    onToggleStatus(id, true);
                  }
                });
                setSelected(new Set());
              }}
              className="rounded-lg px-2 py-1 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20"
            >
              ⏸️ Desativar Selecionados
            </button>
            <button
              onClick={() => {
                const selectedIds = Array.from(selected);
                selectedIds.forEach(id => onDelete(id));
                setSelected(new Set());
              }}
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

function Th({ label, onClick, active, dir }: { label: string; onClick: () => void; active: boolean; dir: "asc" | "desc" }) {
  return (
    <th className="px-3 py-2" aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button onClick={onClick} className={`inline-flex items-center gap-1 rounded px-1 py-0.5 hover:bg-black/5 dark:hover:bg-white/10 ${active ? "font-medium" : ""}`}>
        {label} <ArrowUpDown className={`h-3.5 w-3.5 ${active ? "opacity-100" : "opacity-50"}`} />
        <span className="sr-only">{dir === "asc" ? "asc" : "desc"}</span>
      </button>
    </th>
  );
}

function RoleBadge({ role }: { role: UserRole }) {
  const colors = {
    ADMIN: "bg-red-500/15 text-red-600 dark:bg-red-500/20",
    GERENTE: "bg-blue-500/15 text-blue-600 dark:bg-blue-500/20",
    FINANCEIRO: "bg-green-500/15 text-green-600 dark:bg-green-500/20",
    USUARIO: "bg-gray-500/15 text-gray-600 dark:bg-gray-500/20",
    ESTOQUE: "bg-purple-500/15 text-purple-600 dark:bg-purple-500/20",
    CLIENTE: "bg-orange-500/15 text-orange-600 dark:bg-orange-500/20",
  };

  return (
    <span className={`rounded-full px-2 py-1 text-xs ${colors[role] || colors.USUARIO}`}>
      {role}
    </span>
  );
}