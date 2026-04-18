/**
 * Dashboard Estoque Page
 * Visão geral do sistema de estoque
 * Design System v2.0 - Alinhado com Financeiro
 */

import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Badge } from '@gladpros/ui/badge'
import { Button } from '@gladpros/ui/button'
import { Card, CardContent, CardHeader } from '@gladpros/ui/card';
import {
  Package,
  Wrench,
  AlertTriangle,
  ShoppingCart,
  ArrowUpDown,
  Plus,
  ArrowRight,
  CheckCircle,
} from 'lucide-react';

// Componente local para evitar erros de importação
function PageHeader({ title, description, breadcrumbs, actions }: any) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white font-title">{title}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export default async function DashboardEstoquePage() {
  // Estatísticas gerais
  const [
    totalMateriais,
    totalEquipamentos,
    alertasPendentes,
    movimentacoesHoje,
    materiaisComCusto
  ] = await Promise.all([
    prisma.material.count(),
    prisma.equipamento.count(),
    prisma.alertaEstoque.count({
      where: {
        ativo: true,
        dataResolvido: null,
      },
    }),
    prisma.movimentacao.count({
      where: {
        dataMovimentacao: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    }),
    prisma.material.findMany({
      select: {
        custoMedio: true,
        saldos: {
          select: {
            quantidade: true
          }
        }
      }
    })
  ]);

  const totalItens = totalMateriais + totalEquipamentos;
  
  // Calcular valor total do estoque
  const valorEstoque = materiaisComCusto.reduce((acc, mat) => {
    const qtd = mat.saldos.reduce((s, saldo) => s + Number(saldo.quantidade), 0);
    return acc + (qtd * Number(mat.custoMedio || 0));
  }, 0);

  return (
    <div className="space-y-8">
      {/* Cabeçalho Padronizado */}
      <PageHeader 
        title="Estoque" 
        description="Gerencie materiais, equipamentos, movimentações e compras"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Estoque' }
        ]}
        actions={
          <Link href="/estoque/movimentacoes/nova">
            <Button variant="primary" size="default">
              <Plus className="h-4 w-4 mr-2" />
              Nova Movimentação
            </Button>
          </Link>
        }
      />

      {/* Hero Section - Design System v2.0 (Igual Financeiro) */}
      <section 
        className="rounded-3xl border border-white/30 bg-[linear-gradient(135deg,#0098DA_0%,#FF8C00_100%)] p-6 text-white shadow-2xl shadow-blue-500/20"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.5em] text-white/70">VISÃO GERAL</p>
            <h2 className="text-2xl font-semibold font-title">Resumo do Estoque</h2>
            <p className="text-sm text-white/80">Status atual de materiais e equipamentos</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="rounded-full bg-white/20 px-3 py-1 text-sm text-white border-none">
              Operacional
            </Badge>
            <div className="text-right">
              <p className="text-xs text-white/70">Valor em Estoque</p>
              <p className="text-2xl font-bold font-title">
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(valorEstoque)}
              </p>
            </div>
          </div>
        </div>

        {/* Grid de Stats no Hero */}
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="space-y-1 rounded-2xl bg-white/10 p-4 backdrop-blur-sm border border-white/10">
            <div className="flex items-center gap-2 text-white/80">
              <Package className="h-4 w-4" />
              <p className="text-sm">Total Itens</p>
            </div>
            <p className="text-2xl font-semibold">{totalItens}</p>
            <div className="flex items-center gap-1 text-xs text-white/60">
              <span>Materiais e Equipamentos</span>
            </div>
          </div>
          
          <div className="space-y-1 rounded-2xl bg-white/10 p-4 backdrop-blur-sm border border-white/10">
            <div className="flex items-center gap-2 text-white/80">
              <ArrowUpDown className="h-4 w-4" />
              <p className="text-sm">Movimentações Hoje</p>
            </div>
            <p className="text-2xl font-semibold">{movimentacoesHoje}</p>
            <div className="flex items-center gap-1 text-xs text-white/60">
              <span>Entradas e Saídas</span>
            </div>
          </div>

          <div className="space-y-1 rounded-2xl bg-white/10 p-4 backdrop-blur-sm border border-white/10">
            <div className="flex items-center gap-2 text-white/80">
              <AlertTriangle className="h-4 w-4" />
              <p className="text-sm">Alertas</p>
            </div>
            <p className="text-2xl font-semibold">{alertasPendentes}</p>
            <div className="flex items-center gap-1 text-xs text-white/60">
              <span>Pendentes de resolução</span>
            </div>
          </div>

          <div className="space-y-1 rounded-2xl bg-white/10 p-4 backdrop-blur-sm border border-white/10">
            <div className="flex items-center gap-2 text-white/80">
              <CheckCircle className="h-4 w-4" />
              <p className="text-sm">Status Geral</p>
            </div>
            <p className="text-2xl font-semibold">Normal</p>
            <div className="flex items-center gap-1 text-xs text-white/60">
              <span>Sistema operando</span>
            </div>
          </div>
        </div>
      </section>

      {/* Grid de Navegação (Cards como Módulos) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card MATERIAIS */}
        <Link href="/estoque/materiais">
          <Card className="h-full hover:shadow-md transition-all duration-200 border-neutral-200 dark:border-white/10 group">
            <CardHeader className="pb-3 border-b border-neutral-100 dark:border-white/5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold font-title text-gray-900 dark:text-white">Materiais</h3>
                <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-xl group-hover:scale-110 transition-transform">
                  <Package className="text-blue-600 dark:text-blue-400 w-5 h-5" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Gerencie o estoque de materiais, insumos e consumíveis.
              </p>
              <div className="flex items-center gap-2 text-brand-primary text-sm font-medium group-hover:translate-x-1 transition-transform">
                Acessar Módulo <ArrowRight className="w-4 h-4" />
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Card EQUIPAMENTOS */}
        <Link href="/estoque/equipamentos">
          <Card className="h-full hover:shadow-md transition-all duration-200 border-neutral-200 dark:border-white/10 group">
            <CardHeader className="pb-3 border-b border-neutral-100 dark:border-white/5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold font-title text-gray-900 dark:text-white">Equipamentos</h3>
                <div className="bg-orange-100 dark:bg-orange-900/30 p-2 rounded-xl group-hover:scale-110 transition-transform">
                  <Wrench className="text-orange-600 dark:text-orange-400 w-5 h-5" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Controle de ferramentas, máquinas e ativos da empresa.
              </p>
              <div className="flex items-center gap-2 text-brand-primary text-sm font-medium group-hover:translate-x-1 transition-transform">
                Acessar Módulo <ArrowRight className="w-4 h-4" />
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Card MOVIMENTAÇÕES */}
        <Link href="/estoque/movimentacoes">
          <Card className="h-full hover:shadow-md transition-all duration-200 border-neutral-200 dark:border-white/10 group">
            <CardHeader className="pb-3 border-b border-neutral-100 dark:border-white/5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold font-title text-gray-900 dark:text-white">Movimentações</h3>
                <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-xl group-hover:scale-110 transition-transform">
                  <ArrowUpDown className="text-emerald-600 dark:text-emerald-400 w-5 h-5" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Registre entradas, saídas e transferências de estoque.
              </p>
              <div className="flex items-center gap-2 text-brand-primary text-sm font-medium group-hover:translate-x-1 transition-transform">
                Acessar Módulo <ArrowRight className="w-4 h-4" />
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Card COMPRAS */}
        <Link href="/estoque/compras">
          <Card className="h-full hover:shadow-md transition-all duration-200 border-neutral-200 dark:border-white/10 group">
            <CardHeader className="pb-3 border-b border-neutral-100 dark:border-white/5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold font-title text-gray-900 dark:text-white">Compras</h3>
                <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-xl group-hover:scale-110 transition-transform">
                  <ShoppingCart className="text-purple-600 dark:text-purple-400 w-5 h-5" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Gestão de pedidos de compra e recebimento de mercadorias.
              </p>
              <div className="flex items-center gap-2 text-brand-primary text-sm font-medium group-hover:translate-x-1 transition-transform">
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
          <Link href="/estoque/materiais/novo">
            <Button variant="outline" className="w-full justify-start h-12">
              <Plus className="w-4 h-4 mr-2 text-blue-500" />
              Novo Material
            </Button>
          </Link>
          <Link href="/estoque/equipamentos/novo">
            <Button variant="outline" className="w-full justify-start h-12">
              <Plus className="w-4 h-4 mr-2 text-orange-500" />
              Novo Equipamento
            </Button>
          </Link>
          <Link href="/estoque/movimentacoes/nova">
            <Button variant="outline" className="w-full justify-start h-12">
              <ArrowUpDown className="w-4 h-4 mr-2 text-emerald-500" />
              Nova Movimentação
            </Button>
          </Link>
          <Link href="/estoque/compras/nova">
            <Button variant="outline" className="w-full justify-start h-12">
              <ShoppingCart className="w-4 h-4 mr-2 text-purple-500" />
              Nova Compra
            </Button>
          </Link>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4">
        <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2 font-title">💡 Dica</h3>
        <p className="text-sm text-blue-800 dark:text-blue-300">
          Mantenha o estoque atualizado registrando todas as movimentações. Utilize os alertas para evitar rupturas de estoque.
        </p>
      </div>
    </div>
  );
}
