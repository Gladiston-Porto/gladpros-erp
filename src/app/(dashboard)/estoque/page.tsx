/**
 * Dashboard Estoque — GladPros Design System v3.1
 * Estética: "Precision Engineering"
 */

import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Badge } from '@gladpros/ui/badge'
import { Button } from '@gladpros/ui/button'
import { ModulePageHeader } from '@gladpros/ui/module-page-header'
import { StatCard } from '@gladpros/ui/stat-card';
import {
  Package,
  Wrench,
  AlertTriangle,
  ShoppingCart,
  ArrowUpDown,
  Plus,
  ArrowRight,
  CheckCircle,
  Clock,
  AlertCircle,
  PackageX,
  ClipboardList,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────
function formatUSD(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function getStatusGeral(alertas: number, materiaisAbaixo: number) {
  const total = alertas + materiaisAbaixo;
  if (total === 0) return { label: 'Normal', variant: 'success' as const, icon: CheckCircle };
  if (total < 5)   return { label: 'Atenção', variant: 'warning' as const, icon: AlertCircle };
  return              { label: 'Crítico', variant: 'error' as const, icon: AlertTriangle };
}

// Módulos de navegação com identidade visual por sub-área
const NAV_MODULES = [
  {
    href: '/estoque/materiais',
    label: 'Materiais',
    description: 'Insumos, consumíveis e matérias-primas',
    icon: Package,
    // Tailwind classes estáticas — necessário para purge correto
    barClass: 'bg-[#0098DA]',
    iconClass: 'bg-[#0098DA]',
    linkClass: 'text-[#0098DA]',
  },
  {
    href: '/estoque/equipamentos',
    label: 'Equipamentos',
    description: 'Ferramentas, máquinas e ativos da empresa',
    icon: Wrench,
    barClass: 'bg-[#FF8C00]',
    iconClass: 'bg-[#FF8C00]',
    linkClass: 'text-[#FF8C00]',
  },
  {
    href: '/estoque/movimentacoes',
    label: 'Movimentações',
    description: 'Entradas, saídas e transferências de estoque',
    icon: ArrowUpDown,
    barClass: 'bg-emerald-500',
    iconClass: 'bg-emerald-500',
    linkClass: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    href: '/estoque/compras',
    label: 'Compras',
    description: 'Pedidos de compra e recebimento de mercadorias',
    icon: ShoppingCart,
    barClass: 'bg-violet-600',
    iconClass: 'bg-violet-600',
    linkClass: 'text-violet-600 dark:text-violet-400',
  },
  {
    href: '/estoque/solicitacoes-compra',
    label: 'Solicitações',
    description: 'Fluxo de aprovação de compras (SC)',
    icon: ClipboardList,
    barClass: 'bg-[#FF8C00]',
    iconClass: 'bg-[#FF8C00]',
    linkClass: 'text-brand-secondary',
  },
] as const;

// ─── Page ─────────────────────────────────────────────────────────────────
export default async function DashboardEstoquePage() {
  const now = new Date();
  const todayStart = new Date(now.toLocaleString('en-US', { timeZone: 'America/Chicago' }));
  todayStart.setHours(0, 0, 0, 0);

  const [
    totalMateriais,
    totalEquipamentos,
    alertasPendentes,
    movimentacoesHoje,
    materiaisComCusto,
    comprasPendentes,
    materiaisAbaixoMinimo,
    reservadoTotal,
  ] = await Promise.all([
    prisma.material.count(),
    prisma.equipamento.count(),
    prisma.alertaEstoque.count({ where: { ativo: true, dataResolvido: null } }),
    prisma.materialMovimentacao.count({ where: { criadoEm: { gte: todayStart } } }),
    prisma.material.findMany({
      select: {
        custoMedio: true,
        saldos: { select: { quantidade: true } },
      },
    }),
    prisma.compra.count({ where: { status: { in: ['PENDENTE', 'PARCIAL'] } } }),
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count FROM (
        SELECT m.id FROM materiais m
        LEFT JOIN materiais_saldo ms ON ms.material_id = m.id
        WHERE m.ativo = 1
        GROUP BY m.id, m.estoque_minimo
        HAVING COALESCE(SUM(ms.quantidade), 0) < m.estoque_minimo AND m.estoque_minimo > 0
      ) as subq
    `.then(r => Number(r[0]?.count || 0)).catch(() => 0),
    prisma.materialSaldo
      .aggregate({ _sum: { reservado: true } })
      .then(r => Number(r._sum.reservado || 0)),
  ]);

  const materiaisComSaldo = materiaisComCusto.filter(mat =>
    mat.saldos.reduce((s, saldo) => s + Number(saldo.quantidade), 0) > 0
  ).length;

  const valorEstoque = materiaisComCusto.reduce((acc, mat) => {
    const qtd = mat.saldos.reduce((s, saldo) => s + Number(saldo.quantidade), 0);
    return acc + qtd * Number(mat.custoMedio || 0);
  }, 0);

  const status = getStatusGeral(alertasPendentes, materiaisAbaixoMinimo);
  const StatusIcon = status.icon;

  return (
    <div className="space-y-6">

      {/* ── Header do módulo ─────────────────────────────────────────── */}
      <ModulePageHeader
        title="Estoque"
        description="Materiais, equipamentos, movimentações e compras"
        icon={<Package />}
        accentColor="#0098DA"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Estoque' },
        ]}
        badges={
          <Badge variant={status.variant} className="text-xs">
            <StatusIcon className="size-3 mr-1" />
            {status.label}
          </Badge>
        }
        actions={
          <div className="flex gap-2">
            <Link href="/estoque/relatorios">
              <Button variant="outline" size="sm">
                Relatórios
              </Button>
            </Link>
            <Link href="/estoque/compras/nova">
              <Button size="sm">
                <Plus className="size-4" />
                Nova Compra
              </Button>
            </Link>
          </div>
        }
      />

      {/* ── KPIs operacionais ────────────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Valor em Estoque"
          value={formatUSD(valorEstoque)}
          description={`${materiaisComSaldo} mat. com saldo`}
          icon={<Package />}
          variant="default"
        />
        <StatCard
          title="Compras Pendentes"
          value={comprasPendentes}
          description="Aguardando recebimento"
          icon={<Clock />}
          variant={comprasPendentes > 0 ? 'warning' : 'muted'}
        />
        <StatCard
          title="Abaixo do Mínimo"
          value={materiaisAbaixoMinimo}
          description="Materiais críticos"
          icon={<PackageX />}
          variant={materiaisAbaixoMinimo > 0 ? 'expense' : 'muted'}
        />
        <StatCard
          title="Movimentações Hoje"
          value={movimentacoesHoje}
          description={`${reservadoTotal.toLocaleString('en-US')} unid. reservadas`}
          icon={<ArrowUpDown />}
          variant="income"
        />
      </div>

      {/* ── Navegação por sub-módulo ─────────────────────────────────── */}
      <div>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Módulos
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {NAV_MODULES.map((mod) => {
            const Icon = mod.icon;
            return (
              <Link key={mod.href} href={mod.href} className="group">
                <div className="relative overflow-hidden rounded-xl border border-border bg-card p-4 shadow-card transition-all duration-200 hover:shadow-card-hover hover:border-border/80">
                  {/* Accent top — classe estática por módulo */}
                  <div className={`absolute inset-x-0 top-0 h-[3px] ${mod.barClass}`} aria-hidden />
                  <div className="mt-1 flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-foreground text-sm">{mod.label}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground leading-snug">
                        {mod.description}
                      </p>
                    </div>
                    <div className={`grid shrink-0 size-8 place-content-center rounded-lg text-white [&_svg]:size-4 ${mod.iconClass}`}>
                      <Icon />
                    </div>
                  </div>
                  <div className={`mt-3 flex items-center gap-1 text-xs font-medium ${mod.linkClass}`}>
                    Acessar
                    <ArrowRight className="size-3 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Ações rápidas ────────────────────────────────────────────── */}
      <div>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Ações Rápidas
        </p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { href: '/estoque/materiais/novo',           label: 'Novo Material',       icon: Plus,          color: '#0098DA' },
            { href: '/estoque/equipamentos/novo',         label: 'Novo Equipamento',    icon: Plus,          color: '#FF8C00' },
            { href: '/estoque/movimentacoes/nova',        label: 'Nova Movimentação',   icon: ArrowUpDown,   color: '#10B981' },
            { href: '/estoque/compras/nova',              label: 'Nova Compra',         icon: ShoppingCart,  color: '#7C3AED' },
            { href: '/estoque/solicitacoes-compra/nova',  label: 'Nova Solicitação SC', icon: ClipboardList, color: '#FF8C00' },
          ].map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.href} href={action.href}>
                <Button
                  variant="outline"
                  className="w-full h-10 justify-start gap-2 text-sm font-medium"
                >
                  <Icon className="size-4" style={{ color: action.color }} />
                  {action.label}
                </Button>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Alertas ativos ───────────────────────────────────────────── */}
      {alertasPendentes > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/40 dark:bg-amber-950/20">
          <AlertTriangle className="size-4 flex-shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              {alertasPendentes} alerta{alertasPendentes > 1 ? 's' : ''} pendente{alertasPendentes > 1 ? 's' : ''}
            </p>
            <p className="text-xs text-amber-800/80 dark:text-amber-300/70 mt-0.5">
              Verifique os materiais abaixo do estoque mínimo e equipamentos com manutenção pendente.
            </p>
          </div>
          <Link href="/estoque/alertas">
            <Button variant="outline" size="sm" className="flex-shrink-0 border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300">
              Ver alertas
              <ArrowRight className="size-3" />
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
