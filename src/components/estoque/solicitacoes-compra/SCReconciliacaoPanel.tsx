/**
 * SCReconciliacaoPanel — Painel de reconciliação financeira
 *
 * Exibe resumo financeiro da SC e permite disparar a reconciliação com o módulo financeiro.
 * Visível apenas para status CONCLUIDA ou PARCIALMENTE_RECEBIDA.
 * Requer role FINANCEIRO, GERENTE ou ADMIN.
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@gladpros/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@gladpros/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@gladpros/ui/dialog';
import { Textarea } from '@gladpros/ui/textarea';
import { Label } from '@gladpros/ui/label';
import { Badge } from '@gladpros/ui/badge';
import { useToast } from '@/shared/hooks/use-toast';
import {
  AlertTriangle,
  ArrowRightLeft,
  CheckCircle2,
  DollarSign,
  Loader2,
  TrendingDown,
} from 'lucide-react';

type Props = {
  scId: number;
  status: string;
  valorAprovado: number | null;
  valorTotalGasto: number;
  valorEstimado: number;
  canReconciliar: boolean;
};

type Relatorio = {
  financeiro: {
    valorAprovado: number;
    valorTotalGasto: number;
    devolucao: number;
    devolucaoFormatada: string;
  };
  itens: { total: number; recebidos: number; pendentes: number };
  compras: { total: number; expensesPendentes: number; expensesPagos: number };
  mensagem: string;
};

export function SCReconciliacaoPanel({
  scId,
  status,
  valorAprovado,
  valorTotalGasto,
  valorEstimado,
  canReconciliar,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [observacoes, setObservacoes] = useState('');
  const [relatorio, setRelatorio] = useState<Relatorio | null>(null);

  const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
  const isParc = status === 'PARCIALMENTE_RECEBIDA';
  const aprovado = valorAprovado ?? 0;
  const gasto = valorTotalGasto ?? 0;
  const devolucao = Math.max(0, aprovado - gasto);

  const handleReconciliar = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/estoque/solicitacoes-compra/${scId}/reconciliar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          forcarFechamento: isParc,
          observacoes: observacoes.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || json.error || 'Erro na reconciliação');
      }
      setRelatorio(json.data);
      toast({ title: 'Reconciliação concluída', description: json.message });
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro na reconciliação',
        description: (err as Error).message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <ArrowRightLeft className="h-4 w-4 text-brand-primary" />
            Reconciliação Financeira
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Resumo financeiro */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="rounded-2xl border border-border bg-muted/10 p-3">
              <p className="text-xs text-muted-foreground mb-1">Budget Aprovado</p>
              <p className="font-bold text-foreground tabular-nums">
                {aprovado > 0 ? fmt.format(aprovado) : '—'}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-muted/10 p-3">
              <p className="text-xs text-muted-foreground mb-1">Total Gasto</p>
              <p className="font-bold text-foreground tabular-nums">{fmt.format(gasto)}</p>
            </div>
            <div
              className={`rounded-2xl border p-3 ${
                devolucao > 0
                  ? 'border-green-500/30 bg-green-500/10'
                  : 'border-border bg-muted/10'
              }`}
            >
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <TrendingDown className="h-3 w-3" />
                Devolução Estimada
              </p>
              <p
                className={`font-bold tabular-nums ${
                  devolucao > 0 ? 'text-green-600' : 'text-muted-foreground'
                }`}
              >
                {devolucao > 0 ? fmt.format(devolucao) : '$0.00'}
              </p>
            </div>
          </div>

          {/* Status badge e alerta PARCIALMENTE_RECEBIDA */}
          {isParc && (
            <div className="flex items-start gap-2 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-3 text-yellow-700 dark:text-yellow-400">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="text-sm">
                Esta SC está <strong>Parcialmente Recebida</strong>. Ao reconciliar, o status será
                alterado para <strong>Concluída</strong> e os itens pendentes serão descartados.
              </p>
            </div>
          )}

          {/* Resultado após reconciliação */}
          {relatorio && (
            <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-4 space-y-2">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                <p className="font-semibold text-sm">Reconciliação realizada</p>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-green-700 dark:text-green-400">
                <span>Devolução ao budget:</span>
                <span className="font-bold">{relatorio.financeiro.devolucaoFormatada}</span>
                <span>Itens recebidos:</span>
                <span className="font-bold">
                  {relatorio.itens.recebidos}/{relatorio.itens.total}
                </span>
                <span>Expenses pendentes:</span>
                <span className="font-bold">{relatorio.compras.expensesPendentes}</span>
              </div>
            </div>
          )}

          {/* Botão */}
          {canReconciliar && !relatorio && (
            <Button
              onClick={() => setOpen(true)}
              size="sm"
              className="gap-2 bg-brand-primary hover:bg-brand-primary/90"
              aria-label="Reconciliar SC com financeiro"
            >
              <DollarSign className="h-4 w-4" />
              {isParc ? 'Forçar Fechamento e Reconciliar' : 'Reconciliar com Financeiro'}
            </Button>
          )}

          {!canReconciliar && (
            <Badge className="bg-muted text-muted-foreground">
              Apenas FINANCEIRO, GERENTE ou ADMIN podem reconciliar
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* Confirm dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reconciliar SC #{scId}</DialogTitle>
            <DialogDescription>
              {isParc
                ? 'Esta SC está PARCIALMENTE_RECEBIDA. O fechamento irá desconsiderar itens ainda pendentes. O módulo financeiro será notificado sobre a devolução.'
                : 'O módulo financeiro será notificado sobre o fechamento desta SC e o valor de devolução ao budget.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Resumo inline */}
            <div className="rounded-2xl border border-border bg-muted/10 p-4 grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">Budget aprovado:</span>
              <span className="font-semibold text-right">{fmt.format(aprovado)}</span>
              <span className="text-muted-foreground">Total gasto:</span>
              <span className="font-semibold text-right">{fmt.format(gasto)}</span>
              <span className="text-muted-foreground">Devolução:</span>
              <span
                className={`font-bold text-right ${
                  devolucao > 0 ? 'text-green-600' : 'text-foreground'
                }`}
              >
                {fmt.format(devolucao)}
              </span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="obs-reconciliar">Observações (opcional)</Label>
              <Textarea
                id="obs-reconciliar"
                placeholder="Notas adicionais para o financeiro..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className="resize-none h-20"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button
              onClick={handleReconciliar}
              disabled={loading}
              className="bg-brand-primary hover:bg-brand-primary/90"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ArrowRightLeft className="h-4 w-4 mr-2" />
              )}
              Confirmar Reconciliação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
