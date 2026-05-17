import { redirect } from "next/navigation";
import Link from "next/link";
import { requireServerUser } from "@/shared/lib/requireServerUser";
import { can, type Role } from "@/shared/lib/rbac-core";
import { prisma } from "@/lib/prisma";
import { type StatusDespesa } from "@prisma/client";
import { Suspense } from "react";
import { ModulePageHeader } from "@gladpros/ui/module-page-header";
import { Badge } from "@gladpros/ui/badge";
import { StatCard } from "@gladpros/ui/stat-card";
import { CreditCard, AlertCircle, Clock } from "lucide-react";
import { ServerPagination } from "@/components/financeiro/shared/ServerPagination";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

const statusLabel: Record<string, string> = {
  PENDENTE: "Pendente",
  AGUARDANDO_APROVACAO: "Aguard. Aprovação",
  APROVADA: "Aprovada",
  PAGA: "Paga",
  REJEITADA: "Rejeitada",
  CANCELADA: "Cancelada",
};

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PENDENTE: "secondary",
  AGUARDANDO_APROVACAO: "secondary",
  APROVADA: "default",
  PAGA: "default",
  REJEITADA: "destructive",
  CANCELADA: "outline",
};

async function PayablesContent({ empresaId, page }: { empresaId: number; page: number }) {
  const now = new Date();
  const listStatuses: StatusDespesa[] = ["PENDENTE", "AGUARDANDO_APROVACAO", "APROVADA"];

  const [vencidas, aVencer7d, pendentes, total, expenses] = await Promise.all([
    prisma.expense.aggregate({
      where: {
        empresaId,
        status: { in: ["PENDENTE", "AGUARDANDO_APROVACAO", "APROVADA"] },
        dataVencimento: { lt: now },
      },
      _sum: { valor: true },
      _count: true,
    }),
    prisma.expense.aggregate({
      where: {
        empresaId,
        status: { in: ["PENDENTE", "AGUARDANDO_APROVACAO", "APROVADA"] },
        dataVencimento: {
          gte: now,
          lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        },
      },
      _sum: { valor: true },
      _count: true,
    }),
    prisma.expense.aggregate({
      where: {
        empresaId,
        status: { in: ["PENDENTE", "AGUARDANDO_APROVACAO", "APROVADA"] },
      },
      _sum: { valor: true },
      _count: true,
    }),
    prisma.expense.count({ where: { empresaId, status: { in: listStatuses } } }),
    prisma.expense.findMany({
      where: { empresaId, status: { in: listStatuses } },
      select: {
        id: true,
        descricao: true,
        valor: true,
        status: true,
        dataVencimento: true,
        categoria: { select: { nome: true } },
        projeto: { select: { id: true, titulo: true } },
      },
      orderBy: { dataVencimento: "asc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
  ]);

  const fmt = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Total a pagar"
          value={fmt(Number(pendentes._sum.valor ?? 0))}
          icon={<CreditCard className="h-5 w-5" />}
          description={`${pendentes._count} despesas em aberto`}
          variant="default"
        />
        <StatCard
          title="Vencidas (urgente)"
          value={fmt(Number(vencidas._sum.valor ?? 0))}
          icon={<AlertCircle className="h-5 w-5" />}
          description={`${vencidas._count} despesas vencidas`}
          variant={vencidas._count > 0 ? "expense" : "default"}
        />
        <StatCard
          title="Vencendo em 7 dias"
          value={fmt(Number(aVencer7d._sum.valor ?? 0))}
          icon={<Clock className="h-5 w-5" />}
          description={`${aVencer7d._count} despesas próximas`}
          variant={aVencer7d._count > 0 ? "warning" : "default"}
        />
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Contas a Pagar</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Despesas pendentes, aguardando aprovação ou aprovadas</p>
        </div>

        {expenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
            <CreditCard className="h-10 w-10 opacity-30" />
            <p className="text-sm">Nenhuma conta a pagar</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-6 py-3 text-muted-foreground font-medium">Descrição</th>
                  <th className="text-left px-6 py-3 text-muted-foreground font-medium">Categoria</th>
                  <th className="text-left px-6 py-3 text-muted-foreground font-medium">Projeto</th>
                  <th className="text-right px-6 py-3 text-muted-foreground font-medium">Valor</th>
                  <th className="text-left px-6 py-3 text-muted-foreground font-medium">Vencimento</th>
                  <th className="text-left px-6 py-3 text-muted-foreground font-medium">Status</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border" data-testid="payables-table-body">
                {expenses.map((e) => {
                  const isVencida = new Date(e.dataVencimento) < now;
                  return (
                    <tr key={e.id} className="hover:bg-muted/20 transition-colors" data-testid="payable-row">
                      <td className="px-6 py-3 text-foreground font-medium">{e.descricao}</td>
                      <td className="px-6 py-3 text-muted-foreground">{e.categoria?.nome ?? "—"}</td>
                      <td className="px-6 py-3 text-muted-foreground">
                        {e.projeto ? (
                          <Link href={`/projetos/${e.projeto.id}`} className="text-brand-primary hover:underline">
                            {e.projeto.titulo}
                          </Link>
                        ) : "—"}
                      </td>
                      <td className="px-6 py-3 text-right font-mono text-foreground">
                        {fmt(Number(e.valor))}
                      </td>
                      <td className={`px-6 py-3 ${isVencida ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                        {new Date(e.dataVencimento).toLocaleDateString("en-US", { timeZone: "America/Chicago" })}
                        {isVencida && " ⚠"}
                      </td>
                      <td className="px-6 py-3">
                        <Badge variant={statusVariant[e.status]}>
                          {statusLabel[e.status] ?? e.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <Link
                          href={`/financeiro/despesas/${e.id}`}
                          className="text-brand-primary hover:underline text-xs"
                        >
                          Ver
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ServerPagination
        currentPage={page}
        totalPages={Math.ceil(total / PAGE_SIZE)}
        total={total}
        pageSize={PAGE_SIZE}
        basePath="/financeiro/payables"
      />
    </div>
  );
}

export default async function PayablesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await requireServerUser();
  if (!can(user.role as Role, "financeiro", "read")) redirect("/403");

  const empresaId = (user as unknown as { empresaId?: number }).empresaId ?? 1;
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  return (
    <div className="space-y-6">
      <div className="bg-hero-gradient rounded-2xl p-6">
        <ModulePageHeader
          title="Contas a Pagar"
          description="Controle de obrigações financeiras e vencimentos"
          icon={<CreditCard className="h-6 w-6 text-white" />}
          breadcrumbs={[
            { label: "Financeiro", href: "/financeiro" },
            { label: "Contas a Pagar" },
          ]}
          className="text-white"
        />
      </div>

      <Suspense fallback={<div className="animate-pulse h-64 rounded-2xl bg-muted" />}>
        <PayablesContent empresaId={empresaId} page={page} />
      </Suspense>
    </div>
  );
}
