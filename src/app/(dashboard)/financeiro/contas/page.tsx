import { redirect } from "next/navigation";
import Link from "next/link";
import { requireServerUser } from "@/shared/lib/requireServerUser";
import { can, type Role } from "@/shared/lib/rbac-core";
import { prisma } from "@/lib/prisma";
import { Suspense } from "react";
import { ModulePageHeader } from "@gladpros/ui/module-page-header";
import { Button } from "@gladpros/ui/button";
import { Badge } from "@gladpros/ui/badge";
import { Wallet, Plus, Star } from "lucide-react";

export const dynamic = "force-dynamic";

async function ContasContent({ empresaId }: { empresaId: number }) {
  const contas = await prisma.bankAccount.findMany({
    where: { empresaId },
    select: {
      id: true,
      nome: true,
      banco: true,
      agencia: true,
      conta: true,
      tipo: true,
      saldoAtual: true,
      saldoInicial: true,
      principal: true,
      ativo: true,
    },
    orderBy: [{ principal: "desc" }, { ativo: "desc" }, { nome: "asc" }],
  });

  const fmt = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

  const saldoTotal = contas
    .filter((c) => c.ativo)
    .reduce((sum, c) => sum + Number(c.saldoAtual), 0);

  const tipoLabel: Record<string, string> = {
    CORRENTE: "Corrente",
    POUPANCA: "Poupança",
    INVESTIMENTO: "Investimento",
    CARTAO: "Cartão",
    CAIXA: "Caixa",
  };

  return (
    <div className="space-y-6">
      {/* Saldo total */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="text-muted-foreground text-sm mb-1">Saldo total (contas ativas)</p>
        <p
          className={`text-3xl font-bold font-mono ${
            saldoTotal >= 0 ? "text-green-500" : "text-destructive"
          }`}
        >
          {fmt(saldoTotal)}
        </p>
        <p className="text-muted-foreground text-xs mt-1">
          {contas.filter((c) => c.ativo).length} conta(s) ativa(s)
        </p>
      </div>

      {/* Lista */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Contas Bancárias</h2>
          <Link href="/financeiro/contas/nova">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Nova Conta
            </Button>
          </Link>
        </div>

        {contas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
            <Wallet className="h-10 w-10 opacity-30" />
            <p className="text-sm">Nenhuma conta bancária cadastrada</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {contas.map((c) => (
              <div
                key={c.id}
                className={`flex items-center justify-between px-6 py-4 transition-colors hover:bg-muted/20 ${
                  !c.ativo ? "opacity-50" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-brand-primary/10 flex items-center justify-center">
                    <Wallet className="h-5 w-5 text-brand-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{c.nome}</span>
                      {c.principal && (
                        <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                      )}
                      {!c.ativo && (
                        <Badge variant="outline">Inativa</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {c.banco} · Ag. {c.agencia} · CC {c.conta}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <Badge variant="secondary">{tipoLabel[c.tipo] ?? c.tipo}</Badge>
                  </div>
                  <div className="text-right min-w-32">
                    <p
                      className={`font-mono font-semibold text-lg ${
                        Number(c.saldoAtual) >= 0 ? "text-foreground" : "text-destructive"
                      }`}
                    >
                      {fmt(Number(c.saldoAtual))}
                    </p>
                    <p className="text-xs text-muted-foreground">saldo atual</p>
                  </div>
                  <Link
                    href={`/financeiro/contas/${c.id}`}
                    className="text-brand-primary hover:underline text-sm"
                  >
                    Extrato
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default async function ContasPage() {
  const user = await requireServerUser();
  if (!can(user.role as Role, "financeiro", "read")) redirect("/403");

  const empresaId = (user as unknown as { empresaId?: number }).empresaId ?? 1;

  return (
    <div className="space-y-6">
      <div className="bg-hero-gradient rounded-2xl p-6">
        <ModulePageHeader
          title="Contas Bancárias"
          description="Saldos e movimentações por conta"
          icon={<Wallet className="h-6 w-6 text-white" />}
          breadcrumbs={[
            { label: "Financeiro", href: "/financeiro" },
            { label: "Contas" },
          ]}
          className="text-white"
        />
      </div>

      <Suspense fallback={<div className="animate-pulse h-64 rounded-2xl bg-muted" />}>
        <ContasContent empresaId={empresaId} />
      </Suspense>
    </div>
  );
}
