// packages/auth/src/components/UsersToolbar.tsx
"use client";
import { Search, Plus, Download, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import type { Usuario } from "./UsersTable";

export default function UsersToolbar({
  q,
  onQ,
  role,
  onRole,
  status,
  onStatus,
  total,
  showNew = true,
  users = [],
  scope = "selected",
  onExportAllFiltered,
  exporting = false,
}: {
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
  onExportAllFiltered?: (format: 'csv' | 'pdf') => Promise<void> | void;
  exporting?: boolean;
}) {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportScope, setExportScope] = useState<"selected" | "allFiltered">(scope);
  const exportRef = useRef<HTMLDivElement>(null);

  const handleExport = async (format: 'csv' | 'pdf') => {
    setShowExportMenu(false);
    const scopeNow = exportScope;

    try {
      if (scopeNow === 'selected') {
        if (users.length === 0) {
          alert('Nenhum usuário selecionado para exportar');
          return;
        }
        // Implementar exportação local
        alert(`Exportação ${format.toUpperCase()} em desenvolvimento`);
      } else {
        if (!onExportAllFiltered) {
          alert('Exportação de todos os filtrados não suportada');
          return;
        }
        await onExportAllFiltered(format);
      }
    } catch (error) {
      console.error('Erro na exportação:', error);
      alert(`Erro ao exportar ${format.toUpperCase()}`);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };

    if (showExportMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showExportMenu]);

  return (
    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            value={q}
            onChange={(e) => onQ(e.target.value)}
            placeholder="Buscar por nome ou e-mail"
            className="w-[260px] rounded-xl border border-black/10 bg-white px-9 py-2 text-sm outline-none placeholder:text-neutral-400 focus:border-[#0098DA] dark:border-white/10 dark:bg-gray-800 dark:text-white"
          />
        </div>
        <select
          value={role}
          onChange={(e) => onRole(e.target.value)}
          className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-gray-800 dark:text-white"
        >
          <option value="">Todos os Níveis</option>
          {["ADMIN","GERENTE","FINANCEIRO","USUARIO","ESTOQUE","CLIENTE"].map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>

        <select
          value={status ?? ""}
          onChange={(e) => { if (onStatus) onStatus(e.target.value); }}
          className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-gray-800 dark:text-white"
        >
          <option value="">Status</option>
          <option value="true">Ativos</option>
          <option value="false">Inativos</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <select
          value={exportScope}
          onChange={(e) => setExportScope(e.target.value as 'selected' | 'allFiltered')}
          className="rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5"
          title="Escopo de exportação"
        >
          <option value="selected">Selecionados</option>
          <option value="allFiltered">Todos os filtrados</option>
        </select>
        <div className="relative" ref={exportRef}>
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            disabled={exporting}
            className="rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm hover:bg-black/5 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 flex items-center gap-1"
          >
            <Download className="h-4 w-4" />
            {exporting ? 'Exportando…' : 'Exportar'}
            <ChevronDown className="h-3 w-3" />
          </button>

          {showExportMenu && (
            <div className="absolute right-0 top-full mt-1 w-40 rounded-lg border border-black/10 bg-white shadow-lg dark:border-white/10 dark:bg-gray-800 z-10">
              <button
                onClick={() => handleExport('csv')}
                className="w-full px-4 py-3 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-lg flex items-center gap-2"
              >
                <span>📊</span>
                <span>Exportar CSV</span>
              </button>
              <button
                onClick={() => handleExport('pdf')}
                className="w-full px-4 py-3 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-b-lg flex items-center gap-2"
              >
                <span>📄</span>
                <span>Exportar PDF</span>
              </button>
            </div>
          )}
        </div>
        {showNew && (
          <Link href="/usuarios/novo" className="rounded-2xl bg-[#0098DA] px-4 py-2 text-sm text-white shadow hover:brightness-110">
            <Plus className="mr-1 inline h-4 w-4" />
            Novo Usuário
          </Link>
        )}
      </div>

      <div className="text-xs opacity-60">{total.toLocaleString("pt-BR")} resultado(s)</div>
    </div>
  );
}