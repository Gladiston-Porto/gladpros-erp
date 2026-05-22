"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@gladpros/ui/toast";
import { Button } from "@gladpros/ui/button";
import { Badge } from "@gladpros/ui/badge";
import { ModulePageHeader } from "@gladpros/ui/module-page-header";
import { authenticatedFetch } from "@/lib/api/client";
import { ArrowLeft, Receipt, CheckCircle, XCircle, DollarSign } from "lucide-react";

interface Despesa {
  id: number;
  descricao: string;
  valor: number;
  status: string;
  tipo: string;
  formaPagamento: string;
  dataEmissao: string;
  dataVencimento: string;
  dataPagamento?: string;
  observacoes?: string;
  numeroDocumento?: string;
  categoria?: { nome: string };
  fornecedor?: { nome: string };
}

const statusLabel: Record<string, string> = {
  PENDENTE: "Pending",
  AGUARDANDO_APROVACAO: "Awaiting Approval",
  APROVADA: "Approved",
  REJEITADA: "Rejected",
  PAGA: "Paid",
  CANCELADA: "Cancelled",
};

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PENDENTE: "secondary",
  AGUARDANDO_APROVACAO: "secondary",
  APROVADA: "default",
  REJEITADA: "destructive",
  PAGA: "default",
  CANCELADA: "outline",
};

const fmt = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

const fmtDate = (v: string) =>
  new Date(v).toLocaleDateString("en-US", { timeZone: "America/Chicago" });

interface DespesaDetailClientProps {
  id: string;
}

export function DespesaDetailClient({ id }: DespesaDetailClientProps) {
  const router = useRouter();
  const { success: showSuccess, error: showError } = useToast();
  const [despesa, setDespesa] = useState<Despesa | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [dataPagamento, setDataPagamento] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await authenticatedFetch(`/api/financeiro/despesas/${id}`);
        const json = await res.json();
        if (!json.success) throw new Error(json.error);
        setDespesa(json.data);
      } catch {
        showError("Erro", "Falha ao carregar despesa");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, showError]);

  async function handleAction(action: "aprovar" | "rejeitar") {
    setActionLoading(true);
    try {
      const res = await authenticatedFetch(`/api/financeiro/despesas/${id}/${action}`, { method: "POST" });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || json.error);
      showSuccess(action === "aprovar" ? "Despesa aprovada!" : "Despesa rejeitada!");
      const res2 = await authenticatedFetch(`/api/financeiro/despesas/${id}`);
      const json2 = await res2.json();
      setDespesa(json2.data);
    } catch (err: unknown) {
      showError("Erro", err instanceof Error ? err.message : "Tente novamente");
    } finally {
      setActionLoading(false);
    }
  }

  async function handlePagar() {
    if (!dataPagamento) {
      showError("Erro", "Informe a data de pagamento");
      return;
    }
    setActionLoading(true);
    try {
      const res = await authenticatedFetch(`/api/financeiro/despesas/${id}/pagar`, {
        method: "POST",
        body: JSON.stringify({ dataPagamento: new Date(dataPagamento).toISOString() }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || json.error);
      showSuccess("Despesa marcada como paga!");
      setShowPayModal(false);
      const res2 = await authenticatedFetch(`/api/financeiro/despesas/${id}`);
      const json2 = await res2.json();
      setDespesa(json2.data);
    } catch (err: unknown) {
      showError("Erro", err instanceof Error ? err.message : "Tente novamente");
    } finally {
      setActionLoading(false);
    }
  }

  // suppress unused router warning — keep for future navigation
  void router;

  if (loading) return <div className="animate-pulse h-64 rounded-2xl bg-muted" />;
  if (!despesa) return (
    <div className="text-center py-16 text-muted-foreground">
      <p>Despesa não encontrada</p>
      <Link href="/financeiro/despesas" className="text-brand-primary hover:underline text-sm mt-2 inline-block">
        Voltar para despesas
      </Link>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="bg-hero-gradient rounded-2xl p-6">
        <ModulePageHeader
          title="Detalhes da Despesa"
          icon={<Receipt className="h-6 w-6 text-white" />}
          breadcrumbs={[
            { label: "Financeiro", href: "/financeiro" },
            { label: "Despesas", href: "/financeiro/despesas" },
            { label: despesa.descricao },
          ]}
          className="text-white"
        />
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
        {/* Header row */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground">{despesa.descricao}</h2>
            <p className="text-2xl font-bold text-foreground mt-1">{fmt(Number(despesa.valor))}</p>
          </div>
          <Badge variant={statusVariant[despesa.status]}>{statusLabel[despesa.status] ?? despesa.status}</Badge>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <DetailRow label="Tipo" value={despesa.tipo} />
          <DetailRow label="Forma de Pagamento" value={despesa.formaPagamento} />
          <DetailRow label="Categoria" value={despesa.categoria?.nome ?? "—"} />
          <DetailRow label="Issue Date" value={fmtDate(despesa.dataEmissao)} />
          <DetailRow label="Due Date" value={fmtDate(despesa.dataVencimento)} />
          {despesa.dataPagamento && (
            <DetailRow label="Payment Date" value={fmtDate(despesa.dataPagamento)} />
          )}
          {despesa.numeroDocumento && (
            <DetailRow label="Invoice/Receipt #" value={despesa.numeroDocumento} />
          )}
          {despesa.fornecedor && (
            <DetailRow label="Fornecedor" value={despesa.fornecedor.nome} />
          )}
        </div>

        {despesa.observacoes && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Observações</p>
            <p className="text-sm text-foreground bg-muted/30 rounded-lg p-3">{despesa.observacoes}</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3 pt-4 border-t border-border">
          <Link href="/financeiro/despesas" data-testid="btn-voltar">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
          </Link>

          {despesa.status === "PENDENTE" && (
            <Button
              data-testid="btn-aprovar"
              onClick={() => handleAction("aprovar")}
              disabled={actionLoading}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              {actionLoading ? "..." : "Aprovar"}
            </Button>
          )}

          {despesa.status === "APROVADA" && (
            <Button
              data-testid="btn-pagar"
              onClick={() => setShowPayModal(true)}
              disabled={actionLoading}
              className="bg-brand-primary text-white"
            >
              <DollarSign className="h-4 w-4 mr-1" />
              Pagar
            </Button>
          )}

          {despesa.status !== "CANCELADA" && despesa.status !== "PAGA" && despesa.status !== "REJEITADA" && (
            <Button
              data-testid="btn-rejeitar"
              variant="destructive"
              onClick={() => handleAction("rejeitar")}
              disabled={actionLoading}
            >
              <XCircle className="h-4 w-4 mr-1" />
              {actionLoading ? "..." : "Rejeitar"}
            </Button>
          )}
        </div>
      </div>

      {/* Pay modal */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm space-y-4">
            <h3 className="font-semibold text-foreground">Confirmar Pagamento</h3>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Data do Pagamento</label>
              <input
                type="date"
                value={dataPagamento}
                onChange={(e) => setDataPagamento(e.target.value)}
                className="w-full h-10 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowPayModal(false)}>Cancelar</Button>
              <Button onClick={handlePagar} disabled={actionLoading} className="bg-brand-primary text-white">
                {actionLoading ? "..." : "Confirmar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm text-foreground mt-0.5">{value}</p>
    </div>
  );
}
