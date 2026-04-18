/**
 * PÃ¡gina de CriaÃ§Ã£o de Material
 * /estoque/materiais/novo
 */

import { MaterialForm } from '@gladpros/estoque/components/materiais/MaterialForm';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

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
      select: { id: true, nome: true },
    }),
    prisma.unidade.findMany({
      orderBy: { codigo: 'asc' },
      select: { id: true, nome: true, codigo: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/estoque/materiais">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Novo Material</h1>
          <p className="text-muted-foreground">
            Cadastre um novo material no estoque
          </p>
        </div>
      </div>

      {/* FormulÃ¡rio */}
      <MaterialForm
        categorias={categorias}
        unidades={unidades}
        mode="create"
      />
    </div>
  );
}

