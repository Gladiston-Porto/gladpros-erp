/**
 * Página de Edição de Material
 * /estoque/materiais/[id]/editar
 * Design System v2.0 - Semana 2
 */

import { MaterialForm } from '@/components/estoque/materiais/MaterialForm';
import { Button } from '@gladpros/ui/button'
import { ModulePageHeader } from '@gladpros/ui/module-page-header';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Package } from 'lucide-react';

type PageProps = {
  params: Promise<{ id: string }>;
};

export const metadata = {
  title: 'Editar Material | Estoque',
  description: 'Editar informações do material',
};

export default async function EditarMaterialPage({ params }: PageProps) {
  const { id } = await params;
  const materialId = parseInt(id);

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
      select: { id: true, nome: true, paiId: true },
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
      <ModulePageHeader
        title="Editar Material"
        description={`${material.codigo} - ${material.nome}`}
        icon={<Package />}
        accentColor="#0098DA"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Estoque', href: '/estoque' },
          { label: 'Materiais', href: '/estoque/materiais' },
          { label: material.codigo, href: `/estoque/materiais/${material.id}` },
          { label: 'Editar' },
        ]}
        actions={
          <Link href={`/estoque/materiais/${material.id}`}>
            <Button variant="outline" size="sm">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </Link>
        }
      />

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
