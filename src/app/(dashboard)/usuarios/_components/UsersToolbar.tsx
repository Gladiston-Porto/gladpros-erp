"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, Download, Plus, Search } from "lucide-react";

import { Button } from "@gladpros/ui/button";
import type { Usuario } from "./types";

type UsersToolbarProps = {
  q: string;
  onQ: (v: string) => void;
  role: string;
  onRole: (v: string) => void;
  status?: string;
  onStatus?: (v: string) => void;
  total: number;
  showNew?: boolean;
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
  total,
  showNew = true,
  users: _users = [],
  scope: _scope = "selected",
  onExportAllFiltered,
  exporting = false,
}: UsersToolbarProps) {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };

    if (!showExportMenu) return;

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showExportMenu]);

  const handleExport = async (format: "csv" | "pdf") => {
    setShowExportMenu(false);
    if (!onExportAllFiltered) return;
    await onExportAllFiltered(format);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
        <div className="flex flex-wrap gap-2">
          <div className="relative h-10 min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => onQ(e.target.value)}
              placeholder="Buscar por nome ou email"
              className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
            />
          </div>
          <select
            title="Filtrar por nível de acesso"
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
            value={status ?? ""}
            onChange={(e) => onStatus?.(e.target.value)}
            className="h-10 rounded-2xl border border-border bg-card px-3 text-sm outline-none transition hover:border-brand-primary focus:border-brand-primary dark:focus:border-brand-primary"
          >
            <option value="">Status</option>
            <option value="true">Ativos</option>
            <option value="false">Inativos</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="relative" ref={exportRef}>
            <button
              onClick={() => setShowExportMenu((current) => !current)}
              disabled={exporting}
              className="flex items-center gap-1 rounded-2xl border border-border bg-card px-3 py-2 text-sm transition hover:border-brand-primary disabled:cursor-wait disabled:opacity-60 dark:bg-white/5"
            >
              <Download className="h-4 w-4" />
              {exporting ? "Exportando…" : "Exportar"}
              <ChevronDown className="h-3 w-3" />
            </button>

            {showExportMenu && (
              <div className="absolute right-0 top-full z-10 mt-1 w-44 rounded-xl border border-border bg-card shadow-lg">
                <button
                  onClick={() => handleExport("csv")}
                  className="flex w-full items-center gap-2 rounded-t-xl px-4 py-3 text-left text-sm transition hover:bg-accent"
                >
                  <span>📊</span>
                  <span>Exportar CSV</span>
                </button>
                <button
                  onClick={() => handleExport("pdf")}
                  className="flex w-full items-center gap-2 rounded-b-xl px-4 py-3 text-left text-sm transition hover:bg-accent"
                >
                  <span>📄</span>
                  <span>Exportar PDF</span>
                </button>
              </div>
            )}
          </div>
          {showNew && (
            <Button asChild size="sm">
              <Link href="/usuarios/novo">
                <Plus className="h-4 w-4" />
                Novo Usuário
              </Link>
            </Button>
          )}
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{total.toLocaleString("pt-BR")} resultado(s) encontrado(s)</p>
    </div>
  );
}
