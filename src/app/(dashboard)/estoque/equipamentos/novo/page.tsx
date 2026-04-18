/**
 * Novo Equipamento - Página
 * Design System v2.0 - Semana 2
 */

import { EquipamentoForm } from '@/components/estoque/equipamentos/EquipamentoForm';
import { Button } from '@gladpros/ui/button'
import { ModulePageHeader } from '@gladpros/ui/module-page-header';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { ChevronLeft, Wrench } from 'lucide-react';

export default async function NovoEquipamentoPage() {
  // Buscar dados necessários
  const [categorias, fornecedores] = await Promise.all([
    prisma.categoria.findMany({
      where: { tipo: 'EQUIPAMENTO' },
      orderBy: { nome: 'asc' },
      select: { id: true, nome: true },
    }),
    prisma.fornecedor.findMany({
      where: { ativo: true },
      orderBy: { nome: 'asc' },
      select: { id: true, nome: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <ModulePageHeader
        title="Novo Equipamento"
        description="Cadastre ferramenta, máquina, EPI ou instrumento de medição"
        icon={<Wrench />}
        accentColor="#0098DA"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Estoque', href: '/estoque' },
          { label: 'Equipamentos', href: '/estoque/equipamentos' },
          { label: 'Novo' },
        ]}
        actions={
          <Link href="/estoque/equipamentos">
            <Button variant="outline" size="sm">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </Link>
        }
      />

      <EquipamentoForm
        mode="create"
        categorias={categorias}
        fornecedores={fornecedores}
      />
    </div>
  );
}
