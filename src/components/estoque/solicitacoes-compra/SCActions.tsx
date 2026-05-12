/**
 * SCActions — Ações disponíveis na SC conforme status + role do usuário
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@gladpros/ui/button';
import { Card, CardContent } from '@gladpros/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@gladpros/ui/dialog';
import { Input } from '@gladpros/ui/input';
import { Textarea } from '@gladpros/ui/textarea';
import { Label } from '@gladpros/ui/label';
import { useToast } from '@/shared/hooks/use-toast';
import { Loader2, Send, CheckCircle2, XCircle, Trash2 } from 'lucide-react';

type Props = {
  scId: number;
  status: string;
  solicitanteId: number;
  currentUserId: number;
  canApprove: boolean;
};

export function SCActions({ scId, status, solicitanteId, currentUserId, canApprove }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  // Dialogs state
  const [aprovarOpen, setAprovarOpen] = useState(false);
  const [rejeitarOpen, setRejeitarOpen] = useState(false);
  const [valorAprovado, setValorAprovado] = useState('');
  const [motivoRejeicao, setMotivoRejeicao] = useState('');

  const isSolicitante = solicitanteId === currentUserId;

  const callAction = async (endpoint: string, body?: object) => {
    setLoading(endpoint);
    try {
      const res = await fetch(`/api/estoque/solicitacoes-compra/${scId}/${endpoint}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Erro na operação');
      toast({ title: json.message || 'Operação realizada com sucesso' });
      router.refresh();
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: (err as Error).message });
    } finally {
      setLoading(null);
    }
  };

  const handleAprovar = async () => {
    const valor = parseFloat(valorAprovado);
    if (!valor || valor <= 0) {
      toast({ variant: 'destructive', title: 'Informe o valor aprovado' });
      return;
    }
    await callAction('aprovar', { valorAprovado: valor });
    setAprovarOpen(false);
    setValorAprovado('');
  };

  const handleRejeitar = async () => {
    if (motivoRejeicao.trim().length < 5) {
      toast({ variant: 'destructive', title: 'Informe o motivo da rejeição' });
      return;
    }
    await callAction('rejeitar', { motivoRejeicao: motivoRejeicao.trim() });
    setRejeitarOpen(false);
    setMotivoRejeicao('');
  };

  // Determine available actions
  const canEnviar = (isSolicitante || canApprove) && status === 'RASCUNHO';
  const canAprovarRejeitar = canApprove && status === 'ENVIADA';
  const canCancelar =
    (isSolicitante || canApprove) && ['RASCUNHO', 'ENVIADA', 'APROVADA'].includes(status);

  if (!canEnviar && !canAprovarRejeitar && !canCancelar) return null;

  return (
    <>
      <Card className="border-border bg-card">
        <CardContent className="p-4 flex flex-wrap gap-3 items-center">
          <span className="text-sm text-muted-foreground mr-2">Ações disponíveis:</span>

          {canEnviar && (
            <Button
              onClick={() => callAction('enviar')}
              disabled={!!loading}
              size="sm"
            >
              {loading === 'enviar' ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Enviar para Aprovação
            </Button>
          )}

          {canAprovarRejeitar && (
            <>
              <Button
                onClick={() => setAprovarOpen(true)}
                disabled={!!loading}
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Aprovar
              </Button>
              <Button
                onClick={() => setRejeitarOpen(true)}
                disabled={!!loading}
                variant="destructive"
                size="sm"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Rejeitar
              </Button>
            </>
          )}

          {canCancelar && (
            <Button
              onClick={() => callAction('cancelar')}
              disabled={!!loading}
              variant="outline"
              size="sm"
              className="text-destructive border-destructive/30 hover:bg-destructive/10"
            >
              {loading === 'cancelar' ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Cancelar SC
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Aprovar Dialog */}
      <Dialog open={aprovarOpen} onOpenChange={setAprovarOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprovar Solicitação SC #{scId}</DialogTitle>
            <DialogDescription>
              Defina o budget máximo autorizado para esta solicitação. O estoque não poderá realizar
              compras que ultrapassem este valor.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="valor-aprovado">Budget Máximo Aprovado ($)</Label>
              <Input
                id="valor-aprovado"
                type="number"
                min={0.01}
                step={0.01}
                placeholder="0.00"
                value={valorAprovado}
                onChange={(e) => setValorAprovado(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAprovarOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={handleAprovar}
              disabled={loading === 'aprovar'}
            >
              {loading === 'aprovar' ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Confirmar Aprovação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejeitar Dialog */}
      <Dialog open={rejeitarOpen} onOpenChange={setRejeitarOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Solicitação SC #{scId}</DialogTitle>
            <DialogDescription>
              Informe o motivo da rejeição. O solicitante poderá corrigir e reenviar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="motivo-rejeicao">Motivo da Rejeição</Label>
            <Textarea
              id="motivo-rejeicao"
              placeholder="Descreva o motivo..."
              value={motivoRejeicao}
              onChange={(e) => setMotivoRejeicao(e.target.value)}
              className="resize-none h-24"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejeitarOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejeitar}
              disabled={loading === 'rejeitar'}
            >
              {loading === 'rejeitar' ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              Confirmar Rejeição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
