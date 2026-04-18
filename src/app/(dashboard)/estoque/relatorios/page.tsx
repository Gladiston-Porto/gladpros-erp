/**
 * Relatórios de Estoque — dados reais do banco
 */
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireServerUser } from "@/shared/lib/requireServerUser";
import { can, type Role } from "@/shared/lib/rbac-core";
import { redirect } from "next/navigation";
import { ModulePageHeader } from "@gladpros/ui/module-page-header";
import { Button } from "@gladpros/ui/button";
import { Card, CardContent, CardHeader } from "@gladpros/ui/card";
import { Badge } from "@gladpros/ui/badge";
import { ArrowLeft, Package, AlertTriangle, XCircle, DollarSign, TrendingUp } from "lucide-react";

export default async function RelatoriosEstoquePage() {
  const user = await requireServerUser();
  if (!can(user.role as Role, "estoque", "read")) {
    redirect("/403");
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalMateriais,
    novosEsteMes,
    baixoEstoqueResult,
    semEstoqueResult,
    valorTotalResult,
    topBaixoEstoque,
  ] = await Promise.all([
    prisma.material.count(),
    prisma.material.count({ where: { criadoEm: { gte: startOfMonth } } }),
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count
      FROM materiais m
      LEFT JOIN materiais_saldo ms ON ms.material_id = m.id
      WHERE ms.quantidade <= m.estoque_minimo
    `,
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count
      FROM materiais m
      WHERE NOT EXISTS (
        SELECT 1 FROM materiais_saldo ms
        WHERE ms.material_id = m.id AND ms.quantidade > 0
      )
    `,
    prisma.$queryRaw<{ total: number | null }[]>`
      SELECT SUM(ms.quantidade * m.ultimo_custo) as total
      FROM materiais_saldo ms
      JOIN materiais m ON m.id = ms.material_id
      WHERE m.ultimo_custo IS NOT NULL
    `,
    prisma.$queryRaw<{ id: number; nome: string; codigo: string; saldo_total: number; estoque_minimo: number }[]>`
      SELECT m.id, m.nome, m.codigo,
             COALESCE(SUM(ms.quantidade), 0) as saldo_total,
             m.estoque_minimo
      FROM materiais m
      LEFT JOIN materiais_saldo ms ON ms.material_id = m.id
      GROUP BY m.id, m.nome, m.codigo, m.estoque_minimo
      HAVING saldo_total <= m.estoque_minimo
      ORDER BY saldo_total ASC
      LIMIT 10
    `,
  ]);

  const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

  const baixoEstoque = Number(baixoEstoqueResult[0]?.count ?? 0n);
  const semEstoque = Number(semEstoqueResult[0]?.count ?? 0n);
  const valorTotal = Number(valorTotalResult[0]?.total ?? 0);

  return (
    <div className="space-y-6">
      <ModulePageHeader
        title="Relatórios de Estoque"
        description="Análise de materiais, saldos e alertas de reposição"
        icon={<Package />}
        accentColor="#7c3aed"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Estoque", href: "/estoque" },
          { label: "Relatórios" },
        ]}
        actions={
          <Button variant="outline" size="default" asChild>
            <Link href="/estoque">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Link>
          </Button>
        }
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="rounded-2xl border border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-brand-primary/10 p-2">
                <Package className="h-5 w-5 text-brand-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Materiais</p>
                <p className="text-xl font-bold text-foreground">{totalMateriais.toLocaleString("en-US")}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-yellow-500/10 p-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Baixo Estoque</p>
                <p className="text-xl font-bold text-foreground">{baixoEstoque.toLocaleString("en-US")}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-destructive/10 p-2">
                <XCircle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Sem Estoque</p>
                <p className="text-xl font-bold text-foreground">{semEstoque.toLocaleString("en-US")}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-green-500/10 p-2">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Valor Estimado</p>
                <p className="text-xl font-bold text-foreground">{usd.format(valorTotal)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela: Top materiais com baixo saldo */}
      <Card className="rounded-2xl border border-border bg-card">
        <CardHeader className="border-b border-border pb-3">
          <h3 className="font-title text-base font-semibold text-foreground">
            Materiais com Saldo Crítico
          </h3>
        </CardHeader>
        <CardContent className="pt-4">
          {topBaixoEstoque.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum material com estoque crítico.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-2 text-xs font-medium text-muted-foreground">Código</th>
                    <th className="pb-2 text-xs font-medium text-muted-foreground">Material</th>
                    <th className="pb-2 text-xs font-medium text-muted-foreground text-right">Saldo Atual</th>
                    <th className="pb-2 text-xs font-medium text-muted-foreground text-right">Mínimo</th>
                    <th className="pb-2 text-xs font-medium text-muted-foreground text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {topBaixoEstoque.map((m) => (
                    <tr key={m.id}>
                      <td className="py-2 text-xs text-muted-foreground font-mono">{m.codigo}</td>
                      <td className="py-2 text-foreground">{m.nome}</td>
                      <td className="py-2 text-right font-medium text-foreground">
                        {Number(m.saldo_total).toFixed(2)}
                      </td>
                      <td className="py-2 text-right text-muted-foreground">
                        {Number(m.estoque_minimo).toFixed(2)}
                      </td>
                      <td className="py-2 text-right">
                        {Number(m.saldo_total) === 0 ? (
                          <Badge variant="destructive">Sem estoque</Badge>
                        ) : (
                          <Badge variant="outline" className="text-yellow-600 border-yellow-500">
                            Baixo
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Novos este mês */}
      {novosEsteMes > 0 && (
        <Card className="rounded-2xl border border-border bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-xl bg-brand-primary/10 p-2">
              <TrendingUp className="h-5 w-5 text-brand-primary" />
            </div>
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{novosEsteMes}</span> novos materiais cadastrados este mês
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
