/**
 * MovimentaÃ§Ãµes Listagem Page
 * Lista todas as movimentaÃ§Ãµes com filtros
 */

import { Suspense } from 'react';
import { prisma } from '@/lib/prisma';
import { SearchBar } from '@gladpros/estoque/components/shared/SearchBar';
import { MovimentacaoFilters } from '@gladpros/estoque/components/movimentacoes/MovimentacaoFilters';
import { MovimentacaoList } from '@gladpros/estoque/components/movimentacoes/MovimentacaoList';
import { LoadingSpinner } from '@gladpros/estoque/components/shared/LoadingSpinner';
import { Button } from '@/shared/components/ui/button';
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">MovimentaÃ§Ãµes</h1>
          <p className="text-muted-foreground">HistÃ³rico de movimentaÃ§Ãµes de estoque</p>
        </div>
        <Link href="/estoque/movimentacoes/nova">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nova MovimentaÃ§Ã£o
          </Button>
        </Link>
      </div>

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

