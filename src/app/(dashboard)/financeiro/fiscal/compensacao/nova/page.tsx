"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useToast } from "@gladpros/ui/toast";
import { Button } from "@gladpros/ui/button";
import { Input } from "@gladpros/ui/input";
import { ModulePageHeader } from "@gladpros/ui/module-page-header";
import { authenticatedFetch } from "@/lib/api/client";
import { UserCircle, AlertCircle } from "lucide-react";

const formSchema = z.object({
  workerId: z.number().int().positive("Worker obrigatório"),
  tipo: z.enum(["OWNER_DRAW", "SALARY", "DISTRIBUTION"]),
  valor: z.number().positive("Valor deve ser positivo"),
  data: z.string().min(1, "Data obrigatória"),
  descricao: z.string().optional(),
  referencia: z.string().optional(),
  bankAccountId: z.number().int().positive().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface Worker { id: number; nomeCompleto: string; classification: string }
interface Conta { id: number; nome: string; banco: string }

export default function NovaCompensacaoPage() {
  const router = useRouter();
  const { success: showSuccess, error: showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [contas, setContas] = useState<Conta[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { tipo: "OWNER_DRAW" },
  });

  const tipoSelecionado = watch("tipo");

  useEffect(() => {
    async function load() {
      try {
        const [workersRes, contasRes] = await Promise.all([
          authenticatedFetch("/api/rh/workers?pageSize=100"),
          authenticatedFetch("/api/financeiro/contas"),
        ]);
        const workersJson = await workersRes.json();
        const contasJson = await contasRes.json();

        const allWorkers: Worker[] = workersJson.data ?? [];
        const ownerWorkers = allWorkers.filter((w) => w.classification === "OWNER_OPERATOR");
        setWorkers(ownerWorkers);

        // Pre-select if only one owner worker found
        if (ownerWorkers.length === 1) {
          setValue("workerId", ownerWorkers[0].id);
        }

        setContas(contasJson.data ?? []);
      } catch {
        showError("Erro", "Falha ao carregar dados");
      } finally {
        setLoadingData(false);
      }
    }
    load();
  }, [showError, setValue]);

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      const payload = {
        ...data,
        data: new Date(data.data).toISOString(),
      };
      const res = await authenticatedFetch("/api/financeiro/owner-compensation", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || json.error);
      showSuccess("Compensação registrada com sucesso!");
      router.push("/financeiro/fiscal/compensacao");
    } catch (err: unknown) {
      showError("Erro", err instanceof Error ? err.message : "Tente novamente");
    } finally {
      setLoading(false);
    }
  }

  const selectClass = "w-full h-10 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground";

  return (
    <div className="space-y-6">
      <div className="bg-hero-gradient rounded-2xl p-6">
        <ModulePageHeader
          title="Nova Compensação"
          description="Registrar compensação do proprietário"
          icon={<UserCircle className="h-6 w-6 text-white" />}
          breadcrumbs={[
            { label: "Financeiro", href: "/financeiro" },
            { label: "Fiscal", href: "/financeiro/fiscal" },
            { label: "Compensação", href: "/financeiro/fiscal/compensacao" },
            { label: "Nova Compensação" },
          ]}
          className="text-white"
        />
      </div>

      {/* Info note */}
      <div className="flex items-start gap-3 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4">
        <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-yellow-700 dark:text-yellow-400">
          <strong>LLC</strong> allows only <em>Owner Draw</em>. &nbsp;
          <strong>S-Corp</strong> requires a <em>Salary</em> before any <em>Distribution</em>.
          Distribution without salary is an IRS violation.
        </p>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6">
        {loadingData ? (
          <div className="animate-pulse h-64 rounded-xl bg-muted" />
        ) : (
          <form data-testid="form-compensacao" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Worker */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Owner / Worker *</label>
                <select data-testid="select-workerId" {...register("workerId", { valueAsNumber: true })} className={selectClass}>
                  <option value="">Selecione...</option>
                  {workers.map((w) => (
                    <option key={w.id} value={w.id}>{w.nomeCompleto}</option>
                  ))}
                </select>
                {workers.length === 0 && (
                  <p className="text-muted-foreground text-xs mt-1">
                    Nenhum worker com classification OWNER_OPERATOR encontrado
                  </p>
                )}
                {errors.workerId && <p className="text-destructive text-xs mt-1">{errors.workerId.message}</p>}
              </div>

              {/* Tipo */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Tipo *</label>
                <select data-testid="select-tipo" {...register("tipo")} className={selectClass}>
                  <option value="OWNER_DRAW">Owner Draw (LLC)</option>
                  <option value="SALARY">Salary (S-Corp)</option>
                  <option value="DISTRIBUTION">Distribution (S-Corp)</option>
                </select>
                {tipoSelecionado === "DISTRIBUTION" && (
                  <p className="text-yellow-600 text-xs mt-1">⚠ S-Corp: ensure salary exists before distribution</p>
                )}
              </div>

              {/* Valor */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Amount (USD) *</label>
                <Input data-testid="input-valor" type="number" step="0.01" {...register("valor", { valueAsNumber: true })} placeholder="0.00" />
                {errors.valor && <p className="text-destructive text-xs mt-1">{errors.valor.message}</p>}
              </div>

              {/* Data */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Date *</label>
                <Input data-testid="input-data" type="date" {...register("data")} />
                {errors.data && <p className="text-destructive text-xs mt-1">{errors.data.message}</p>}
              </div>

              {/* Banco */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Bank Account (optional)</label>
                <select data-testid="select-bankAccountId" {...register("bankAccountId", { setValueAs: (v) => v === "" ? undefined : Number(v) })} className={selectClass}>
                  <option value="">Nenhuma</option>
                  {contas.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome} — {c.banco}</option>
                  ))}
                </select>
              </div>

              {/* Referência */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Reference (e.g., Q1 2025)</label>
                <Input data-testid="input-referencia" {...register("referencia")} placeholder="Ex: Q1 2025" />
              </div>

              {/* Descrição */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-1">Descrição</label>
                <Input data-testid="input-descricao" {...register("descricao")} placeholder="Descrição opcional" />
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <Link href="/financeiro/fiscal/compensacao" data-testid="btn-cancelar">
                <Button type="button" variant="outline">Cancelar</Button>
              </Link>
              <Button type="submit" disabled={loading} data-testid="btn-salvar" className="bg-brand-primary text-white">
                {loading ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
