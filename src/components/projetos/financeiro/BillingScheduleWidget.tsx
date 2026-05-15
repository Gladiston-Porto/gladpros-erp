'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { Badge } from '@gladpros/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@gladpros/ui/card';
import { Loading } from '@gladpros/ui/loading';

type BillingLineItem = {
  invoiceId: number;
  invoiceNumber: string;
  billingType: string;
  billingReference: string | null;
  status: string;
  valorTotal: number;
  dueDate: string | null;
  paidAt: string | null;
  issuedAt: string;
};

type BillingTypeGroup = {
  billingType: string;
  label: string;
  planned: number;
  executed: number;
  items: BillingLineItem[];
};

type BillingSchedule = {
  projetoId: number;
  totalPlanned: number;
  totalExecuted: number;
  totalBillingSchedule: number;
  coveragePct: number;
  groups: BillingTypeGroup[];
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

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Rascunho',
  SENT: 'Enviada',
  OVERDUE: 'Vencida',
  PAID: 'Paga',
  PARTIALLY_PAID: 'Parcialmente paga',
  CANCELLED: 'Cancelada',
  VOID: 'Anulada',
};

const STATUS_BADGE: Record<string, string> = {
  PAID: 'bg-green-500/10 text-green-600',
  PARTIALLY_PAID: 'bg-blue-500/10 text-blue-600',
  OVERDUE: 'bg-destructive/10 text-destructive',
  SENT: 'bg-yellow-500/10 text-yellow-600',
  DRAFT: 'bg-muted/50 text-muted-foreground',
};

export function BillingScheduleWidget({ projetoId }: { projetoId: number }) {
  const [schedule, setSchedule] = useState<BillingSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projetos/${projetoId}/financeiro/billing-schedule`);
      if (!res.ok) throw new Error('Não foi possível carregar o cronograma de faturamento');
      const json = (await res.json()) as { data: BillingSchedule; success: boolean };
      if (!json.success) throw new Error('Resposta inválida do servidor');
      setSchedule(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar cronograma');
    } finally {
      setLoading(false);
    }
  }, [projetoId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <Card className="rounded-2xl border-border bg-card shadow-sm">
        <CardContent className="flex min-h-32 items-center justify-center">
          <Loading text="Carregando cronograma..." />
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
            <CardTitle className="text-destructive">Cronograma indisponível</CardTitle>
            <CardDescription>{error}</CardDescription>
          </div>
        </CardHeader>
      </Card>
    );
  }

  if (!schedule || schedule.groups.length === 0) {
    return (
      <Card className="rounded-2xl border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="font-title">Cronograma de Faturamento</CardTitle>
          <CardDescription>Planejado vs. executado por tipo de cobrança.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-2xl border border-border p-4 text-sm text-muted-foreground">
            Nenhuma invoice ativa encontrada para este projeto.
          </div>
        </CardContent>
      </Card>
    );
  }

  const coverageClass =
    schedule.coveragePct >= 100
      ? 'text-green-600'
      : schedule.coveragePct >= 50
        ? 'text-yellow-600'
        : 'text-destructive';

  return (
    <Card className="rounded-2xl border-border bg-card shadow-sm">
      <CardHeader>
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="font-title">Cronograma de Faturamento</CardTitle>
            <CardDescription>Planejado vs. executado por tipo de cobrança.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <span className="text-muted-foreground">Planejado:</span>
              <span className="font-semibold text-foreground">{fmt(schedule.totalPlanned)}</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4 text-green-600" aria-hidden="true" />
              <span className="text-muted-foreground">Executado:</span>
              <span className="font-semibold text-foreground">{fmt(schedule.totalExecuted)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Cobertura:</span>
              <span className={`font-semibold ${coverageClass}`}>{schedule.coveragePct.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {schedule.groups.map((group) => (
          <section key={group.billingType} aria-label={group.label}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">{group.label}</h3>
              <div className="flex gap-3 text-xs text-muted-foreground">
                <span>Planejado: <span className="font-medium text-foreground">{fmt(group.planned)}</span></span>
                <span>Executado: <span className="font-medium text-green-600">{fmt(group.executed)}</span></span>
              </div>
            </div>
            <div className="space-y-2">
              {group.items.map((item) => (
                <div
                  key={item.invoiceId}
                  className="flex flex-col gap-2 rounded-2xl border border-border bg-card/60 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Badge className={STATUS_BADGE[item.status] ?? 'bg-muted/50 text-muted-foreground'}>
                      {STATUS_LABELS[item.status] ?? item.status}
                    </Badge>
                    <span className="text-sm font-medium text-foreground">{item.invoiceNumber}</span>
                    {item.billingReference && (
                      <span className="text-xs text-muted-foreground">({item.billingReference})</span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">{fmt(item.valorTotal)}</span>
                    {item.dueDate && (
                      <span>Venc.: {fmtDate(item.dueDate)}</span>
                    )}
                    {item.paidAt && (
                      <span className="text-green-600">Pago: {fmtDate(item.paidAt)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </CardContent>
    </Card>
  );
}
