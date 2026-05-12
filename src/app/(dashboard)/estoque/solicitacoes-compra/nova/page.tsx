/**
 * Nova Solicitação de Compra
 * /estoque/solicitacoes-compra/nova
 */

import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireServerUser } from '@/shared/lib/requireServerUser';
import { can, type Role } from '@/shared/lib/rbac-core';
import { redirect } from 'next/navigation';
import { Button } from '@gladpros/ui/button';
import { ModulePageHeader } from '@gladpros/ui/module-page-header';
import { SolicitacaoCompraForm } from '@/components/estoque/solicitacoes-compra/SolicitacaoCompraForm';
import { ArrowLeft, ClipboardList } from 'lucide-react';

export default async function NovaSolicitacaoCompraPage() {
  const user = await requireServerUser();
  if (!can(user.role as Role, 'estoque', 'write')) redirect('/403');

  const materiais = await prisma.material.findMany({
    where: { ativo: true },
    orderBy: { nome: 'asc' },
    select: {
      id: true,
      codigo: true,
      nome: true,
      unidade: { select: { codigo: true } },
    },
  });

  return (
    <div className="space-y-6">
      <ModulePageHeader
        title="Nova Solicitação de Compra"
        description="Solicite a compra de materiais para aprovação do financeiro"
        icon={<ClipboardList />}
        accentColor="#FF8C00"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Estoque', href: '/estoque' },
          { label: 'Solicitações', href: '/estoque/solicitacoes-compra' },
          { label: 'Nova Solicitação' },
        ]}
        actions={
          <Link href="/estoque/solicitacoes-compra">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </Link>
        }
      />
      <SolicitacaoCompraForm materiais={materiais} />
    </div>
  );
}
