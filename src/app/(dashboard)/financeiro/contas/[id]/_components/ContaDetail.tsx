"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useToast } from "@gladpros/ui/toast";
import { Button } from "@gladpros/ui/button";
import { Badge } from "@gladpros/ui/badge";
import { ModulePageHeader } from "@gladpros/ui/module-page-header";
import { authenticatedFetch } from "@/lib/api/client";
import { ArrowLeft, Landmark, ArrowUp, ArrowDown } from "lucide-react";

interface Conta {
  id: number;
  nome: string;
  banco: string;
  agencia: string;
  conta: string;
  digito?: string;
  tipo: string;
  saldoAtual: number;
  principal: boolean;
  ativo: boolean;
}

interface Transacao {
  id: number;
  tipo: string;
  valor: number;
  descricao?: string;
  dataTransacao: string;
  saldoAnterior: number;
  saldoPosterior: number;
}

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

export default function ContaDetailPage({ id }: Props) {
  const { error: showError } = useToast();
  const [conta, setConta] = useState<Conta | null>(null);
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [contaRes, extratoRes] = await Promise.all([
          authenticatedFetch(`/api/financeiro/contas/${id}`),
          authenticatedFetch(`/api/financeiro/contas/${id}/extrato?limit=20`),
        ]);
        const contaJson = await contaRes.json();
        const extratoJson = await extratoRes.json();
        if (!contaJson.success) throw new Error(contaJson.error ?? contaJson.message);
        setConta(contaJson.data);
        setTransacoes(extratoJson.data?.transacoes ?? extratoJson.data ?? []);
      } catch {
        showError("Erro", "Falha ao carregar conta");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, showError]);

  if (loading) return <div className="animate-pulse h-64 rounded-2xl bg-muted" />;
  if (!conta) return (
    <div className="text-center py-16 text-muted-foreground">
      <p>Conta não encontrada</p>
      <Link href="/financeiro/contas" className="text-brand-primary hover:underline text-sm mt-2 inline-block">
        Voltar para contas
      </Link>
    </div>
  );

  const isCredit = (tipo: string) =>
    ["CREDITO", "TRANSFERENCIA_ENTRADA", "JUROS"].includes(tipo);

  return (
    <div className="space-y-6">
      <div className="bg-hero-gradient rounded-2xl p-6">
        <ModulePageHeader
          title={conta.nome}
          description={conta.banco}
          icon={<Landmark className="h-6 w-6 text-white" />}
          breadcrumbs={[
            { label: "Financeiro", href: "/financeiro" },
            { label: "Contas", href: "/financeiro/contas" },
            { label: conta.nome },
          ]}
          className="text-white"
        />
      </div>

      {/* Account details */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Current Balance</p>
            <p className="text-3xl font-bold text-foreground">{fmt(Number(conta.saldoAtual))}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {conta.principal && <Badge variant="default">Primary</Badge>}
            <Badge variant={conta.ativo ? "default" : "outline"}>{conta.ativo ? "Active" : "Inactive"}</Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <DetailRow label="Tipo" value={conta.tipo} />
          <DetailRow label="Bank" value={conta.banco} />
          <DetailRow label="Branch (Routing)" value={conta.agencia} />
          <DetailRow
            label="Account Number"
            value={conta.digito ? `${conta.conta}-${conta.digito}` : conta.conta}
          />
        </div>

        <div className="pt-4 border-t border-border">
          <Link href="/financeiro/contas" data-testid="btn-voltar">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
          </Link>
        </div>
      </div>

      {/* Recent transactions */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="font-semibold text-foreground">Recent Transactions</h3>
        </div>
        {transacoes.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">
            Nenhuma transação encontrada
          </div>
        ) : (
          <div className="divide-y divide-border">
            {transacoes.map((t) => (
              <div key={t.id} className="flex items-center justify-between px-6 py-3">
                <div className="flex items-center gap-3">
                  <div className={`flex items-center justify-center h-8 w-8 rounded-full ${isCredit(t.tipo) ? "bg-green-500/10 text-green-600" : "bg-destructive/10 text-destructive"}`}>
                    {isCredit(t.tipo) ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{t.descricao ?? t.tipo}</p>
                    <p className="text-xs text-muted-foreground">{fmtDate(t.dataTransacao)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-mono font-medium ${isCredit(t.tipo) ? "text-green-600" : "text-destructive"}`}>
                    {isCredit(t.tipo) ? "+" : "-"}{fmt(Math.abs(Number(t.valor)))}
                  </p>
                  <p className="text-xs text-muted-foreground">{fmt(Number(t.saldoPosterior))}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
