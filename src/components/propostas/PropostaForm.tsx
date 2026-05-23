'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { MaterialSearchCombobox, type EmbalagemOption } from './MaterialSearchCombobox';
import { HoursInput } from './HoursInput';
import { useRouter } from 'next/navigation';
import { authenticatedFetch } from '@/lib/api/client';
import {
  StatusProposta,
  StatusPropostaValues,
  StatusPermite,
  StatusPermiteValues,
} from '@/shared/types/prisma-temp';
import { Badge } from '@gladpros/ui/badge';
import { Button } from '@gladpros/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@gladpros/ui/card';
import { Input } from '@gladpros/ui/input';
import { Label } from '@gladpros/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@gladpros/ui/select';
import { Textarea } from '@gladpros/ui/textarea';
import { useToast } from '@gladpros/ui/toast';
import { useClientes } from './ClientesContext';
/* Removing ui-components imports */
/*
import {
    gp,
    Label,
    Input,
    Textarea,
    Select,
    Section,
    Badge,
    currency
} from './ui-components'
*/
// Re-implement currency helper locally or import if available.
// I'll keep it simple locally for now.
const currency = (n: number | undefined) => {
  if (n == null || Number.isNaN(n)) return '-';
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
};

/** Format packaging type to human-readable label, e.g. "ROLL" → "Roll" */
const formatPkgType = (t: string) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();

import {
  Material,
  Etapa,
  PropostaFormData,
  ClienteInfo,
  PrazosInfo,
  ComerciaisInfo,
  InternoInfo,
  FaturamentoInfo,
} from './types';
import { useCalcularTotais } from './hooks';
import { useAutoSave } from './useAutoSave';
import { propostaFormSchema } from './validation';
import { TemplateSelector, type TemplateData } from './TemplateSelector';
import { SaveAsTemplateButton } from './SaveAsTemplateButton';
import { EstimadorWizard } from './estimador/EstimadorWizard';
import type { EstimadorResult } from './estimador/types';

interface PropostaFormProps {
  initialData?: PropostaFormData;
  propostaId?: string;
}

