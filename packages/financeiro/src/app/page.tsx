'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  PieChart,
  ArrowRight,
  Plus,
} from 'lucide-react';

/**
 * Dashboard Principal do Módulo Financeiro
 * Visão geral de todos os recursos financeiros
 * Rota: /financeiro
 */
export default function DashboardFinanceiroPage() {
  return (
    <div className="space-y-8">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Financeiro</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Gerencie receitas, despesas, contas bancárias e fluxo de caixa
          </p>
        </div>
      </div>

      {/* Grid de Recursos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card RECEITAS */}
        <Link href="/financeiro/receitas">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">Receitas</CardTitle>
                <div className="bg-green-100 dark:bg-green-900 p-2 rounded-lg">
                  <TrendingUp className="text-green-600 dark:text-green-400 w-5 h-5" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Gerencie receitas, vendas e faturamentos
              </p>
              <div className="mt-4 flex items-center gap-2 text-green-600 dark:text-green-400 text-sm font-medium">
                Acessar <ArrowRight className="w-4 h-4" />
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Card DESPESAS */}
        <Link href="/financeiro/despesas">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">Despesas</CardTitle>
                <div className="bg-red-100 dark:bg-red-900 p-2 rounded-lg">
                  <TrendingDown className="text-red-600 dark:text-red-400 w-5 h-5" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Registre e acompanhe todas as despesas
              </p>
              <div className="mt-4 flex items-center gap-2 text-red-600 dark:text-red-400 text-sm font-medium">
                Acessar <ArrowRight className="w-4 h-4" />
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Card CONTAS BANCÁRIAS */}
        <Link href="/financeiro/contas">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">Contas Bancárias</CardTitle>
                <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-lg">
                  <CreditCard className="text-blue-600 dark:text-blue-400 w-5 h-5" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Gerencie suas contas bancárias e transferências
              </p>
              <div className="mt-4 flex items-center gap-2 text-blue-600 dark:text-blue-400 text-sm font-medium">
                Acessar <ArrowRight className="w-4 h-4" />
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Card FLUXO DE CAIXA */}
        <Link href="/dashboard/financeiro/fluxo-caixa">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">Fluxo de Caixa</CardTitle>
                <div className="bg-emerald-100 dark:bg-emerald-900 p-2 rounded-lg">
                  <PieChart className="text-emerald-600 dark:text-emerald-400 w-5 h-5" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Visualize projeções e análises de caixa
              </p>
              <div className="mt-4 flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
                Acessar <ArrowRight className="w-4 h-4" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Ações Rápidas */}
      <div className="border-t pt-8">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Ações Rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <Link href="/financeiro/receitas">
            <Button variant="outline" className="w-full justify-start">
              <Plus className="w-4 h-4 mr-2" />
              Nova Receita
            </Button>
          </Link>
          <Link href="/financeiro/despesas">
            <Button variant="outline" className="w-full justify-start">
              <Plus className="w-4 h-4 mr-2" />
              Nova Despesa
            </Button>
          </Link>
          <Link href="/financeiro/contas">
            <Button variant="outline" className="w-full justify-start">
              <CreditCard className="w-4 h-4 mr-2" />
              Gerenciar Contas
            </Button>
          </Link>
          <Link href="/dashboard/financeiro/fluxo-caixa">
            <Button variant="outline" className="w-full justify-start">
              <PieChart className="w-4 h-4 mr-2" />
              Ver Fluxo
            </Button>
          </Link>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">💡 Dica</h3>
        <p className="text-sm text-blue-800 dark:text-blue-300">
          Explore cada recurso do módulo financeiro para gerenciar suas finanças de forma eficiente e obter insights sobre o fluxo de caixa da sua empresa.
        </p>
      </div>
    </div>
  );
}
