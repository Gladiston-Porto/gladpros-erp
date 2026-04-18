"use client";
import React, { useState, useEffect } from "react";
import {
  FileText,
  FolderOpen,
  Wrench,
  Receipt,
  ShieldCheck,
  ExternalLink,
  AlertCircle,
  Loader2,
} from "lucide-react";
import Link from "next/link";

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface ServiceOrderItem {
  id: number;
  ticketNumber: string;
  title: string;
  status: string;
  scheduledDate: string | null;
  total: number;
  criadoEm: string;
}

interface PropostaItem {
  id: number;
  numeroProposta: string;
  tipoServico: string;
  status: string;
  valorEstimado: number | null;
  moeda: string;
  criadoEm: string;
}

interface ProjetoItem {
  id: number;
  titulo: string;
  status: string;
  valorEstimado: number | null;
  criadoEm: string;
}

interface InvoiceItem {
  id: number;
  numeroInvoice: string;
  status: string;
  valorTotal: number;
  dataEmissao: string;
  dataVencimento: string;
  dataPagamento: string | null;
}

interface RevenueItem {
  id: number;
  descricao: string;
  categoria: string;
  status: string;
  tipo: string;
  valor: number;
  dataEmissao: string;
  dataVencimento: string;
  dataPagamento: string | null;
}

interface InvoicePaymentItem {
  id: number;
  invoiceId: number;
  invoiceNumber: string;
  valor: number;
  dataPagamento: string;
  metodoPagamento: string;
  referencia: string | null;
}

interface WarrantyTicketItem {
  id: number;
  title: string;
  status: string;
  reportedAt: string;
  resolvedAt: string | null;
  costToRepair: number | null;
  coveredByWarranty: boolean | null;
  warrantyExpiresAt: string | null;
  serviceOrderCreatedId: number | null;
}

interface HistoricoData {
  serviceOrders: ServiceOrderItem[];
  propostas: PropostaItem[];
  projetos: ProjetoItem[];
  invoices: InvoiceItem[];
  warrantyTickets: WarrantyTicketItem[];
  revenues: RevenueItem[];
  invoicePayments: InvoicePaymentItem[];
  totais: {
    serviceOrders: number;
    propostas: number;
    projetos: number;
    invoices: number;
    warrantyTickets: number;
    revenues: number;
    invoicePayments: number;
  };
  permissions: {
    canViewFinancial: boolean;
  };
  metrics: {
    lifetimeValue: number;
    outstandingValue: number;
    totalInvoiceValue: number;
    projectPipelineValue: number;
    activeWarrantyTickets: number;
    totalRevenueValue?: number;
    receivedRevenueValue?: number;
    outstandingRevenueValue?: number;
    invoicePaymentsValue?: number;
  };
}

// ─── Helpers de formatação ───────────────────────────────────────────────────

function formatUSD(value: number | null) {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    timeZone: "America/Chicago",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Componentes de badge de status ──────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  // ServiceOrder
  DRAFT: "bg-muted text-muted-foreground",
  SCHEDULED: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  IN_PROGRESS: "bg-brand-secondary/10 text-brand-secondary",
  COMPLETED: "bg-green-500/10 text-green-600 dark:text-green-400",
  CANCELLED: "bg-destructive/10 text-destructive",
  // Proposta
  RASCUNHO: "bg-muted text-muted-foreground",
  ENVIADA: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  APROVADA: "bg-green-500/10 text-green-600 dark:text-green-400",
  RECUSADA: "bg-destructive/10 text-destructive",
  EXPIRADA: "bg-muted text-muted-foreground",
  // Projeto
  planejado: "bg-muted text-muted-foreground",
  em_andamento: "bg-brand-secondary/10 text-brand-secondary",
  concluido: "bg-green-500/10 text-green-600 dark:text-green-400",
  pausado: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  cancelado: "bg-destructive/10 text-destructive",
  // Invoice
  PAID: "bg-green-500/10 text-green-600 dark:text-green-400",
  PENDING: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  OVERDUE: "bg-destructive/10 text-destructive",
  VOID: "bg-muted text-muted-foreground",
  // Warranty
  REPORTED: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  EVALUATING: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  APPROVED: "bg-brand-primary/10 text-brand-primary",
  IN_REPAIR: "bg-brand-secondary/10 text-brand-secondary",
  RESOLVED: "bg-green-500/10 text-green-600 dark:text-green-400",
  DENIED: "bg-destructive/10 text-destructive",
};

