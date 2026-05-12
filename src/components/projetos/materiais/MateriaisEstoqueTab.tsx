/**
 * MateriaisEstoqueTab — Aba de materiais de estoque no projeto
 *
 * Lista os materiais reservados/pendentes do estoque para o projeto via
 * GET /api/projetos/[id]/materiais-estoque
 *
 * Funcionalidades:
 *  - Listagem de alocações com status visual (RESERVADA, PENDENTE_SC, UTILIZADA, CANCELADA)
 *  - Botão "Verificar Disponibilidade" → POST /api/projetos/[id]/materiais-estoque/verificar-reservas
 *  - Botão "Adicionar Material" → dialog com form
 *  - Stats: total reservado, total pendente SC
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@gladpros/ui/button';
import { Badge } from '@gladpros/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@gladpros/ui/card';
import { Loading } from '@gladpros/ui/loading';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@gladpros/ui/dialog';
import { Input } from '@gladpros/ui/input';
import { Label } from '@gladpros/ui/label';
import { useToast } from '@/shared/hooks/use-toast';
import {
  AlertCircle,
  Box,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Package,
  Plus,
  RefreshCcw,
  ShoppingCart,
  XCircle,
} from 'lucide-react';
import { MaterialSearchCombobox, type EmbalagemOption } from '@/components/propostas/MaterialSearchCombobox';

type AlocacaoStatus = 'RESERVADA' | 'PENDENTE_SC' | 'UTILIZADA' | 'CANCELADA';

type Alocacao = {
  id: number;
  projetoId: number;
  materialId: number;
  quantidadeReservada: number;
  custoUnitario: number | null;
  cobrarCliente: boolean;
  status: AlocacaoStatus;
  observacoes: string | null;
  criadoEm: string;
  material: {
    id: number;
    codigo: string;
    nome: string;
    unidade: { codigo: string; nome: string } | null;
  };
};

type VerificarResult = {
  promovidos: number;
  aindaPendentes: number;
  scAtualizada: number | null;
  scCriada: number | null;
};

type Props = {
  projetoId: number;
};

const STATUS_CONFIG: Record<AlocacaoStatus, { label: string; className: string; icon: React.ReactNode }> = {
  RESERVADA: {
    label: 'Reservado',
    className: 'bg-green-500/10 text-green-600',
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  PENDENTE_SC: {
    label: 'Aguardando Compra',
    className: 'bg-yellow-500/10 text-yellow-600',
    icon: <ShoppingCart className="h-3.5 w-3.5" />,
  },
  UTILIZADA: {
    label: 'Utilizado',
    className: 'bg-blue-500/10 text-blue-600',
    icon: <Package className="h-3.5 w-3.5" />,
  },
  CANCELADA: {
    label: 'Cancelado',
    className: 'bg-muted text-muted-foreground',
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
};

export function MateriaisEstoqueTab({ projetoId }: Props) {
  const { toast } = useToast();
  const [alocacoes, setAlocacoes] = useState<Alocacao[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingVerificar, setLoadingVerificar] = useState(false);
  const [loadingAdicionar, setLoadingAdicionar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificarResult, setVerificarResult] = useState<VerificarResult | null>(null);

  // Adicionar material form
  const [adicionarOpen, setAdicionarOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    materialId: null as number | null,
    materialNome: '',
    quantidade: '',
    custo: '',
    tipoEntrada: 'unidade' as 'unidade' | 'embalagem',
    embalagemId: null as number | null,
    qtdEmbalagens: 1,
    embalagemOpcoes: [] as EmbalagemOption[],
    // Manual embalagem fields (used when no pre-registered options exist)
    embalagemBaseQtyAtTime: null as number | null,
    embalagemPrecoAtTime: null as number | null,
    embalagemUnitAtTime: '' as string,
  });

  const resetAddForm = () =>
    setAddForm({
      materialId: null,
      materialNome: '',
      quantidade: '',
      custo: '',
      tipoEntrada: 'unidade',
      embalagemId: null,
      qtdEmbalagens: 1,
      embalagemOpcoes: [],
      embalagemBaseQtyAtTime: null,
      embalagemPrecoAtTime: null,
      embalagemUnitAtTime: '',
    });

  const loadAlocacoes = useCallback(async () => {
    try {
      setLoadingData(true);
      setError(null);
      const res = await fetch(`/api/projetos/${projetoId}/materiais-estoque`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Erro ao carregar materiais');
      setAlocacoes(json.data?.alocacoes ?? []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoadingData(false);
    }
  }, [projetoId]);

  useEffect(() => {
    loadAlocacoes();
  }, [loadAlocacoes]);

  const handleVerificar = async () => {
    setLoadingVerificar(true);
    setVerificarResult(null);
    try {
      const res = await fetch(`/api/projetos/${projetoId}/materiais-estoque/verificar-reservas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Erro ao verificar disponibilidade');
      setVerificarResult(json.data);
      toast({ title: 'Verificação concluída', description: json.message });
      await loadAlocacoes();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: (err as Error).message,
      });
    } finally {
      setLoadingVerificar(false);
    }
  };

  const handleAdicionar = async () => {
    const { materialId } = addForm;
    const quantidade = parseFloat(addForm.quantidade);

    if (!materialId) {
      toast({ variant: 'destructive', title: 'Selecione um material' });
      return;
    }
    if (isNaN(quantidade) || quantidade <= 0) {
      toast({ variant: 'destructive', title: 'Informe uma quantidade válida' });
      return;
    }

    setLoadingAdicionar(true);
    try {
      const body: Record<string, unknown> = { materialId, quantidade };
      const custo = parseFloat(addForm.custo);
      if (!isNaN(custo) && custo > 0) body.custoUnitario = custo;

      if (addForm.tipoEntrada === 'embalagem') {
        if (addForm.embalagemId) {
          const emb = addForm.embalagemOpcoes.find((e) => e.id === addForm.embalagemId);
          if (emb) {
            body.embalagemId = emb.id;
            body.qtdEmbalagens = addForm.qtdEmbalagens;
            body.embalagemBaseQtyAtTime = emb.baseQtyPerUnit;
            body.embalagemPrecoAtTime = emb.precoCompra;
            body.embalagemUnitAtTime = emb.packageType;
          }
        } else if (addForm.embalagemBaseQtyAtTime) {
          // Manual embalagem (no pre-registered option)
          body.qtdEmbalagens = addForm.qtdEmbalagens;
          body.embalagemBaseQtyAtTime = addForm.embalagemBaseQtyAtTime;
          body.embalagemPrecoAtTime = addForm.embalagemPrecoAtTime;
          body.embalagemUnitAtTime = addForm.embalagemUnitAtTime || null;
        }
      }

      const res = await fetch(`/api/projetos/${projetoId}/materiais-estoque`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Erro ao adicionar material');

      const acao = json.data?.acao;
      toast({
        title: acao === 'RESERVADA' ? 'Material reservado!' : 'SC criada automaticamente',
        description: json.message,
      });
      setAdicionarOpen(false);
      resetAddForm();
      await loadAlocacoes();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: (err as Error).message,
      });
    } finally {
      setLoadingAdicionar(false);
    }
  };

  // Stats
  const reservadas = alocacoes.filter((a) => a.status === 'RESERVADA').length;
  const pendentes = alocacoes.filter((a) => a.status === 'PENDENTE_SC').length;
  const utilizadas = alocacoes.filter((a) => a.status === 'UTILIZADA').length;
  const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

  if (loadingData) {
    return <Loading text="Carregando materiais do estoque..." />;
  }

  if (error) {
    return (
      <Card className="border-destructive/30 bg-destructive/10">
        <CardContent className="py-8 flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <p>{error}</p>
          <Button variant="outline" size="sm" className="ml-4" onClick={loadAlocacoes}>
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header com stats e ações */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex gap-3 flex-wrap">
          <StatChip
            label="Reservados"
            value={reservadas}
            color="text-green-600"
            icon={<CheckCircle2 className="h-4 w-4" />}
          />
          <StatChip
            label="Aguard. Compra"
            value={pendentes}
            color="text-yellow-600"
            icon={<ShoppingCart className="h-4 w-4" />}
          />
          <StatChip
            label="Utilizados"
            value={utilizadas}
            color="text-blue-600"
            icon={<Package className="h-4 w-4" />}
          />
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleVerificar}
            disabled={loadingVerificar || pendentes === 0}
            variant="outline"
            size="sm"
            className="gap-2"
            aria-label="Verificar disponibilidade de materiais pendentes"
            title={pendentes === 0 ? 'Nenhum material aguardando compra' : 'Verificar se há estoque disponível para os itens pendentes'}
          >
            {loadingVerificar ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="h-4 w-4" />
            )}
            Verificar Disponibilidade
          </Button>
          <Button
            onClick={() => setAdicionarOpen(true)}
            size="sm"
            className="gap-2 bg-brand-primary hover:bg-brand-primary/90"
            aria-label="Adicionar material ao estoque do projeto"
          >
            <Plus className="h-4 w-4" />
            Adicionar Material
          </Button>
        </div>
      </div>

      {/* Resultado da verificação */}
      {verificarResult && (
        <div className="rounded-2xl border border-brand-primary/30 bg-brand-primary/5 p-4 text-sm">
          <p className="font-semibold text-brand-primary mb-2 flex items-center gap-2">
            <RefreshCcw className="h-4 w-4" />
            Resultado da Verificação
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-muted-foreground">
            <span>Promovidos para Reservado:</span>
            <span className="font-bold text-green-600">{verificarResult.promovidos}</span>
            <span>Ainda aguardando compra:</span>
            <span className="font-bold text-yellow-600">{verificarResult.aindaPendentes}</span>
          </div>
          {verificarResult.scCriada && (
            <div className="mt-2">
              <Link href={`/estoque/solicitacoes-compra/${verificarResult.scCriada}`}>
                <Button variant="link" size="sm" className="h-auto p-0 text-xs text-brand-primary gap-1">
                  <ExternalLink className="h-3 w-3" />
                  SC #{verificarResult.scCriada} criada para itens pendentes
                </Button>
              </Link>
            </div>
          )}
          {verificarResult.scAtualizada && !verificarResult.scCriada && (
            <div className="mt-2">
              <Link href={`/estoque/solicitacoes-compra/${verificarResult.scAtualizada}`}>
                <Button variant="link" size="sm" className="h-auto p-0 text-xs text-brand-primary gap-1">
                  <ExternalLink className="h-3 w-3" />
                  SC #{verificarResult.scAtualizada} atualizada
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Lista vazia */}
      {alocacoes.length === 0 && (
        <Card className="border-none shadow-sm">
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-4 text-center">
              <Box className="h-12 w-12 text-muted-foreground" />
              <div>
                <h3 className="font-medium text-foreground">Nenhum material de estoque alocado</h3>
                <p className="text-sm text-muted-foreground">
                  Adicione materiais para reservar ou criar SCs automaticamente
                </p>
              </div>
              <Button
                onClick={() => setAdicionarOpen(true)}
                size="sm"
                className="gap-2 bg-brand-primary hover:bg-brand-primary/90"
              >
                <Plus className="h-4 w-4" />
                Adicionar Primeiro Material
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de alocações */}
      {alocacoes.length > 0 && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Materiais do Estoque ({alocacoes.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-xs">
                    <th className="text-left py-3 px-4">Material</th>
                    <th className="text-right py-3 px-4">Qtd</th>
                    <th className="text-left py-3 px-4">Und</th>
                    <th className="text-right py-3 px-4">Custo Unit.</th>
                    <th className="text-right py-3 px-4">Total</th>
                    <th className="text-center py-3 px-4">Cobrar Cliente</th>
                    <th className="text-right py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {alocacoes.map((a) => {
                    const cfg = STATUS_CONFIG[a.status];
                    const total = a.custoUnitario
                      ? Number(a.custoUnitario) * Number(a.quantidadeReservada)
                      : null;
                    return (
                      <tr key={a.id} className="hover:bg-muted/5 transition-colors">
                        <td className="py-3 px-4">
                          <p className="font-medium text-foreground">{a.material.nome}</p>
                          <p className="text-xs text-muted-foreground">{a.material.codigo}</p>
                        </td>
                        <td className="text-right py-3 px-4 tabular-nums font-medium">
                          {Number(a.quantidadeReservada).toLocaleString('en-US')}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {a.material.unidade?.codigo ?? '—'}
                        </td>
                        <td className="text-right py-3 px-4 tabular-nums">
                          {a.custoUnitario ? fmt.format(Number(a.custoUnitario)) : '—'}
                        </td>
                        <td className="text-right py-3 px-4 tabular-nums">
                          {total ? fmt.format(total) : '—'}
                        </td>
                        <td className="text-center py-3 px-4">
                          {a.cobrarCliente ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
                          ) : (
                            <XCircle className="h-4 w-4 text-muted-foreground mx-auto" />
                          )}
                        </td>
                        <td className="text-right py-3 px-4">
                          <Badge className={`gap-1 text-xs ${cfg.className}`}>
                            {cfg.icon}
                            {cfg.label}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog — Adicionar Material */}
      <Dialog open={adicionarOpen} onOpenChange={(open) => { setAdicionarOpen(open); if (!open) resetAddForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Material ao Projeto</DialogTitle>
            <DialogDescription>
              O sistema verificará o saldo disponível. Se houver estoque suficiente, o material
              será reservado automaticamente. Caso contrário, uma SC de rascunho será criada.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Busca de material */}
            <div className="space-y-2">
              <Label>Material</Label>
              <MaterialSearchCombobox
                onSelect={(id, nome, embalagens) => {
                  setAddForm((f) => ({
                    ...f,
                    materialId: id,
                    materialNome: nome,
                    embalagemOpcoes: embalagens,
                    tipoEntrada: 'unidade',
                    embalagemId: null,
                    qtdEmbalagens: 1,
                    quantidade: '',
                    custo: '',
                  }));
                }}
              />
            </div>

            {/* Toggle embalagem — shown when material is selected */}
            {addForm.materialId && (
              <div className="flex rounded-lg border border-border overflow-hidden text-sm">
                <button
                  type="button"
                  onClick={() => setAddForm((f) => ({
                    ...f,
                    tipoEntrada: 'unidade',
                    embalagemId: null,
                    qtdEmbalagens: 1,
                    embalagemBaseQtyAtTime: null,
                    embalagemPrecoAtTime: null,
                    embalagemUnitAtTime: '',
                  }))}
                  className={`flex-1 px-3 py-2 transition-colors ${addForm.tipoEntrada === 'unidade' ? 'bg-brand-primary text-white font-medium' : 'bg-background text-muted-foreground hover:bg-muted/30'}`}
                >
                  Por Unidade
                </button>
                <button
                  type="button"
                  onClick={() => setAddForm((f) => ({ ...f, tipoEntrada: 'embalagem' }))}
                  className={`flex-1 px-3 py-2 gap-1 flex items-center justify-center transition-colors ${addForm.tipoEntrada === 'embalagem' ? 'bg-brand-primary text-white font-medium' : 'bg-background text-muted-foreground hover:bg-muted/30'}`}
                >
                  <Package className="h-3.5 w-3.5" />
                  Em Embalagem
                </button>
              </div>
            )}

            {/* Seleção de embalagem */}
            {addForm.tipoEntrada === 'embalagem' && addForm.embalagemOpcoes.length > 0 && (
              <div className="space-y-3 rounded-xl border border-brand-primary/30 bg-brand-primary/5 p-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Embalagem</Label>
                  <select
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                    value={addForm.embalagemId ?? ''}
                    onChange={(e) => {
                      const id = Number(e.target.value) || null;
                      const emb = addForm.embalagemOpcoes.find((o) => o.id === id);
                      setAddForm((f) => ({
                        ...f,
                        embalagemId: id,
                        custo: emb ? String(((emb.precoCompra ?? 0) / emb.baseQtyPerUnit).toFixed(4)) : f.custo,
                        quantidade: emb ? String(f.qtdEmbalagens * emb.baseQtyPerUnit) : f.quantidade,
                      }));
                    }}
                  >
                    <option value="">Selecione a embalagem…</option>
                    {addForm.embalagemOpcoes.map((emb) => (
                      <option key={emb.id} value={emb.id}>
                        {emb.packageType.charAt(0).toUpperCase() + emb.packageType.slice(1).toLowerCase()} — {emb.baseQtyPerUnit} {emb.purchaseUnit} — ${(emb.precoCompra ?? 0).toFixed(2)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Quantidade de embalagens</Label>
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    value={addForm.qtdEmbalagens}
                    onChange={(e) => {
                      const qty = Math.max(1, parseInt(e.target.value) || 1);
                      const emb = addForm.embalagemOpcoes.find((o) => o.id === addForm.embalagemId);
                      setAddForm((f) => ({
                        ...f,
                        qtdEmbalagens: qty,
                        quantidade: emb ? String(qty * emb.baseQtyPerUnit) : f.quantidade,
                      }));
                    }}
                  />
                </div>
                {addForm.embalagemId && (() => {
                  const emb = addForm.embalagemOpcoes.find((o) => o.id === addForm.embalagemId);
                  if (!emb) return null;
                  return (
                    <p className="text-xs text-muted-foreground">
                      = <strong>{addForm.qtdEmbalagens * emb.baseQtyPerUnit} {emb.purchaseUnit}</strong> total
                      &nbsp;·&nbsp; $<strong>{((emb.precoCompra ?? 0) / emb.baseQtyPerUnit).toFixed(4)}</strong> por {emb.purchaseUnit}
                    </p>
                  );
                })()}
              </div>
            )}

            {/* Manual embalagem — when no pre-registered options */}
            {addForm.tipoEntrada === 'embalagem' && addForm.embalagemOpcoes.length === 0 && (
              <div className="space-y-3 rounded-xl border border-brand-primary/30 bg-brand-primary/5 p-3">
                <p className="text-xs text-muted-foreground">Sem embalagens cadastradas — preencha manualmente:</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Tipo de embalagem</Label>
                    <select
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                      value={addForm.embalagemUnitAtTime}
                      onChange={(e) => setAddForm((f) => ({ ...f, embalagemUnitAtTime: e.target.value }))}
                    >
                      <option value="">Selecione...</option>
                      {['ROLL','PACK','BOX','BAG','STICK','BUNDLE','PALLET','UNIT'].map(t => (
                        <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Qtd por embalagem</Label>
                    <Input
                      type="number" min={0.001} step="any"
                      placeholder="Ex: 100"
                      value={addForm.embalagemBaseQtyAtTime ?? ''}
                      onChange={(e) => {
                        const baseQty = Math.max(0.001, Number(e.target.value) || 0);
                        setAddForm((f) => ({
                          ...f,
                          embalagemBaseQtyAtTime: baseQty,
                          quantidade: String(f.qtdEmbalagens * baseQty),
                        }));
                      }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Preço por embalagem ($)</Label>
                    <Input
                      type="number" min={0} step="0.01"
                      placeholder="Ex: 45.00"
                      value={addForm.embalagemPrecoAtTime ?? ''}
                      onChange={(e) => {
                        const pkgPrice = Number(e.target.value) || 0;
                        const baseQty = addForm.embalagemBaseQtyAtTime ?? 1;
                        setAddForm((f) => ({
                          ...f,
                          embalagemPrecoAtTime: pkgPrice,
                          custo: baseQty > 0 ? String((pkgPrice / baseQty).toFixed(4)) : f.custo,
                        }));
                      }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Quantidade de embalagens</Label>
                    <Input
                      type="number" min={1} step={1}
                      value={addForm.qtdEmbalagens}
                      onChange={(e) => {
                        const qty = Math.max(1, parseInt(e.target.value) || 1);
                        const baseQty = addForm.embalagemBaseQtyAtTime ?? 0;
                        setAddForm((f) => ({
                          ...f,
                          qtdEmbalagens: qty,
                          quantidade: baseQty > 0 ? String(qty * baseQty) : f.quantidade,
                        }));
                      }}
                    />
                  </div>
                </div>
                {addForm.embalagemBaseQtyAtTime && addForm.qtdEmbalagens > 0 && (
                  <p className="text-xs text-muted-foreground">
                    = <strong>{addForm.qtdEmbalagens * addForm.embalagemBaseQtyAtTime}</strong> unidades total
                    {addForm.embalagemPrecoAtTime && addForm.embalagemBaseQtyAtTime > 0 && (
                      <>&nbsp;·&nbsp; $<strong>{(addForm.embalagemPrecoAtTime / addForm.embalagemBaseQtyAtTime).toFixed(4)}</strong> por unidade</>
                    )}
                  </p>
                )}
              </div>
            )}

            {/* Quantidade (unidade) */}
            {addForm.tipoEntrada === 'unidade' && (
              <div className="space-y-2">
                <Label htmlFor="pme-quantidade">Quantidade Necessária</Label>
                <Input
                  id="pme-quantidade"
                  type="number"
                  min={0.01}
                  step={0.01}
                  placeholder="Ex: 10"
                  value={addForm.quantidade}
                  onChange={(e) => setAddForm((f) => ({ ...f, quantidade: e.target.value }))}
                />
              </div>
            )}

            {/* Custo unitário estimado */}
            <div className="space-y-2">
              <Label htmlFor="pme-custo">Custo Unitário Estimado ($) — opcional</Label>
              <Input
                id="pme-custo"
                type="number"
                min={0.01}
                step={0.01}
                placeholder="Ex: 12.50"
                value={addForm.custo}
                onChange={(e) => setAddForm((f) => ({ ...f, custo: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdicionarOpen(false)} disabled={loadingAdicionar}>
              Cancelar
            </Button>
            <Button
              onClick={handleAdicionar}
              disabled={loadingAdicionar}
              className="bg-brand-primary hover:bg-brand-primary/90"
            >
              {loadingAdicionar ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Adicionar Material
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatChip({
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
    <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2">
      <span className={color}>{icon}</span>
      <div>
        <p className="text-xs text-muted-foreground leading-none">{label}</p>
        <p className={`text-lg font-bold leading-tight ${color}`}>{value}</p>
      </div>
    </div>
  );
}
