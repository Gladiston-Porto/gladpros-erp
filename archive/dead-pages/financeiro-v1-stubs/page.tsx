'use client';

import Link from 'next/link';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  Button, 
  PageHeader, 
  Badge 
} from '@gladpros/ui';
import {
  TrendingUp,
  TrendingDown,
  CreditCard,
  PieChart,
  ArrowRight,
  Plus,
  Wallet,
  AlertCircle
} from 'lucide-react';

/**
 * Dashboard Principal do Módulo Financeiro
 * Visão geral de todos os recursos financeiros
 * Rota: /financeiro
 */
export default function DashboardFinanceiroPage() {
  return (
    <div className="space-y-8">
      {/* Cabeçalho Padronizado */}
      <PageHeader 
        title="Financeiro" 
        description="Gerencie receitas, despesas, contas bancárias e fluxo de caixa"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Financeiro' }
        ]}
        actions={
          <Link href="/financeiro/receitas/nova">
            <Button variant="primary" size="md">
              <Plus className="h-4 w-4 mr-2" />
              Nova Transação
            </Button>
          </Link>
        }
      />

      {/* Hero Section - Design System v2.0 */}
      <section 
        className="rounded-3xl border border-white/30 bg-gradient-to-br p-6 text-white shadow-2xl shadow-blue-500/20"
        style={{ backgroundImage: 'linear-gradient(135deg, #0098DA 0%, #FF8C00 100%)' }}
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.5em] text-white/70">VISÃO GERAL</p>
            <h2 className="text-2xl font-semibold font-title">Resumo do Mês</h2>
            <p className="text-sm text-white/80">Movimentações financeiras de Novembro 2025</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="rounded-full bg-white/20 px-3 py-1 text-sm text-white border-none">
              Em dia
            </Badge>
            <div className="text-right">
              <p className="text-xs text-white/70">Saldo Atual</p>
              <p className="text-2xl font-bold font-title">R$ 124.590,00</p>
            </div>
          </div>
        </div>

        {/* Grid de Stats no Hero */}
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="space-y-1 rounded-2xl bg-white/10 p-4 backdrop-blur-sm border border-white/10">
            <div className="flex items-center gap-2 text-white/80">
              <TrendingUp className="h-4 w-4" />
              <p className="text-sm">Receitas</p>
            </div>
            <p className="text-2xl font-semibold">R$ 45.200</p>
            <div className="flex items-center gap-1 text-xs text-green-300 bg-green-500/20 w-fit px-2 py-0.5 rounded-full">
              <span>+12%</span>
            </div>
          </div>
          
          <div className="space-y-1 rounded-2xl bg-white/10 p-4 backdrop-blur-sm border border-white/10">
            <div className="flex items-center gap-2 text-white/80">
              <TrendingDown className="h-4 w-4" />
              <p className="text-sm">Despesas</p>
            </div>
            <p className="text-2xl font-semibold">R$ 12.850</p>
            <div className="flex items-center gap-1 text-xs text-red-300 bg-red-500/20 w-fit px-2 py-0.5 rounded-full">
              <span>-5%</span>
            </div>
          </div>

          <div className="space-y-1 rounded-2xl bg-white/10 p-4 backdrop-blur-sm border border-white/10">
            <div className="flex items-center gap-2 text-white/80">
              <AlertCircle className="h-4 w-4" />
              <p className="text-sm">Pendentes</p>
            </div>
            <p className="text-2xl font-semibold">R$ 3.400</p>
            <p className="text-xs text-white/60">5 lançamentos</p>
          </div>

          <div className="space-y-1 rounded-2xl bg-white/10 p-4 backdrop-blur-sm border border-white/10">
            <div className="flex items-center gap-2 text-white/80">
              <Wallet className="h-4 w-4" />
              <p className="text-sm">Caixa</p>
            </div>
            <p className="text-2xl font-semibold">R$ 32.350</p>
            <p className="text-xs text-white/60">Disponível</p>
          </div>
        </div>
      </section>

      {/* Grid de Navegação */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card RECEITAS */}
        <Link href="/financeiro/receitas">
          <Card className="h-full hover:shadow-md transition-all duration-200 border-neutral-200 dark:border-white/10 group">
            <CardHeader className="pb-3 border-b border-neutral-100 dark:border-white/5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold font-title text-gray-900 dark:text-white">Receitas</h3>
                <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-xl group-hover:scale-110 transition-transform">
                  <TrendingUp className="text-green-600 dark:text-green-400 w-5 h-5" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Gerencie receitas, vendas e faturamentos da empresa.
              </p>
              <div className="flex items-center gap-2 text-[#0098DA] text-sm font-medium group-hover:translate-x-1 transition-transform">
                Acessar Módulo <ArrowRight className="w-4 h-4" />
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Card DESPESAS */}
        <Link href="/financeiro/despesas">
          <Card className="h-full hover:shadow-md transition-all duration-200 border-neutral-200 dark:border-white/10 group">
            <CardHeader className="pb-3 border-b border-neutral-100 dark:border-white/5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold font-title text-gray-900 dark:text-white">Despesas</h3>
                <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-xl group-hover:scale-110 transition-transform">
                  <TrendingDown className="text-red-600 dark:text-red-400 w-5 h-5" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Registre e acompanhe todas as despesas e custos.
              </p>
              <div className="flex items-center gap-2 text-[#0098DA] text-sm font-medium group-hover:translate-x-1 transition-transform">
                Acessar Módulo <ArrowRight className="w-4 h-4" />
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Card CONTAS BANCÁRIAS */}
        <Link href="/financeiro/contas">
          <Card className="h-full hover:shadow-md transition-all duration-200 border-neutral-200 dark:border-white/10 group">
            <CardHeader className="pb-3 border-b border-neutral-100 dark:border-white/5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold font-title text-gray-900 dark:text-white">Contas</h3>
                <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-xl group-hover:scale-110 transition-transform">
                  <CreditCard className="text-blue-600 dark:text-blue-400 w-5 h-5" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Gerencie suas contas bancárias e conciliações.
              </p>
              <div className="flex items-center gap-2 text-[#0098DA] text-sm font-medium group-hover:translate-x-1 transition-transform">
                Acessar Módulo <ArrowRight className="w-4 h-4" />
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Card FLUXO DE CAIXA */}
        <Link href="/dashboard/financeiro/fluxo-caixa">
          <Card className="h-full hover:shadow-md transition-all duration-200 border-neutral-200 dark:border-white/10 group">
            <CardHeader className="pb-3 border-b border-neutral-100 dark:border-white/5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold font-title text-gray-900 dark:text-white">Fluxo de Caixa</h3>
                <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-xl group-hover:scale-110 transition-transform">
                  <PieChart className="text-emerald-600 dark:text-emerald-400 w-5 h-5" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Visualize projeções, relatórios e análises de caixa.
              </p>
              <div className="flex items-center gap-2 text-[#0098DA] text-sm font-medium group-hover:translate-x-1 transition-transform">
                Acessar Módulo <ArrowRight className="w-4 h-4" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Ações Rápidas */}
      <div className="pt-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 font-title">Ações Rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <Link href="/financeiro/receitas">
            <Button variant="outline" className="w-full justify-start h-12">
              <Plus className="w-4 h-4 mr-2 text-[#0098DA]" />
              Nova Receita
            </Button>
          </Link>
          <Link href="/financeiro/despesas">
            <Button variant="outline" className="w-full justify-start h-12">
              <Plus className="w-4 h-4 mr-2 text-red-500" />
              Nova Despesa
            </Button>
          </Link>
          <Link href="/financeiro/contas">
            <Button variant="outline" className="w-full justify-start h-12">
              <CreditCard className="w-4 h-4 mr-2 text-gray-500" />
              Gerenciar Contas
            </Button>
          </Link>
          <Link href="/dashboard/financeiro/fluxo-caixa">
            <Button variant="outline" className="w-full justify-start h-12">
              <PieChart className="w-4 h-4 mr-2 text-emerald-500" />
              Ver Relatórios
            </Button>
          </Link>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4">
        <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2 font-title">💡 Dica</h3>
        <p className="text-sm text-blue-800 dark:text-blue-300">
          Explore cada recurso do módulo financeiro para gerenciar suas finanças de forma eficiente e obter insights sobre o fluxo de caixa da sua empresa.
        </p>
      </div>
    </div>
  );
}
