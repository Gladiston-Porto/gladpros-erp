'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Plus, XCircle } from 'lucide-react';
import { Badge } from '@gladpros/ui/badge';
import { Button } from '@gladpros/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@gladpros/ui/card';
import { Input } from '@gladpros/ui/input';
import { Loading } from '@gladpros/ui/loading';
import { useToast } from '@/shared/hooks/use-toast';

type COStatus = 'DRAFT' | 'SENT' | 'APPROVED' | 'APPLIED' | 'REJECTED' | 'VOIDED';
type COType = 'CLIENT_REQUEST' | 'UNFORESEEN' | 'COMPANY_ERROR' | 'CODE_REQUIREMENT';

type ChangeOrder = {
  id: number;
  type: COType;
  status: COStatus;
  description: string;
  priceDelta: number;
  costDelta: number;
  rootCause: string | null;
  createdAt: string;
  createdByUser: { nomeCompleto: string } | null;
  approvedAt: string | null;
  approvedByName: string | null;
  rejectedAt: string | null;
  rejectedReason: string | null;
};

type COListResponse = {
  data: ChangeOrder[];
  pagination: { total: number };
  success: boolean;
};

const STATUS_LABELS: Record<COStatus, string> = {
  DRAFT: 'Rascunho',
  SENT: 'Enviada',
  APPROVED: 'Aprovada',
  APPLIED: 'Aplicada',
  REJECTED: 'Rejeitada',
  VOIDED: 'Anulada',
};

const STATUS_BADGE: Record<COStatus, string> = {
  DRAFT: 'bg-muted/50 text-muted-foreground',
  SENT: 'bg-yellow-500/10 text-yellow-600',
  APPROVED: 'bg-green-500/10 text-green-600',
  APPLIED: 'bg-blue-500/10 text-blue-600',
  REJECTED: 'bg-destructive/10 text-destructive',
  VOIDED: 'bg-muted/30 text-muted-foreground line-through',
};

const TYPE_LABELS: Record<COType, string> = {
  CLIENT_REQUEST: 'Solicitação do cliente',
  UNFORESEEN: 'Imprevisto',
  COMPANY_ERROR: 'Erro interno',
  CODE_REQUIREMENT: 'Exigência normativa',
};

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const dateFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Chicago',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

function fmt(v: number) {
  return currency.format(v);
}

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return dateFormat.format(new Date(iso));
}

type Props = {
  projetoId: number;
  canManage: boolean; // ADMIN or GERENTE
};

