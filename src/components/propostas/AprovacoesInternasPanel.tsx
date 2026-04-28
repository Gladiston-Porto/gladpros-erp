"use client";

import { useState } from "react";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@gladpros/ui/button";
import { Badge } from "@gladpros/ui/badge";

interface AprovacoesInternasPanelProps {
  propostaId: number;
  aprovacaoInternaFinanceira: boolean;
  aprovacaoInternaTecnica: boolean;
  userRole: string;
}

export function AprovacoesInternasPanel({
  propostaId,
  aprovacaoInternaFinanceira: initialFinanceira,
  aprovacaoInternaTecnica: initialTecnica,
  userRole,
}: AprovacoesInternasPanelProps) {
  const [financeira, setFinanceira] = useState(initialFinanceira);
  const [tecnica, setTecnica] = useState(initialTecnica);
  const [loading, setLoading] = useState<"financeira" | "tecnica" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canApproveFinancial = ["ADMIN", "FINANCEIRO"].includes(userRole);
  const canApproveTechnical = ["ADMIN", "GERENTE"].includes(userRole);

  if (!canApproveFinancial && !canApproveTechnical) return null;

  async function toggle(tipo: "financeira" | "tecnica", current: boolean) {
    setLoading(tipo);
    setError(null);
    try {
      const res = await fetch(`/api/propostas/${propostaId}/aprovacao-interna`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo, aprovado: !current }),
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.message ?? "Erro ao atualizar aprovação");
        return;
      }
      if (tipo === "financeira") setFinanceira(!current);
      else setTecnica(!current);
    } catch {
      setError("Erro de conexão ao atualizar aprovação");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Aprovação Interna</h3>

      <div className="flex flex-wrap gap-3">
        {canApproveFinancial && (
          <div className="flex items-center gap-2">
            {financeira ? (
              <CheckCircle className="h-4 w-4 text-green-500" aria-hidden="true" />
            ) : (
              <XCircle className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            )}
            <Badge variant={financeira ? "success" : "secondary"} className="text-xs">
              {financeira ? "Financeiro ✓" : "Financeiro pendente"}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              disabled={loading === "financeira"}
              onClick={() => toggle("financeira", financeira)}
              aria-label={financeira ? "Remover aprovação financeira" : "Aprovar financeiramente"}
            >
              {loading === "financeira" ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : financeira ? (
                "Revogar"
              ) : (
                "Aprovar"
              )}
            </Button>
          </div>
        )}

        {canApproveTechnical && (
          <div className="flex items-center gap-2">
            {tecnica ? (
              <CheckCircle className="h-4 w-4 text-green-500" aria-hidden="true" />
            ) : (
              <XCircle className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            )}
            <Badge variant={tecnica ? "success" : "secondary"} className="text-xs">
              {tecnica ? "Técnico ✓" : "Técnico pendente"}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              disabled={loading === "tecnica"}
              onClick={() => toggle("tecnica", tecnica)}
              aria-label={tecnica ? "Remover aprovação técnica" : "Aprovar tecnicamente"}
            >
              {loading === "tecnica" ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : tecnica ? (
                "Revogar"
              ) : (
                "Aprovar"
              )}
            </Button>
          </div>
        )}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {financeira && tecnica && (
        <p className="text-xs text-green-600 dark:text-green-400 font-medium">
          ✓ Aprovação interna completa (financeiro + técnico)
        </p>
      )}
    </div>
  );
}
