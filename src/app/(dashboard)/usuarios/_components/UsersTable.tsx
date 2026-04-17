"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown, MoreVertical, Pencil, Trash2 } from "lucide-react";

import { Badge } from "@gladpros/ui/badge";
import type { SortKey, UserRole, UsersList } from "./types";
import { unwrapUsers } from "./types";

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

function RoleBadge({ role }: { role: UserRole }) {
  const labels: Record<UserRole, string> = {
    ADMIN: "Destructive",
    GERENTE: "Default",
    FINANCEIRO: "Secondary",
    USUARIO: "Outline",
    ESTOQUE: "Secondary",
    CLIENTE: "Outline",
  };

  return (
    <Badge
      variant={role === "ADMIN" ? "destructive" : role === "GERENTE" ? "default" : "secondary"}
      className={labels[role] === "Outline" ? "border-border bg-background text-foreground" : undefined}
    >
      {role}
    </Badge>
  );
}

function SortableHead({
  label,
  onClick,
  active,
  dir,
  className = "",
}: {
  label: string;
  onClick: () => void;
  active: boolean;
  dir: "asc" | "desc";
  className?: string;
}) {
  const ariaSort = active ? (dir === "asc" ? "ascending" : "descending") : "none";
  return (
    <th className={`px-3 py-2 ${className}`} {...{ "aria-sort": ariaSort as "ascending" | "descending" | "none" }}>
      <button
        onClick={onClick}
        className={`inline-flex items-center gap-1 rounded px-1 py-0.5 hover:bg-black/5 dark:hover:bg-white/10 ${active ? "font-medium" : ""}`}
      >
        {label}
        <ArrowUpDown className={`h-3.5 w-3.5 ${active ? "opacity-100" : "opacity-50"}`} />
        <span className="sr-only">{dir === "asc" ? "asc" : "desc"}</span>
      </button>
    </th>
  );
}

