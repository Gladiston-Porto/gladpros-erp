/**
 * Detalhes da Movimentação
 * Exibe informações completas de uma movimentação
 */

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { ArrowLeft } from 'lucide-react';
import { formatDate } from '@/lib/estoque/utils/formatters';

type PageProps = {
  params: {
    id: string;
  };
};

const TIPO_LABELS: Record<string, string> = {
  ENTRADA: 'Entrada',
  SAIDA: 'Saída',
  TRANSFERENCIA: 'Transferência',
  AJUSTE_POSITIVO: 'Ajuste Positivo',
  AJUSTE_NEGATIVO: 'Ajuste Negativo',
  RESERVA: 'Reserva',
  CANCELAMENTO_RESERVA: 'Cancelamento de Reserva',
  DEVOLUCAO: 'Devolução',
  PERDA: 'Perda',
};

const TIPO_COLORS: Record<string, string> = {
  ENTRADA: 'bg-green-100 text-green-800',
  SAIDA: 'bg-red-100 text-red-800',
  TRANSFERENCIA: 'bg-blue-100 text-blue-800',
  AJUSTE_POSITIVO: 'bg-green-100 text-green-800',
  AJUSTE_NEGATIVO: 'bg-red-100 text-red-800',
  RESERVA: 'bg-yellow-100 text-yellow-800',
  CANCELAMENTO_RESERVA: 'bg-gray-100 text-gray-800',
  DEVOLUCAO: 'bg-blue-100 text-blue-800',
  PERDA: 'bg-red-100 text-red-800',
};

export default async function MovimentacaoDetalhesPage({ params }: PageProps) {
  const movimentacao = await prisma.movimentacao.findUnique({
    where: { id: BigInt(params.id) },
    include: {
      material: { select: { id: true, codigo: true, nome: true } },
      equipamento: { select: { id: true, codigo: true, nome: true } },
      projeto: { select: { id: true, numeroProjeto: true, titulo: true } },
      usuario: { select: { id: true, nomeCompleto: true, email: true } },
    },
  });

  if (!movimentacao) {
    return notFound();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/estoque/movimentacoes">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Detalhes da Movimentação</h1>
          <p className="text-muted-foreground">ID: {movimentacao.id.toString()}</p>
        </div>
        <Badge className={TIPO_COLORS[movimentacao.tipo]}>
          {TIPO_LABELS[movimentacao.tipo]}
        </Badge>
      </div>

      {/* Grid de Cards */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Informações Básicas */}
        <Card>
          <CardHeader>
            <CardTitle>Informações Básicas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <span className="text-sm text-muted-foreground">Tipo</span>
              <p className="font-medium">{TIPO_LABELS[movimentacao.tipo]}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Data</span>
              <p className="font-medium">{formatDate(movimentacao.dataMovimentacao)}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Quantidade</span>
              <p className="font-medium">{Number(movimentacao.quantidade).toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Item Movimentado */}
        <Card>
          <CardHeader>
            <CardTitle>Item Movimentado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {movimentacao.material && (
              <>
                <div>
                  <span className="text-sm text-muted-foreground">Material</span>
                  <p className="font-medium">{movimentacao.material.nome}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Código</span>
                  <p className="font-medium">{movimentacao.material.codigo}</p>
                </div>
                <Link href={`/estoque/materiais/${movimentacao.material.id}`}>
                  <Button variant="link" className="h-auto p-0">
                    Ver Material
                  </Button>
                </Link>
              </>
            )}

            {movimentacao.equipamento && (
              <>
                <div>
                  <span className="text-sm text-muted-foreground">Equipamento</span>
                  <p className="font-medium">{movimentacao.equipamento.nome}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Código</span>
                  <p className="font-medium">{movimentacao.equipamento.codigo}</p>
                </div>
                <Link href={`/estoque/equipamentos/${movimentacao.equipamento.id}`}>
                  <Button variant="link" className="h-auto p-0">
                    Ver Equipamento
                  </Button>
                </Link>
              </>
            )}

            {!movimentacao.material && !movimentacao.equipamento && (
              <p className="text-sm text-muted-foreground">Nenhum item vinculado</p>
            )}
          </CardContent>
        </Card>

        {/* Projeto */}
        {movimentacao.projeto && (
          <Card>
            <CardHeader>
              <CardTitle>Projeto Vinculado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <span className="text-sm text-muted-foreground">Número</span>
                <p className="font-medium">{movimentacao.projeto.numeroProjeto}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Título</span>
                <p className="font-medium">{movimentacao.projeto.titulo}</p>
              </div>
              <Link href={`/projetos/${movimentacao.projeto.id}`}>
                <Button variant="link" className="h-auto p-0">
                  Ver Projeto
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Observações */}
        {movimentacao.observacao && (
          <Card>
            <CardHeader>
              <CardTitle>Observações</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{movimentacao.observacao}</p>
            </CardContent>
          </Card>
        )}

        {/* Auditoria */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Informações de Auditoria</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <span className="text-sm text-muted-foreground">Registrado em</span>
              <p className="font-medium">
                {new Date(movimentacao.criadoEm).toLocaleString('pt-BR')}
              </p>
            </div>
            {movimentacao.usuario && (
              <div>
                <span className="text-sm text-muted-foreground">Registrado por</span>
                <p className="font-medium">{movimentacao.usuario.nomeCompleto}</p>
                <p className="text-sm text-muted-foreground">{movimentacao.usuario.email}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ações */}
      <div className="flex gap-3">
        <Link href="/estoque/movimentacoes">
          <Button variant="outline">Voltar para Listagem</Button>
        </Link>
      </div>
    </div>
  );
}
