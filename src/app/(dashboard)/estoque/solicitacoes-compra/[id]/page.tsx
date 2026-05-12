/**
 * Detalhe da Solicitação de Compra
 * /estoque/solicitacoes-compra/[id]
 */

import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireServerUser } from '@/shared/lib/requireServerUser';
import { can, type Role } from '@/shared/lib/rbac-core';
import { Button } from '@gladpros/ui/button';
import { ModulePageHeader } from '@gladpros/ui/module-page-header';
import { Badge } from '@gladpros/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@gladpros/ui/card';
import { ArrowLeft, ClipboardList, ShoppingCart } from 'lucide-react';
import { SCActions } from '@/components/estoque/solicitacoes-compra/SCActions';
import { SCReconciliacaoPanel } from '@/components/estoque/solicitacoes-compra/SCReconciliacaoPanel';
import { format } from 'date-fns';

type Props = { params: Promise<{ id: string }> };

export default async function SolicitacaoCompraDetailPage({ params }: Props) {
  const { id } = await params;
  const user = await requireServerUser();
  if (!can(user.role as Role, 'estoque', 'read')) redirect('/403');

  const sc = await prisma.solicitacaoCompra.findUnique({
    where: { id: Number(id) },
    include: {
      solicitante: { select: { id: true, nomeCompleto: true } },
      aprovador: { select: { id: true, nomeCompleto: true } },
      itens: {
        include: {
          material: {
            select: { id: true, codigo: true, nome: true, unidade: { select: { codigo: true } } },
          },
        },
      },
      compras: {
        select: {
          id: true,
          status: true,
          valorTotal: true,
          numeroNf: true,
          notaFiscalUrl: true,
          dataCompra: true,
          fornecedor: { select: { id: true, nome: true } },
        },
      },
    },
  });

  if (!sc) notFound();

  const canViewAll = can(user.role as Role, 'financeiro', 'read');
  if (!canViewAll && sc.solicitanteId !== Number(user.id)) redirect('/403');

  const canApprove = can(user.role as Role, 'financeiro', 'write');
  const canReconciliar = can(user.role as Role, 'financeiro', 'read');
  const showReconciliar = ['CONCLUIDA', 'PARCIALMENTE_RECEBIDA'].includes(sc.status);

  const STATUS_LABELS: Record<string, string> = {
    RASCUNHO: 'Rascunho',
    ENVIADA: 'Aguardando Aprovação',
    APROVADA: 'Aprovada',
    PARCIALMENTE_RECEBIDA: 'Parcialmente Recebida',
    CONCLUIDA: 'Concluída',
    REJEITADA: 'Rejeitada',
    CANCELADA: 'Cancelada',
  };

  const STATUS_CLASSES: Record<string, string> = {
    RASCUNHO: 'bg-muted text-muted-foreground',
    ENVIADA: 'bg-yellow-500/10 text-yellow-600',
    APROVADA: 'bg-blue-500/10 text-blue-600',
    PARCIALMENTE_RECEBIDA: 'bg-orange-500/10 text-orange-600',
    CONCLUIDA: 'bg-green-500/10 text-green-600',
    REJEITADA: 'bg-destructive/10 text-destructive',
    CANCELADA: 'bg-muted text-muted-foreground',
  };

  const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

  return (
    <div className="space-y-6">
      <ModulePageHeader
        title={`Solicitação SC #${sc.id}`}
        description={STATUS_LABELS[sc.status] ?? sc.status}
        icon={<ClipboardList />}
        accentColor="#FF8C00"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Estoque', href: '/estoque' },
          { label: 'Solicitações', href: '/estoque/solicitacoes-compra' },
          { label: `SC #${sc.id}` },
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

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Status</p>
            <Badge className={`text-sm ${STATUS_CLASSES[sc.status] ?? ''}`}>
              {STATUS_LABELS[sc.status] ?? sc.status}
            </Badge>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Valor Estimado</p>
            <p className="font-bold text-foreground">{fmt.format(Number(sc.valorEstimado))}</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Budget Aprovado</p>
            <p className="font-bold text-foreground">
              {sc.valorAprovado ? fmt.format(Number(sc.valorAprovado)) : '—'}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Total Gasto</p>
            <p className="font-bold text-foreground">{fmt.format(Number(sc.valorTotalGasto))}</p>
          </CardContent>
        </Card>
      </div>

      {/* Meta */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Informações</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Solicitado por</p>
            <p className="font-medium">{sc.solicitante.nomeCompleto}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Criado em</p>
            <p className="font-medium">{format(new Date(sc.criadoEm), 'MM/dd/yyyy')}</p>
          </div>
          {sc.aprovador && (
            <div>
              <p className="text-muted-foreground text-xs">Aprovado por</p>
              <p className="font-medium">{sc.aprovador.nomeCompleto}</p>
            </div>
          )}
          {sc.aprovadaEm && (
            <div>
              <p className="text-muted-foreground text-xs">Aprovado em</p>
              <p className="font-medium">{format(new Date(sc.aprovadaEm), 'MM/dd/yyyy')}</p>
            </div>
          )}
          {sc.observacoes && (
            <div className="col-span-2 md:col-span-4">
              <p className="text-muted-foreground text-xs">Observações</p>
              <p className="font-medium">{sc.observacoes}</p>
            </div>
          )}
          {sc.motivoRejeicao && (
            <div className="col-span-2 md:col-span-4">
              <p className="text-destructive text-xs font-semibold">Motivo da Rejeição</p>
              <p className="text-destructive">{sc.motivoRejeicao}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Itens */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">
            Itens Solicitados ({sc.itens.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-xs">
                  <th className="text-left py-2 pr-4">Material</th>
                  <th className="text-right py-2 pr-4">Qtd</th>
                  <th className="text-left py-2 pr-4">Und</th>
                  <th className="text-right py-2 pr-4">Custo Est.</th>
                  <th className="text-right py-2 pr-4">Total Est.</th>
                  <th className="text-right py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sc.itens.map((item) => (
                  <tr key={item.id}>
                    <td className="py-2 pr-4">
                      <p className="font-medium">{item.descricao}</p>
                      {item.material && (
                        <p className="text-xs text-muted-foreground">
                          {item.material.codigo} — {item.material.nome}
                        </p>
                      )}
                    </td>
                    <td className="text-right py-2 pr-4 tabular-nums">
                      {Number(item.quantidadeSolicitada).toLocaleString('en-US')}
                    </td>
                    <td className="py-2 pr-4 text-muted-foreground">{item.unidade ?? '—'}</td>
                    <td className="text-right py-2 pr-4 tabular-nums">
                      {item.custoEstimado ? fmt.format(Number(item.custoEstimado)) : '—'}
                    </td>
                    <td className="text-right py-2 pr-4 tabular-nums">
                      {item.custoEstimado
                        ? fmt.format(Number(item.custoEstimado) * Number(item.quantidadeSolicitada))
                        : '—'}
                    </td>
                    <td className="text-right py-2">
                      <ItemStatusBadge status={item.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Compras vinculadas */}
      {sc.compras.length > 0 && (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Compras Vinculadas ({sc.compras.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sc.compras.map((compra) => (
              <div
                key={compra.id}
                className="flex items-center justify-between p-3 rounded-2xl border border-border bg-muted/10"
              >
                <div>
                  <p className="text-sm font-medium">
                    Compra #{compra.id}
                    {compra.numeroNf && ` — NF ${compra.numeroNf}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {compra.fornecedor?.nome ?? 'Fornecedor não informado'} ·{' '}
                    {format(new Date(compra.dataCompra), 'MM/dd/yyyy')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{fmt.format(Number(compra.valorTotal))}</p>
                  <Link href={`/estoque/compras/${compra.id}`}>
                    <Button variant="link" size="sm" className="h-auto p-0 text-xs text-brand-primary">
                      Ver compra →
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <SCActions
        scId={sc.id}
        status={sc.status}
        solicitanteId={sc.solicitanteId}
        currentUserId={user.id}
        canApprove={canApprove}
      />

      {/* Reconciliação Financeira */}
      {showReconciliar && (
        <SCReconciliacaoPanel
          scId={sc.id}
          status={sc.status}
          valorAprovado={sc.valorAprovado ? Number(sc.valorAprovado) : null}
          valorTotalGasto={Number(sc.valorTotalGasto)}
          valorEstimado={Number(sc.valorEstimado)}
          canReconciliar={canReconciliar}
        />
      )}
    </div>
  );
}

function ItemStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDENTE: 'bg-muted text-muted-foreground',
    PARCIAL: 'bg-yellow-500/10 text-yellow-600',
    RECEBIDO: 'bg-green-500/10 text-green-600',
    CANCELADO: 'bg-destructive/10 text-destructive',
  };
  const labels: Record<string, string> = {
    PENDENTE: 'Pendente',
    PARCIAL: 'Parcial',
    RECEBIDO: 'Recebido',
    CANCELADO: 'Cancelado',
  };
  return (
    <Badge className={`text-xs ${map[status] ?? ''}`}>{labels[status] ?? status}</Badge>
  );
}
