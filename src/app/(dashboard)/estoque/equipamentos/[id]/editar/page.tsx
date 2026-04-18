/**
 * Editar Equipamento - Página
 * Design System v2.0 - Semana 2
 */

import { notFound } from 'next/navigation';
import { EquipamentoForm } from '@/components/estoque/equipamentos/EquipamentoForm';
import { Button } from '@gladpros/ui/button'
import { ModulePageHeader } from '@gladpros/ui/module-page-header';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { ChevronLeft, Wrench } from 'lucide-react';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditarEquipamentoPage({ params }: PageProps) {
  // Buscar equipamento
  const { id } = await params;
  const equipamento = await prisma.equipamento.findUnique({
    where: { id: Number(id) },
  });

  if (!equipamento) {
    notFound();
  }

  // Buscar categorias e fornecedores
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
        title="Editar Equipamento"
        description={`${equipamento.codigo} - ${equipamento.nome}`}
        icon={<Wrench />}
        accentColor="#0098DA"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Estoque', href: '/estoque' },
          { label: 'Equipamentos', href: '/estoque/equipamentos' },
          { label: equipamento.codigo, href: `/estoque/equipamentos/${equipamento.id}` },
          { label: 'Editar' },
        ]}
        actions={
          <Link href={`/estoque/equipamentos/${equipamento.id}`}>
            <Button variant="outline" size="sm">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </Link>
        }
      />

      <EquipamentoForm
        mode="edit"
        initialData={equipamento}
        categorias={categorias}
        fornecedores={fornecedores}
      />
    </div>
  );
}
