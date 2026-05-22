"use client";

import Link from "next/link";
import { Plus, Search } from "lucide-react";

import { Button } from "@gladpros/ui/button";
import type { Usuario } from "./types";

type UsersToolbarProps = {
  q: string;
  onQ: (v: string) => void;
  role: string;
  onRole: (v: string) => void;
  status?: string;
  onStatus?: (v: string) => void;
  primeiroAcesso?: string;
  onPrimeiroAcesso?: (v: string) => void;
  total: number;
  showNew?: boolean;
  // legacy props — mantidas para não quebrar chamadas existentes
  users?: Usuario[];
  scope?: "selected" | "allFiltered";
  onExportAllFiltered?: (format: "csv" | "pdf") => Promise<void> | void;
  exporting?: boolean;
};

export function UsersToolbar({
  q,
  onQ,
  role,
  onRole,
  status,
  onStatus,
  primeiroAcesso,
  onPrimeiroAcesso,
  total,
  showNew = true,
}: UsersToolbarProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="flex flex-wrap gap-3">
        <div className="relative h-10 min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => onQ(e.target.value)}
            placeholder="Buscar por nome ou email"
            aria-label="Buscar usuários por nome ou email"
            className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
          />
        </div>
        <select
          title="Filtrar por nível de acesso"
          aria-label="Filtrar por nível de acesso"
          value={role}
          onChange={(e) => onRole(e.target.value)}
          className="h-10 rounded-2xl border border-border bg-card px-3 text-sm outline-none transition hover:border-brand-primary focus:border-brand-primary dark:focus:border-brand-primary"
        >
          <option value="">Todos os Níveis</option>
          {["ADMIN", "GERENTE", "FINANCEIRO", "USUARIO", "ESTOQUE", "CLIENTE"].map((entry) => (
            <option key={entry} value={entry}>{entry}</option>
          ))}
        </select>
        <select
          title="Filtrar por status"
          aria-label="Filtrar por status da conta"
          value={status ?? ""}
          onChange={(e) => onStatus?.(e.target.value)}
          className="h-10 rounded-2xl border border-border bg-card px-3 text-sm outline-none transition hover:border-brand-primary focus:border-brand-primary dark:focus:border-brand-primary"
        >
          <option value="">Status</option>
          <option value="true">Ativos</option>
          <option value="false">Inativos</option>
        </select>
        <select
          title="Filtrar por acesso inicial"
          aria-label="Filtrar por status do primeiro acesso"
          value={primeiroAcesso ?? ""}
          onChange={(e) => onPrimeiroAcesso?.(e.target.value)}
          className="h-10 rounded-2xl border border-border bg-card px-3 text-sm outline-none transition hover:border-brand-primary focus:border-brand-primary dark:focus:border-brand-primary"
        >
          <option value="">1º Acesso</option>
          <option value="true">Aguardando</option>
          <option value="false">Configurado</option>
        </select>

        {showNew && (
          <Button asChild size="sm" className="ml-auto">
            <Link href="/usuarios/novo">
              <Plus className="h-4 w-4" />
              Novo Usuário
            </Link>
          </Button>
        )}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{total.toLocaleString("en-US")} resultado(s) encontrado(s)</p>
    </div>
  );
}
