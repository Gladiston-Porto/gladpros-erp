/**
 * Equipamentos - Página de Listagem
 * Design System v2.0 - Semana 2
 */

import { Suspense } from 'react';
import Link from 'next/link';
import { Plus, Wrench, CheckCircle, AlertTriangle, Calendar } from 'lucide-react';
import { Button } from '@gladpros/ui/button'
import { ModulePageHeader } from '@gladpros/ui/module-page-header'
import { StatCard } from '@gladpros/ui/stat-card';
import { SearchBar } from '@/components/estoque/shared/SearchBar';
import { LoadingSpinner } from '@/components/estoque/shared/LoadingSpinner';
import { EquipamentoList } from '@/components/estoque/equipamentos/EquipamentoList';
import { EquipamentoFilters } from '@/components/estoque/equipamentos/EquipamentoFilters';
import { prisma } from '@/lib/prisma';

type PageProps = {
  searchParams: Promise<{
    search?: string;
    tipo?: string;
    status?: string;
    categoriaId?: string;
    requerCalibracao?: string;
    page?: string;
    pageSize?: string;
  }>;
};

export default async function EquipamentosPage({ searchParams }: PageProps) {
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  // Categorias + estatísticas em paralelo — 1 round-trip ao banco em vez de 5 sequenciais
  const [categorias, _totalEquipamentos, disponiveis, emManutencao, calibraPendentes] = await Promise.all([
    prisma.categoria.findMany({
      where: { tipo: 'EQUIPAMENTO' },
      orderBy: { nome: 'asc' }
    }),
    prisma.equipamento.count(),
    prisma.equipamento.count({ where: { status: 'DISPONIVEL' } }),
    prisma.equipamento.count({ where: { status: 'EM_MANUTENCAO' } }),
    prisma.equipamento.count({
      where: {
        requerCalibracao: true,
        proximaCalibracao: { lte: thirtyDaysFromNow, gte: new Date() }
      }
    })
  ]);

  return (
    <div className="space-y-6">
      <ModulePageHeader
        title="Equipamentos"
        description="Gerencie ferramentas, máquinas, EPIs e instrumentos de medição"
        icon={<Wrench />}
        accentColor="#0098DA"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Estoque', href: '/estoque' },
          { label: 'Equipamentos' },
        ]}
        actions={
          <Link href="/estoque/equipamentos/novo">
            <Button size="default">
              <Plus className="h-4 w-4 mr-2" />
              Novo Equipamento
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Disponíveis" value={disponiveis} icon={<CheckCircle />} variant="income" description="Prontos para uso" />
        <StatCard title="Em Manutenção" value={emManutencao} icon={<Wrench />} variant="warning" description="Indisponíveis" />
        <StatCard title="Calibração" value={calibraPendentes} icon={<Calendar />} variant={calibraPendentes > 0 ? "expense" : "muted"} description="Vencem em 30 dias" />
        <StatCard title="Categorias" value={categorias.length} icon={<AlertTriangle />} variant="default" description="Tipos de equipamentos" />
      </div>

      {/* Busca e Filtros */}
      <Suspense fallback={<LoadingSpinner />}>
        <div className="flex flex-col gap-4">
          <SearchBar placeholder="Buscar por código, nome, marca, modelo ou S/N..." />
          <EquipamentoFilters categorias={categorias} />
        </div>
      </Suspense>

      {/* Lista */}
      <Suspense fallback={<LoadingSpinner />}>
        <EquipamentoList searchParams={Promise.resolve(searchParams)} />
      </Suspense>
    </div>
  );
}
