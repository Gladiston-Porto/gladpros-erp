/**
 * Movimentações Listagem Page
 * Lista todas as movimentações com filtros
 * Design System v2.0 - Semana 2
 */

import { Suspense } from 'react';
import { prisma } from '@/lib/prisma';
import { Button } from '@gladpros/ui/button'
import { ModulePageHeader } from '@gladpros/ui/module-page-header';
import { MovimentacaoFilters } from '@/components/estoque/movimentacoes/MovimentacaoFilters';
import { MovimentacaoList } from '@/components/estoque/movimentacoes/MovimentacaoList';
import { LoadingSpinner } from '@/components/estoque/shared/LoadingSpinner';
import { Plus } from 'lucide-react';
import Link from 'next/link';

type PageProps = {
  searchParams: Promise<{
    search?: string;
    tipo?: string;
    materialId?: string;
    equipamentoId?: string;
    projetoId?: string;
    dataInicio?: string;
    dataFim?: string;
    page?: string;
  }>;
};

export default async function MovimentacoesPage({ searchParams }: PageProps) {
  const [materiais, equipamentos, projetos] = await Promise.all([
    prisma.material.findMany({
      where: { ativo: true },
      select: { id: true, nome: true },
      orderBy: { nome: 'asc' },
    }),
    prisma.equipamento.findMany({
      where: { ativo: true },
      select: { id: true, nome: true },
      orderBy: { nome: 'asc' },
    }),
    prisma.projeto.findMany({
      select: { id: true, numeroProjeto: true },
      orderBy: { criadoEm: 'desc' },
      take: 50,
    }),
  ]);

  return (
    <div className="space-y-6">
      <ModulePageHeader
        title="Movimentações"
        description="Histórico completo de entradas, saídas e transferências de estoque"
        icon={<Plus />}
        accentColor="#0098DA"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Estoque', href: '/estoque' },
          { label: 'Movimentações' },
        ]}
        actions={
          <Link href="/estoque/movimentacoes/nova">
            <Button size="default">
              <Plus className="mr-2 h-4 w-4" />
              Nova Movimentação
            </Button>
          </Link>
        }
      />

      <Suspense fallback={<LoadingSpinner />}>
        <MovimentacaoFilters
          materiais={materiais.map((m) => ({ id: String(m.id), nome: m.nome }))}
          equipamentos={equipamentos.map((e) => ({ id: String(e.id), nome: e.nome }))}
          projetos={projetos.map((p) => ({ id: String(p.id), nome: p.numeroProjeto }))}
        />
      </Suspense>

      <Suspense fallback={<LoadingSpinner />}>
        <MovimentacaoList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
