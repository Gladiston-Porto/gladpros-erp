/**
 * Dashboard Estoque Page
 * VisÃ£o geral do sistema de estoque
 */

import { Suspense } from 'react';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import {
  Package,
  Wrench,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ShoppingCart,
  ArrowUpDown,
} from 'lucide-react';
import { formatCurrency } from '@gladpros/estoque/lib/utils/formatters';
import Link from 'next/link';
import { Button } from '@/shared/components/ui/button';

export default async function DashboardEstoquePage() {
  // EstatÃ­sticas gerais
  const [
    totalMateriais,
    materiaisAtivos,
    materiaisEstoqueMinimo,
    totalEquipamentos,
    equipamentosDisponiveis,
    equipamentosManutencao,
    alertasPendentes,
    alertasCriticos,
    comprasPendentes,
    movimentacoesHoje,
  ] = await Promise.all([
    prisma.material.count(),
    prisma.material.count({ where: { ativo: true } }),
    prisma.material.count({
      where: {
        ativo: true,
        // Idealmente comparar saldo com estoque mÃ­nimo
      },
    }),
    prisma.equipamento.count(),
    prisma.equipamento.count({ where: { status: 'DISPONIVEL' } }),
    prisma.equipamento.count({
      where: {
        OR: [
          { status: 'EM_MANUTENCAO' },
          { proximaManutencao: { lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } },
        ],
      },
    }),
    prisma.alertaEstoque.count({
      where: {
        ativo: true,
        dataResolvido: null,
      },
    }),
    prisma.alertaEstoque.count({
      where: {
        ativo: true,
        dataResolvido: null,
        prioridade: 'CRITICA',
      },
    }),
    prisma.compra.count({
      where: {
        status: { in: ['PENDENTE', 'PARCIAL'] },
      },
    }),
    prisma.movimentacao.count({
      where: {
        dataMovimentacao: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    }),
  ]);

  // MovimentaÃ§Ãµes recentes
  const movimentacoesRecentes = await prisma.movimentacao.findMany({
    take: 5,
    orderBy: { criadoEm: 'desc' },
    include: {
      material: { select: { nome: true } },
      equipamento: { select: { nome: true } },
      usuario: { select: { nomeCompleto: true } },
    },
  });

  // Alertas prioritÃ¡rios
  const alertasPrioritarios = await prisma.alertaEstoque.findMany({
    where: {
      ativo: true,
      dataResolvido: null,
    },
    orderBy: [{ prioridade: 'desc' }, { dataAlerta: 'desc' }],
    take: 5,
    include: {
      material: { select: { nome: true } },
      equipamento: { select: { nome: true } },
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard de Estoque</h1>
        <p className="text-muted-foreground">VisÃ£o geral do sistema</p>
      </div>

      {/* Cards de MÃ©tricas */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Materiais */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Materiais</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMateriais}</div>
            <p className="text-xs text-muted-foreground">
              {materiaisAtivos} ativos â€¢ {materiaisEstoqueMinimo} em estoque mÃ­nimo
            </p>
            <Link href="/estoque/materiais">
              <Button variant="link" className="h-auto p-0 mt-2">
                Ver todos
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Equipamentos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Equipamentos</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEquipamentos}</div>
            <p className="text-xs text-muted-foreground">
              {equipamentosDisponiveis} disponÃ­veis â€¢ {equipamentosManutencao} em manutenÃ§Ã£o
            </p>
            <Link href="/estoque/equipamentos">
              <Button variant="link" className="h-auto p-0 mt-2">
                Ver todos
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Alertas */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Alertas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{alertasPendentes}</div>
            <p className="text-xs text-muted-foreground">
              {alertasCriticos} crÃ­ticos
            </p>
            <Link href="/estoque/alertas">
              <Button variant="link" className="h-auto p-0 mt-2">
                Ver alertas
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Compras */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Compras Pendentes</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{comprasPendentes}</div>
            <p className="text-xs text-muted-foreground">
              Aguardando recebimento
            </p>
            <Link href="/estoque/compras?status=PENDENTE">
              <Button variant="link" className="h-auto p-0 mt-2">
                Ver compras
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Grid de Cards SecundÃ¡rios */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* MovimentaÃ§Ãµes Recentes */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>MovimentaÃ§Ãµes Recentes</CardTitle>
              <Badge variant="outline">{movimentacoesHoje} hoje</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {movimentacoesRecentes.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma movimentaÃ§Ã£o registrada
              </p>
            ) : (
              <div className="space-y-4">
                {movimentacoesRecentes.map((mov) => (
                  <div key={mov.id.toString()} className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        {mov.material?.nome || mov.equipamento?.nome}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {mov.tipo} â€¢ {Number(mov.quantidade).toFixed(2)} un
                        {mov.usuario && ` â€¢ ${mov.usuario.nomeCompleto}`}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {new Date(mov.criadoEm).toLocaleDateString('pt-BR')}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
            <Link href="/estoque/movimentacoes">
              <Button variant="link" className="h-auto p-0 mt-4 w-full">
                Ver todas as movimentaÃ§Ãµes
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Alertas PrioritÃ¡rios */}
        <Card>
          <CardHeader>
            <CardTitle>Alertas PrioritÃ¡rios</CardTitle>
          </CardHeader>
          <CardContent>
            {alertasPrioritarios.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum alerta pendente
              </p>
            ) : (
              <div className="space-y-4">
                {alertasPrioritarios.map((alerta) => (
                  <div key={alerta.id.toString()} className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{alerta.titulo}</p>
                        <Badge
                          variant={
                            alerta.prioridade === 'CRITICA'
                              ? 'destructive'
                              : alerta.prioridade === 'ALTA'
                              ? 'default'
                              : 'secondary'
                          }
                          className="text-xs"
                        >
                          {alerta.prioridade}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {alerta.material?.nome || alerta.equipamento?.nome || 'Sistema'}
                      </p>
                    </div>
                    <Link href={`/estoque/alertas/${alerta.id}`}>
                      <Button variant="ghost" size="sm">
                        Ver
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
            <Link href="/estoque/alertas">
              <Button variant="link" className="h-auto p-0 mt-4 w-full">
                Ver todos os alertas
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Links RÃ¡pidos */}
      <Card>
        <CardHeader>
          <CardTitle>AÃ§Ãµes RÃ¡pidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Link href="/estoque/materiais/novo">
              <Button variant="outline" className="w-full">
                <Package className="mr-2 h-4 w-4" />
                Novo Material
              </Button>
            </Link>
            <Link href="/estoque/equipamentos/novo">
              <Button variant="outline" className="w-full">
                <Wrench className="mr-2 h-4 w-4" />
                Novo Equipamento
              </Button>
            </Link>
            <Link href="/estoque/movimentacoes/nova">
              <Button variant="outline" className="w-full">
                <ArrowUpDown className="mr-2 h-4 w-4" />
                Nova MovimentaÃ§Ã£o
              </Button>
            </Link>
            <Link href="/estoque/compras/nova">
              <Button variant="outline" className="w-full">
                <ShoppingCart className="mr-2 h-4 w-4" />
                Nova Compra
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

