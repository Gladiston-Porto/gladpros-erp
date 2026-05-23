'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { FilePlus } from 'lucide-react';

import { Button } from '@gladpros/ui/button';
import { ModulePageHeader } from '@gladpros/ui/module-page-header';
import { useToast } from '@gladpros/ui/toast';
import { Input } from '@gladpros/ui/input';

import { authenticatedFetch } from '@/lib/api/client';

import { ServiceOrderClientSection } from './_components/ServiceOrderClientSection';
import { ServiceOrderMaterialsSection } from './_components/ServiceOrderMaterialsSection';
import { ServiceOrderScheduleSection } from './_components/ServiceOrderScheduleSection';
import { ServiceOrderScopeSection } from './_components/ServiceOrderScopeSection';
import type {
  PlannedMaterial,
  ServiceOrderClient,
  ServiceOrderFormState,
  StockMaterial,
} from './_components/types';

const INITIAL_FORM: ServiceOrderFormState = {
  clienteId: 0,
  title: '',
  description: '',
  scheduleType: 'FIXED',
  scheduledDate: '',
  scheduleDateStart: '',
  scheduleDateEnd: '',
  estimatedHours: '',
  hourlyRate: '',
  materialSupply: 'COMPANY_PROVIDES',
  sameClientAddress: true,
  serviceAddressLine1: '',
  serviceCity: '',
  serviceState: 'TX',
  serviceZip: '',
  servicePhone: '',
  serviceContactName: '',
  endClientName: '',
  endClientPhone: '',
  endClientEmail: '',
  endClientNotes: '',
  assignedWorkerId: undefined,
  priority: 'MEDIUM',
  agreedClientPrice: '',
  materialEstimate: '',
  laborEstimate: '',
  propertyType: 'RESIDENTIAL',
  serviceCategory: 'REPAIR',
  contractType: 'LUMP_SUM',
};

