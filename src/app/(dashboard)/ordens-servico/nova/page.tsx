"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { FilePlus } from "lucide-react";

import { Button } from "@gladpros/ui/button"
import { ModulePageHeader } from "@gladpros/ui/module-page-header"
import { useToast } from "@gladpros/ui/toast";

import { authenticatedFetch } from "@/lib/api/client";

import { ServiceOrderClientSection } from "./_components/ServiceOrderClientSection";
import { ServiceOrderMaterialsSection } from "./_components/ServiceOrderMaterialsSection";
import { ServiceOrderScheduleSection } from "./_components/ServiceOrderScheduleSection";
import { ServiceOrderScopeSection } from "./_components/ServiceOrderScopeSection";
import type {
  PlannedMaterial,
  ServiceOrderClient,
  ServiceOrderFormState,
  StockMaterial,
} from "./_components/types";

const INITIAL_FORM: ServiceOrderFormState = {
  clienteId: 0,
  title: "",
  description: "",
  scheduleType: "FIXED",
  scheduledDate: "",
  scheduleDateStart: "",
  scheduleDateEnd: "",
  estimatedHours: "",
  hourlyRate: "",
  materialSupply: "COMPANY_PROVIDES",
  sameClientAddress: true,
  serviceAddressLine1: "",
  serviceCity: "",
  serviceState: "TX",
  serviceZip: "",
  servicePhone: "",
  serviceContactName: "",
  endClientName: "",
  endClientPhone: "",
  endClientEmail: "",
  endClientNotes: "",
  assignedWorkerId: undefined,
  priority: "MEDIUM",
};

export default function NovaOrdemServicoPage() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<ServiceOrderClient[]>([]);
  const [searchClient, setSearchClient] = useState("");
  const [stockMaterials, setStockMaterials] = useState<StockMaterial[]>([]);
  const [stockMaterialsLoaded, setStockMaterialsLoaded] = useState(false);
  const [plannedMaterials, setPlannedMaterials] = useState<PlannedMaterial[]>([]);
  const [showMaterialSearch, setShowMaterialSearch] = useState(false);
  const [materialSearch, setMaterialSearch] = useState("");
  const [pendingMaterial, setPendingMaterial] = useState<StockMaterial | null>(null);
  const [pendingQty, setPendingQty] = useState("1");
  const [scopeItems, setScopeItems] = useState<string[]>([]);
  const [newScopeItem, setNewScopeItem] = useState("");
  const [form, setForm] = useState<ServiceOrderFormState>(INITIAL_FORM);

  useEffect(() => {
    const controller = new AbortController();

    async function loadClients() {
      try {
        const response = await authenticatedFetch("/api/clients", {
          signal: controller.signal,
        });
        if (!response.ok) {
          return;
        }

        const data = await response.json();
        setClients(Array.isArray(data) ? data : data.data ?? []);
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }
      }
    }

    void loadClients();

    return () => controller.abort();
  }, []);

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === form.clienteId),
    [clients, form.clienteId]
  );

  const filteredClients = useMemo(
    () =>
      clients.filter((client) =>
        client.name.toLowerCase().includes(searchClient.toLowerCase())
      ),
    [clients, searchClient]
  );

  const loadStockMaterials = async () => {
    if (stockMaterialsLoaded) {
      return;
    }

    try {
      const response = await authenticatedFetch("/api/estoque/materiais?limit=100");
      if (!response.ok) {
        return;
      }
      const data = await response.json();
      setStockMaterials(
        Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : []
      );
      setStockMaterialsLoaded(true);
    } catch {
      // silently fail
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.clienteId) {
      toast.error("Selecione um cliente");
      return;
    }
    if (!form.title.trim()) {
      toast.error("Informe o título do serviço");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...form,
        estimatedHours: form.estimatedHours
          ? parseFloat(form.estimatedHours)
          : undefined,
        hourlyRate: form.hourlyRate ? parseFloat(form.hourlyRate) : undefined,
        scheduledDate:
          form.scheduleType === "FIXED" && form.scheduledDate
            ? form.scheduledDate
            : undefined,
        scheduleDateStart:
          form.scheduleType === "FLEXIBLE" && form.scheduleDateStart
            ? form.scheduleDateStart
            : undefined,
        scheduleDateEnd:
          form.scheduleType === "FLEXIBLE" && form.scheduleDateEnd
            ? form.scheduleDateEnd
            : undefined,
      };

      const response = await authenticatedFetch("/api/service-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erro ao criar");
      }

      const result = await response.json();
      const created = result.data ?? result;

      const materialResults = await Promise.allSettled(
        plannedMaterials.map((material) =>
          authenticatedFetch(`/api/service-orders/${created.id}/materials`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              materialId: material.materialId,
              name: material.name,
              unit: material.unit,
              quantityPlanned: material.quantityPlanned,
              unitCostEstimated: material.unitCostEstimated,
            }),
          })
        )
      );

      const scopeResults = await Promise.allSettled(
        scopeItems.map((item) =>
          authenticatedFetch(`/api/service-orders/${created.id}/scope-items`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ description: item }),
          })
        )
      );

      const savedMats = materialResults.filter(
        (result) => result.status === "fulfilled" && result.value.ok
      ).length;
      const savedScope = scopeResults.filter(
        (result) => result.status === "fulfilled" && result.value.ok
      ).length;

      const extras: string[] = [];
      if (plannedMaterials.length > 0) {
        extras.push(`${savedMats}/${plannedMaterials.length} materiais`);
      }
      if (scopeItems.length > 0) {
        extras.push(`${savedScope}/${scopeItems.length} tarefas`);
      }
      const detail = extras.length > 0 ? ` (${extras.join(", ")})` : "";
      toast.success(`OS ${created.ticketNumber} criada!${detail}`);
      router.push(`/ordens-servico/${created.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro");
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    "mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring";
  const labelCls = "text-sm text-muted-foreground";

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

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Criando..." : "Criar Ordem de Serviço"}
          </Button>
        </div>
      </form>
    </div>
  );
}
