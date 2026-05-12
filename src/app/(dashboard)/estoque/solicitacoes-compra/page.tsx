/**
 * Solicitações de Compra — Lista
 * /estoque/solicitacoes-compra
 */

import { Suspense } from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireServerUser } from '@/shared/lib/requireServerUser';
import { can, type Role } from '@/shared/lib/rbac-core';
import { redirect } from 'next/navigation';
import { Button } from '@gladpros/ui/button';
import { ModulePageHeader } from '@gladpros/ui/module-page-header';
import { Badge } from '@gladpros/ui/badge';
import { Card, CardContent } from '@gladpros/ui/card';
import { LoadingSpinner } from '@/components/estoque/shared/LoadingSpinner';
import { Plus, ClipboardList, Eye, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default async function SolicitacoesCompraPage() {
  const user = await requireServerUser();
  if (!can(user.role as Role, 'estoque', 'read')) redirect('/403');

  const canViewAll = can(user.role as Role, 'financeiro', 'read');

  const solicitacoes = await prisma.solicitacaoCompra.findMany({
    where: canViewAll ? {} : { solicitanteId: user.id },
    orderBy: { criadoEm: 'desc' },
    take: 100,
    include: {
      solicitante: { select: { id: true, nomeCompleto: true } },
      aprovador: { select: { id: true, nomeCompleto: true } },
      itens: { select: { id: true, status: true } },
      _count: { select: { compras: true } },
    },
  });

  const stats = {
    rascunho: solicitacoes.filter((s) => s.status === 'RASCUNHO').length,
    enviada: solicitacoes.filter((s) => s.status === 'ENVIADA').length,
    aprovada: solicitacoes.filter((s) => s.status === 'APROVADA').length,
    concluida: solicitacoes.filter((s) => s.status === 'CONCLUIDA').length,
  };

  return (
    <div className="space-y-6">
      <ModulePageHeader
        title="Solicitações de Compra"
        description="Controle de aprovação de compras — do pedido ao recebimento"
        icon={<ClipboardList />}
        accentColor="#FF8C00"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Estoque', href: '/estoque' },
          { label: 'Solicitações de Compra' },
        ]}
        actions={
          <Link href="/estoque/solicitacoes-compra/nova">
            <Button size="default">
              <Plus className="mr-2 h-4 w-4" />
              Nova Solicitação
            </Button>
          </Link>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Rascunho" value={stats.rascunho} color="text-muted-foreground" icon={<Clock className="h-5 w-5" />} />
        <StatCard label="Aguardando Aprovação" value={stats.enviada} color="text-yellow-500" icon={<Clock className="h-5 w-5 text-yellow-500" />} />
        <StatCard label="Aprovadas" value={stats.aprovada} color="text-brand-primary" icon={<CheckCircle2 className="h-5 w-5 text-brand-primary" />} />
        <StatCard label="Concluídas" value={stats.concluida} color="text-green-500" icon={<CheckCircle2 className="h-5 w-5 text-green-500" />} />
      </div>

      {/* List */}
      <Suspense fallback={<LoadingSpinner />}>
        {solicitacoes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
            <ClipboardList className="h-12 w-12 opacity-30" />
            <p className="text-sm">Nenhuma solicitação de compra encontrada.</p>
            <Link href="/estoque/solicitacoes-compra/nova">
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Criar Primeira Solicitação
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {solicitacoes.map((sc) => (
              <Card key={sc.id} className="border-border bg-card hover:border-brand-primary/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="shrink-0">
                        <StatusIcon status={sc.status} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-foreground">SC #{sc.id}</span>
                          <StatusBadge status={sc.status} />
                          <OrigemBadge origem={sc.origemTipo} />
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {sc.itens.length} {sc.itens.length === 1 ? 'item' : 'itens'}
                          {' · '}
                          {sc._count.compras} {sc._count.compras === 1 ? 'compra' : 'compras'}
                          {' · '}
                          por {sc.solicitante.nomeCompleto}
                          {' · '}
                          {formatDistanceToNow(new Date(sc.criadoEm), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right hidden md:block">
                        <p className="text-xs text-muted-foreground">Estimado</p>
                        <p className="font-semibold text-foreground">
                          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
                            Number(sc.valorEstimado)
                          )}
                        </p>
                        {sc.valorAprovado && (
                          <p className="text-xs text-green-500">
                            Budget: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(sc.valorAprovado))}
                          </p>
                        )}
                      </div>
                      <Link href={`/estoque/solicitacoes-compra/${sc.id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          Ver
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </Suspense>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="border-border bg-card">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">{label}</span>
          {icon}
        </div>
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

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
  CANCELADA: 'bg-muted text-muted-foreground line-through',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge className={`text-xs ${STATUS_CLASSES[status] ?? ''}`}>
      {STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

const ORIGEM_LABELS: Record<string, string> = {
  MANUAL: 'Manual',
  PROJETO: 'Projeto',
  OS: 'OS',
  ALERTA_ESTOQUE: 'Alerta',
};

function OrigemBadge({ origem }: { origem: string }) {
  return (
    <Badge variant="outline" className="text-xs text-muted-foreground">
      {ORIGEM_LABELS[origem] ?? origem}
    </Badge>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'APROVADA' || status === 'CONCLUIDA')
    return <CheckCircle2 className="h-5 w-5 text-green-500" />;
  if (status === 'REJEITADA' || status === 'CANCELADA')
    return <XCircle className="h-5 w-5 text-destructive" />;
  if (status === 'ENVIADA')
    return <Clock className="h-5 w-5 text-yellow-500" />;
  return <Clock className="h-5 w-5 text-muted-foreground" />;
}
