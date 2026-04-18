/**
 * Nova Movimentação Page
 * Página para registrar nova movimentação
 * Design System v2.0 - Semana 2
 */

import { prisma } from '@/lib/prisma';
import { Button } from '@gladpros/ui/button'
import { ModulePageHeader } from '@gladpros/ui/module-page-header';
import { MovimentacaoForm } from '@/components/estoque/movimentacoes/MovimentacaoForm';
import { ChevronLeft, ArrowLeftRight } from 'lucide-react';
import Link from 'next/link';

export default async function NovaMovimentacaoPage() {
  const [materiais, equipamentos, projetos] = await Promise.all([
    prisma.material.findMany({
      where: { ativo: true },
      select: { id: true, nome: true },
      orderBy: { nome: 'asc' },
    }),
    prisma.equipamento.findMany({
      where: { ativo: true },
      select: { id: true, nome: true },
      orderBy: { nome: 'asc' },
    }),
    prisma.projeto.findMany({
      select: { id: true, numeroProjeto: true },
      orderBy: { criadoEm: 'desc' },
      take: 50,
    }),
  ]);

  return (
    <div className="space-y-6">
      <ModulePageHeader
        title="Nova Movimentação"
        description="Registre entrada, saída ou transferência de estoque"
        icon={<ArrowLeftRight />}
        accentColor="#0098DA"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Estoque', href: '/estoque' },
          { label: 'Movimentações', href: '/estoque/movimentacoes' },
          { label: 'Nova' },
        ]}
        actions={
          <Link href="/estoque/movimentacoes">
            <Button variant="outline" size="sm">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </Link>
        }
      />

      <MovimentacaoForm
        materiais={materiais.map((m) => ({ id: String(m.id), nome: m.nome }))}
        equipamentos={equipamentos.map((e) => ({ id: String(e.id), nome: e.nome }))}
        projetos={projetos.map((p) => ({ id: String(p.id), nome: p.numeroProjeto }))}
      />
    </div>
  );
}
