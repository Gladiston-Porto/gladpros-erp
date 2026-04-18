/**
 * Detalhes da Movimentação
 * Exibe informações completas de uma movimentação
 */

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Badge } from "@gladpros/ui/badge"
import { Button } from "@gladpros/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@gladpros/ui/card"
import { ModulePageHeader } from "@gladpros/ui/module-page-header";
import { ArrowLeft, ArrowLeftRight } from 'lucide-react';
import { formatDate } from '@/lib/estoque/utils/formatters';

type PageProps = {
  params: Promise<{
    id: string;
  }>;
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

// Mapeia tipo → variante do Badge (design tokens, dark-mode ok)
const TIPO_BADGE_VARIANT: Record<string, 'success' | 'error' | 'info' | 'warning' | 'outline'> = {
  ENTRADA: 'success',
  SAIDA: 'error',
  TRANSFERENCIA: 'info',
  AJUSTE_POSITIVO: 'success',
  AJUSTE_NEGATIVO: 'error',
  RESERVA: 'warning',
  CANCELAMENTO_RESERVA: 'outline',
  DEVOLUCAO: 'info',
  PERDA: 'error',
};

export default async function MovimentacaoDetalhesPage({ params: paramsPromise }: PageProps) {
  const params = await paramsPromise;
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
      <ModulePageHeader
        title="Detalhes da Movimentação"
        description={`ID: ${movimentacao.id.toString()}`}
        icon={<ArrowLeftRight />}
        accentColor="#0098DA"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Estoque', href: '/estoque' },
          { label: 'Movimentações', href: '/estoque/movimentacoes' },
          { label: 'Detalhes' },
        ]}
        badges={<Badge variant={TIPO_BADGE_VARIANT[movimentacao.tipo] ?? 'outline'}>{TIPO_LABELS[movimentacao.tipo]}</Badge>}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/estoque/movimentacoes">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            </Link>
          </div>
        }
      />

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
