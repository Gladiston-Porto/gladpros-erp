/**
 * AlertaActions — Ações no detalhe do alerta de estoque
 *
 * Inclui:
 *  1. Botão "Criar SC" — disponível para alertas de material não resolvidos
 *  2. Botão "Marcar como Resolvido" — disponível para alertas não resolvidos
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@gladpros/ui/button';
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
import { CheckCircle2, Loader2, ShoppingCart, ExternalLink } from 'lucide-react';

type Props = {
  alertaId: string;
  materialId: number | null;
  isResolvido: boolean;
};

export function AlertaActions({ alertaId, materialId, isResolvido }: Props) {
  const router = useRouter();
  const { toast } = useToast();

  // Criar SC
  const [criarScOpen, setCriarScOpen] = useState(false);
  const [qtdOverride, setQtdOverride] = useState('');
  const [loadingSc, setLoadingSc] = useState(false);
  const [scCriada, setScCriada] = useState<{ id: number } | null>(null);

  // Resolver
  const [resolverOpen, setResolverOpen] = useState(false);
  const [solucao, setSolucao] = useState('');
  const [loadingResolver, setLoadingResolver] = useState(false);

  const handleCriarSc = async () => {
    setLoadingSc(true);
    try {
      const body: Record<string, unknown> = {};
      const qtd = parseFloat(qtdOverride);
      if (!isNaN(qtd) && qtd > 0) body.quantidadeSolicitada = qtd;

      const res = await fetch(`/api/estoque/alertas/${alertaId}/criar-sc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || json.error || 'Erro ao criar SC');

      setScCriada(json.data.sc);
      toast({ title: 'Solicitação de Compra criada', description: json.message });
      setCriarScOpen(false);
      setQtdOverride('');
      router.refresh();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: (err as Error).message,
      });
    } finally {
      setLoadingSc(false);
    }
  };

  const handleResolver = async () => {
    setLoadingResolver(true);
    try {
      const res = await fetch(`/api/estoque/alertas/${alertaId}/resolver`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ solucao: solucao.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || json.error || 'Erro ao resolver alerta');

      toast({ title: 'Alerta resolvido' });
      setResolverOpen(false);
      setSolucao('');
      router.refresh();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: (err as Error).message,
      });
    } finally {
      setLoadingResolver(false);
    }
  };

  if (isResolvido) return null;

  return (
    <>
      <div className="flex flex-wrap gap-3">
        {materialId && (
          <>
            {scCriada ? (
              <Link href={`/estoque/solicitacoes-compra/${scCriada.id}`}>
                <Button variant="outline" size="sm" className="gap-2 text-brand-primary border-brand-primary/30">
                  <ExternalLink className="h-4 w-4" />
                  Ver SC #{scCriada.id}
                </Button>
              </Link>
            ) : (
              <Button
                onClick={() => setCriarScOpen(true)}
                size="sm"
                className="gap-2 bg-brand-primary hover:bg-brand-primary/90"
                aria-label="Criar solicitação de compra para este material"
              >
                <ShoppingCart className="h-4 w-4" />
                Criar Solicitação de Compra
              </Button>
            )}
          </>
        )}

        <Button
          onClick={() => setResolverOpen(true)}
          size="sm"
          variant="outline"
          className="gap-2"
          aria-label="Marcar alerta como resolvido"
        >
          <CheckCircle2 className="h-4 w-4" />
          Marcar como Resolvido
        </Button>
      </div>

      {/* Dialog — Criar SC */}
      <Dialog open={criarScOpen} onOpenChange={setCriarScOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Solicitação de Compra</DialogTitle>
            <DialogDescription>
              Uma SC de rascunho será criada automaticamente com a quantidade sugerida pelo
              ponto de reposição. Você pode ajustar a quantidade antes de enviar para aprovação.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="qtd-sc">
                Quantidade (deixe em branco para usar sugestão automática)
              </Label>
              <Input
                id="qtd-sc"
                type="number"
                min={1}
                step={1}
                placeholder="Sugerida pelo sistema"
                value={qtdOverride}
                onChange={(e) => setQtdOverride(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCriarScOpen(false)} disabled={loadingSc}>
              Cancelar
            </Button>
            <Button
              onClick={handleCriarSc}
              disabled={loadingSc}
              className="bg-brand-primary hover:bg-brand-primary/90"
            >
              {loadingSc ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ShoppingCart className="h-4 w-4 mr-2" />
              )}
              Criar SC
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog — Resolver */}
      <Dialog open={resolverOpen} onOpenChange={setResolverOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marcar como Resolvido</DialogTitle>
            <DialogDescription>
              Descreva brevemente como o alerta foi resolvido. Este registro ficará no histórico.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="solucao-resolver">Solução aplicada (opcional)</Label>
            <Textarea
              id="solucao-resolver"
              placeholder="Ex: Material reposto, equipamento devolvido, calibração realizada..."
              value={solucao}
              onChange={(e) => setSolucao(e.target.value)}
              className="resize-none h-24"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolverOpen(false)} disabled={loadingResolver}>
              Cancelar
            </Button>
            <Button
              onClick={handleResolver}
              disabled={loadingResolver}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {loadingResolver ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Confirmar Resolução
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
