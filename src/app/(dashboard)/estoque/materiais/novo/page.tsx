/**
 * Página de Criação de Material
 * /estoque/materiais/novo
 * Design System v2.0 - Semana 2
 */

import { MaterialForm } from '@/components/estoque/materiais/MaterialForm';
import { Button } from '@gladpros/ui/button'
import { ModulePageHeader } from '@gladpros/ui/module-page-header';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { ChevronLeft, Package } from 'lucide-react';

export const metadata = {
  title: 'Novo Material | Estoque',
  description: 'Cadastrar novo material no estoque',
};

export default async function NovoMaterialPage() {
  // Buscar categorias e unidades para os selects
  const [categorias, unidades] = await Promise.all([
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

  return (
    <div className="space-y-6">
      <ModulePageHeader
        title="Novo Material"
        description="Cadastre um novo material no sistema de estoque"
        icon={<Package />}
        accentColor="#0098DA"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Estoque', href: '/estoque' },
          { label: 'Materiais', href: '/estoque/materiais' },
          { label: 'Novo' },
        ]}
        actions={
          <Link href="/estoque/materiais">
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
        mode="create"
      />
    </div>
  );
}
