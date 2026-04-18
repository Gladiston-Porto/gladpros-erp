/**
 * Detalhes da Compra
 * Exibe informações completas e itens da compra
 */

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { ArrowLeft, Package } from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/estoque/utils/formatters';

type PageProps = {
  params: {
    id: string;
  };
};

const STATUS_CONFIG = {
  PENDENTE: { variant: 'secondary' as const, label: 'Pendente' },
  PARCIAL: { variant: 'default' as const, label: 'Parcialmente Recebida' },
  RECEBIDA: { variant: 'outline' as const, label: 'Recebida' },
  CANCELADA: { variant: 'destructive' as const, label: 'Cancelada' },
};

const TIPO_LABELS = {
  MATERIAL: 'Material',
  EQUIPAMENTO: 'Equipamento',
  AMBOS: 'Material + Equipamento',
};

export default async function CompraDetalhesPage({ params }: PageProps) {
  const compra = await prisma.compra.findUnique({
    where: { id: Number(params.id) },
    include: {
      fornecedor: { select: { id: true, nome: true, telefone: true, email: true } },
      projeto: { select: { id: true, numeroProjeto: true, titulo: true } },
      criador: { select: { id: true, nomeCompleto: true } },
      itens: {
        include: {
          material: { select: { id: true, codigo: true, nome: true } },
          equipamento: { select: { id: true, codigo: true, nome: true } },
          recebedor: { select: { id: true, nomeCompleto: true } },
        },
        orderBy: { id: 'asc' },
      },
    },
  });

  if (!compra) {
    return notFound();
  }

  const statusConfig = STATUS_CONFIG[compra.status];
  const totalItens = compra.itens.length;
  const itensRecebidos = compra.itens.filter((i) => i.dataRecebimento).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/estoque/compras">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">
            {compra.numeroNf ? `NF: ${compra.numeroNf}` : `Compra #${compra.id}`}
          </h1>
          <p className="text-muted-foreground">
            {TIPO_LABELS[compra.tipo]} • {formatDate(compra.dataCompra)}
          </p>
        </div>
        <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
      </div>

      {/* Grid de Cards */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Informações Básicas */}
        <Card>
          <CardHeader>
            <CardTitle>Informações da Compra</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <span className="text-sm text-muted-foreground">Data da Compra</span>
              <p className="font-medium">{formatDate(compra.dataCompra)}</p>
            </div>
            {compra.dataEntrega && (
              <div>
                <span className="text-sm text-muted-foreground">Data de Entrega</span>
                <p className="font-medium">{formatDate(compra.dataEntrega)}</p>
              </div>
            )}
            <div>
              <span className="text-sm text-muted-foreground">Tipo</span>
              <p className="font-medium">{TIPO_LABELS[compra.tipo]}</p>
            </div>
            {compra.formaPagamento && (
              <div>
                <span className="text-sm text-muted-foreground">Forma de Pagamento</span>
                <p className="font-medium">{compra.formaPagamento}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Fornecedor */}
        {compra.fornecedor && (
          <Card>
            <CardHeader>
              <CardTitle>Fornecedor</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <span className="text-sm text-muted-foreground">Nome</span>
                <p className="font-medium">{compra.fornecedor.nome}</p>
              </div>
              {compra.fornecedor.telefone && (
                <div>
                  <span className="text-sm text-muted-foreground">Telefone</span>
                  <p className="font-medium">{compra.fornecedor.telefone}</p>
                </div>
              )}
              {compra.fornecedor.email && (
                <div>
                  <span className="text-sm text-muted-foreground">Email</span>
                  <p className="font-medium">{compra.fornecedor.email}</p>
                </div>
              )}
              <Link href={`/estoque/fornecedores/${compra.fornecedor.id}`}>
                <Button variant="link" className="h-auto p-0">
                  Ver Fornecedor
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Projeto */}
        {compra.projeto && (
          <Card>
            <CardHeader>
              <CardTitle>Projeto Vinculado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <span className="text-sm text-muted-foreground">Número</span>
                <p className="font-medium">{compra.projeto.numeroProjeto}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Título</span>
                <p className="font-medium">{compra.projeto.titulo}</p>
              </div>
              <Link href={`/projetos/${compra.projeto.id}`}>
                <Button variant="link" className="h-auto p-0">
                  Ver Projeto
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Valores */}
        <Card>
          <CardHeader>
            <CardTitle>Valores</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <span className="text-sm text-muted-foreground">Valor dos Itens</span>
              <p className="font-medium">{formatCurrency(Number(compra.valorTotal))}</p>
            </div>
            {compra.desconto && Number(compra.desconto) > 0 && (
              <div>
                <span className="text-sm text-muted-foreground">Desconto</span>
                <p className="font-medium text-green-600">- {formatCurrency(Number(compra.desconto))}</p>
              </div>
            )}
            {compra.frete && Number(compra.frete) > 0 && (
              <div>
                <span className="text-sm text-muted-foreground">Frete</span>
                <p className="font-medium">+ {formatCurrency(Number(compra.frete))}</p>
              </div>
            )}
            <div className="border-t pt-3">
              <span className="text-sm text-muted-foreground">Total Final</span>
              <p className="text-2xl font-bold">
                {formatCurrency(
                  Number(compra.valorTotal) +
                    Number(compra.frete || 0) -
                    Number(compra.desconto || 0)
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Observações */}
        {compra.observacoes && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Observações</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{compra.observacoes}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Itens da Compra */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Itens da Compra</CardTitle>
            <div className="text-sm text-muted-foreground">
              {itensRecebidos}/{totalItens} recebidos
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {compra.itens.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum item cadastrado
            </p>
          ) : (
            <div className="space-y-4">
              {compra.itens.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between border-b pb-4 last:border-0 last:pb-0"
                >
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-muted p-2 mt-1">
                      <Package className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium">
                        {item.material?.nome || item.equipamento?.nome}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Código: {item.material?.codigo || item.equipamento?.codigo}
                      </p>
                      <div className="flex items-center gap-4 text-sm">
                        <span>Qtd: {Number(item.quantidade).toFixed(2)}</span>
                        <span>Un: {formatCurrency(Number(item.custoUnitario))}</span>
                        <span className="font-medium">
                          Total: {formatCurrency(Number(item.quantidade) * Number(item.custoUnitario))}
                        </span>
                      </div>
                      {item.dataRecebimento && (
                        <div className="text-xs text-green-600 flex items-center gap-1 mt-2">
                          <Package className="h-3 w-3" />
                          Recebido em {formatDate(item.dataRecebimento)}
                          {item.recebedor && ` por ${item.recebedor.nomeCompleto}`}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={item.dataRecebimento ? 'outline' : 'secondary'}>
                      {item.dataRecebimento ? 'Recebido' : 'Pendente'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Auditoria */}
      <Card>
        <CardHeader>
          <CardTitle>Informações de Auditoria</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <span className="text-sm text-muted-foreground">Criado em</span>
            <p className="font-medium">
              {new Date(compra.criadoEm).toLocaleString('pt-BR')}
            </p>
          </div>
          {compra.criador && (
            <div>
              <span className="text-sm text-muted-foreground">Criado por</span>
              <p className="font-medium">{compra.criador.nomeCompleto}</p>
            </div>
          )}
          {compra.atualizadoEm && (
            <div>
              <span className="text-sm text-muted-foreground">Última atualização</span>
              <p className="font-medium">
                {new Date(compra.atualizadoEm).toLocaleString('pt-BR')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ações */}
      <div className="flex gap-3">
        <Link href="/estoque/compras">
          <Button variant="outline">Voltar</Button>
        </Link>
        {compra.status === 'PENDENTE' && (
          <Button>Registrar Recebimento</Button>
        )}
      </div>
    </div>
  );
}