export default function PropostaForm({ initialData, propostaId }: PropostaFormProps) {
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [status, setStatus] = useState<StatusProposta>(
    initialData?.status || StatusPropostaValues.RASCUNHO,
  );
  const router = useRouter();
  const { addToast: showToast } = useToast();

  // Usar o contexto de clientes
  const { clientes, loading: clientesLoading, error: clientesError } = useClientes();

  // Estados do formulário
  const [cliente, setCliente] = useState<ClienteInfo>(
    initialData?.cliente || {
      id: '',
      contato_nome: '',
      contato_email: '',
      contato_telefone: '',
      local_endereco: '',
      titulo: '',
    },
  );

  // When editing an existing proposal, check if service address differs from client address
  // to determine the initial toggle state
  const [sameClientAddress, setSameClientAddress] = useState<boolean>(() => {
    if (!initialData?.cliente) return true;
    const c = initialData.cliente;
    // If structured service address fields exist, assume user set them manually
    return !c.serviceAddressLine1;
  });

  const [escopo, setEscopo] = useState(initialData?.escopo || '');

  const [prazos, setPrazos] = useState<PrazosInfo>(
    initialData?.prazos || {
      tempo_para_aceite: 7,
      validade_proposta: '',
      prazo_execucao_dias: 5,
      janela: '',
      restricoes: '',
    },
  );

  // Auto-calculate Data Limite from days — only for new proposals (no initialData)
  const [autoValidade, setAutoValidade] = useState<boolean>(
    !initialData?.prazos?.validade_proposta,
  );

  useEffect(() => {
    if (!autoValidade || prazos.tempo_para_aceite <= 0) return;
    // Use local date to avoid UTC off-by-one (e.g. in America/Chicago)
    const base = new Date();
    base.setDate(base.getDate() + prazos.tempo_para_aceite);
    const y = base.getFullYear();
    const m = String(base.getMonth() + 1).padStart(2, '0');
    const d = String(base.getDate()).padStart(2, '0');
    setPrazos((prev) => ({ ...prev, validade_proposta: `${y}-${m}-${d}` }));
  }, [prazos.tempo_para_aceite, autoValidade]);

  const [permite] = useState<StatusPermite>(
    initialData?.permite || StatusPermiteValues.NAO_NECESSARIO,
  );
  const [quaisPermites] = useState(initialData?.quaisPermites || '');
  const [normas] = useState(initialData?.normas || '');
  const [inspecoes] = useState(initialData?.inspecoes || '');

  const [comerciais, setComerciais] = useState<ComerciaisInfo>(
    initialData?.comerciais || {
      condicoes_pagamento: '',
      garantia: '',
      exclusoes: '',
      condicoes_gerais: '',
      desconto: 0,
    },
  );

  const [interno, setInterno] = useState<InternoInfo>(
    initialData?.interno || {
      custo_material: 0,
      custo_mo: 0,
      horas_mo: 0,
      custo_terceiros: 0,
      overhead_pct: 12,
      margem_pct: 20,
      impostos_pct: 0,
      contingencia_pct: 0,
      frete: 0,
    },
  );

  const [materiais, setMateriais] = useState<Material[]>(initialData?.materiais || []);

  const [etapas, setEtapas] = useState<Etapa[]>(initialData?.etapas || []);

  const [faturamento] = useState<FaturamentoInfo>(
    initialData?.faturamento || {
      gatilho: 'na_aprovacao',
      percentual_sinal: 40,

      forma_preferida: 'Invoice',
      instrucoes: '',
    },
  );

  const [obsCliente, setObsCliente] = useState(initialData?.obsCliente || '');
  const [obsInternas] = useState(initialData?.obsInternas || '');

  // Tax classification state
  const [propertyType, setPropertyType] = useState<PropostaFormData['propertyType']>(
    initialData?.propertyType ?? 'RESIDENTIAL',
  );
  const [serviceCategory, setServiceCategory] = useState<PropostaFormData['serviceCategory']>(
    initialData?.serviceCategory ?? 'REPAIR',
  );
  const [contractType, setContractType] = useState<PropostaFormData['contractType']>(
    initialData?.contractType ?? 'LUMP_SUM',
  );

  // Stock availability check state (populated when material is auto-linked from estoque)
  const [estoqueCheck] = useState<
    Record<number, { disponivel: number; needsToPurchase: boolean; shortfall: number }>
  >({});

  // Embalagem options per estoqueItemId (populated when user selects a material that has packaged entries)
  const [embalagemOpcoes, setEmbalagemOpcoes] = useState<Record<number, EmbalagemOption[]>>({});

  // Refs for auto-scroll when adding rows
  const materialsEndRef = useRef<HTMLDivElement>(null);
  const etapasEndRef = useRef<HTMLDivElement>(null);

  // Smart Estimator
  const [showEstimador, setShowEstimador] = useState(false);

  const handleApplyEstimativa = (result: EstimadorResult) => {
    setEtapas(
      result.etapas.map((e) => ({
        id: crypto.randomUUID(),
        servico: e.servico,
        descricao: e.descricao ?? '',
        quantidade: e.quantidade,
        unidade: e.unidade,
        duracaoHoras: e.duracaoHoras ?? 0,
        custoMO: e.custoMO ?? 0,
        status: 'planejada',
      })),
    );
    setMateriais(
      result.materiais.map((m) => ({
        id: crypto.randomUUID(),
        codigo: m.codigo ?? '',
        nome: m.nome,
        quantidade: m.quantidade,
        unidade: m.unidade,
        preco: m.preco ?? 0,
        status: 'necessario' as const,
        aComprar: true,
      })),
    );
    if (result.escopoTexto) setEscopo(result.escopoTexto);
    setInterno((prev) => ({
      ...prev,
      custo_material: result.custoMaterial,
      custo_mo: result.custoMO,
    }));
  };

  // Exibir erro de clientes se houver
  useEffect(() => {
    if (clientesError) {
      showToast({
        title: 'Erro',
        message: 'Erro ao carregar lista de clientes',
        type: 'error',
      });
    }
  }, [clientesError, showToast]);

  // Cálculos automáticos
  const totais = useCalcularTotais(materiais, interno);

  // Auto-save automático
  const formData: PropostaFormData = useMemo(
    () => ({
      cliente,
      escopo,
      prazos,
      permite,
      quaisPermites,
      normas,
      inspecoes,
      materiais,
      etapas,
      comerciais,
      interno,
      faturamento,
      obsCliente,
      obsInternas,
      status,
      propertyType,
      serviceCategory,
      contractType,
    }),
    [
      cliente,
      escopo,
      prazos,
      permite,
      quaisPermites,
      normas,
      inspecoes,
      materiais,
      etapas,
      comerciais,
      interno,
      faturamento,
      obsCliente,
      obsInternas,
      status,
      propertyType,
      serviceCategory,
      contractType,
    ],
  );

  const { debouncedSave } = useAutoSave(formData, !loading && !propostaId);

  useEffect(() => {
    if (!propostaId && cliente.id && escopo.length > 5) {
      debouncedSave(formData);
    }
  }, [formData, cliente.id, debouncedSave, escopo.length, propostaId]);

  // Handlers utilitários
  const addMaterial = () => {
    setMateriais((arr) => [
      ...arr,
      {
        id: crypto.randomUUID(),
        codigo: '',
        nome: '',
        quantidade: 1,
        unidade: 'un',
        status: 'necessario',
        aComprar: true,
      },
    ]);
    setTimeout(
      () => materialsEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }),
      50,
    );
  };
  const rmMaterial = (id: string) => setMateriais((arr) => arr.filter((m) => m.id !== id));

  const addEtapa = () => {
    setEtapas((arr) => [
      ...arr,
      {
        id: crypto.randomUUID(),
        servico: '',
        descricao: '',
        quantidade: 1,
        unidade: 'serviço',
        status: 'planejada',
      },
    ]);
    setTimeout(
      () => etapasEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }),
      50,
    );
  };
  const rmEtapa = (id: string) => setEtapas((arr) => arr.filter((e) => e.id !== id));

  const handleApplyTemplate = (data: TemplateData) => {
    if (data.titulo) setCliente((prev) => ({ ...prev, titulo: data.titulo! }));
    if (data.escopo) setEscopo(data.escopo);
    if (data.condicoes) setComerciais((prev) => ({ ...prev, condicoes_gerais: data.condicoes! }));
    if (data.observacoes) setObsCliente(data.observacoes);
    if (data.etapasJson) {
      try {
        const parsed = JSON.parse(data.etapasJson);
        if (Array.isArray(parsed)) {
          setEtapas(
            parsed.map((e: Record<string, unknown>) => ({
              ...e,
              id: crypto.randomUUID(),
            })) as Etapa[],
          );
        }
      } catch {
        /* invalid JSON — ignore */
      }
    }
    if (data.materiaisJson) {
      try {
        const parsed = JSON.parse(data.materiaisJson);
        if (Array.isArray(parsed)) {
          setMateriais(
            parsed.map((m: Record<string, unknown>) => ({
              ...m,
              id: crypto.randomUUID(),
            })) as Material[],
          );
        }
      } catch {
        /* invalid JSON — ignore */
      }
    }
  };

  const handleClienteChange = (clienteId: string) => {
    const clienteSelecionado = clientes.find((c) => c.id === clienteId);
    if (clienteSelecionado) {
      // Build a best-effort service address from client address fields
      const clientAddress = [
        clienteSelecionado.addressStreet,
        clienteSelecionado.addressUnit,
        clienteSelecionado.addressCity,
        clienteSelecionado.addressState,
        clienteSelecionado.addressZip,
      ]
        .filter(Boolean)
        .join(', ');

      setCliente((prev) => ({
        ...prev,
        id: clienteId,
        contato_nome: clienteSelecionado.nomeCompleto,
        contato_email: clienteSelecionado.email,
        contato_telefone: clienteSelecionado.telefone || '',
        local_endereco: clientAddress || prev.local_endereco,
        // Pre-populate structured service address from client
        serviceAddressLine1: clienteSelecionado.addressStreet || '',
        serviceAddressLine2: clienteSelecionado.addressUnit || '',
        serviceAddressCity: clienteSelecionado.addressCity || '',
        serviceAddressState: clienteSelecionado.addressState || 'TX',
        serviceAddressZip: clienteSelecionado.addressZip || '',
      }));
      // Default: same address as client
      setSameClientAddress(true);
    }
  };

  const handleSalvar = async (isDraft = false) => {
    setSaveStatus('saving');
    setLoading(true);
    try {
      const parseResult = propostaFormSchema.safeParse(formData);
      if (!parseResult.success) {
        const firstIssue = parseResult.error.issues[0];
        const path = firstIssue.path.filter((p) => typeof p === 'string' && p !== 'id').join(' → ');
        const msg = path ? `${firstIssue.message} (${path})` : firstIssue.message;
        throw new Error(msg);
      }
      const validatedData = parseResult.data;
      const url = propostaId ? `/api/propostas/${propostaId}` : '/api/propostas';
      const method = propostaId ? 'PUT' : 'POST';
      // Use authenticatedFetch with noRedirectOn401 to preserve form data
      // on session expiry — user can log in on another tab and come back to save.
      const response = await authenticatedFetch(
        url,
        {
          method: method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validatedData),
        },
        { noRedirectOn401: true },
      );

      if (response.status === 401) {
        setSaveStatus('error');
        showToast({
          title: 'Sessão expirada',
          message:
            'Sua sessão expirou. Abra uma nova aba, faça login e volte aqui para salvar — seus dados estão preservados.',
          type: 'error',
        });
        return;
      }

      if (response.ok) {
        const result = await response.json();
        setSaveStatus('saved');
        showToast({
          title: 'Sucesso',
          message: isDraft
            ? 'Rascunho salvo com sucesso!'
            : propostaId
              ? 'Proposta atualizada!'
              : 'Proposta criada com sucesso!',
          type: 'success',
        });

        if (!isDraft && result.proposta?.id && !propostaId) {
          router.push(`/propostas/${result.proposta.id}`);
        }
        if (propostaId) {
          router.refresh();
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao salvar proposta');
      }
    } catch (error) {
      setSaveStatus('error');
      showToast({
        title: 'Erro ao salvar',
        message: error instanceof Error ? error.message : 'Erro ao salvar proposta',
        type: 'error',
      });
    } finally {
      setLoading(false);
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const _statusBadgeVariant = status === StatusPropostaValues.APROVADA ? 'success' : 'destructive';
  const statusLabel =
    status === StatusPropostaValues.RASCUNHO
      ? 'Rascunho'
      : status === StatusPropostaValues.APROVADA
        ? 'Aprovada'
        : 'Cancelada';

  return (
    <div className="min-h-screen bg-background">
      {/* Header Sticky */}
      <div className="sticky top-0 z-20 mx-auto max-w-8xl px-6 py-4 bg-background/80 backdrop-blur-md border-b border-border flex items-center justify-between">
        <div>
          <h2 className="font-title text-xl text-foreground">
            {propostaId ? `Editar Proposta #${propostaId}` : 'Nova Proposta'}
          </h2>
          <p className="text-sm text-muted-foreground">Detalhes do projeto e orçamento.</p>
        </div>
        <div className="flex items-center gap-3">
          {status === StatusPropostaValues.RASCUNHO && (
            <div className="hidden sm:flex items-center rounded-xl bg-yellow-500/10 px-3 py-1 text-xs font-medium text-yellow-600">
              Rascunho
            </div>
          )}
          <TemplateSelector onSelect={handleApplyTemplate} />
          <Button
            variant="outline"
            onClick={() => setShowEstimador(true)}
            className="hidden sm:flex items-center gap-1.5 border-brand-primary/40 text-brand-primary hover:bg-brand-primary/5"
            title="Gerar estimativa de custo automaticamente"
          >
            ✨ Gerar Estimativa
          </Button>
          <SaveAsTemplateButton
            titulo={cliente.titulo}
            escopo={escopo}
            condicoes={comerciais.condicoes_gerais}
            observacoes={obsCliente}
            etapas={etapas}
            materiais={materiais}
          />
          {saveStatus === 'saving' && (
            <span className="text-xs text-muted-foreground">Salvando…</span>
          )}
          {saveStatus === 'saved' && <span className="text-xs text-emerald-600">✓ Salvo</span>}
          {saveStatus === 'error' && <span className="text-xs text-destructive">✗ Erro</span>}
          <Button
            variant="ghost"
            onClick={() => handleSalvar(true)}
            disabled={loading || clientesLoading}
          >
            {loading ? '...' : 'Salvar Rascunho'}
          </Button>
          <Button
            onClick={() => handleSalvar(false)}
            disabled={loading || clientesLoading}
            className="bg-brand-primary text-white"
          >
            {loading ? 'Processando...' : propostaId ? 'Atualizar' : 'Criar Proposta'}
          </Button>
        </div>
      </div>

      <main className="mx-auto grid max-w-8xl grid-cols-12 gap-6 px-6 py-6">
        {/* Left column (Form) */}
        <div className="col-span-12 lg:col-span-9 space-y-6">
          {/* Dados Cadastrais */}
          <Card>
            <CardHeader>
              <CardTitle>Dados Cadastrais</CardTitle>
              <CardDescription>Informações do cliente e local do serviço.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="mb-2 block">
                  Cliente{' '}
                  <span className="text-destructive" aria-hidden="true">
                    *
                  </span>
                </Label>
                {clientesLoading ? (
                  <div className="text-sm text-muted-foreground">Carregando...</div>
                ) : (
                  <Select
                    value={cliente.id}
                    onValueChange={handleClienteChange}
                    disabled={clientesLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar cliente..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clientes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nomeCompleto}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div>
                <Label className="mb-2 block">
                  Título da Proposta{' '}
                  <span className="text-destructive" aria-hidden="true">
                    *
                  </span>
                </Label>
                <Input
                  placeholder="Ex: Reforma Elétrica"
                  value={cliente.titulo}
                  onChange={(e) => setCliente({ ...cliente, titulo: e.target.value })}
                />
              </div>
              <div>
                <Label className="mb-2 block">Nome Contato</Label>
                <Input
                  value={cliente.contato_nome}
                  onChange={(e) => setCliente({ ...cliente, contato_nome: e.target.value })}
                />
              </div>
              <div>
                <Label className="mb-2 block">Email Contato</Label>
                <Input
                  value={cliente.contato_email}
                  onChange={(e) => setCliente({ ...cliente, contato_email: e.target.value })}
                />
              </div>
              {/* Service address toggle — mirrors OS module pattern */}
              <div className="md:col-span-2">
                <div className="flex items-center gap-2 py-2">
                  <input
                    type="checkbox"
                    id="sameClientAddress"
                    checked={sameClientAddress}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setSameClientAddress(checked);
                      if (checked) {
                        // Restore client's address when toggling back
                        const selected = clientes.find((c) => c.id === cliente.id);
                        if (selected) {
                          setCliente((prev) => ({
                            ...prev,
                            serviceAddressLine1: selected.addressStreet || '',
                            serviceAddressLine2: selected.addressUnit || '',
                            serviceAddressCity: selected.addressCity || '',
                            serviceAddressState: selected.addressState || 'TX',
                            serviceAddressZip: selected.addressZip || '',
                          }));
                        }
                      }
                    }}
                    className="h-4 w-4"
                    aria-label="Usar endereço do cliente como local do serviço"
                  />
                  <label
                    htmlFor="sameClientAddress"
                    className="text-sm text-foreground cursor-pointer"
                  >
                    Usar o endereço do cliente como local do serviço
                  </label>
                </div>

                {/* Read-only address preview when using client address */}
                {sameClientAddress &&
                  (cliente.serviceAddressLine1 || cliente.serviceAddressCity) && (
                    <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground mt-1">
                      <p className="font-medium text-foreground mb-1">
                        Local do serviço (endereço do cliente):
                      </p>
                      <p>
                        {[cliente.serviceAddressLine1, cliente.serviceAddressLine2]
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                      <p>
                        {[
                          cliente.serviceAddressCity,
                          cliente.serviceAddressState,
                          cliente.serviceAddressZip,
                        ]
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                    </div>
                  )}
              </div>

              {/* Editable service address fields — shown only when different from client */}
              {!sameClientAddress && (
                <>
                  <div className="md:col-span-2">
                    <Label className="mb-2 block">
                      Endereço do Serviço — Linha 1{' '}
                      <span className="text-destructive" aria-hidden="true">
                        *
                      </span>
                    </Label>
                    <Input
                      placeholder="Ex: 1234 Elm St"
                      value={cliente.serviceAddressLine1 || ''}
                      onChange={(e) =>
                        setCliente({ ...cliente, serviceAddressLine1: e.target.value })
                      }
                      aria-label="Endereço do serviço linha 1"
                    />
                  </div>
                  <div>
                    <Label className="mb-2 block">Apt / Suite / Unit</Label>
                    <Input
                      placeholder="Ex: Suite 200"
                      value={cliente.serviceAddressLine2 || ''}
                      onChange={(e) =>
                        setCliente({ ...cliente, serviceAddressLine2: e.target.value })
                      }
                      aria-label="Endereço do serviço linha 2"
                    />
                  </div>
                  <div>
                    <Label className="mb-2 block">City</Label>
                    <Input
                      placeholder="Ex: Dallas"
                      value={cliente.serviceAddressCity || ''}
                      onChange={(e) =>
                        setCliente({ ...cliente, serviceAddressCity: e.target.value })
                      }
                      aria-label="Cidade do serviço"
                    />
                  </div>
                  <div>
                    <Label className="mb-2 block">State</Label>
                    <Input
                      placeholder="TX"
                      maxLength={2}
                      value={cliente.serviceAddressState || 'TX'}
                      onChange={(e) =>
                        setCliente({
                          ...cliente,
                          serviceAddressState: e.target.value.toUpperCase(),
                        })
                      }
                      aria-label="Estado do serviço"
                    />
                  </div>
                  <div>
                    <Label className="mb-2 block">ZIP Code</Label>
                    <Input
                      placeholder="Ex: 75201"
                      value={cliente.serviceAddressZip || ''}
                      onChange={(e) =>
                        setCliente({ ...cliente, serviceAddressZip: e.target.value })
                      }
                      aria-label="ZIP Code do serviço"
                    />
                  </div>
                </>
              )}
              <div className="md:col-span-2">
                <Label className="mb-2 block">Escopo (Resumo)</Label>
                <Textarea
                  rows={3}
                  placeholder="Descrição geral do serviço..."
                  value={escopo}
                  onChange={(e) => setEscopo(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Tax Classification */}
          <Card>
            <CardHeader>
              <CardTitle>Classificação Fiscal (TX Sales Tax)</CardTitle>
              <CardDescription>
                Determina como o imposto de vendas do Texas (8.25%) é aplicado nesta proposta.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="mb-2 block">Tipo de Propriedade</Label>
                <Select
                  value={propertyType}
                  onValueChange={(v) => setPropertyType(v as PropostaFormData['propertyType'])}
                >
                  <SelectTrigger aria-label="Tipo de propriedade">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RESIDENTIAL">Residential</SelectItem>
                    <SelectItem value="COMMERCIAL">Commercial</SelectItem>
                    <SelectItem value="MIXED_USE">Mixed-Use</SelectItem>
                    <SelectItem value="EXEMPT_ORGANIZATION">Exempt Organization</SelectItem>
                    <SelectItem value="GOVERNMENT">Government</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-2 block">Tipo de Serviço</Label>
                <Select
                  value={serviceCategory}
                  onValueChange={(v) =>
                    setServiceCategory(v as PropostaFormData['serviceCategory'])
                  }
                >
                  <SelectTrigger aria-label="Tipo de serviço">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="REPAIR">Repair</SelectItem>
                    <SelectItem value="REMODEL">Remodel</SelectItem>
                    <SelectItem value="NEW_CONSTRUCTION">New Construction</SelectItem>
                    <SelectItem value="RESTORATION">Restoration</SelectItem>
                    <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                    <SelectItem value="INSPECTION">Inspection</SelectItem>
                    <SelectItem value="CONSULTATION">Consultation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-2 block">Tipo de Contrato</Label>
                <Select
                  value={contractType}
                  onValueChange={(v) => setContractType(v as PropostaFormData['contractType'])}
                >
                  <SelectTrigger aria-label="Tipo de contrato">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LUMP_SUM">Lump Sum (preço fechado)</SelectItem>
                    <SelectItem value="SEPARATED">
                      Separated (mão de obra + material separados)
                    </SelectItem>
                    <SelectItem value="COST_PLUS">Cost Plus</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-3 rounded-lg bg-muted/40 border border-border p-3 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Regra TX: </span>
                {propertyType === 'RESIDENTIAL' && contractType === 'LUMP_SUM' && (
                  <span>
                    Residencial + Lump Sum →{' '}
                    <strong className="text-green-600">Não tributável ao cliente</strong> (GladPros
                    paga tax nos materiais)
                  </span>
                )}
                {propertyType === 'RESIDENTIAL' && contractType === 'SEPARATED' && (
                  <span>
                    Residencial + Separado →{' '}
                    <strong className="text-yellow-600">Apenas materiais tributados (8.25%)</strong>
                  </span>
                )}
                {propertyType === 'COMMERCIAL' && (
                  <span>
                    Comercial →{' '}
                    <strong className="text-orange-600">Subtotal total tributado (8.25%)</strong>
                  </span>
                )}
                {(propertyType === 'MIXED_USE' ||
                  propertyType === 'EXEMPT_ORGANIZATION' ||
                  propertyType === 'GOVERNMENT') && (
                  <span>
                    <strong className="text-destructive">Revisão manual necessária</strong> —
                    contate ADMIN ou FINANCEIRO antes de enviar.
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Prazos */}
          <Card>
            <CardHeader>
              <CardTitle>Prazos e Validade</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label className="mb-2 block">Validade (dias)</Label>
                <Input
                  type="number"
                  min={1}
                  value={prazos.tempo_para_aceite}
                  onChange={(e) =>
                    setPrazos({ ...prazos, tempo_para_aceite: Number(e.target.value) })
                  }
                  aria-label="Número de dias de validade da proposta"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Data Limite</Label>
                  <label className="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoValidade}
                      onChange={(e) => setAutoValidade(e.target.checked)}
                      className="h-3 w-3"
                      aria-label="Calcular data automaticamente"
                    />
                    Auto
                  </label>
                </div>
                <Input
                  type="date"
                  value={prazos.validade_proposta}
                  readOnly={autoValidade}
                  disabled={autoValidade}
                  onChange={(e) =>
                    !autoValidade && setPrazos({ ...prazos, validade_proposta: e.target.value })
                  }
                  aria-label="Data limite de validade da proposta"
                  className={autoValidade ? 'opacity-60 cursor-not-allowed' : ''}
                />
                {autoValidade && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Calculada a partir dos dias de validade
                  </p>
                )}
              </div>
              <div>
                <Label className="mb-2 block">Execução (dias úteis)</Label>
                <Input
                  type="number"
                  min={1}
                  value={prazos.prazo_execucao_dias}
                  onChange={(e) =>
                    setPrazos({ ...prazos, prazo_execucao_dias: Number(e.target.value) })
                  }
                  aria-label="Prazo estimado de execução em dias úteis"
                />
              </div>
              <div>
                <Label className="mb-2 block">Janela de Execução</Label>
                <Input
                  placeholder="Ex: Seg–Sex, 8h–17h"
                  value={prazos.janela}
                  onChange={(e) => setPrazos({ ...prazos, janela: e.target.value })}
                  aria-label="Janela de horário permitida para execução"
                />
              </div>
              <div className="md:col-span-4">
                <Label className="mb-2 block">
                  Restrições de Acesso
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    (ex: sem obras após 17h, animais no local, acesso pela lateral)
                  </span>
                </Label>
                <Textarea
                  rows={2}
                  placeholder="Descreva restrições de acesso, condições especiais do local ou requisitos da equipe..."
                  value={prazos.restricoes}
                  onChange={(e) => setPrazos({ ...prazos, restricoes: e.target.value })}
                  aria-label="Restrições de acesso ao local de serviço"
                />
              </div>
            </CardContent>
          </Card>

          {/* Materiais */}
          <Card>
            <CardHeader>
              <CardTitle>Materiais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {materiais.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
                  <span className="text-2xl">📦</span>
                  <p className="text-sm">Nenhum material adicionado ainda.</p>
                </div>
              )}
              {materiais.map((m) => (
                <div
                  key={m.id}
                  className="space-y-2 border-b border-border pb-4 last:border-0 last:pb-0"
                >
                  {/* Row 1: search/name, qty, unit, price, total, delete */}
                  <div className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-5">
                      <Label className="text-xs">Material</Label>
                      <MaterialSearchCombobox
                        nome={m.nome}
                        estoqueItemId={m.estoqueItemId}
                        ariaLabel={`Material ${m.nome || ''}`}
                        onNomeChange={(nome) =>
                          setMateriais((arr) =>
                            arr.map((x) => (x.id === m.id ? { ...x, nome } : x)),
                          )
                        }
                        onSelect={({
                          estoqueItemId,
                          codigo,
                          nome,
                          unidade,
                          precoSugerido,
                          saldoTotal,
                          embalagens,
                        }) => {
                          if (embalagens.length > 0) {
                            setEmbalagemOpcoes((prev) => ({
                              ...prev,
                              [estoqueItemId]: embalagens,
                            }));
                          }
                          setMateriais((arr) =>
                            arr.map((x) =>
                              x.id === m.id
                                ? {
                                    ...x,
                                    estoqueItemId,
                                    codigo,
                                    nome,
                                    unidade,
                                    preco: precoSugerido ?? x.preco,
                                    aComprar: saldoTotal <= 0,
                                  }
                                : x,
                            ),
                          );
                        }}
                        onUnlink={() =>
                          setMateriais((arr) =>
                            arr.map((x) =>
                              x.id === m.id ? { ...x, estoqueItemId: undefined } : x,
                            ),
                          )
                        }
                      />
                    </div>
                    <div className="col-span-1">
                      <Label className="text-xs">Qtd</Label>
                      <Input
                        className="h-9"
                        type="number"
                        min="0"
                        step="0.001"
                        value={m.quantidade}
                        onChange={(e) =>
                          setMateriais((arr) =>
                            arr.map((x) =>
                              x.id === m.id ? { ...x, quantidade: Number(e.target.value) } : x,
                            ),
                          )
                        }
                        aria-label={`Quantidade de ${m.nome}`}
                      />
                    </div>
                    <div className="col-span-1">
                      <Label className="text-xs">Un</Label>
                      <Input
                        className="h-9"
                        value={m.unidade ?? ''}
                        onChange={(e) =>
                          setMateriais((arr) =>
                            arr.map((x) => (x.id === m.id ? { ...x, unidade: e.target.value } : x)),
                          )
                        }
                        aria-label={`Unidade de ${m.nome}`}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">$ Unit</Label>
                      <Input
                        className="h-9"
                        type="number"
                        step="0.01"
                        min="0"
                        value={m.preco ?? ''}
                        onChange={(e) =>
                          setMateriais((arr) =>
                            arr.map((x) =>
                              x.id === m.id
                                ? {
                                    ...x,
                                    preco: e.target.value ? Number(e.target.value) : undefined,
                                  }
                                : x,
                            ),
                          )
                        }
                        aria-label={`Preço unitário de ${m.nome}`}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Total</Label>
                      <div className="h-9 flex items-center text-sm font-medium text-foreground">
                        {m.preco != null ? currency(m.preco * m.quantidade) : '—'}
                      </div>
                    </div>
                    <div className="col-span-1 flex items-end gap-1">
                      {m.estoqueItemId && estoqueCheck[m.estoqueItemId] && (
                        <span
                          className={`text-xs font-medium px-1 rounded mr-1 ${estoqueCheck[m.estoqueItemId].needsToPurchase ? 'bg-destructive/10 text-destructive' : 'bg-green-500/10 text-green-600'}`}
                          title={
                            estoqueCheck[m.estoqueItemId].needsToPurchase
                              ? `Faltam ${estoqueCheck[m.estoqueItemId].shortfall} ${m.unidade}`
                              : 'Em estoque'
                          }
                        >
                          {estoqueCheck[m.estoqueItemId].needsToPurchase ? '⚠' : '✓'}
                        </span>
                      )}
                      <Button
                        size="icon"
                        variant="destructive"
                        className="h-9 w-9"
                        onClick={() => rmMaterial(m.id)}
                        aria-label={`Remover material ${m.nome}`}
                      >
                        ✕
                      </Button>
                    </div>
                  </div>
                  {/* Row 1b: Embalagem toggle — shown for all materials */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Toggle Por Unidade / Em Embalagem */}
                    <div className="flex rounded-lg border border-border overflow-hidden text-xs">
                      <button
                        type="button"
                        onClick={() =>
                          setMateriais((arr) =>
                            arr.map((x) =>
                              x.id === m.id
                                ? {
                                    ...x,
                                    tipoEntrada: 'unidade',
                                    embalagemId: undefined,
                                    qtdEmbalagens: undefined,
                                    embalagemBaseQtyAtTime: undefined,
                                    embalagemPrecoAtTime: undefined,
                                    embalagemUnitAtTime: undefined,
                                  }
                                : x,
                            ),
                          )
                        }
                        className={`px-3 py-1.5 transition-colors ${m.tipoEntrada !== 'embalagem' ? 'bg-brand-primary text-white' : 'bg-transparent text-muted-foreground hover:text-foreground'}`}
                        aria-pressed={m.tipoEntrada !== 'embalagem'}
                      >
                        Por Unidade
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setMateriais((arr) =>
                            arr.map((x) =>
                              x.id === m.id ? { ...x, tipoEntrada: 'embalagem' } : x,
                            ),
                          )
                        }
                        className={`px-3 py-1.5 transition-colors ${m.tipoEntrada === 'embalagem' ? 'bg-brand-primary text-white' : 'bg-transparent text-muted-foreground hover:text-foreground'}`}
                        aria-pressed={m.tipoEntrada === 'embalagem'}
                      >
                        📦 Em Embalagem
                      </button>
                    </div>
                    {m.tipoEntrada === 'embalagem' && (
                      <>
                        {m.estoqueItemId && (embalagemOpcoes[m.estoqueItemId]?.length ?? 0) > 0 ? (
                          /* Pre-registered options — dropdown */
                          <>
                            <select
                              className="h-8 rounded-lg border border-border bg-background text-sm px-2"
                              value={m.embalagemId ?? ''}
                              onChange={(e) => {
                                const embId = Number(e.target.value);
                                const emb = embalagemOpcoes[m.estoqueItemId!]?.find(
                                  (x) => x.id === embId,
                                );
                                if (!emb) return;
                                const qty = m.qtdEmbalagens ?? 1;
                                setMateriais((arr) =>
                                  arr.map((x) =>
                                    x.id === m.id
                                      ? {
                                          ...x,
                                          embalagemId: emb.id,
                                          embalagemBaseQtyAtTime: emb.baseQtyPerUnit,
                                          embalagemPrecoAtTime: emb.precoCompra ?? undefined,
                                          embalagemUnitAtTime: emb.purchaseUnit,
                                          quantidade: qty * emb.baseQtyPerUnit,
                                          preco:
                                            emb.precoCompra != null
                                              ? emb.precoCompra / emb.baseQtyPerUnit
                                              : x.preco,
                                        }
                                      : x,
                                  ),
                                );
                              }}
                              aria-label="Selecionar embalagem"
                            >
                              <option value="">Selecionar embalagem...</option>
                              {embalagemOpcoes[m.estoqueItemId!]?.map((emb) => (
                                <option key={emb.id} value={emb.id}>
                                  {formatPkgType(emb.packageType)} — {emb.baseQtyPerUnit}{' '}
                                  {m.unidade}
                                  {emb.precoCompra != null
                                    ? ` ($${Number(emb.precoCompra).toFixed(2)}/pkg)`
                                    : ''}
                                </option>
                              ))}
                            </select>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-muted-foreground">Qtd pkgs:</span>
                              <Input
                                className="h-8 w-16 text-xs"
                                type="number"
                                min="1"
                                step="1"
                                value={m.qtdEmbalagens ?? ''}
                                onChange={(e) => {
                                  const qty = Math.max(1, Number(e.target.value) || 1);
                                  const emb =
                                    m.embalagemId != null
                                      ? embalagemOpcoes[m.estoqueItemId!]?.find(
                                          (x) => x.id === m.embalagemId,
                                        )
                                      : null;
                                  setMateriais((arr) =>
                                    arr.map((x) =>
                                      x.id === m.id
                                        ? {
                                            ...x,
                                            qtdEmbalagens: qty,
                                            quantidade: emb
                                              ? qty * emb.baseQtyPerUnit
                                              : x.quantidade,
                                          }
                                        : x,
                                    ),
                                  );
                                }}
                                aria-label="Quantidade de embalagens"
                              />
                            </div>
                            {m.embalagemId && m.qtdEmbalagens && m.quantidade > 0 && (
                              <span className="text-xs text-green-600 font-medium">
                                = {m.quantidade} {m.unidade} total
                              </span>
                            )}
                          </>
                        ) : (
                          /* Manual entry — no pre-registered options */
                          <>
                            <select
                              className="h-8 rounded-lg border border-border bg-background text-sm px-2"
                              value={m.embalagemUnitAtTime ?? ''}
                              onChange={(e) =>
                                setMateriais((arr) =>
                                  arr.map((x) =>
                                    x.id === m.id
                                      ? {
                                          ...x,
                                          embalagemId: undefined,
                                          embalagemUnitAtTime: e.target.value,
                                        }
                                      : x,
                                  ),
                                )
                              }
                              aria-label="Tipo de embalagem"
                            >
                              <option value="">Tipo de pkg...</option>
                              {[
                                'ROLL',
                                'PACK',
                                'BOX',
                                'BAG',
                                'STICK',
                                'BUNDLE',
                                'PALLET',
                                'UNIT',
                              ].map((t) => (
                                <option key={t} value={t}>
                                  {formatPkgType(t)}
                                </option>
                              ))}
                            </select>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-muted-foreground">
                                Qtd/{m.unidade || 'un'} por pkg:
                              </span>
                              <Input
                                className="h-8 w-16 text-xs"
                                type="number"
                                min="0.001"
                                step="any"
                                value={m.embalagemBaseQtyAtTime ?? ''}
                                onChange={(e) => {
                                  const baseQty = Math.max(0.001, Number(e.target.value) || 0);
                                  const qty = m.qtdEmbalagens ?? 1;
                                  setMateriais((arr) =>
                                    arr.map((x) =>
                                      x.id === m.id
                                        ? {
                                            ...x,
                                            embalagemBaseQtyAtTime: baseQty,
                                            quantidade: qty * baseQty,
                                          }
                                        : x,
                                    ),
                                  );
                                }}
                                aria-label="Quantidade por embalagem"
                              />
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-muted-foreground">$pkg:</span>
                              <Input
                                className="h-8 w-20 text-xs"
                                type="number"
                                min="0"
                                step="0.01"
                                value={m.embalagemPrecoAtTime ?? ''}
                                onChange={(e) => {
                                  const pkgPrice = Number(e.target.value) || 0;
                                  const baseQty = m.embalagemBaseQtyAtTime ?? 1;
                                  setMateriais((arr) =>
                                    arr.map((x) =>
                                      x.id === m.id
                                        ? {
                                            ...x,
                                            embalagemPrecoAtTime: pkgPrice,
                                            preco: baseQty > 0 ? pkgPrice / baseQty : x.preco,
                                          }
                                        : x,
                                    ),
                                  );
                                }}
                                aria-label="Preço por embalagem"
                              />
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-muted-foreground">Qtd pkgs:</span>
                              <Input
                                className="h-8 w-16 text-xs"
                                type="number"
                                min="1"
                                step="1"
                                value={m.qtdEmbalagens ?? ''}
                                onChange={(e) => {
                                  const qty = Math.max(1, Number(e.target.value) || 1);
                                  const baseQty = m.embalagemBaseQtyAtTime ?? 0;
                                  setMateriais((arr) =>
                                    arr.map((x) =>
                                      x.id === m.id
                                        ? {
                                            ...x,
                                            qtdEmbalagens: qty,
                                            quantidade: baseQty > 0 ? qty * baseQty : x.quantidade,
                                          }
                                        : x,
                                    ),
                                  );
                                }}
                                aria-label="Quantidade de embalagens"
                              />
                            </div>
                            {m.embalagemBaseQtyAtTime && m.qtdEmbalagens && m.quantidade > 0 && (
                              <span className="text-xs text-green-600 font-medium">
                                = {m.quantidade} {m.unidade} total
                              </span>
                            )}
                          </>
                        )}
                      </>
                    )}
                  </div>
                  {/* Row 2: obs + fornecedor + aComprar toggle */}
                  <div className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-6">
                      <Label className="text-xs text-muted-foreground">Observação</Label>
                      <Input
                        className="h-8 text-xs"
                        placeholder="Observação ou especificação..."
                        value={m.obs ?? ''}
                        onChange={(e) =>
                          setMateriais((arr) =>
                            arr.map((x) => (x.id === m.id ? { ...x, obs: e.target.value } : x)),
                          )
                        }
                        aria-label={`Observação de ${m.nome}`}
                      />
                    </div>
                    <div className="col-span-4">
                      <Label className="text-xs text-muted-foreground">
                        Fornecedor preferencial
                      </Label>
                      <Input
                        className="h-8 text-xs"
                        placeholder="Ex: Home Depot, Grainger..."
                        value={m.fornecedor ?? ''}
                        onChange={(e) =>
                          setMateriais((arr) =>
                            arr.map((x) =>
                              x.id === m.id ? { ...x, fornecedor: e.target.value } : x,
                            ),
                          )
                        }
                        aria-label={`Fornecedor de ${m.nome}`}
                      />
                    </div>
                    <div className="col-span-2 flex items-end gap-1 pb-0.5">
                      {m.codigo && (
                        <span
                          className="text-xs text-muted-foreground truncate"
                          title={`Código: ${m.codigo}`}
                        >
                          {m.codigo}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          setMateriais((arr) =>
                            arr.map((x) => (x.id === m.id ? { ...x, aComprar: !x.aComprar } : x)),
                          )
                        }
                        className={`ml-auto text-xs px-2 py-1 rounded-lg border whitespace-nowrap ${
                          m.aComprar
                            ? 'border-brand-secondary/40 bg-brand-secondary/10 text-brand-secondary'
                            : 'border-green-500/40 bg-green-500/10 text-green-600'
                        }`}
                        title={
                          m.aComprar
                            ? 'Clique para marcar como material do estoque (sem taxa adicional)'
                            : 'Clique para marcar como material a comprar (+ TX tax 8.25%)'
                        }
                        aria-label={`Status de compra: ${m.aComprar ? 'a comprar' : 'do estoque'}`}
                      >
                        {m.aComprar ? '🛒 A comprar' : '📦 Estoque'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={materialsEndRef} />
              <button
                type="button"
                onClick={addMaterial}
                className="w-full mt-2 py-2.5 rounded-xl border-2 border-dashed border-border hover:border-brand-primary/50 hover:bg-brand-primary/5 text-sm text-muted-foreground hover:text-brand-primary transition-colors flex items-center justify-center gap-2"
                aria-label="Adicionar novo material"
              >
                <span className="text-lg leading-none">+</span> Adicionar material
              </button>
            </CardContent>
          </Card>

          {/* Serviços */}
          <Card>
            <CardHeader>
              <CardTitle>Etapas / Serviços</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {etapas.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
                  <span className="text-2xl">🔧</span>
                  <p className="text-sm">Nenhum serviço adicionado ainda.</p>
                </div>
              )}
              {etapas.map((e) => (
                <div
                  key={e.id}
                  className="grid grid-cols-12 gap-2 border-b border-gray-100 pb-4 last:border-0 last:pb-0"
                >
                  <div className="col-span-12 md:col-span-4">
                    <Label className="text-xs">Serviço</Label>
                    <Input
                      className="h-9"
                      value={e.servico}
                      onChange={(ev) =>
                        setEtapas((arr) =>
                          arr.map((x) => (x.id === e.id ? { ...x, servico: ev.target.value } : x)),
                        )
                      }
                    />
                  </div>
                  <div className="col-span-12 md:col-span-8">
                    <Label className="text-xs">Descrição</Label>
                    <Textarea
                      rows={2}
                      value={e.descricao}
                      onChange={(ev) =>
                        setEtapas((arr) =>
                          arr.map((x) =>
                            x.id === e.id ? { ...x, descricao: ev.target.value } : x,
                          ),
                        )
                      }
                    />
                  </div>
                  <div className="col-span-3">
                    <Label className="text-xs">Qtd</Label>
                    <Input
                      className="h-9"
                      type="number"
                      value={e.quantidade ?? ''}
                      onChange={(ev) =>
                        setEtapas((arr) =>
                          arr.map((x) =>
                            x.id === e.id ? { ...x, quantidade: Number(ev.target.value) } : x,
                          ),
                        )
                      }
                    />
                  </div>
                  <div className="col-span-3">
                    <Label className="text-xs">Horas (H:MM)</Label>
                    <HoursInput
                      className="h-9"
                      value={e.duracaoHoras}
                      onChange={(hours) =>
                        setEtapas((arr) =>
                          arr.map((x) => (x.id === e.id ? { ...x, duracaoHoras: hours } : x)),
                        )
                      }
                      aria-label={`Duração em horas de ${e.servico || 'etapa'}`}
                    />
                  </div>
                  <div className="col-span-3">
                    <Label className="text-xs">Custo MO</Label>
                    <Input
                      className="h-9"
                      type="number"
                      step="0.01"
                      value={e.custoMO ?? ''}
                      onChange={(ev) =>
                        setEtapas((arr) =>
                          arr.map((x) =>
                            x.id === e.id ? { ...x, custoMO: Number(ev.target.value) } : x,
                          ),
                        )
                      }
                    />
                  </div>
                  <div className="col-span-3 flex items-end">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive w-full"
                      onClick={() => rmEtapa(e.id)}
                      aria-label="Remover etapa"
                    >
                      Remover
                    </Button>
                  </div>
                </div>
              ))}
              <div ref={etapasEndRef} />
              <button
                type="button"
                onClick={addEtapa}
                className="w-full mt-2 py-2.5 rounded-xl border-2 border-dashed border-border hover:border-brand-primary/50 hover:bg-brand-primary/5 text-sm text-muted-foreground hover:text-brand-primary transition-colors flex items-center justify-center gap-2"
                aria-label="Adicionar nova etapa ou serviço"
              >
                <span className="text-lg leading-none">+</span> Adicionar serviço
              </button>
            </CardContent>
          </Card>

          {/* Condições Comerciais */}
          <Card>
            <CardHeader>
              <CardTitle>Condições Comerciais</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label className="mb-2 block">Pagamento</Label>
                <Input
                  placeholder="Ex: 40% upfront, 40% at midpoint, 20% on completion"
                  value={comerciais.condicoes_pagamento}
                  onChange={(e) =>
                    setComerciais({ ...comerciais, condicoes_pagamento: e.target.value })
                  }
                />
              </div>
              <div>
                <Label className="mb-2 block">Garantia</Label>
                <Input
                  placeholder="Ex: 1 year labor warranty; 3 months materials"
                  value={comerciais.garantia}
                  onChange={(e) => setComerciais({ ...comerciais, garantia: e.target.value })}
                />
              </div>
              <div>
                <Label className="mb-2 block">Exclusões</Label>
                <Input
                  placeholder="Ex: Structural demolition, exterior painting, permits"
                  value={comerciais.exclusoes}
                  onChange={(e) => setComerciais({ ...comerciais, exclusoes: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column (Summary & Totals) */}
        <div className="col-span-12 lg:col-span-3 space-y-6">
          <Card className="sticky top-24 border-brand-primary/20 bg-brand-primary/5">
            <CardHeader>
              <CardTitle className="text-brand-primary">Resumo Interno</CardTitle>
              <Badge variant="outline">Privado</Badge>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Materiais</span>
                <span className="font-medium">{currency(totais.mat)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mão de Obra</span>
                <span className="font-medium">{currency(totais.mo)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Terceiros</span>
                <span className="font-medium">{currency(totais.terce)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Frete</span>
                <span className="font-medium">{currency(totais.frete)}</span>
              </div>
              <div className="h-px bg-current opacity-10 my-2" />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Impostos</span>
                <span className="font-medium">{currency(totais.impostos)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Margem</span>
                <span className="font-medium">{currency(totais.margem)}</span>
              </div>
              <div className="h-px bg-current opacity-10 my-2" />
              <div className="flex justify-between text-lg font-bold text-foreground">
                <span>Total</span>
                <span>{currency(totais.precoCliente)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Configuração Margem</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Overhead (%)</Label>
                <Input
                  type="number"
                  value={interno.overhead_pct}
                  onChange={(e) => setInterno({ ...interno, overhead_pct: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Margem (%)</Label>
                <Input
                  type="number"
                  value={interno.margem_pct}
                  onChange={(e) => setInterno({ ...interno, margem_pct: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Impostos (%)</Label>
                <Input
                  type="number"
                  value={interno.impostos_pct}
                  onChange={(e) => setInterno({ ...interno, impostos_pct: Number(e.target.value) })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Atual:</span>
                <Badge>{statusLabel}</Badge>
              </div>
              <Button
                variant="outline"
                className="w-full text-xs"
                onClick={() => setStatus(StatusPropostaValues.APROVADA)}
              >
                Marcar como Aprovada
              </Button>
              <Button
                variant="outline"
                className="w-full text-xs text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                onClick={() => setStatus(StatusPropostaValues.CANCELADA)}
                aria-label="Cancelar proposta"
              >
                Cancelar Proposta
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      <EstimadorWizard
        open={showEstimador}
        onClose={() => setShowEstimador(false)}
        onImport={handleApplyEstimativa}
      />
    </div>
  );
}
