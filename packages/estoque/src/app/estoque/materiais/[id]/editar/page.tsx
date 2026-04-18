/**
 * Página de Edição de Material
 * /estoque/materiais/[id]/editar
 */

import { MaterialForm } from '@/components/materiais/MaterialForm';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

type PageProps = {
  params: { id: string };
};

export const metadata = {
  title: 'Editar Material | Estoque',
  description: 'Editar informações do material',
};

export default async function EditarMaterialPage({ params }: PageProps) {
  const materialId = parseInt(params.id);

  if (isNaN(materialId)) {
    notFound();
  }

  const [material, categorias, unidades] = await Promise.all([
    prisma.material.findUnique({
      where: { id: materialId },
    }),
    prisma.categoria.findMany({
      where: { tipo: 'MATERIAL' },
      orderBy: { nome: 'asc' },
      select: { id: true, nome: true },
    }),
    prisma.unidade.findMany({
      orderBy: { codigo: 'asc' },
      select: { id: true, nome: true, codigo: true },
    }),
  ]);

  if (!material) {
    notFound();
  }

  // Preparar dados iniciais para o formulário
  const initialData = {
    id: material.id,
    codigo: material.codigo,
    nome: material.nome,
    descricao: material.descricao || '',
    categoriaId: String(material.categoriaId || ''),
    unidadeId: String(material.unidadeId),
    fabricante: material.fabricante || '',
    modelo: material.modelo || '',
    ncm: material.ncm || '',
    pesoUnitario: material.pesoUnitario ? String(material.pesoUnitario) : '',
    dimensoes: material.dimensoes || '',
    estoqueMinimo: String(material.estoqueMinimo),
    pontoReposicao: String(material.pontoReposicao),
    rastreioLote: material.rastreioLote,
    possuiValidade: material.possuiValidade,
    ativo: material.ativo,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/estoque/materiais/${material.id}`}>
          <Button variant="ghost" size="icon">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Editar Material</h1>
          <p className="text-muted-foreground">
            {material.codigo} - {material.nome}
          </p>
        </div>
      </div>

      {/* Formulário */}
      <MaterialForm
        categorias={categorias}
        unidades={unidades}
        initialData={initialData}
        mode="edit"
      />
    </div>
  );
}