function StatusBadge({ status }: { status: string }) {
  const classes = STATUS_COLORS[status] ?? "bg-muted text-muted-foreground";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${classes}`}>
      {status}
    </span>
  );
}

// ─── Props do componente principal ───────────────────────────────────────────

interface ClienteHistoricoProps {
  clienteId: number;
}

// ─── Componente principal ────────────────────────────────────────────────────

type AbaTipo = "serviceOrders" | "propostas" | "projetos" | "invoices" | "warrantyTickets" | "financeiro";

export function ClienteHistorico({ clienteId }: ClienteHistoricoProps) {
  const [data, setData] = useState<HistoricoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [abaAtiva, setAbaAtiva] = useState<AbaTipo>("serviceOrders");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetch(`/api/clientes/${clienteId}/historico`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error("Erro ao carregar histórico");
        return res.json();
      })
      .then((json) => {
        if (!controller.signal.aborted) setData(json.data);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (!controller.signal.aborted) setError(err.message ?? "Erro inesperado");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => { controller.abort(); };
  }, [clienteId]);

  const abas: { key: AbaTipo; label: string; icon: React.ReactNode; count: number }[] = [
    {
      key: "serviceOrders",
      label: "Ordens de Serviço",
      icon: <Wrench className="h-4 w-4" />,
      count: data?.totais.serviceOrders ?? 0,
    },
    {
      key: "propostas",
      label: "Propostas",
      icon: <FileText className="h-4 w-4" />,
      count: data?.totais.propostas ?? 0,
    },
    {
      key: "projetos",
      label: "Projetos",
      icon: <FolderOpen className="h-4 w-4" />,
      count: data?.totais.projetos ?? 0,
    },
    {
      key: "invoices",
      label: "Faturas",
      icon: <Receipt className="h-4 w-4" />,
      count: data?.totais.invoices ?? 0,
    },
    {
      key: "warrantyTickets",
      label: "Garantias",
      icon: <ShieldCheck className="h-4 w-4" />,
      count: data?.totais.warrantyTickets ?? 0,
    },
    ...(data?.permissions.canViewFinancial
      ? [{
          key: "financeiro" as const,
          label: "Financeiro",
          icon: <Receipt className="h-4 w-4" />,
          count: (data?.totais.revenues ?? 0) + (data?.totais.invoicePayments ?? 0),
        }]
      : []),
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Carregando histórico...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-destructive/5 border border-destructive/20 p-4 text-destructive">
        <AlertCircle className="h-5 w-5 shrink-0" />
        <span className="text-sm">{error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="LTV Recebido" value={formatUSD(data?.metrics.lifetimeValue ?? 0)} />
        <MetricCard label="Aberto em Invoices" value={formatUSD(data?.metrics.outstandingValue ?? 0)} />
        <MetricCard label="Faturamento Total" value={formatUSD(data?.metrics.totalInvoiceValue ?? 0)} />
        <MetricCard label="Pipeline de Projetos" value={formatUSD(data?.metrics.projectPipelineValue ?? 0)} />
        <MetricCard label="Garantias Ativas" value={String(data?.metrics.activeWarrantyTickets ?? 0)} />
      </div>

      {data?.permissions.canViewFinancial ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Receitas Lançadas" value={formatUSD(data?.metrics.totalRevenueValue ?? 0)} />
          <MetricCard label="Receitas Recebidas" value={formatUSD(data?.metrics.receivedRevenueValue ?? 0)} />
          <MetricCard label="Receitas em Aberto" value={formatUSD(data?.metrics.outstandingRevenueValue ?? 0)} />
          <MetricCard label="Pagamentos em Invoice" value={formatUSD(data?.metrics.invoicePaymentsValue ?? 0)} />
        </div>
      ) : null}

      {/* Abas de navegação */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        {abas.map((aba) => (
          <button
            key={aba.key}
            onClick={() => setAbaAtiva(aba.key)}
            className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium transition-colors ${
              abaAtiva === aba.key
                ? "bg-brand-primary text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {aba.icon}
            {aba.label}
            <span className={`rounded-full px-1.5 py-0.5 text-xs ${
              abaAtiva === aba.key ? "bg-white/20 text-white" : "bg-background text-muted-foreground"
            }`}>
              {aba.count}
            </span>
          </button>
        ))}
      </div>

      {/* Conteúdo da aba ativa */}
      {abaAtiva === "serviceOrders" && (
        <ServiceOrdersTab items={data?.serviceOrders ?? []} />
      )}
      {abaAtiva === "propostas" && (
        <PropostasTab items={data?.propostas ?? []} />
      )}
      {abaAtiva === "projetos" && (
        <ProjetosTab items={data?.projetos ?? []} />
      )}
      {abaAtiva === "invoices" && (
        <InvoicesTab items={data?.invoices ?? []} />
      )}
      {abaAtiva === "warrantyTickets" && (
        <WarrantyTicketsTab items={data?.warrantyTickets ?? []} />
      )}
      {abaAtiva === "financeiro" && data?.permissions.canViewFinancial && (
        <FinanceiroTab revenues={data?.revenues ?? []} payments={data?.invoicePayments ?? []} />
      )}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 font-title text-xl text-foreground">{value}</p>
    </div>
  );
}

// ─── Aba: Ordens de Serviço ────────────────────────────────────────────────

function ServiceOrdersTab({ items }: { items: ServiceOrderItem[] }) {
  if (!items.length) return <EmptyTabState label="nenhuma OS vinculada" />;
  return (
    <div className="space-y-2">
      {items.map((os) => (
        <div key={os.id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 hover:border-brand-primary/30 transition-colors">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">{os.ticketNumber}</span>
              <StatusBadge status={os.status} />
            </div>
            <p className="font-medium text-foreground truncate">{os.title}</p>
            <p className="text-xs text-muted-foreground">
              {os.scheduledDate ? `Agendada: ${formatDate(os.scheduledDate)}` : `Criada: ${formatDate(os.criadoEm)}`}
            </p>
          </div>
          <div className="flex items-center gap-3 ml-4 shrink-0">
            <span className="text-sm font-semibold text-foreground">{formatUSD(os.total)}</span>
            <Link
              href={`/ordens-servico/${os.id}`}
              className="flex items-center gap-1 rounded-xl bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-brand-primary/10 hover:text-brand-primary transition-colors"
            >
              Ver <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Aba: Propostas ────────────────────────────────────────────────────────

function PropostasTab({ items }: { items: PropostaItem[] }) {
  if (!items.length) return <EmptyTabState label="nenhuma proposta vinculada" />;
  return (
    <div className="space-y-2">
      {items.map((p) => (
        <div key={p.id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 hover:border-brand-primary/30 transition-colors">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">{p.numeroProposta}</span>
              <StatusBadge status={p.status} />
            </div>
            <p className="font-medium text-foreground truncate">{p.tipoServico}</p>
            <p className="text-xs text-muted-foreground">Criada: {formatDate(p.criadoEm)}</p>
          </div>
          <div className="flex items-center gap-3 ml-4 shrink-0">
            <span className="text-sm font-semibold text-foreground">
              {p.valorEstimado ? formatUSD(p.valorEstimado) : "—"}
            </span>
            <Link
              href={`/propostas/${p.id}`}
              className="flex items-center gap-1 rounded-xl bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-brand-primary/10 hover:text-brand-primary transition-colors"
            >
              Ver <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Aba: Projetos ─────────────────────────────────────────────────────────

function ProjetosTab({ items }: { items: ProjetoItem[] }) {
  if (!items.length) return <EmptyTabState label="nenhum projeto vinculado" />;
  return (
    <div className="space-y-2">
      {items.map((proj) => (
        <div key={proj.id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 hover:border-brand-primary/30 transition-colors">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <StatusBadge status={proj.status} />
            </div>
            <p className="font-medium text-foreground truncate">{proj.titulo}</p>
            <p className="text-xs text-muted-foreground">Criado: {formatDate(proj.criadoEm)}</p>
          </div>
          <div className="flex items-center gap-3 ml-4 shrink-0">
            <span className="text-sm font-semibold text-foreground">
              {proj.valorEstimado ? formatUSD(proj.valorEstimado) : "—"}
            </span>
            <Link
              href={`/projetos/${proj.id}`}
              className="flex items-center gap-1 rounded-xl bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-brand-primary/10 hover:text-brand-primary transition-colors"
            >
              Ver <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Aba: Faturas ──────────────────────────────────────────────────────────

function InvoicesTab({ items }: { items: InvoiceItem[] }) {
  if (!items.length) return <EmptyTabState label="nenhuma fatura vinculada" />;
  return (
    <div className="space-y-2">
      {items.map((inv) => (
        <div key={inv.id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 hover:border-brand-primary/30 transition-colors">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">{inv.numeroInvoice}</span>
              <StatusBadge status={inv.status} />
            </div>
            <p className="text-xs text-muted-foreground">
              Emitida: {formatDate(inv.dataEmissao)} · Vence: {formatDate(inv.dataVencimento)}
              {inv.dataPagamento ? ` · Pago: ${formatDate(inv.dataPagamento)}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-3 ml-4 shrink-0">
            <span className="text-sm font-semibold text-foreground">{formatUSD(inv.valorTotal)}</span>
            <Link
              href={`/invoices/${inv.id}`}
              className="flex items-center gap-1 rounded-xl bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-brand-primary/10 hover:text-brand-primary transition-colors"
            >
              Ver <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}