export default function NovaOrdemServicoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<ServiceOrderClient[]>([]);
  const [searchClient, setSearchClient] = useState('');
  const [stockMaterials, setStockMaterials] = useState<StockMaterial[]>([]);
  const [stockMaterialsLoaded, setStockMaterialsLoaded] = useState(false);
  const [plannedMaterials, setPlannedMaterials] = useState<PlannedMaterial[]>([]);
  const [showMaterialSearch, setShowMaterialSearch] = useState(false);
  const [materialSearch, setMaterialSearch] = useState('');
  const [pendingMaterial, setPendingMaterial] = useState<StockMaterial | null>(null);
  const [pendingQty, setPendingQty] = useState('1');
  const [scopeItems, setScopeItems] = useState<string[]>([]);
  const [newScopeItem, setNewScopeItem] = useState('');
  const [form, setForm] = useState<ServiceOrderFormState>(INITIAL_FORM);
  const [carryOverSource, setCarryOverSource] = useState<string | null>(null);

  // Carry-over: if ?propostaId=X is in URL, pre-fill financial fields from proposta
  useEffect(() => {
    const propostaId = searchParams.get('propostaId');
    if (!propostaId) return;
    authenticatedFetch(`/api/propostas/${propostaId}`)
      .then((r) => r.json())
      .then((json) => {
        const p = json.data ?? json;
        if (!p?.id) return;
        setForm((prev) => ({
          ...prev,
          ...(p.precoPropostaCliente
            ? { agreedClientPrice: String(Number(p.precoPropostaCliente)) }
            : {}),
          ...(p.valorEstimado ? { materialEstimate: String(Number(p.valorEstimado)) } : {}),
          ...(p.clienteId ? { clienteId: p.clienteId } : {}),
          ...(p.titulo ? { title: p.titulo } : {}),
          ...(p.descricao ? { description: p.descricao } : {}),
        }));
        setCarryOverSource(`Proposta #${p.numeroProposta || propostaId}`);
      })
      .catch(() => {
        /* silent — carry-over is best-effort */
      });
  }, [searchParams]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadClients() {
      try {
        const response = await authenticatedFetch('/api/clients', {
          signal: controller.signal,
        });
        if (!response.ok) {
          return;
        }

        const data = await response.json();
        setClients(Array.isArray(data) ? data : (data.data ?? []));
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          return;
        }
      }
    }

    void loadClients();

    return () => controller.abort();
  }, []);

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === form.clienteId),
    [clients, form.clienteId],
  );

  const filteredClients = useMemo(
    () =>
      clients.filter((client) => client.name.toLowerCase().includes(searchClient.toLowerCase())),
    [clients, searchClient],
  );

  const loadStockMaterials = async () => {
    if (stockMaterialsLoaded) {
      return;
    }

    try {
      const response = await authenticatedFetch('/api/estoque/materiais?limit=100');
      if (!response.ok) {
        return;
      }
      const data = await response.json();
      const raw: Record<string, unknown>[] = Array.isArray(data.data)
        ? data.data
        : Array.isArray(data)
          ? data
          : [];
      setStockMaterials(
        raw.map((m) => ({
          id: m.id as number,
          nome: m.nome as string,
          unidade: ((m.unidade as Record<string, unknown> | null)?.codigo as string) ?? '',
          quantidadeEstoque: Number(m.saldoTotal ?? 0),
          precoUnitario: Number(m.ultimoCusto ?? m.custoMedio ?? 0),
          embalagens: Array.isArray(m.embalagens)
            ? (m.embalagens as Record<string, unknown>[]).map((e) => ({
                id: e.id as number,
                packageType: e.packageType as string,
                baseQtyPerUnit: Number(e.baseQtyPerUnit),
                purchaseUnit: (e.purchaseUnit as string) ?? 'EA',
                precoCompra: Number(e.precoCompra),
              }))
            : [],
        })),
      );
      setStockMaterialsLoaded(true);
    } catch {
      // silently fail
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.clienteId) {
      toast.error('Selecione um cliente');
      return;
    }
    if (!form.title.trim()) {
      toast.error('Informe o título do serviço');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...form,
        estimatedHours: form.estimatedHours ? parseFloat(form.estimatedHours) : undefined,
        hourlyRate: form.hourlyRate ? parseFloat(form.hourlyRate) : undefined,
        scheduledDate:
          form.scheduleType === 'FIXED' && form.scheduledDate ? form.scheduledDate : undefined,
        scheduleDateStart:
          form.scheduleType === 'FLEXIBLE' && form.scheduleDateStart
            ? form.scheduleDateStart
            : undefined,
        scheduleDateEnd:
          form.scheduleType === 'FLEXIBLE' && form.scheduleDateEnd
            ? form.scheduleDateEnd
            : undefined,
        ...(form.agreedClientPrice && { agreedClientPrice: parseFloat(form.agreedClientPrice) }),
        ...(form.materialEstimate && { materialEstimate: parseFloat(form.materialEstimate) }),
        ...(form.laborEstimate && { laborEstimate: parseFloat(form.laborEstimate) }),
        propertyType: form.propertyType,
        serviceCategory: form.serviceCategory,
        contractType: form.contractType,
      };

      const response = await authenticatedFetch('/api/service-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao criar');
      }

      const result = await response.json();
      const created = result.data ?? result;

      const materialResults = await Promise.allSettled(
        plannedMaterials.map((material) =>
          authenticatedFetch(`/api/service-orders/${created.id}/materials`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              materialId: material.materialId,
              name: material.name,
              unit: material.unit,
              quantityPlanned: material.quantityPlanned,
              unitCostEstimated: material.unitCostEstimated,
              ...(material.embalagemId && {
                embalagemId: material.embalagemId,
                qtdEmbalagens: material.qtdEmbalagens,
                embalagemBaseQtyAtTime: material.embalagemBaseQtyAtTime,
                embalagemPrecoAtTime: material.embalagemPrecoAtTime,
                embalagemUnitAtTime: material.embalagemUnitAtTime,
              }),
            }),
          }),
        ),
      );

      const scopeResults = await Promise.allSettled(
        scopeItems.map((item, index) =>
          authenticatedFetch(`/api/service-orders/${created.id}/scope-items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ description: item, sortOrder: index }),
          }),
        ),
      );

      const savedMats = materialResults.filter(
        (result) => result.status === 'fulfilled' && result.value.ok,
      ).length;
      const savedScope = scopeResults.filter(
        (result) => result.status === 'fulfilled' && result.value.ok,
      ).length;

      const extras: string[] = [];
      if (plannedMaterials.length > 0) {
        extras.push(`${savedMats}/${plannedMaterials.length} materiais`);
      }
      if (scopeItems.length > 0) {
        extras.push(`${savedScope}/${scopeItems.length} tarefas`);
      }
      const detail = extras.length > 0 ? ` (${extras.join(', ')})` : '';
      toast.success(`OS ${created.ticketNumber} criada!${detail}`);
      router.push(`/ordens-servico/${created.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro');
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    'mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring';
  const labelCls = 'text-sm text-muted-foreground';

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <ModulePageHeader
        title="Nova Ordem de Serviço"
        description="Preencha os dados abaixo para criar uma nova OS"
        icon={<FilePlus />}
        accentColor="#0098DA"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Ordens de Serviço', href: '/ordens-servico' },
          { label: 'Nova OS' },
        ]}
        actions={
          <Button type="button" variant="outline" asChild>
            <Link href="/ordens-servico">Cancelar</Link>
          </Button>
        }
      />

      {/* Carry-over banner */}
      {carryOverSource && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-brand-primary/10 border border-brand-primary/30 text-sm text-brand-primary">
          <span className="font-medium">📋 Dados pré-preenchidos de {carryOverSource}.</span>
          <span className="text-muted-foreground">Revise e ajuste antes de salvar.</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <ServiceOrderClientSection
          clients={clients}
          filteredClients={filteredClients}
          form={form}
          inputCls={inputCls}
          labelCls={labelCls}
          searchClient={searchClient}
          selectedClient={selectedClient}
          setForm={setForm}
          setSearchClient={setSearchClient}
        />

        <ServiceOrderScopeSection
          form={form}
          inputCls={inputCls}
          labelCls={labelCls}
          newScopeItem={newScopeItem}
          scopeItems={scopeItems}
          setForm={setForm}
          setNewScopeItem={setNewScopeItem}
          setScopeItems={setScopeItems}
        />

        <ServiceOrderMaterialsSection
          materialSearch={materialSearch}
          pendingMaterial={pendingMaterial}
          pendingQty={pendingQty}
          plannedMaterials={plannedMaterials}
          showMaterialSearch={showMaterialSearch}
          stockMaterials={stockMaterials}
          setMaterialSearch={setMaterialSearch}
          setPendingMaterial={setPendingMaterial}
          setPendingQty={setPendingQty}
          setPlannedMaterials={setPlannedMaterials}
          setShowMaterialSearch={setShowMaterialSearch}
          onOpenMaterialSearch={() => {
            setShowMaterialSearch(true);
            void loadStockMaterials();
          }}
        />

        <ServiceOrderScheduleSection
          form={form}
          inputCls={inputCls}
          labelCls={labelCls}
          setForm={setForm}
        />

        {/* Tax Classification Section */}
        <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
          <div>
            <h3 className="font-semibold text-foreground">
              Classificação Fiscal (Texas Sales Tax)
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Determine se sales tax se aplica a este serviço. Residencial + lump-sum = sem cobrança
              de tax ao cliente.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Tipo de Propriedade</label>
              <select
                value={form.propertyType}
                onChange={(e) =>
                  setForm((f) => ({ ...f, propertyType: e.target.value as typeof f.propertyType }))
                }
                className="w-full h-10 rounded-xl bg-background border border-border px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand-primary"
                aria-label="Tipo de propriedade"
              >
                <option value="RESIDENTIAL">Residencial</option>
                <option value="COMMERCIAL">Comercial</option>
                <option value="MIXED_USE">Uso Misto</option>
                <option value="EXEMPT_ORGANIZATION">Organização Isenta</option>
                <option value="GOVERNMENT">Governo</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Categoria do Serviço</label>
              <select
                value={form.serviceCategory}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    serviceCategory: e.target.value as typeof f.serviceCategory,
                  }))
                }
                className="w-full h-10 rounded-xl bg-background border border-border px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand-primary"
                aria-label="Categoria do serviço"
              >
                <option value="REPAIR">Reparo</option>
                <option value="REMODEL">Reforma</option>
                <option value="RESTORATION">Restauração</option>
                <option value="NEW_CONSTRUCTION">Nova Construção</option>
                <option value="MAINTENANCE">Manutenção</option>
                <option value="INSPECTION">Inspeção</option>
                <option value="CONSULTATION">Consultoria</option>
                <option value="OTHER">Outro</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Tipo de Contrato</label>
              <select
                value={form.contractType}
                onChange={(e) =>
                  setForm((f) => ({ ...f, contractType: e.target.value as typeof f.contractType }))
                }
                className="w-full h-10 rounded-xl bg-background border border-border px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand-primary"
                aria-label="Tipo de contrato"
              >
                <option value="LUMP_SUM">Preço Único (Lump-Sum)</option>
                <option value="SEPARATED">Separado (Labor + Material)</option>
              </select>
            </div>
          </div>

          {/* Tax preview */}
          <div className="rounded-xl bg-muted/50 p-3 text-sm flex items-start gap-2">
            <span className="mt-0.5">
              {form.propertyType === 'RESIDENTIAL' && form.contractType === 'LUMP_SUM' && (
                <span className="text-green-600 dark:text-green-400">
                  ✓ Residencial + Lump-Sum: <strong>Sem sales tax</strong> cobrado ao cliente.
                  Empresa paga tax na compra de materiais.
                </span>
              )}
              {form.propertyType === 'RESIDENTIAL' && form.contractType === 'SEPARATED' && (
                <span className="text-blue-600 dark:text-blue-400">
                  ℹ Residencial + Separado: Sales tax aplicado somente em materiais (não em mão de
                  obra).
                </span>
              )}
              {form.propertyType === 'COMMERCIAL' && (
                <span className="text-yellow-600 dark:text-yellow-400">
                  ⚠ Comercial: Sales tax de 8.25% aplicado sobre o subtotal total.
                </span>
              )}
              {(form.propertyType === 'MIXED_USE' ||
                form.propertyType === 'EXEMPT_ORGANIZATION' ||
                form.propertyType === 'GOVERNMENT') && (
                <span className="text-orange-600 dark:text-orange-400">
                  ⚠ Requer revisão manual por ADMIN ou Financeiro antes de enviar o invoice.
                </span>
              )}
            </span>
          </div>

          {/* Out-of-state warning */}
          {form.serviceState && form.serviceState.trim().toUpperCase() !== 'TX' && (
            <div className="rounded-xl border border-yellow-500/40 bg-yellow-500/10 p-3 flex items-start gap-2">
              <span className="text-yellow-600 dark:text-yellow-400 font-medium text-sm">
                ⚠ Serviço fora do Texas ({form.serviceState.toUpperCase()}): Sales tax deste estado
                será revisada manualmente. O invoice não poderá ser enviado até revisão por ADMIN ou
                Financeiro.
              </span>
            </div>
          )}
        </div>

        {/* Financial Section */}
        <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
          <h3 className="font-semibold text-foreground">Valor do Contrato</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Valor Acordado com Cliente
              </label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={form.agreedClientPrice}
                onChange={(e) => setForm((f) => ({ ...f, agreedClientPrice: e.target.value }))}
                className="bg-background border-border"
                aria-label="Valor acordado com o cliente"
              />
              <p className="text-xs text-muted-foreground">Valor total acordado no contrato</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Estimativa de Material</label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={form.materialEstimate}
                onChange={(e) => setForm((f) => ({ ...f, materialEstimate: e.target.value }))}
                className="bg-background border-border"
                aria-label="Estimativa de material"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Estimativa de Mão de Obra
              </label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={form.laborEstimate}
                onChange={(e) => setForm((f) => ({ ...f, laborEstimate: e.target.value }))}
                className="bg-background border-border"
                aria-label="Estimativa de mão de obra"
              />
            </div>
          </div>

          {/* Margin Preview */}
          {Number(form.agreedClientPrice) > 0 && (
            <div className="rounded-xl border border-border p-3 text-sm space-y-1">
              {(() => {
                const agreed = Number(form.agreedClientPrice) || 0;
                const matEst = Number(form.materialEstimate) || 0;
                const labEst = Number(form.laborEstimate) || 0;
                const totalCost = matEst + labEst;
                const costRatio = agreed > 0 ? totalCost / agreed : 0;
                const marginPct = agreed > 0 ? ((agreed - totalCost) / agreed) * 100 : 0;
                const profit = agreed - totalCost;

                let badge = 'bg-green-500/10 text-green-600';
                let statusLabel = '✅ OK';
                if (costRatio > 1.1) {
                  badge = 'bg-destructive/10 text-destructive';
                  statusLabel = '⛔ Prejuízo projetado';
                } else if (costRatio > 1.0) {
                  badge = 'bg-red-500/10 text-red-600';
                  statusLabel = '🔴 CRÍTICO — custo > receita';
                } else if (costRatio >= 0.85) {
                  badge = 'bg-orange-500/10 text-orange-600';
                  statusLabel = '🟠 Alerta — margem baixa';
                } else if (costRatio >= 0.7) {
                  badge = 'bg-yellow-500/10 text-yellow-600';
                  statusLabel = '⚠️ Atenção — margem reduzida';
                }

                const fmt = (v: number) =>
                  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);
                return (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-medium">Previsão de margem</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge}`}>
                        {statusLabel}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Custo total estimado</span>
                      <span className="font-medium text-foreground">{fmt(totalCost)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Valor acordado</span>
                      <span className="font-medium text-foreground">{fmt(agreed)}</span>
                    </div>
                    <div className="flex justify-between text-xs border-t border-border pt-1">
                      <span className="text-muted-foreground">Margem projetada</span>
                      <span
                        className={`font-bold ${profit >= 0 ? 'text-green-600' : 'text-destructive'}`}
                      >
                        {fmt(profit)} ({marginPct.toFixed(1)}%)
                      </span>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Criando...' : 'Criar Ordem de Serviço'}
          </Button>
        </div>
      </form>
    </div>
  );
}
