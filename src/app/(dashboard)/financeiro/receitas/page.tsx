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
import { TrendingUp, Plus, AlertCircle, CheckCircle, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

const statusLabel: Record<string, string> = {
  PENDENTE: "Pendente",
  RECEBIDA: "Recebida",
  VENCIDA: "Vencida",
  CANCELADA: "Cancelada",
};

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PENDENTE: "secondary",
  RECEBIDA: "default",
  VENCIDA: "destructive",
  CANCELADA: "outline",
};

async function ReceitasContent({ empresaId }: { empresaId: number }) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const [receitasMes, receitasPendentes, receitasVencidas, receitas] = await Promise.all([
    prisma.revenue.aggregate({
      where: { empresaId, status: "RECEBIDA", dataVencimento: { gte: startOfMonth, lte: endOfMonth } },
      _sum: { valor: true },
      _count: true,
    }),
    prisma.revenue.aggregate({
      where: { empresaId, status: "PENDENTE" },
      _sum: { valor: true },
      _count: true,
    }),
    prisma.revenue.aggregate({
      where: { empresaId, status: "VENCIDA" },
      _sum: { valor: true },
      _count: true,
    }),
    prisma.revenue.findMany({
      where: { empresaId, status: { not: "CANCELADA" } },
      select: {
        id: true,
        descricao: true,
        valor: true,
        status: true,
        tipo: true,
        dataVencimento: true,
        dataPagamento: true,
        cliente: { select: { id: true, nomeCompleto: true, razaoSocial: true } },
        categoria: { select: { id: true, nome: true } },
      },
      orderBy: { dataVencimento: "desc" },
      take: 50,
    }),
  ]);

  const fmt = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Recebido este mês"
          value={fmt(Number(receitasMes._sum.valor ?? 0))}
          icon={<CheckCircle className="h-5 w-5" />}
          description={`${receitasMes._count} receitas`}
          variant="income"
        />
        <StatCard
          title="A receber (pendente)"
          value={fmt(Number(receitasPendentes._sum.valor ?? 0))}
          icon={<Clock className="h-5 w-5" />}
          description={`${receitasPendentes._count} receitas`}
          variant="default"
        />
        <StatCard
          title="Em atraso"
          value={fmt(Number(receitasVencidas._sum.valor ?? 0))}
          icon={<AlertCircle className="h-5 w-5" />}
          description={`${receitasVencidas._count} receitas`}
          variant={receitasVencidas._count > 0 ? "expense" : "default"}
        />
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Receitas</h2>
          <Link href="/financeiro/receitas/nova">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Nova Receita
            </Button>
          </Link>
        </div>

        {receitas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
            <TrendingUp className="h-10 w-10 opacity-30" />
            <p className="text-sm">Nenhuma receita encontrada</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-6 py-3 text-muted-foreground font-medium">Descrição</th>
                  <th className="text-left px-6 py-3 text-muted-foreground font-medium">Cliente</th>
                  <th className="text-left px-6 py-3 text-muted-foreground font-medium">Categoria</th>
                  <th className="text-right px-6 py-3 text-muted-foreground font-medium">Valor</th>
                  <th className="text-left px-6 py-3 text-muted-foreground font-medium">Vencimento</th>
                  <th className="text-left px-6 py-3 text-muted-foreground font-medium">Status</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {receitas.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-3 text-foreground font-medium">{r.descricao}</td>
                    <td className="px-6 py-3 text-muted-foreground">
                      {r.cliente?.nomeCompleto ?? r.cliente?.razaoSocial ?? "—"}
                    </td>
                    <td className="px-6 py-3 text-muted-foreground">{r.categoria.nome}</td>
                    <td className="px-6 py-3 text-right font-mono text-foreground">
                      {fmt(Number(r.valor))}
                    </td>
                    <td className="px-6 py-3 text-muted-foreground">
                      {new Date(r.dataVencimento).toLocaleDateString("en-US")}
                    </td>
                    <td className="px-6 py-3">
                      <Badge variant={statusVariant[r.status]}>
                        {statusLabel[r.status] ?? r.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <Link
                        href={`/financeiro/receitas/${r.id}`}
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
    </div>
  );
}

export default async function ReceitasPage() {
  const user = await requireServerUser();
  if (!can(user.role as Role, "financeiro", "read")) redirect("/403");

  const empresaId = (user as unknown as { empresaId?: number }).empresaId ?? 1;

  return (
    <div className="space-y-6">
      <div className="bg-hero-gradient rounded-2xl p-6">
        <ModulePageHeader
          title="Receitas"
          description="Gestão de receitas e recebimentos"
          icon={<TrendingUp className="h-6 w-6 text-white" />}
          breadcrumbs={[
            { label: "Financeiro", href: "/financeiro" },
            { label: "Receitas" },
          ]}
          className="text-white"
        />
      </div>

      <Suspense fallback={<div className="animate-pulse h-64 rounded-2xl bg-muted" />}>
        <ReceitasContent empresaId={empresaId} />
      </Suspense>
    </div>
  );
}
