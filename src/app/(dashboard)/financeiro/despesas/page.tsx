import { redirect } from "next/navigation";
import Link from "next/link";
import { requireServerUser } from "@/shared/lib/requireServerUser";
import { can, type Role } from "@/shared/lib/rbac-core";
import { prisma } from "@/lib/prisma";
import { Suspense } from "react";
import { ModulePageHeader } from "@gladpros/ui/module-page-header";
import { Button } from "@gladpros/ui/button";
import { Badge } from "@gladpros/ui/badge";
import { StatCard } from "@gladpros/ui/stat-card";
import { TrendingDown, Plus, AlertCircle, Clock, CheckCircle } from "lucide-react";
import { ServerPagination } from "@/components/financeiro/shared/ServerPagination";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

const statusLabel: Record<string, string> = {
  PENDENTE: "Pendente",
  AGUARDANDO_APROVACAO: "Aguard. Aprovação",
  APROVADA: "Aprovada",
  REJEITADA: "Rejeitada",
  PAGA: "Paga",
  CANCELADA: "Cancelada",
};

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PENDENTE: "secondary",
  AGUARDANDO_APROVACAO: "secondary",
  APROVADA: "default",
  REJEITADA: "destructive",
  PAGA: "default",
  CANCELADA: "outline",
};

async function DespesasContent({ empresaId, page }: { empresaId: number; page: number }) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const listWhere = { empresaId, status: { not: "CANCELADA" as const } };

  const [despesasMes, despesasPendentes, despesasVencidas, total, despesas] = await Promise.all([
    prisma.expense.aggregate({
      where: { empresaId, status: "PAGA", dataVencimento: { gte: startOfMonth, lte: endOfMonth } },
      _sum: { valor: true },
      _count: true,
    }),
    prisma.expense.aggregate({
      where: { empresaId, status: { in: ["PENDENTE", "AGUARDANDO_APROVACAO", "APROVADA"] } },
      _sum: { valor: true },
      _count: true,
    }),
    prisma.expense.aggregate({
      where: {
        empresaId,
        status: { in: ["PENDENTE", "AGUARDANDO_APROVACAO", "APROVADA"] },
        dataVencimento: { lt: now },
      },
      _sum: { valor: true },
      _count: true,
    }),
    prisma.expense.count({ where: listWhere }),
    prisma.expense.findMany({
      where: listWhere,
      select: {
        id: true,
        descricao: true,
        valor: true,
        status: true,
        tipo: true,
        dataVencimento: true,
        dataPagamento: true,
        projetoId: true,
        categoria: { select: { id: true, nome: true } },
        projeto: { select: { id: true, titulo: true } },
      },
      orderBy: { dataVencimento: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
  ]);

  const fmt = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Pago este mês"
          value={fmt(Number(despesasMes._sum.valor ?? 0))}
          icon={<CheckCircle className="h-5 w-5" />}
          description={`${despesasMes._count} despesas`}
          variant="default"
        />
        <StatCard
          title="A pagar (em aberto)"
          value={fmt(Number(despesasPendentes._sum.valor ?? 0))}
          icon={<Clock className="h-5 w-5" />}
          description={`${despesasPendentes._count} despesas`}
          variant="default"
        />
        <StatCard
          title="Vencidas (urgente)"
          value={fmt(Number(despesasVencidas._sum.valor ?? 0))}
          icon={<AlertCircle className="h-5 w-5" />}
          description={`${despesasVencidas._count} despesas`}
          variant={despesasVencidas._count > 0 ? "expense" : "default"}
        />
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Despesas</h2>
          <Link href="/financeiro/despesas/nova">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Nova Despesa
            </Button>
          </Link>
        </div>

        {despesas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
            <TrendingDown className="h-10 w-10 opacity-30" />
            <p className="text-sm">Nenhuma despesa encontrada</p>
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
              <tbody className="divide-y divide-border" data-testid="despesas-table-body">
                {despesas.map((d) => (
                  <tr key={d.id} className="hover:bg-muted/20 transition-colors" data-testid="despesa-row">
                    <td className="px-6 py-3 text-foreground font-medium">{d.descricao}</td>
                    <td className="px-6 py-3 text-muted-foreground">{d.categoria?.nome ?? "—"}</td>
                    <td className="px-6 py-3 text-muted-foreground">
                      {d.projeto ? (
                        <Link
                          href={`/projetos/${d.projeto.id}`}
                          className="text-brand-primary hover:underline"
                        >
                          {d.projeto.titulo}
                        </Link>
                      ) : "—"}
                    </td>
                    <td className="px-6 py-3 text-right font-mono text-foreground">
                      {fmt(Number(d.valor))}
                    </td>
                    <td className="px-6 py-3 text-muted-foreground">
                      {new Date(d.dataVencimento).toLocaleDateString("en-US", { timeZone: "America/Chicago" })}
                    </td>
                    <td className="px-6 py-3">
                      <Badge variant={statusVariant[d.status]}>
                        {statusLabel[d.status] ?? d.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <Link
                        href={`/financeiro/despesas/${d.id}`}
                        className="text-brand-primary hover:underline text-xs"
                      >
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
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
        basePath="/financeiro/despesas"
      />
    </div>
  );
}

export default async function DespesasPage({
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
          title="Despesas"
          description="Gestão de despesas e pagamentos"
          icon={<TrendingDown className="h-6 w-6 text-white" />}
          breadcrumbs={[
            { label: "Financeiro", href: "/financeiro" },
            { label: "Despesas" },
          ]}
          className="text-white"
        />
      </div>

      <Suspense fallback={<div className="animate-pulse h-64 rounded-2xl bg-muted" />}>
        <DespesasContent empresaId={empresaId} page={page} />
      </Suspense>
    </div>
  );
}
