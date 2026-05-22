"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useToast } from "@gladpros/ui/toast";
import { Button } from "@gladpros/ui/button";
import { Badge } from "@gladpros/ui/badge";
import { ModulePageHeader } from "@gladpros/ui/module-page-header";
import { authenticatedFetch } from "@/lib/api/client";
import { ArrowLeft, TrendingUp } from "lucide-react";

interface Receita {
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
  categoria?: { nome: string };
  cliente?: { nomeCompleto?: string; razaoSocial?: string };
}

const statusLabel: Record<string, string> = {
  PENDENTE: "Pending",
  RECEBIDA: "Received",
  VENCIDA: "Overdue",
  CANCELADA: "Cancelled",
};

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PENDENTE: "secondary",
  RECEBIDA: "default",
  VENCIDA: "destructive",
  CANCELADA: "outline",
};

const fmt = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

const fmtDate = (v: string) =>
  new Date(v).toLocaleDateString("en-US", { timeZone: "America/Chicago" });

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm text-foreground mt-0.5">{value}</p>
    </div>
  );
}

interface Props { id: string }

export default function ReceitaDetailPage({ id }: Props) {
  const { error: showError } = useToast();
  const [receita, setReceita] = useState<Receita | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await authenticatedFetch(`/api/financeiro/receitas/${id}`);
        const json = await res.json();
        if (!json.success) throw new Error(json.error);
        setReceita(json.data);
      } catch {
        showError("Erro", "Falha ao carregar receita");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, showError]);

  if (loading) return <div className="animate-pulse h-64 rounded-2xl bg-muted" />;
  if (!receita) return (
    <div className="text-center py-16 text-muted-foreground">
      <p>Receita não encontrada</p>
      <Link href="/financeiro/receitas" className="text-brand-primary hover:underline text-sm mt-2 inline-block">
        Voltar para receitas
      </Link>
    </div>
  );

  const clienteName = receita.cliente?.nomeCompleto ?? receita.cliente?.razaoSocial;

  return (
    <div className="space-y-6">
      <div className="bg-hero-gradient rounded-2xl p-6">
        <ModulePageHeader
          title="Detalhes da Receita"
          icon={<TrendingUp className="h-6 w-6 text-white" />}
          breadcrumbs={[
            { label: "Financeiro", href: "/financeiro" },
            { label: "Receitas", href: "/financeiro/receitas" },
            { label: receita.descricao },
          ]}
          className="text-white"
        />
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground">{receita.descricao}</h2>
            <p className="text-2xl font-bold text-foreground mt-1">{fmt(Number(receita.valor))}</p>
          </div>
          <Badge variant={statusVariant[receita.status]}>{statusLabel[receita.status] ?? receita.status}</Badge>
        </div>

        {/* Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <DetailRow label="Tipo" value={receita.tipo} />
          <DetailRow label="Forma de Pagamento" value={receita.formaPagamento} />
          <DetailRow label="Categoria" value={receita.categoria?.nome ?? "—"} />
          {clienteName && <DetailRow label="Cliente" value={clienteName} />}
          <DetailRow label="Issue Date" value={fmtDate(receita.dataEmissao)} />
          <DetailRow label="Due Date" value={fmtDate(receita.dataVencimento)} />
          {receita.dataPagamento && (
            <DetailRow label="Payment Date" value={fmtDate(receita.dataPagamento)} />
          )}
        </div>

        {receita.observacoes && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Observações</p>
            <p className="text-sm text-foreground bg-muted/30 rounded-lg p-3">{receita.observacoes}</p>
          </div>
        )}

        <div className="pt-4 border-t border-border">
          <Link href="/financeiro/receitas" data-testid="btn-voltar">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
