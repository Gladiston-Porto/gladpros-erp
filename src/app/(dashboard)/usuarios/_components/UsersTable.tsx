"use client";

import { useMemo, useState, useEffect } from "react";
import { ArrowUpDown, Eye, Pencil, UserCheck, UserX } from "lucide-react";

import type { SortKey, UserRole, UsersList } from "./types";
import { unwrapUsers } from "./types";

type UsersTableProps = {
  data?: UsersList;
  onEdit: (id: number) => void;
  onView: (id: number) => void;
  onToggleStatus: (id: number, currentStatus: boolean) => void;
  onSelectedChange?: (ids: number[]) => void;
  resetKey?: number;
  sortKey?: SortKey;
  sortDir?: "asc" | "desc";
  onSortChange?: (key: SortKey, dir: "asc" | "desc") => void;
};

// Paleta de cores para avatares de iniciais (determinística por nome)
const AVATAR_COLORS = [
  "bg-sky-600",
  "bg-teal-600",
  "bg-orange-600",
  "bg-indigo-600",
  "bg-emerald-600",
  "bg-rose-600",
];
function avatarColorClass(name: string): string {
  const idx = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

// Cores distintas por role
const ROLE_CONFIG: Record<UserRole, { label: string; className: string }> = {
  ADMIN:       { label: "Administrador", className: "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20" },
  GERENTE:     { label: "Gerente",       className: "bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/20" },
  FINANCEIRO:  { label: "Financeiro",    className: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20" },
  ESTOQUE:     { label: "Estoque",       className: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-500/20" },
  USUARIO:     { label: "Usuário",       className: "bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border border-neutral-500/20" },
  CLIENTE:     { label: "Cliente",       className: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20" },
};

function UserAvatar({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={name}
        width={36}
        height={36}
        className="shrink-0 h-9 w-9 rounded-full object-cover"
        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
      />
    );
  }

  return (
    <div
      className={`flex shrink-0 h-9 w-9 items-center justify-center rounded-full text-[13.7px] text-white font-semibold select-none ${avatarColorClass(name)}`}
      aria-label={name}
    >
      {initials}
    </div>
  );
}

function relativeTime(date: Date): { text: string; color: string } {
  const now = Date.now();
  const diff = now - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 5)  return { text: "Online agora", color: "bg-green-500" };
  if (hours < 24) {
    const timeStr = date.toLocaleTimeString("en-US", {
      timeZone: "America/Chicago", hour: "2-digit", minute: "2-digit",
    });
    return { text: `Hoje às ${timeStr}`, color: "bg-blue-400" };
  }
  if (days === 1) return { text: "Ontem", color: "bg-neutral-400" };
  if (days < 7)   return { text: `Há ${days} dias`, color: "bg-neutral-400" };
  return {
    text: date.toLocaleDateString("en-US", { timeZone: "America/Chicago", month: "short", day: "numeric" }),
    color: "bg-neutral-400",
  };
}

function SortableHead({
  label, onClick, active, dir, className = "",
}: {
  label: string; onClick: () => void; active: boolean; dir: "asc" | "desc"; className?: string;
}) {
  const thCls = `px-3 py-3 ${className}`;
  const btn = (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded px-1 py-0.5 text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground ${active ? "text-foreground" : ""}`}
    >
      {label}
      <ArrowUpDown className={`h-3 w-3 ${active ? "opacity-100" : "opacity-40"}`} />
    </button>
  );
  if (!active) return <th className={thCls} aria-sort="none">{btn}</th>;
  if (dir === "asc") return <th className={thCls} aria-sort="ascending">{btn}</th>;
  return <th className={thCls} aria-sort="descending">{btn}</th>;
}

export function UsersTable({
  data,
  onEdit,
  onView,
  onToggleStatus,
  onSelectedChange,
  sortKey = "criadoEm",
  sortDir = "desc",
  onSortChange,
  resetKey = 0,
}: UsersTableProps) {
  const [selected, setSelected] = useState<Set<number>>(new Set());

  useEffect(() => {
    setSelected(new Set());
  }, [resetKey]);

  const rows = useMemo(() => unwrapUsers(data), [data]);
  const allSelected = selected.size > 0 && selected.size === rows.length;

  function toggleSort(key: SortKey) {
    const nextDir = sortKey === key ? (sortDir === "asc" ? "desc" : "asc") : "asc";
    onSortChange?.(key, nextDir);
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="w-10 px-3 py-3">
              <input
                aria-label="Selecionar todos"
                type="checkbox"
                checked={allSelected}
                className="h-4 w-4 rounded border-border accent-brand-primary"
                onChange={(e) => {
                  const ids = rows.map((u) => u.id);
                  const next = e.target.checked ? new Set(ids) : new Set<number>();
                  setSelected(next);
                  onSelectedChange?.(Array.from(next));
                }}
              />
            </th>
            <SortableHead label="Usuário" onClick={() => toggleSort("nome")} active={sortKey === "nome"} dir={sortDir} className="min-w-[200px]" />
            <SortableHead label="Perfil"  onClick={() => toggleSort("role")} active={sortKey === "role"} dir={sortDir} className="w-[140px]" />
            <SortableHead label="Último acesso" onClick={() => toggleSort("ativo")} active={sortKey === "ativo"} dir={sortDir} className="w-40" />
            <SortableHead label="Status" onClick={() => toggleSort("ativo")} active={false} dir={sortDir} className="w-[90px]" />
            <SortableHead label="Criado" onClick={() => toggleSort("criadoEm")} active={sortKey === "criadoEm"} dir={sortDir} className="w-[100px]" />
            <th className="w-[120px] px-3 py-3 text-right">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Ações</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((user) => {
            const checked = selected.has(user.id);
            const isActive = user.ativo ?? (user.status === "ATIVO");
            const isExpired = !isActive && user.expiresAt && new Date(user.expiresAt) < new Date();
            const lastLogin = user.ultimoLoginEm ? new Date(user.ultimoLoginEm) : null;
            const roleConf = ROLE_CONFIG[user.role] ?? ROLE_CONFIG.USUARIO;
            const access = lastLogin ? relativeTime(lastLogin) : null;

            return (
              <tr
                key={user.id}
                className={`border-b border-border/50 transition-colors hover:bg-muted/40 ${checked ? "bg-brand-primary/5" : ""}`}
              >
                {/* Checkbox */}
                <td className="px-3 py-3">
                  <input
                    aria-label={`Selecionar ${user.nomeCompleto}`}
                    type="checkbox"
                    checked={checked}
                    className="h-4 w-4 rounded border-border accent-brand-primary"
                    onChange={(e) => {
                      const next = new Set(selected);
                      if (e.target.checked) next.add(user.id); else next.delete(user.id);
                      setSelected(next);
                      onSelectedChange?.(Array.from(next));
                    }}
                  />
                </td>

                {/* Usuário: avatar + nome + email */}
                <td className="px-3 py-3">
                  <div className="flex items-center gap-3">
                    <UserAvatar name={user.nomeCompleto} avatarUrl={user.avatarUrl} />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{user.nomeCompleto}</p>
                      <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                </td>

                {/* Perfil badge colorida */}
                <td className="px-3 py-3">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${roleConf.className}`}>
                    {roleConf.label}
                  </span>
                </td>

                {/* Último acesso com dot + tempo relativo */}
                <td className="px-3 py-3">
                  {access ? (
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 shrink-0 rounded-full ${access.color}`} />
                      <span className="text-xs text-muted-foreground">{access.text}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 shrink-0 rounded-full bg-neutral-300 dark:bg-neutral-600" />
                      <span className="text-xs text-muted-foreground">Nunca acessou</span>
                    </div>
                  )}
                </td>

                {/* Status pill */}
                <td className="px-3 py-3">
                  {isExpired ? (
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
                      Expirado
                    </span>
                  ) : (
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    isActive
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-neutral-500/10 text-neutral-500 dark:text-neutral-400"
                  }`}>
                    {isActive ? "Ativo" : "Inativo"}
                  </span>
                  )}
                </td>

                {/* Criado em */}
                <td className="px-3 py-3 text-xs text-muted-foreground">
                  {user.criadoEm
                    ? new Date(user.criadoEm).toLocaleDateString("en-US", { timeZone: "America/Chicago", month: "short", day: "numeric", year: "numeric" })
                    : "—"}
                </td>

                {/* Ações: 👁 + ✏️ + toggle */}
                <td className="px-3 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => onView(user.id)}
                      title="Visualizar"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
                      aria-label={`Visualizar ${user.nomeCompleto}`}
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onEdit(user.id)}
                      title="Editar"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
                      aria-label={`Editar ${user.nomeCompleto}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onToggleStatus(user.id, isActive)}
                      title={isActive ? "Desativar" : "Ativar"}
                      className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                        isActive
                          ? "text-orange-500 hover:bg-orange-500/10 hover:text-orange-600"
                          : "text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-600"
                      }`}
                      aria-label={isActive ? `Desativar ${user.nomeCompleto}` : `Ativar ${user.nomeCompleto}`}
                    >
                      {isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan={7} className="px-3 py-12 text-center text-sm text-muted-foreground">
                Nenhum usuário encontrado.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

