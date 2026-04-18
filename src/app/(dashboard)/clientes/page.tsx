/**
 * Dashboard Clientes — GladPros Design System v3.1
 */

import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { requireServerUser } from "@/shared/lib/requireServerUser";
import { can, type Role } from "@/shared/lib/rbac-core";
import { Button } from '@gladpros/ui/button'
import { ModulePageHeader } from '@gladpros/ui/module-page-header'
import { StatCard } from '@gladpros/ui/stat-card';
import {
  Users, UserPlus, FileBarChart, Settings,
  ArrowRight, TrendingUp, Building2, User, CheckCircle,
} from 'lucide-react';

export default async function DashboardClientesPage() {
  const user = await requireServerUser();
  const role = user.role as Role;
  const canCreate = can(role, "clientes", "create");
  const canUpdate  = can(role, "clientes", "update");

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [totalClientes, novosEsteMes, clientesAtivos, porTipo] = await Promise.all([
    prisma.cliente.count(),
    prisma.cliente.count({ where: { criadoEm: { gte: startOfMonth } } }),
    prisma.cliente.count({ where: { status: 'ATIVO' } }),
    prisma.cliente.groupBy({ by: ['tipo'], _count: { id: true } }),
  ]);

  const totalPF = porTipo.find(t => t.tipo === 'PF')?._count.id ?? 0;
  const totalPJ = porTipo.find(t => t.tipo === 'PJ')?._count.id ?? 0;

  const navCards = [
    {
      href: '/clientes/lista',
      label: 'Gerenciar Clientes',
      description: 'Visualize, filtre e gerencie toda a base de clientes.',
      icon: Users,
      barClass: 'bg-[#0098DA]',
      iconClass: 'bg-[#0098DA]',
      linkClass: 'text-[#0098DA]',
      visible: true,
    },
    {
      href: '/clientes/novo',
      label: 'Novo Cliente',
      description: 'Cadastre clientes PF ou PJ no sistema.',
      icon: UserPlus,
      barClass: 'bg-emerald-500',
      iconClass: 'bg-emerald-500',
      linkClass: 'text-emerald-600 dark:text-emerald-400',
      visible: canCreate,
    },
    {
      href: '/clientes/relatorios',
      label: 'Relatórios',
      description: 'Análise do perfil e comportamento dos clientes.',
      icon: FileBarChart,
      barClass: 'bg-[#FF8C00]',
      iconClass: 'bg-[#FF8C00]',
      linkClass: 'text-[#FF8C00]',
      visible: true,
    },
    {
      href: '/clientes/config',
      label: 'Configurações',
      description: 'Preferências de exibição e comportamento da lista.',
      icon: Settings,
      barClass: 'bg-muted-foreground/40',
      iconClass: 'bg-muted-foreground/40',
      linkClass: 'text-muted-foreground',
      visible: canUpdate,
    },
  ].filter(c => c.visible);

  return (
    <div className="space-y-6">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <ModulePageHeader
        title="Clientes"
        description="Gestão de relacionamento com clientes (CRM)"
        icon={<Users />}
        accentColor="#FF8C00"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Clientes' },
        ]}
        actions={
          canCreate ? (
            <Link href="/clientes/novo">
              <Button size="sm">
                <UserPlus className="size-4" />
                Novo Cliente
              </Button>
            </Link>
          ) : undefined
        }
      />

      {/* ── KPIs ────────────────────────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total de Clientes"
          value={totalClientes}
          icon={<Users />}
          variant="default"
        />
        <StatCard
          title="Novos este Mês"
          value={novosEsteMes}
          description="Crescimento recente"
          icon={<TrendingUp />}
          variant="income"
        />
        <StatCard
          title="Pessoa Física"
          value={totalPF}
          description="Consumidores finais"
          icon={<User />}
          variant="orange"
        />
        <StatCard
          title="Pessoa Jurídica"
          value={totalPJ}
          description="Empresas parceiras"
          icon={<Building2 />}
          variant="purple"
        />
      </div>

      {/* ── Navegação por sub-área ───────────────────────────────────── */}
      <div>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Módulos
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {navCards.map(card => {
            const Icon = card.icon;
            return (
              <Link key={card.href} href={card.href} className="group">
                <div className="relative overflow-hidden rounded-xl border border-border bg-card p-4 shadow-card transition-all duration-200 hover:shadow-card-hover">
                  <div className={`absolute inset-x-0 top-0 h-[3px] ${card.barClass}`} aria-hidden />
                  <div className="mt-1 flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground">{card.label}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground leading-snug">{card.description}</p>
                    </div>
                    <div className={`grid shrink-0 size-8 place-content-center rounded-lg text-white [&_svg]:size-4 ${card.iconClass}`}>
                      <Icon />
                    </div>
                  </div>
                  <div className={`mt-3 flex items-center gap-1 text-xs font-medium ${card.linkClass}`}>
                    Acessar
                    <ArrowRight className="size-3 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Barra de status: ativos ──────────────────────────────────── */}
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-card">
        <CheckCircle className="size-4 shrink-0 text-emerald-500" />
        <p className="text-sm text-foreground">
          <span className="font-semibold">{clientesAtivos}</span>
          <span className="text-muted-foreground"> clientes ativos no momento</span>
        </p>
        <Link href="/clientes/lista" className="ml-auto shrink-0">
          <Button variant="ghost" size="sm" className="text-xs h-7">
            Ver lista <ArrowRight className="size-3" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
