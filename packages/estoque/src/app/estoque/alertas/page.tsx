/**
 * Alertas Page
 * Lista todos os alertas com filtros
 */

import { Suspense } from 'react';
import { prisma } from '@/lib/prisma';
import { AlertaFilters } from '@gladpros/estoque/components/alertas/AlertaFilters';
import { AlertaList } from '@gladpros/estoque/components/alertas/AlertaList';
import { LoadingSpinner } from '@gladpros/estoque/components/shared/LoadingSpinner';
import { Badge } from '@/shared/components/ui/badge';
import { AlertTriangle } from 'lucide-react';

type PageProps = {
  searchParams: Promise<{
    tipo?: string;
    prioridade?: string;
    status?: string;
    materialId?: string;
    equipamentoId?: string;
    page?: string;
  }>;
};

export default async function AlertasPage({ searchParams }: PageProps) {
  const [materiais, equipamentos, totalPendentes] = await Promise.all([
    prisma.material.findMany({
      where: { ativo: true },
      select: { id: true, nome: true },
      orderBy: { nome: 'asc' },
      take: 100,
    }),
    prisma.equipamento.findMany({
      where: { ativo: true },
      select: { id: true, nome: true },
      orderBy: { nome: 'asc' },
      take: 100,
    }),
    prisma.alertaEstoque.count({
      where: {
        ativo: true,
        dataResolvido: null,
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Alertas de Estoque</h1>
          <p className="text-muted-foreground">Monitoramento e notificaÃ§Ãµes</p>
        </div>
        {totalPendentes > 0 && (
          <Badge variant="destructive" className="text-lg px-4 py-2">
            <AlertTriangle className="mr-2 h-5 w-5" />
            {totalPendentes} {totalPendentes === 1 ? 'Alerta Pendente' : 'Alertas Pendentes'}
          </Badge>
        )}
      </div>

      <Suspense fallback={<LoadingSpinner />}>
        <AlertaFilters
          materiais={materiais.map((m) => ({ id: String(m.id), nome: m.nome }))}
          equipamentos={equipamentos.map((e) => ({ id: String(e.id), nome: e.nome }))}
        />
      </Suspense>

      <Suspense fallback={<LoadingSpinner />}>
        <AlertaList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

