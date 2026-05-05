"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { authenticatedFetch } from "@/lib/api/client";
import { Users, X, ChevronRight } from "lucide-react";

interface DelegacaoItem {
  id: number;
  dataInicio: string;
  dataFim: string;
  motivo?: string | null;
  delegante?: { id: number; nomeCompleto: string; email: string } | null;
  delegatario?: { id: number; nomeCompleto: string; email: string } | null;
}

interface MinhasResponse {
  delegacoesFeitas: DelegacaoItem[];
  delegacoesRecebidas: DelegacaoItem[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    timeZone: "America/Chicago",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function DelegacaoBanner() {
  const [data, setData] = useState<MinhasResponse | null>(null);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  useEffect(() => {
    authenticatedFetch("/api/usuarios/delegacoes/minhas")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json?.success) setData(json.data);
      })
      .catch(() => null);
  }, []);

  if (!data) return null;

  const receivedActive = data.delegacoesRecebidas.filter((d) => !dismissed.has(d.id));
  const sentActive = data.delegacoesFeitas.filter((d) => !dismissed.has(d.id));

  if (receivedActive.length === 0 && sentActive.length === 0) return null;

  return (
    <div className="mb-4 space-y-2">
      {/* Received delegations — primary banner */}
      {receivedActive.map((d) => (
        <div
          key={d.id}
          className="flex items-center gap-3 rounded-2xl border border-brand-primary/30 bg-brand-primary/10 px-4 py-3 text-sm"
          role="status"
          aria-label="Delegação ativa recebida"
        >
          <Users className="h-4 w-4 shrink-0 text-brand-primary" />
          <p className="flex-1 text-foreground">
            Você está cobrindo as funções de{" "}
            <span className="font-semibold">{d.delegante?.nomeCompleto ?? "—"}</span>{" "}
            até{" "}
            <span className="font-semibold">{formatDate(d.dataFim)}</span>
            {d.motivo && (
              <span className="text-muted-foreground"> · {d.motivo}</span>
            )}
          </p>
          <Link
            href="/usuarios/delegacoes"
            className="hidden shrink-0 items-center gap-1 text-xs text-brand-primary hover:underline sm:flex"
          >
            Ver detalhes <ChevronRight className="h-3 w-3" />
          </Link>
          <button
            onClick={() => setDismissed((prev) => new Set([...prev, d.id]))}
            aria-label="Fechar aviso de delegação"
            className="ml-1 rounded-lg p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}

      {/* Sent delegations — subtle secondary banner */}
      {sentActive.map((d) => (
        <div
          key={d.id}
          className="flex items-center gap-3 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm"
          role="status"
          aria-label="Delegação ativa enviada"
        >
          <Users className="h-4 w-4 shrink-0 text-yellow-600 dark:text-yellow-400" />
          <p className="flex-1 text-foreground">
            Suas funções foram delegadas para{" "}
            <span className="font-semibold">{d.delegatario?.nomeCompleto ?? "—"}</span>{" "}
            até{" "}
            <span className="font-semibold">{formatDate(d.dataFim)}</span>
          </p>
          <button
            onClick={() => setDismissed((prev) => new Set([...prev, d.id]))}
            aria-label="Fechar aviso"
            className="ml-1 rounded-lg p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
