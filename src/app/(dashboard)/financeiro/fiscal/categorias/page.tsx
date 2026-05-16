import { redirect } from "next/navigation";
import Link from "next/link";
import { requireServerUser } from "@/shared/lib/requireServerUser";
import { can, type Role } from "@/shared/lib/rbac-core";
import { prisma } from "@/lib/prisma";
import { Suspense } from "react";
import { ModulePageHeader } from "@gladpros/ui/module-page-header";
import { Button } from "@gladpros/ui/button";
import { Tag, Plus } from "lucide-react";

export const dynamic = "force-dynamic";

async function CategoriasContent({ empresaId }: { empresaId: number }) {
  const [categoriasDespesa, categoriasReceita] = await Promise.all([
    prisma.expenseCategory.findMany({
      where: { empresaId },
      select: {
        id: true,
        nome: true,
        scheduleCLine: true,
        ativo: true,
        _count: { select: { despesas: true } },
      },
      orderBy: [{ scheduleCLine: "asc" }, { nome: "asc" }],
    }),
    prisma.revenueCategory.findMany({
      where: { empresaId },
      select: {
        id: true,
        nome: true,
        ativo: true,
        _count: { select: { receitas: true } },
      },
      orderBy: { nome: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      {/* Expense categories */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="font-semibold text-foreground">Categorias de Despesa</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Mapeadas para Schedule C (IRS)</p>
          </div>
          <Link href="/financeiro/fiscal/categorias/nova-despesa">
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-1" />
              Nova
            </Button>
          </Link>
        </div>

        {categoriasDespesa.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
            <Tag className="h-8 w-8 opacity-30" />
            <p className="text-sm">Nenhuma categoria de despesa</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-6 py-3 text-muted-foreground font-medium">Nome</th>
                  <th className="text-left px-6 py-3 text-muted-foreground font-medium">Schedule C Line</th>
                  <th className="text-right px-6 py-3 text-muted-foreground font-medium">Despesas</th>
                  <th className="text-left px-6 py-3 text-muted-foreground font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {categoriasDespesa.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-3 text-foreground font-medium">{c.nome}</td>
                    <td className="px-6 py-3 text-muted-foreground font-mono text-xs">
                      {c.scheduleCLine ?? "—"}
                    </td>
                    <td className="px-6 py-3 text-right text-muted-foreground">{c._count.despesas}</td>
                    <td className="px-6 py-3">
                      <span className={`text-xs ${c.ativo ? "text-green-500" : "text-muted-foreground"}`}>
                        {c.ativo ? "Ativa" : "Inativa"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Revenue categories */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="font-semibold text-foreground">Categorias de Receita</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Classificação das entradas</p>
          </div>
          <Link href="/financeiro/fiscal/categorias/nova-receita">
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-1" />
              Nova
            </Button>
          </Link>
        </div>

        {categoriasReceita.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
            <Tag className="h-8 w-8 opacity-30" />
            <p className="text-sm">Nenhuma categoria de receita</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-6 py-3 text-muted-foreground font-medium">Nome</th>
                  <th className="text-right px-6 py-3 text-muted-foreground font-medium">Receitas</th>
                  <th className="text-left px-6 py-3 text-muted-foreground font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {categoriasReceita.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-3 text-foreground font-medium">{c.nome}</td>
                    <td className="px-6 py-3 text-right text-muted-foreground">{c._count.receitas}</td>
                    <td className="px-6 py-3">
                      <span className={`text-xs ${c.ativo ? "text-green-500" : "text-muted-foreground"}`}>
                        {c.ativo ? "Ativa" : "Inativa"}
                      </span>
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

export default async function CategoriasPage() {
  const user = await requireServerUser();
  if (!can(user.role as Role, "financeiro", "read")) redirect("/403");

  const empresaId = (user as unknown as { empresaId?: number }).empresaId ?? 1;

  return (
    <div className="space-y-6">
      <div className="bg-hero-gradient rounded-2xl p-6">
        <ModulePageHeader
          title="Categorias Fiscais"
          description="Categorias de despesa (Schedule C) e receita"
          icon={<Tag className="h-6 w-6 text-white" />}
          breadcrumbs={[
            { label: "Financeiro", href: "/financeiro" },
            { label: "Fiscal", href: "/financeiro/fiscal" },
            { label: "Categorias" },
          ]}
          className="text-white"
        />
      </div>

      <Suspense fallback={<div className="animate-pulse h-64 rounded-2xl bg-muted" />}>
        <CategoriasContent empresaId={empresaId} />
      </Suspense>
    </div>
  );
}
