/**
 * Nova MovimentaÃ§Ã£o Page
 * PÃ¡gina para registrar nova movimentaÃ§Ã£o
 */

import { prisma } from '@/lib/prisma';
import { MovimentacaoForm } from '@gladpros/estoque/components/movimentacoes/MovimentacaoForm';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/shared/components/ui/button';

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
      <div className="flex items-center gap-4">
        <Link href="/estoque/movimentacoes">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Nova MovimentaÃ§Ã£o</h1>
          <p className="text-muted-foreground">Registre uma nova movimentaÃ§Ã£o de estoque</p>
        </div>
      </div>

      <MovimentacaoForm
        materiais={materiais.map((m) => ({ id: String(m.id), nome: m.nome }))}
        equipamentos={equipamentos.map((e) => ({ id: String(e.id), nome: e.nome }))}
        projetos={projetos.map((p) => ({ id: String(p.id), nome: p.numeroProjeto }))}
      />
    </div>
  );
}