export function ChangeOrdersWidget({ projetoId, canManage }: Props) {
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Create form state
  const [form, setForm] = useState({
    type: 'CLIENT_REQUEST' as COType,
    description: '',
    rootCause: '',
    priceDelta: '',
    costDelta: '',
  });

  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projetos/${projetoId}/change-orders?pageSize=50`);
      if (!res.ok) throw new Error('Erro ao carregar change orders');
      const json = (await res.json()) as COListResponse;
      if (!json.success) throw new Error('Resposta inválida');
      setChangeOrders(json.data);
      setTotal(json.pagination.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, [projetoId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async () => {
    if (form.description.trim().length < 10) {
      toast({ title: 'Descrição obrigatória', description: 'Mínimo de 10 caracteres.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/projetos/${projetoId}/change-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: form.type,
          description: form.description.trim(),
          rootCause: form.rootCause.trim() || undefined,
          priceDelta: Number(form.priceDelta) || 0,
          costDelta: Number(form.costDelta) || 0,
        }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { message: string };
        throw new Error(err.message);
      }
      toast({ title: 'Change Order criada', description: 'Disponível para aprovação.', variant: 'success' });
      setShowForm(false);
      setForm({ type: 'CLIENT_REQUEST', description: '', rootCause: '', priceDelta: '', costDelta: '' });
      await load();
    } catch (err) {
      toast({ title: 'Erro ao criar', description: err instanceof Error ? err.message : 'Tente novamente.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecision = async (coId: number, action: 'approve' | 'reject', reason?: string) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/projetos/${projetoId}/change-orders/${coId}/decision`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action === 'approve' ? { action: 'approve' } : { action: 'reject', reason }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { message: string };
        throw new Error(err.message);
      }
      const label = action === 'approve' ? 'aprovada' : 'rejeitada';
      toast({ title: `Change Order ${label}`, description: 'Status atualizado com sucesso.', variant: 'success' });
      setRejectId(null);
      setRejectReason('');
      await load();
    } catch (err) {
      toast({ title: 'Erro ao processar decisão', description: err instanceof Error ? err.message : 'Tente novamente.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card className="rounded-2xl border-border bg-card shadow-sm">
        <CardContent className="flex min-h-32 items-center justify-center">
          <Loading text="Carregando change orders..." />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="rounded-2xl border-destructive/30 bg-destructive/10 shadow-sm">
        <CardHeader className="flex flex-row items-start gap-3">
          <AlertTriangle className="mt-1 h-5 w-5 text-destructive" />
          <div>
            <CardTitle className="text-destructive">Change Orders indisponível</CardTitle>
            <CardDescription>{error}</CardDescription>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl border-border bg-card shadow-sm">
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <CardTitle className="font-title">Change Orders</CardTitle>
          <CardDescription>
            Mudanças de escopo, imprevisto ou requisito normativo. {total > 0 && `${total} registros.`}
          </CardDescription>
        </div>
        {canManage && !showForm && (
          <Button
            variant="default"
            className="min-h-12 gap-2 self-start"
            onClick={() => setShowForm(true)}
            aria-label="Nova change order"
          >
            <Plus className="h-4 w-4" />
            Nova Change Order
          </Button>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Create form */}
        {showForm && (
          <div className="rounded-2xl border border-border bg-card/70 p-4 space-y-3">
            <p className="text-sm font-semibold text-foreground">Nova Change Order</p>
            <div>
              <label htmlFor="co-type" className="text-xs text-muted-foreground">Tipo</label>
              <select
                id="co-type"
                className="mt-1 w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm text-foreground"
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as COType }))}
                aria-label="Tipo da change order"
              >
                {(Object.entries(TYPE_LABELS) as [COType, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="co-description" className="text-xs text-muted-foreground">Descrição (obrigatório, mín. 10 caracteres)</label>
              <textarea
                id="co-description"
                className="mt-1 w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm text-foreground min-h-20 resize-none"
                placeholder="Descreva a mudança necessária..."
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                aria-label="Descrição da change order"
              />
            </div>
            <div>
              <label htmlFor="co-root-cause" className="text-xs text-muted-foreground">Causa raiz (opcional)</label>
              <Input
                id="co-root-cause"
                className="mt-1 rounded-2xl"
                placeholder="O que causou esta mudança?"
                value={form.rootCause}
                onChange={(e) => setForm((f) => ({ ...f, rootCause: e.target.value }))}
                aria-label="Causa raiz"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="co-price-delta" className="text-xs text-muted-foreground">Δ Preço (USD)</label>
                <Input
                  id="co-price-delta"
                  type="number"
                  step="0.01"
                  className="mt-1 rounded-2xl"
                  placeholder="0.00"
                  value={form.priceDelta}
                  onChange={(e) => setForm((f) => ({ ...f, priceDelta: e.target.value }))}
                  aria-label="Delta de preço"
                />
              </div>
              <div>
                <label htmlFor="co-cost-delta" className="text-xs text-muted-foreground">Δ Custo (USD)</label>
                <Input
                  id="co-cost-delta"
                  type="number"
                  step="0.01"
                  className="mt-1 rounded-2xl"
                  placeholder="0.00"
                  value={form.costDelta}
                  onChange={(e) => setForm((f) => ({ ...f, costDelta: e.target.value }))}
                  aria-label="Delta de custo"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="default"
                size="sm"
                className="min-h-12"
                onClick={() => void handleCreate()}
                disabled={submitting}
                aria-label="Salvar change order"
              >
                {submitting ? <Loading size="sm" /> : 'Salvar'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="min-h-12"
                onClick={() => setShowForm(false)}
                aria-label="Cancelar criação"
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* Reject form */}
        {rejectId !== null && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 space-y-3">
            <p className="text-sm font-semibold text-destructive">Rejeitar Change Order #{rejectId}</p>
            <div>
              <label htmlFor="co-reject-reason" className="text-xs text-muted-foreground">Motivo (obrigatório, mín. 5 caracteres)</label>
              <Input
                id="co-reject-reason"
                className="mt-1 rounded-2xl border-destructive/30"
                placeholder="Informe o motivo da rejeição..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                aria-label="Motivo da rejeição"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                className="min-h-12"
                onClick={() => void handleDecision(rejectId, 'reject', rejectReason)}
                disabled={submitting || rejectReason.trim().length < 5}
                aria-label="Confirmar rejeição"
              >
                {submitting ? <Loading size="sm" /> : 'Rejeitar'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="min-h-12"
                onClick={() => { setRejectId(null); setRejectReason(''); }}
                aria-label="Cancelar rejeição"
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* List */}
        {changeOrders.length === 0 ? (
          <div className="rounded-2xl border border-border p-4 text-sm text-muted-foreground">
            Nenhuma change order registrada para este projeto.
          </div>
        ) : (
          <div className="space-y-3">
            {changeOrders.map((co) => (
              <article key={co.id} className="rounded-2xl border border-border p-4 space-y-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={STATUS_BADGE[co.status]}>{STATUS_LABELS[co.status]}</Badge>
                      <span className="text-xs text-muted-foreground">{TYPE_LABELS[co.type]}</span>
                      <span className="text-xs text-muted-foreground">#{co.id}</span>
                    </div>
                    <p className="text-sm text-foreground">{co.description}</p>
                    {co.rootCause && (
                      <p className="text-xs text-muted-foreground">Causa: {co.rootCause}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground shrink-0">
                    {co.priceDelta !== 0 && (
                      <span className={co.priceDelta > 0 ? 'text-destructive' : 'text-green-600'}>
                        Δ Preço: {fmt(co.priceDelta)}
                      </span>
                    )}
                    {co.costDelta !== 0 && (
                      <span className="text-muted-foreground">Δ Custo: {fmt(co.costDelta)}</span>
                    )}
                    <span>Criada: {fmtDate(co.createdAt)}</span>
                    {co.approvedAt && (
                      <span className="text-green-600">
                        Aprovada: {fmtDate(co.approvedAt)}{co.approvedByName ? ` (${co.approvedByName})` : ''}
                      </span>
                    )}
                    {co.rejectedAt && (
                      <span className="text-destructive">Rejeitada: {fmtDate(co.rejectedAt)}</span>
                    )}
                  </div>
                </div>

                {co.rejectedReason && (
                  <div className="flex items-start gap-2 rounded-xl bg-destructive/10 p-2 text-xs text-destructive">
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>Motivo: {co.rejectedReason}</span>
                  </div>
                )}

                {/* Action buttons — only for DRAFT/SENT and managers */}
                {canManage && (co.status === 'DRAFT' || co.status === 'SENT') && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                      variant="default"
                      size="sm"
                      className="min-h-12 gap-1"
                      onClick={() => void handleDecision(co.id, 'approve')}
                      disabled={submitting}
                      aria-label={`Aprovar change order #${co.id}`}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Aprovar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="min-h-12 gap-1 border-destructive/40 text-destructive hover:bg-destructive/10"
                      onClick={() => { setRejectId(co.id); setRejectReason(''); }}
                      disabled={submitting}
                      aria-label={`Rejeitar change order #${co.id}`}
                    >
                      <XCircle className="h-4 w-4" />
                      Rejeitar
                    </Button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