export function UsersTable({
  data,
  onEdit,
  onDelete,
  onToggleStatus,
  onSelectedChange,
  sortKey = "criadoEm",
  sortDir = "desc",
  onSortChange,
}: UsersTableProps) {
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const rows = useMemo(() => unwrapUsers(data), [data]);
  const rowsLen = rows.length;
  const allSelected = selected.size > 0 && selected.size === rowsLen;

  function toggleSort(key: SortKey) {
    const nextDir = sortKey === key ? (sortDir === "asc" ? "desc" : "asc") : "asc";
    onSortChange?.(key, nextDir);
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full table-fixed text-sm">
        <thead>
          <tr className="text-left opacity-70">
            <th className="w-10 px-3 py-2">
              <input
                aria-label="Selecionar todos"
                type="checkbox"
                checked={allSelected}
                onChange={(e) => {
                  const ids = rows.map((user) => user.id);
                  const next = e.target.checked ? new Set(ids) : new Set<number>();
                  setSelected(next);
                  onSelectedChange?.(Array.from(next));
                }}
              />
            </th>
            <SortableHead label="Nome" onClick={() => toggleSort("nome")} active={sortKey === "nome"} dir={sortDir} className="w-[20%]" />
            <SortableHead label="E-mail" onClick={() => toggleSort("email")} active={sortKey === "email"} dir={sortDir} className="w-[25%]" />
            <SortableHead label="Nível" onClick={() => toggleSort("role")} active={sortKey === "role"} dir={sortDir} className="w-[100px]" />
            <th className="w-[130px] px-3 py-2">Status Online</th>
            <SortableHead label="Status" onClick={() => toggleSort("ativo")} active={sortKey === "ativo"} dir={sortDir} className="w-[90px]" />
            <SortableHead label="Criado" onClick={() => toggleSort("criadoEm")} active={sortKey === "criadoEm"} dir={sortDir} className="w-[100px]" />
            <th className="w-[180px] px-3 py-2 text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((user) => {
            const checked = selected.has(user.id);
            const isActive = user.ativo ?? (user.status === "ATIVO");
            const lastLogin = user.ultimoLoginEm ? new Date(user.ultimoLoginEm) : null;
            const isOnline = lastLogin && (Date.now() - lastLogin.getTime()) < 15 * 60 * 1000;

            return (
              <tr key={user.id} className="border-t border-black/5 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10">
                <td className="px-3 py-3">
                  <input
                    aria-label={`Selecionar ${user.nomeCompleto}`}
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const next = new Set(selected);
                      if (e.target.checked) next.add(user.id);
                      else next.delete(user.id);
                      setSelected(next);
                      onSelectedChange?.(Array.from(next));
                    }}
                  />
                </td>
                <td className="max-w-0 truncate px-3 py-3 font-medium">{user.nomeCompleto}</td>
                <td className="max-w-0 truncate px-3 py-3">{user.email}</td>
                <td className="px-3 py-3"><RoleBadge role={user.role} /></td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${isOnline ? "bg-green-500" : "bg-muted-foreground"}`} title={isOnline ? "Online" : "Offline"} />
                    <span className="text-xs text-muted-foreground">
                      {lastLogin ? lastLogin.toLocaleDateString("en-US", { timeZone: "America/Chicago" }) : "Nunca"}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <span
                    className={`rounded-full px-2 py-1 text-xs ${
                      isActive
                        ? "bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20"
                        : "bg-neutral-500/15 text-neutral-600 dark:bg-neutral-500/20"
                    }`}
                  >
                    {isActive ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td className="px-3 py-3 text-xs opacity-70">
                  {user.criadoEm ? new Date(user.criadoEm).toLocaleDateString("en-US", { timeZone: "America/Chicago" }) : "-"}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => onEdit(user.id)} className="rounded-lg px-2 py-1 text-xs hover:bg-black/5 dark:hover:bg-white/10">
                      <Pencil className="mr-1 inline h-3.5 w-3.5" /> Editar
                    </button>
                    <button
                      onClick={() => onToggleStatus(user.id, isActive)}
                      className={`rounded-lg px-2 py-1 text-xs hover:bg-opacity-20 ${
                        isActive
                          ? "text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                          : "text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                      }`}
                    >
                      {isActive ? "⏸️ Desativar" : "▶️ Ativar"}
                    </button>
                    <button onClick={() => onDelete(user.id)} className="rounded-lg px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
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
          {rows.length === 0 && (
            <tr>
              <td colSpan={8} className="px-3 py-8 text-center opacity-60">Nenhum usuário encontrado.</td>
            </tr>
          )}
        </tbody>
      </table>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-card/80 p-3 text-xs text-muted-foreground dark:bg-white/5">
          <div>{selected.size} selecionado(s)</div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                for (const id of selected) {
                  const user = rows.find((entry) => entry.id === id);
                  if (user && !(user.ativo ?? (user.status === "ATIVO"))) onToggleStatus(id, false);
                }
                setSelected(new Set());
              }}
              className="rounded-full border border-slate-200 px-3 py-1 text-xs text-green-600 transition hover:border-green-500 hover:bg-green-50 dark:border-white/10"
            >
              ▶️ Ativar Selecionados
            </button>
            <button
              onClick={() => {
                for (const id of selected) {
                  const user = rows.find((entry) => entry.id === id);
                  if (user && (user.ativo ?? (user.status === "ATIVO"))) onToggleStatus(id, true);
                }
                setSelected(new Set());
              }}
              className="rounded-full border border-slate-200 px-3 py-1 text-xs text-orange-600 transition hover:border-orange-500 hover:bg-orange-50 dark:border-white/10"
            >
              ⏸️ Desativar Selecionados
            </button>
            <button
              onClick={() => {
                for (const id of selected) onDelete(id);
                setSelected(new Set());
              }}
              className="rounded-full border border-slate-200 px-3 py-1 text-xs text-red-600 transition hover:border-red-500 hover:bg-red-50 dark:border-white/10"
            >
              🗑️ Excluir Selecionados
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
