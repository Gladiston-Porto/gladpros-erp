/**
 * Editar Equipamento - Página
 */

import { notFound } from 'next/navigation';
import { EquipamentoForm } from '@/components/equipamentos/EquipamentoForm';
import { prisma } from '@/lib/prisma';

type PageProps = {
  params: { id: string };
};

export default async function EditarEquipamentoPage({ params }: PageProps) {
  // Buscar equipamento
  const equipamento = await prisma.equipamento.findUnique({
    where: { id: Number(params.id) },
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Editar Equipamento</h1>
        <p className="text-muted-foreground">
          Atualize as informações do equipamento {equipamento.codigo}
        </p>
      </div>

      <EquipamentoForm
        mode="edit"
        initialData={equipamento}
        categorias={categorias}
        fornecedores={fornecedores}
      />
    </div>
  );
}
