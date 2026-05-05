/**
 * Página de Listagem de Materiais
 * /estoque/materiais
 * Design System v2.0 - Com Hero/KPIs Operacionais
 * 
 * MELHORIAS P0:
 * - Hero com KPIs: Total, Abaixo Mínimo, Zerados, Reservado
 * - RBAC: Valor em estoque só para Admin/Financeiro
 * - Ações rápidas: Ver Abaixo Mínimo, Ver Reservados, Nova Compra
 */

import { Suspense } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Plus, Package, AlertTriangle, ShoppingCart,
  PackageX, Clock, Lock, CheckCircle
} from 'lucide-react';
import { Badge } from '@gladpros/ui/badge'
import { Button } from '@gladpros/ui/button'
import { ModulePageHeader } from '@gladpros/ui/module-page-header'
import { StatCard } from '@gladpros/ui/stat-card';
import { MaterialList } from '@/components/estoque/materiais/MaterialList';
import { MaterialFilters } from '@/components/estoque/materiais/MaterialFilters';
import { SearchBar } from '@/components/estoque/shared/SearchBar';
import { LoadingSkeleton } from '@gladpros/ui/loading'
import { prisma } from '@/lib/prisma';
import { requireServerUser } from '@/shared/lib/requireServerUser';
import { can, type Role } from '@/shared/lib/rbac-core';

type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

// Helper para formatar moeda USD
function formatUSD(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

export default async function MateriaisPage({ searchParams }: PageProps) {
  const user = await requireServerUser();
  if (!can(user.role as Role, 'estoque', 'read')) redirect('/403');

  // Await searchParams para uso local (simplificado)
  const sp = await searchParams;

  const canSeeValue = ['ADMIN', 'FINANCEIRO'].includes(user.role);

  // Buscar dados em paralelo
  const [
    categorias,
    totalAtivos,
    materiaisAbaixoMinimo,
    zeradosGeral,
    zeradosCriticos,
    reservadoTotal,
    valorEstoque
  ] = await Promise.all([
    // Categorias para filtros
    prisma.categoria.findMany({
      where: { tipo: 'MATERIAL' },
      orderBy: { nome: 'asc' },
      select: { id: true, nome: true },
    }),
    // Total de materiais ativos
    prisma.material.count({ where: { ativo: true } }),
    // Abaixo do mínimo (query otimizada)
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count FROM (
        SELECT m.id
        FROM materiais m
        LEFT JOIN materiais_saldo ms ON ms.material_id = m.id
        WHERE m.ativo = 1 AND m.estoque_minimo > 0
        GROUP BY m.id, m.estoque_minimo
        HAVING COALESCE(SUM(ms.quantidade), 0) < m.estoque_minimo
      ) as subq
    `.then(r => Number(r[0]?.count || 0)).catch(() => 0),
    // Zerados geral (disponível = 0)
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(DISTINCT m.id) as count
      FROM materiais m
      LEFT JOIN materiais_saldo ms ON ms.material_id = m.id
      WHERE m.ativo = 1
      GROUP BY m.id
      HAVING COALESCE(SUM(ms.quantidade), 0) = 0
    `.then(r => Number(r[0]?.count || 0)).catch(() => 0),
    // Zerados críticos (estoqueMinimo > 0 e disponível = 0)
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count FROM (
        SELECT m.id
        FROM materiais m
        LEFT JOIN materiais_saldo ms ON ms.material_id = m.id
        WHERE m.ativo = 1 AND m.estoque_minimo > 0
        GROUP BY m.id
        HAVING COALESCE(SUM(ms.quantidade), 0) = 0
      ) as subq
    `.then(r => Number(r[0]?.count || 0)).catch(() => 0),
    // Total reservado
    prisma.materialSaldo.aggregate({
      _sum: { reservado: true }
    }).then(r => Number(r._sum.reservado || 0)),
    // Valor em estoque (custo médio * quantidade)
    canSeeValue ? prisma.material.findMany({
      where: { ativo: true },
      select: {
        custoMedio: true,
        saldos: { select: { quantidade: true } }
      }
    }).then(mats => mats.reduce((acc, mat) => {
      const qtd = mat.saldos.reduce((s, saldo) => s + Number(saldo.quantidade), 0);
      return acc + (qtd * Number(mat.custoMedio || 0));
    }, 0)) : Promise.resolve(0),
  ]);

  return (
    <div className="space-y-6">
      <ModulePageHeader
        title="Materiais"
        description="Gerencie o estoque de materiais e consumíveis"
        icon={<Package />}
        accentColor="#0098DA"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Estoque', href: '/estoque' },
          { label: 'Materiais' },
        ]}
        badges={
          materiaisAbaixoMinimo > 0 ? (
            <Badge variant="warning">
              <AlertTriangle className="w-3 h-3 mr-1" />
              {materiaisAbaixoMinimo} abaixo do mínimo
            </Badge>
          ) : undefined
        }
        actions={
          <Link href="/estoque/materiais/novo">
            <Button size="default">
              <Plus className="h-4 w-4 mr-2" />
              Novo Material
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Total Ativos" value={totalAtivos} icon={<Package />} variant="default" description="Cadastrados" />
        <StatCard title="Abaixo Mínimo" value={materiaisAbaixoMinimo} icon={<AlertTriangle />} variant={materiaisAbaixoMinimo > 0 ? "warning" : "muted"} description="Precisam reposição" />
        <StatCard title="Zerados" value={zeradosGeral} icon={<PackageX />} variant={zeradosCriticos > 0 ? "expense" : "muted"} description={`${zeradosCriticos} críticos`} />
        <StatCard title="Reservado" value={reservadoTotal} icon={<Clock />} variant="default" description="Em OSs" />
        <StatCard title="Valor Total" value={canSeeValue ? formatUSD(valorEstoque) : 'Restrito'} icon={canSeeValue ? <Package /> : <Lock />} variant={canSeeValue ? "income" : "muted"} description={canSeeValue ? "Custo médio × qtd" : "Admin/Financeiro"} />
      </div>

      {/* Ações Rápidas */}
      <div className="flex flex-wrap gap-3">
        <Link href="/estoque/materiais?status=abaixo_minimo">
          <Button variant="outline" size="default" className="gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            Ver Abaixo do Mínimo
            {materiaisAbaixoMinimo > 0 && (
              <Badge className="ml-1 bg-yellow-500 text-white">{materiaisAbaixoMinimo}</Badge>
            )}
          </Button>
        </Link>
        <Link href="/estoque/materiais?status=reservado">
          <Button variant="outline" size="default" className="gap-2">
            <Clock className="h-4 w-4 text-blue-500" />
            Ver Reservados
          </Button>
        </Link>
        <Link href="/estoque/compras/nova">
          <Button variant="outline" size="default" className="gap-2">
            <ShoppingCart className="h-4 w-4 text-purple-500" />
            Nova Compra
          </Button>
        </Link>
      </div>

      {/* Filtros e Busca */}
      <Suspense fallback={<LoadingSkeleton rows={2} />}>
        <div className="flex flex-col gap-4 sm:flex-row">
          <SearchBar
            placeholder="Buscar por código, nome, fabricante..."
            className="flex-1"
          />
          <MaterialFilters categorias={categorias} />
        </div>
      </Suspense>

      {/* Listagem */}
      <Suspense fallback={<LoadingSkeleton rows={6} />}>
        <MaterialList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
