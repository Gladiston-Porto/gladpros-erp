import { redirect } from "next/navigation";
import Link from "next/link";
import { requireServerUser } from "@/shared/lib/requireServerUser";
import { can, type Role } from "@/shared/lib/rbac-core";
import { prisma } from "@/lib/prisma";
import { Suspense } from "react";
import { ModulePageHeader } from "@gladpros/ui/module-page-header";
import { Button } from "@gladpros/ui/button";
import { Badge } from "@gladpros/ui/badge";
import { ArrowRightLeft, Plus } from "lucide-react";
import { ServerPagination } from "@/components/financeiro/shared/ServerPagination";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

const statusLabel: Record<string, string> = {
  PENDENTE: "Agendada",
  EXECUTADA: "Executada",
  CANCELADA: "Cancelada",
  FALHOU: "Falhou",
};

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PENDENTE: "secondary",
  EXECUTADA: "default",
  CANCELADA: "outline",
  FALHOU: "destructive",
};

async function TransferenciasContent({ empresaId, page }: { empresaId: number; page: number }) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalMesCount, totalMesSoma, total, transferencias] = await Promise.all([
    prisma.bankTransfer.count({
      where: { empresaId, status: "CONCLUIDA", dataAgendamento: { gte: startOfMonth } },
    }),
    prisma.bankTransfer.aggregate({
      where: { empresaId, status: "CONCLUIDA", dataAgendamento: { gte: startOfMonth } },
      _sum: { valor: true },
    }),
    prisma.bankTransfer.count({ where: { empresaId } }),
    prisma.bankTransfer.findMany({
      where: { empresaId },
      select: {
        id: true,
        valor: true,
        descricao: true,
        status: true,
        dataAgendamento: true,
        dataExecucao: true,
        fromAccount: { select: { id: true, nome: true, banco: true } },
        toAccount: { select: { id: true, nome: true, banco: true } },
      },
      orderBy: { dataAgendamento: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
  ]);

  const fmt = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="rounded-2xl border border-border bg-card p-6 flex items-center gap-6">
        <ArrowRightLeft className="h-8 w-8 text-brand-primary" />
        <div>
          <p className="text-muted-foreground text-sm">Transferências este mês</p>
          <p className="text-2xl font-bold font-mono text-foreground">
            {fmt(Number(totalMesSoma._sum?.valor ?? 0))}
          </p>
          <p className="text-xs text-muted-foreground">{totalMesCount} transferências executadas</p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Transferências</h2>
          <Link href="/financeiro/transferencias/nova">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Nova Transferência
            </Button>
          </Link>
        </div>

        {transferencias.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
            <ArrowRightLeft className="h-10 w-10 opacity-30" />
            <p className="text-sm">Nenhuma transferência encontrada</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-6 py-3 text-muted-foreground font-medium">Descrição</th>
                  <th className="text-left px-6 py-3 text-muted-foreground font-medium">De</th>
                  <th className="text-left px-6 py-3 text-muted-foreground font-medium">Para</th>
                  <th className="text-right px-6 py-3 text-muted-foreground font-medium">Valor</th>
                  <th className="text-left px-6 py-3 text-muted-foreground font-medium">Data</th>
                  <th className="text-left px-6 py-3 text-muted-foreground font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border" data-testid="transferencias-table-body">
                {transferencias.map((t) => (
                  <tr key={t.id} className="hover:bg-muted/20 transition-colors" data-testid="transferencia-row">
                    <td className="px-6 py-3 text-foreground font-medium">{t.descricao}</td>
                    <td className="px-6 py-3 text-muted-foreground">
                      {t.fromAccount.nome}
                      <span className="text-xs ml-1 opacity-60">({t.fromAccount.banco})</span>
                    </td>
                    <td className="px-6 py-3 text-muted-foreground">
                      {t.toAccount.nome}
                      <span className="text-xs ml-1 opacity-60">({t.toAccount.banco})</span>
                    </td>
                    <td className="px-6 py-3 text-right font-mono text-foreground">
                      {fmt(Number(t.valor))}
                    </td>
                    <td className="px-6 py-3 text-muted-foreground">
                      {new Date(t.dataAgendamento).toLocaleDateString("en-US", { timeZone: "America/Chicago" })}
                    </td>
                    <td className="px-6 py-3">
                      <Badge variant={statusVariant[t.status]}>
                        {statusLabel[t.status] ?? t.status}
                      </Badge>
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
        basePath="/financeiro/transferencias"
      />
    </div>
  );
}

export default async function TransferenciasPage({
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
          title="Transferências"
          description="Movimentações entre contas bancárias"
          icon={<ArrowRightLeft className="h-6 w-6 text-white" />}
          breadcrumbs={[
            { label: "Financeiro", href: "/financeiro" },
            { label: "Transferências" },
          ]}
          className="text-white"
        />
      </div>

      <Suspense fallback={<div className="animate-pulse h-64 rounded-2xl bg-muted" />}>
        <TransferenciasContent empresaId={empresaId} page={page} />
      </Suspense>
    </div>
  );
}