function WarrantyTicketsTab({ items }: { items: WarrantyTicketItem[] }) {
  if (!items.length) return <EmptyTabState label="nenhuma garantia vinculada" />;
  return (
    <div className="space-y-2">
      {items.map((ticket) => (
        <div key={ticket.id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 hover:border-brand-primary/30 transition-colors">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">WT-{ticket.id}</span>
              <StatusBadge status={ticket.status} />
              {ticket.coveredByWarranty === true ? (
                <span className="inline-flex items-center rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600 dark:text-green-400">
                  Coberta
                </span>
              ) : null}
            </div>
            <p className="font-medium text-foreground truncate">{ticket.title}</p>
            <p className="text-xs text-muted-foreground">
              Reportada: {formatDate(ticket.reportedAt)}
              {ticket.warrantyExpiresAt ? ` · Expira: ${formatDate(ticket.warrantyExpiresAt)}` : ""}
              {ticket.resolvedAt ? ` · Resolvida: ${formatDate(ticket.resolvedAt)}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-3 ml-4 shrink-0">
            <span className="text-sm font-semibold text-foreground">{formatUSD(ticket.costToRepair)}</span>
            {ticket.serviceOrderCreatedId ? (
              <Link
                href={`/ordens-servico/${ticket.serviceOrderCreatedId}`}
                className="flex items-center gap-1 rounded-xl bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-brand-primary/10 hover:text-brand-primary transition-colors"
              >
                Ver OS <ExternalLink className="h-3 w-3" />
              </Link>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function FinanceiroTab({ revenues, payments }: { revenues: RevenueItem[]; payments: InvoicePaymentItem[] }) {
  if (!revenues.length && !payments.length) return <EmptyTabState label="nenhum lançamento financeiro vinculado" />;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h5 className="text-sm font-semibold text-foreground">Receitas</h5>
        {revenues.length ? revenues.map((revenue) => (
          <div key={`revenue-${revenue.id}`} className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 hover:border-brand-primary/30 transition-colors">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">REV-{revenue.id}</span>
                <StatusBadge status={revenue.status} />
              </div>
              <p className="font-medium text-foreground truncate">{revenue.descricao}</p>
              <p className="text-xs text-muted-foreground">
                {revenue.categoria} · {revenue.tipo} · Emissão: {formatDate(revenue.dataEmissao)} · Vence: {formatDate(revenue.dataVencimento)}
                {revenue.dataPagamento ? ` · Recebida: ${formatDate(revenue.dataPagamento)}` : ""}
              </p>
            </div>
            <span className="ml-4 shrink-0 text-sm font-semibold text-foreground">{formatUSD(revenue.valor)}</span>
          </div>
        )) : <EmptyTabState label="nenhuma receita vinculada" />}
      </div>

      <div className="space-y-2">
        <h5 className="text-sm font-semibold text-foreground">Pagamentos de Invoices</h5>
        {payments.length ? payments.map((payment) => (
          <div key={`payment-${payment.id}`} className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 hover:border-brand-primary/30 transition-colors">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">{payment.invoiceNumber}</span>
                <StatusBadge status="PAID" />
              </div>
              <p className="font-medium text-foreground truncate">
                Pagamento recebido em {formatDate(payment.dataPagamento)}
              </p>
              <p className="text-xs text-muted-foreground">
                Método: {payment.metodoPagamento}
                {payment.referencia ? ` · Ref: ${payment.referencia}` : ""}
              </p>
            </div>
            <Link
              href={`/invoices/${payment.invoiceId}`}
              className="ml-4 flex items-center gap-3 shrink-0 rounded-xl bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-brand-primary/10 hover:text-brand-primary transition-colors"
            >
              <span className="text-sm font-semibold text-foreground">{formatUSD(payment.valor)}</span>
              Ver <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        )) : <EmptyTabState label="nenhum pagamento de invoice vinculado" />}
      </div>
    </div>
  );
}

// ─── Empty state reutilizável ────────────────────────────────────────────────

function EmptyTabState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <FileText className="h-6 w-6" />
      </div>
      <p className="text-sm">Ainda {label}.</p>
    </div>
  );
}
