"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown, Copy, Send, Trash2 } from "lucide-react";

import { Badge } from "@gladpros/ui/badge"
import { Button } from "@gladpros/ui/button";

import type { PropostaDTO, PropostasList, SortKey, StatusProposta } from "./types";

const isWrapped = (
  data: PropostasList
): data is { items: PropostaDTO[] } =>
  !Array.isArray(data) &&
  data !== null &&
  typeof data === "object" &&
  "items" in data &&
  Array.isArray((data as { items: unknown }).items);

const unwrap = (data?: PropostasList): PropostaDTO[] => {
  if (!data) {
    return [];
  }
  return Array.isArray(data) ? data : isWrapped(data) ? data.items : [];
};

function StatusBadge({ status }: { status: StatusProposta }) {
  const variantMap: Record<
    StatusProposta,
    "secondary" | "primary" | "warning" | "success" | "error"
  > = {
    RASCUNHO: "secondary",
    ENVIADA: "primary",
    ASSINADA: "warning",
    APROVADA: "success",
    CANCELADA: "error",
  };

  return <Badge variant={variantMap[status] || "outline"}>{status}</Badge>;
}

function SortableHeader({
  active,
  dir,
  label,
  onClick,
}: {
  active: boolean;
  dir: "asc" | "desc";
  label: string;
  onClick: () => void;
}) {
  const ariaSort = active ? (dir === "asc" ? "ascending" : "descending") : "none";

  return (
    <th className="px-3 py-2" {...{ "aria-sort": ariaSort as "ascending" | "descending" | "none" }}>
      <button
        onClick={onClick}
        className={`inline-flex items-center gap-1 rounded px-1 py-0.5 hover:bg-black/5 dark:hover:bg-white/10 ${active ? "font-medium" : ""}`}
      >
        {label}
        <ArrowUpDown
          className={`h-3.5 w-3.5 ${active ? "opacity-100" : "opacity-50"}`}
        />
        <span className="sr-only">{dir === "asc" ? "asc" : "desc"}</span>
      </button>
    </th>
  );
}

type PropostasTableProps = {
  data?: PropostasList;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onEdit: (id: string) => void;
  onSelectedChange?: (ids: string[]) => void;
  onSend: (id: string) => void;
  onSortChange?: (key: SortKey, dir: "asc" | "desc") => void;
  sortDir?: "asc" | "desc";
  sortKey?: SortKey;
};

