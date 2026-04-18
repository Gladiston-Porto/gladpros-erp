/**
 * Detalhes do Alerta
 * Exibe informações completas e permite resolver
 */

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { formatDate } from '@/lib/estoque/utils/formatters';

type PageProps = {
  params: {
    id: string;
  };
};

const TIPO_LABELS: Record<string, string> = {
  ESTOQUE_MINIMO: 'Estoque Mínimo',
  ESTOQUE_ZERO: 'Estoque Zero',
  VALIDADE_PROXIMA: 'Validade Próxima',
  VALIDADE_VENCIDA: 'Validade Vencida',
  CALIBRACAO_PROXIMA: 'Calibração Próxima',
  CALIBRACAO_VENCIDA: 'Calibração Vencida',
  MANUTENCAO_PROXIMA: 'Manutenção Próxima',
  MANUTENCAO_VENCIDA: 'Manutenção Vencida',
  EQUIPAMENTO_NAO_DEVOLVIDO: 'Equipamento Não Devolvido',
  EQUIPAMENTO_DANIFICADO: 'Equipamento Danificado',
};

const PRIORIDADE_LABELS: Record<string, { variant: any; label: string }> = {
  BAIXA: { variant: 'outline' as const, label: 'Baixa' },
  MEDIA: { variant: 'secondary' as const, label: 'Média' },
  ALTA: { variant: 'default' as const, label: 'Alta' },
  CRITICA: { variant: 'destructive' as const, label: 'Crítica' },
};

export default async function AlertaDetalhesPage({ params }: PageProps) {
  const alerta = await prisma.alertaEstoque.findUnique({
    where: { id: BigInt(params.id) },
    include: {
      material: { select: { id: true, codigo: true, nome: true } },
      equipamento: { select: { id: true, codigo: true, nome: true } },
      projeto: { select: { id: true, numeroProjeto: true, titulo: true } },
      visualizador: { select: { id: true, nomeCompleto: true } },
      resolvedor: { select: { id: true, nomeCompleto: true } },
    },
  });

  if (!alerta) {
    return notFound();
  }

  const isResolvido = !!alerta.dataResolvido;
  const prioridadeConfig = PRIORIDADE_LABELS[alerta.prioridade];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/estoque/alertas">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{alerta.titulo}</h1>
          <p className="text-muted-foreground">{TIPO_LABELS[alerta.tipo]}</p>
        </div>
        <div className="flex gap-2">
          <Badge variant={prioridadeConfig.variant}>{prioridadeConfig.label}</Badge>
          {isResolvido && (
            <Badge variant="outline" className="text-green-600 border-green-600">
              <CheckCircle2 className="mr-1 h-4 w-4" />
              Resolvido
            </Badge>
          )}
        </div>
      </div>

      {/* Grid de Cards */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Mensagem */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Mensagem do Alerta</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-wrap">{alerta.mensagem}</p>
          </CardContent>
        </Card>

        {/* Item Relacionado */}
        {(alerta.material || alerta.equipamento) && (
          <Card>
            <CardHeader>
              <CardTitle>Item Relacionado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {alerta.material && (
                <>
                  <div>
                    <span className="text-sm text-muted-foreground">Material</span>
                    <p className="font-medium">{alerta.material.nome}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Código</span>
                    <p className="font-medium">{alerta.material.codigo}</p>
                  </div>
                  <Link href={`/estoque/materiais/${alerta.material.id}`}>
                    <Button variant="link" className="h-auto p-0">
                      Ver Material
                    </Button>
                  </Link>
                </>
              )}

              {alerta.equipamento && (
                <>
                  <div>
                    <span className="text-sm text-muted-foreground">Equipamento</span>
                    <p className="font-medium">{alerta.equipamento.nome}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Código</span>
                    <p className="font-medium">{alerta.equipamento.codigo}</p>
                  </div>
                  <Link href={`/estoque/equipamentos/${alerta.equipamento.id}`}>
                    <Button variant="link" className="h-auto p-0">
                      Ver Equipamento
                    </Button>
                  </Link>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Projeto */}
        {alerta.projeto && (
          <Card>
            <CardHeader>
              <CardTitle>Projeto Relacionado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <span className="text-sm text-muted-foreground">Número</span>
                <p className="font-medium">{alerta.projeto.numeroProjeto}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Título</span>
                <p className="font-medium">{alerta.projeto.titulo}</p>
              </div>
              <Link href={`/projetos/${alerta.projeto.id}`}>
                <Button variant="link" className="h-auto p-0">
                  Ver Projeto
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Resolução */}
        {isResolvido && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Resolução</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {alerta.solucao && (
                <div>
                  <span className="text-sm text-muted-foreground">Solução</span>
                  <p className="whitespace-pre-wrap">{alerta.solucao}</p>
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <span className="text-sm text-muted-foreground">Resolvido em</span>
                  <p className="font-medium">
                    {alerta.dataResolvido && new Date(alerta.dataResolvido).toLocaleString('pt-BR')}
                  </p>
                </div>
                {alerta.resolvedor && (
                  <div>
                    <span className="text-sm text-muted-foreground">Resolvido por</span>
                    <p className="font-medium">{alerta.resolvedor.nomeCompleto}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Auditoria */}
        <Card className={isResolvido ? '' : 'lg:col-span-2'}>
          <CardHeader>
            <CardTitle>Histórico</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <span className="text-sm text-muted-foreground">Criado em</span>
              <p className="font-medium">
                {new Date(alerta.dataAlerta).toLocaleString('pt-BR')}
              </p>
            </div>
            {alerta.dataVisualizado && (
              <>
                <div>
                  <span className="text-sm text-muted-foreground">Visualizado em</span>
                  <p className="font-medium">
                    {new Date(alerta.dataVisualizado).toLocaleString('pt-BR')}
                  </p>
                </div>
                {alerta.visualizador && (
                  <div>
                    <span className="text-sm text-muted-foreground">Visualizado por</span>
                    <p className="font-medium">{alerta.visualizador.nomeCompleto}</p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ações */}
      <div className="flex gap-3">
        <Link href="/estoque/alertas">
          <Button variant="outline">Voltar</Button>
        </Link>
        {!isResolvido && (
          <Button>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Marcar como Resolvido
          </Button>
        )}
      </div>
    </div>
  );
}
