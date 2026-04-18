/**
 * Alertas Page
 * Lista todos os alertas com filtros
 * Design System v2.0 - Semana 2
 */

import { Suspense } from 'react';
import { prisma } from '@/lib/prisma';
import { Badge } from '@gladpros/ui/badge'
import { ModulePageHeader } from '@gladpros/ui/module-page-header';
import { AlertaFilters } from '@/components/estoque/alertas/AlertaFilters';
import { AlertaList } from '@/components/estoque/alertas/AlertaList';
import { LoadingSpinner } from '@/components/estoque/shared/LoadingSpinner';
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
      <ModulePageHeader
        title="Alertas de Estoque"
        description="Monitoramento de estoque mínimo, manutenções e validades"
        icon={<AlertTriangle />}
        accentColor="#FF8C00"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Estoque', href: '/estoque' },
          { label: 'Alertas' },
        ]}
        badges={
          totalPendentes > 0 ? (
            <Badge variant="error">
              {totalPendentes} {totalPendentes === 1 ? 'Pendente' : 'Pendentes'}
            </Badge>
          ) : undefined
        }
      />

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