export function PropostasTable({
  data,
  onDelete,
  onDuplicate,
  onEdit,
  onSelectedChange,
  onSend,
  onSortChange,
  sortDir = "desc",
  sortKey = "criadoEm",
}: PropostasTableProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const rows = useMemo(() => unwrap(data), [data]);
  const rowsLen = rows.length;
  const allSelected = selected.size > 0 && selected.size === rowsLen;

  function toggleSort(key: SortKey) {
    const nextDir = sortKey === key ? (sortDir === "asc" ? "desc" : "asc") : "asc";
    onSortChange?.(key, nextDir);
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-black/10 bg-card dark:border-white/10 dark:bg-white/5">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left opacity-70">
            <th className="px-3 py-2">
              <input
                aria-label="Selecionar todos"
                type="checkbox"
                checked={allSelected}
                onChange={(event) => {
                  const ids = rows.map((proposta) => proposta.id);
                  const next = event.target.checked ? new Set(ids) : new Set<string>();
                  setSelected(next);
                  onSelectedChange?.(Array.from(next));
                }}
              />
            </th>
            <SortableHeader
              label="Número"
              onClick={() => toggleSort("numeroProposta")}
              active={sortKey === "numeroProposta"}
              dir={sortDir}
            />
            <SortableHeader
              label="Título"
              onClick={() => toggleSort("titulo")}
              active={sortKey === "titulo"}
              dir={sortDir}
            />
            <SortableHeader
              label="Cliente"
              onClick={() => toggleSort("cliente")}
              active={sortKey === "cliente"}
              dir={sortDir}
            />
            <SortableHeader
              label="Status"
              onClick={() => toggleSort("status")}
              active={sortKey === "status"}
              dir={sortDir}
            />
            <SortableHeader
              label="Valor"
              onClick={() => toggleSort("valor")}
              active={sortKey === "valor"}
              dir={sortDir}
            />
            <SortableHeader
              label="Criado"
              onClick={() => toggleSort("criadoEm")}
              active={sortKey === "criadoEm"}
              dir={sortDir}
            />
            <th className="px-3 py-2 text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((proposta) => {
            const checked = selected.has(proposta.id);

            return (
              <tr
                key={proposta.id}
                className="border-t border-border hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
              >
                <td className="px-3 py-3">
                  <input
                    aria-label={`Selecionar ${proposta.titulo}`}
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => {
                      const next = new Set(selected);
                      if (event.target.checked) {
                        next.add(proposta.id);
                      } else {
                        next.delete(proposta.id);
                      }
                      setSelected(next);
                      onSelectedChange?.(Array.from(next));
                    }}
                  />
                </td>
                <td className="px-3 py-3 font-medium">{proposta.numeroProposta}</td>
                <td className="px-3 py-3">{proposta.titulo}</td>
                <td className="px-3 py-3">
                  {proposta.cliente
                    ? proposta.cliente.nomeCompleto ||
                      proposta.cliente.razaoSocial ||
                      proposta.cliente.nomeFantasia ||
                      "Nome não informado"
                    : "-"}
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-col gap-1">
                    <StatusBadge status={proposta.status} />
                    {proposta.diasAteVencimento !== null && proposta.diasAteVencimento !== undefined && (
                      <span
                        className={`inline-block self-start rounded px-1.5 py-0.5 text-xs font-medium ${
                          proposta.diasAteVencimento < 0
                            ? 'bg-destructive/10 text-destructive'
                            : proposta.diasAteVencimento <= 7
                            ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {proposta.diasAteVencimento < 0
                          ? 'Expirada'
                          : proposta.diasAteVencimento === 0
                          ? 'Expira hoje'
                          : `Exp. em ${proposta.diasAteVencimento}d`}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-3">
                  {(proposta.valorEstimado ?? proposta.valor)
                    ? `$ ${(proposta.valorEstimado ?? proposta.valor)!.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                      })}`
                    : "-"}
                </td>
                <td className="px-3 py-3 text-xs opacity-70">
                  {new Date(proposta.criadoEm).toLocaleDateString("en-US")}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => onEdit(proposta.id)} aria-label={`Editar proposta ${proposta.titulo}`}>
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDuplicate(proposta.id)}
                      aria-label={`Duplicar proposta ${proposta.titulo}`}
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Duplicar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onSend(proposta.id)}
                      aria-label={`Enviar proposta ${proposta.titulo}`}
                    >
                      <Send className="h-3.5 w-3.5" />
                      Enviar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(proposta.id)}
                      aria-label={`Excluir proposta ${proposta.titulo}`}
                      className="text-destructive hover:text-destructive/80"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Excluir
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}

          {rows.length === 0 && (
            <tr>
              <td colSpan={8} className="px-3 py-8 text-center opacity-60">
                Nenhuma proposta encontrada.
              </td>
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
                selectedIds.forEach((id) => onDuplicate(id));
                setSelected(new Set());
              }}
              aria-label="Duplicar propostas selecionadas"
              className="rounded-xl px-2 py-1 hover:bg-black/5 dark:hover:bg-white/10"
            >
              📋 Duplicar Selecionados
            </button>
            <button
              onClick={() => {
                const selectedIds = Array.from(selected);
                selectedIds.forEach((id) => onSend(id));
                setSelected(new Set());
              }}
              aria-label="Enviar propostas selecionadas"
              className="rounded-xl px-2 py-1 hover:bg-black/5 dark:hover:bg-white/10"
            >
              📤 Enviar Selecionados
            </button>
            <button
              onClick={() => {
                const selectedIds = Array.from(selected);
                selectedIds.forEach((id) => onDelete(id));
                setSelected(new Set());
              }}
              aria-label="Excluir propostas selecionadas"
              className="rounded-xl px-2 py-1 text-destructive hover:bg-destructive/10"
            >
              🗑️ Excluir Selecionados
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
