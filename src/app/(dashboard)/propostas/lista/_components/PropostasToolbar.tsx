"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, Download, Search } from "lucide-react";

import type { PropostaClienteOption, PropostaDTO } from "./types";

type PropostasToolbarProps = {
  clienteId: string;
  clientes?: PropostaClienteOption[];
  exporting?: boolean;
  onClienteId: (value: string) => void;
  onExportAllFiltered?: (format: "csv" | "pdf") => Promise<void> | void;
  onQ: (value: string) => void;
  onStatus: (value: string) => void;
  propostas?: PropostaDTO[];
  q: string;
  scope?: "selected" | "allFiltered";
  showNew?: boolean;
  status: string;
  total: number;
};

export function PropostasToolbar({
  clienteId,
  clientes = [],
  exporting = false,
  onClienteId,
  onExportAllFiltered,
  onQ,
  onStatus,
  propostas = [],
  q,
  scope = "allFiltered",
  showNew = true,
  status,
  total,
}: PropostasToolbarProps) {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [clienteMenuOpen, setClienteMenuOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const clienteRef = useRef<HTMLDivElement>(null);

  const handleExport = async (format: "csv" | "pdf") => {
    setShowExportMenu(false);
    try {
      if (scope === "selected") {
        if (propostas.length === 0) {
          alert("Nenhuma proposta selecionada para exportar");
          return;
        }
        alert(`Exportação ${format.toUpperCase()} em desenvolvimento`);
        return;
      }

      if (!onExportAllFiltered) {
        alert("Exportação de todos os filtrados não suportada");
        return;
      }

      await onExportAllFiltered(format);
    } catch (error) {
      console.error("Erro na exportação:", error);
      alert(`Erro ao exportar ${format.toUpperCase()}`);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
      if (statusRef.current && !statusRef.current.contains(event.target as Node)) {
        setStatusMenuOpen(false);
      }
      if (clienteRef.current && !clienteRef.current.contains(event.target as Node)) {
        setClienteMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getStatusLabel = (value: string) => {
    switch (value) {
      case "RASCUNHO":
        return "Rascunho";
      case "ENVIADA":
        return "Enviada";
      case "ASSINADA":
        return "Assinada";
      case "APROVADA":
        return "Aprovada";
      case "CANCELADA":
        return "Cancelada";
      default:
        return "Todos os Status";
    }
  };

  const getClienteLabel = (value: string) => {
    if (!value) {
      return "Todos os Clientes";
    }
    const cliente = clientes.find((item) => item.id === value);
    return cliente ? cliente.nome : "Cliente não encontrado";
  };

  return (
    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            value={q}
            onChange={(event) => onQ(event.target.value)}
            placeholder="Buscar por título, número ou cliente"
            className="w-[260px] rounded-xl border border-black/10 bg-card px-9 py-2 text-sm outline-none placeholder:text-neutral-400 focus:border-brand-primary dark:border-white/10"
          />
        </div>

        <div className="relative" ref={statusRef}>
          <button
            onClick={() => setStatusMenuOpen((current) => !current)}
            className="rounded-xl border border-black/10 bg-card px-3 py-2 text-sm dark:border-white/10"
          >
            {status === "" ? "Todos os Status" : getStatusLabel(status)}
            <span className="ml-2">▾</span>
          </button>
          {statusMenuOpen && (
            <div className="absolute left-0 top-full z-20 mt-1 w-40 rounded-lg border border-black/10 bg-card shadow-lg dark:border-white/10">
              <button className="w-full px-4 py-2 text-left text-sm hover:bg-accent" onClick={() => { onStatus(""); setStatusMenuOpen(false); }}>Todos</button>
              <button className="w-full px-4 py-2 text-left text-sm hover:bg-accent" onClick={() => { onStatus("RASCUNHO"); setStatusMenuOpen(false); }}>Rascunho</button>
              <button className="w-full px-4 py-2 text-left text-sm hover:bg-accent" onClick={() => { onStatus("ENVIADA"); setStatusMenuOpen(false); }}>Enviada</button>
              <button className="w-full px-4 py-2 text-left text-sm hover:bg-accent" onClick={() => { onStatus("ASSINADA"); setStatusMenuOpen(false); }}>Assinada</button>
              <button className="w-full px-4 py-2 text-left text-sm hover:bg-accent" onClick={() => { onStatus("APROVADA"); setStatusMenuOpen(false); }}>Aprovada</button>
              <button className="w-full px-4 py-2 text-left text-sm hover:bg-accent" onClick={() => { onStatus("CANCELADA"); setStatusMenuOpen(false); }}>Cancelada</button>
            </div>
          )}
        </div>

        <div className="relative" ref={clienteRef}>
          <button
            onClick={() => setClienteMenuOpen((current) => !current)}
            className="rounded-xl border border-black/10 bg-card px-3 py-2 text-sm dark:border-white/10"
          >
            {getClienteLabel(clienteId)}
            <span className="ml-2">▾</span>
          </button>
          {clienteMenuOpen && (
            <div className="absolute left-0 top-full z-20 mt-1 max-h-60 w-64 overflow-y-auto rounded-lg border border-black/10 bg-card shadow-lg dark:border-white/10">
              <button className="w-full px-4 py-2 text-left text-sm hover:bg-accent" onClick={() => { onClienteId(""); setClienteMenuOpen(false); }}>Todos os Clientes</button>
              {clientes.map((cliente) => (
                <button
                  key={cliente.id}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-accent"
                  onClick={() => {
                    onClienteId(cliente.id);
                    setClienteMenuOpen(false);
                  }}
                >
                  {cliente.nome}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <select
          value={scope}
          onChange={() => {}}
          className="rounded-2xl border border-black/10 bg-card px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5"
          title="Escopo de exportação"
        >
          <option value="selected">Selecionados</option>
          <option value="allFiltered">Todos os filtrados</option>
        </select>
        <div className="relative" ref={exportRef}>
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            disabled={exporting}
            className="flex items-center gap-1 rounded-2xl border border-black/10 bg-card px-3 py-2 text-sm hover:bg-black/5 disabled:opacity-50 dark:border-white/10 dark:bg-white/5"
          >
            <Download className="h-4 w-4" />
            {exporting ? "Exportando…" : "Exportar"}
            <ChevronDown className="h-3 w-3" />
          </button>

          {showExportMenu && (
            <div className="absolute right-0 top-full z-10 mt-1 w-40 rounded-lg border border-black/10 bg-card shadow-lg dark:border-white/10">
              <button
                onClick={() => handleExport("csv")}
                className="flex w-full items-center gap-2 rounded-t-lg px-4 py-3 text-left text-sm hover:bg-accent"
              >
                <span>📊</span>
                <span>Exportar CSV</span>
              </button>
              <button
                onClick={() => handleExport("pdf")}
                className="flex w-full items-center gap-2 rounded-b-lg px-4 py-3 text-left text-sm hover:bg-accent"
              >
                <span>📄</span>
                <span>Exportar PDF</span>
              </button>
            </div>
          )}
        </div>
        {showNew && (
          <Link
            href="/propostas/nova"
            className="rounded-2xl bg-brand-primary px-4 py-2 text-sm text-white shadow hover:brightness-110"
          >
            Nova Proposta
          </Link>
        )}
      </div>

      <div className="text-xs opacity-60">{total.toLocaleString("pt-BR")} resultado(s)</div>
    </div>
  );
}
