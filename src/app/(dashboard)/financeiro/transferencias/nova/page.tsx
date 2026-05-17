"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useToast } from "@gladpros/ui/toast";
import { Button } from "@gladpros/ui/button";
import { Input } from "@gladpros/ui/input";
import { ModulePageHeader } from "@gladpros/ui/module-page-header";
import { authenticatedFetch } from "@/lib/api/client";
import { ArrowLeftRight } from "lucide-react";

const formSchema = z.object({
  fromAccountId: z.coerce.number().int().positive("Conta de origem obrigatória"),
  toAccountId: z.coerce.number().int().positive("Conta de destino obrigatória"),
  valor: z.coerce.number().positive("Valor deve ser positivo"),
  descricao: z.string().min(3, "Mínimo 3 caracteres"),
  dataAgendamento: z.string().optional(),
  observacoes: z.string().optional(),
}).refine((d) => d.fromAccountId !== d.toAccountId, {
  message: "Conta de origem e destino devem ser diferentes",
  path: ["toAccountId"],
});

type FormData = z.infer<typeof formSchema>;

interface Conta { id: number; nome: string; banco: string }

export default function NovaTransferenciaPage() {
  const router = useRouter();
  const { success: showSuccess, error: showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [contas, setContas] = useState<Conta[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(formSchema) as Resolver<FormData> });

  useEffect(() => {
    async function load() {
      try {
        const res = await authenticatedFetch("/api/financeiro/contas");
        const json = await res.json();
        setContas(json.data ?? []);
      } catch {
        showError("Erro", "Falha ao carregar contas");
      } finally {
        setLoadingData(false);
      }
    }
    load();
  }, [showError]);

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      const payload = {
        ...data,
        empresaId: 1,
        dataAgendamento: data.dataAgendamento ? new Date(data.dataAgendamento).toISOString() : undefined,
      };
      const res = await authenticatedFetch("/api/financeiro/transferencias", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || json.error);
      showSuccess("Transferência criada com sucesso!");
      router.push("/financeiro/transferencias");
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
          title="Nova Transferência"
          description="Transferir entre contas"
          icon={<ArrowLeftRight className="h-6 w-6 text-white" />}
          breadcrumbs={[
            { label: "Financeiro", href: "/financeiro" },
            { label: "Transferências", href: "/financeiro/transferencias" },
            { label: "Nova Transferência" },
          ]}
          className="text-white"
        />
      </div>

      <div className="bg-card border border-border rounded-2xl p-6">
        {loadingData ? (
          <div className="animate-pulse h-64 rounded-xl bg-muted" />
        ) : (
          <form data-testid="form-transferencia" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* From Account */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">From Account *</label>
                <select data-testid="select-fromAccountId" {...register("fromAccountId")} className={selectClass}>
                  <option value="">Selecione...</option>
                  {contas.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome} — {c.banco}</option>
                  ))}
                </select>
                {errors.fromAccountId && <p className="text-destructive text-xs mt-1">{errors.fromAccountId.message}</p>}
              </div>

              {/* To Account */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">To Account *</label>
                <select data-testid="select-toAccountId" {...register("toAccountId")} className={selectClass}>
                  <option value="">Selecione...</option>
                  {contas.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome} — {c.banco}</option>
                  ))}
                </select>
                {errors.toAccountId && <p className="text-destructive text-xs mt-1">{errors.toAccountId.message}</p>}
              </div>

              {/* Valor */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Amount (USD) *</label>
                <Input data-testid="input-valor" type="number" step="0.01" {...register("valor")} placeholder="0.00" />
                {errors.valor && <p className="text-destructive text-xs mt-1">{errors.valor.message}</p>}
              </div>

              {/* Data Agendamento */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Schedule Date</label>
                <Input data-testid="input-dataAgendamento" type="date" {...register("dataAgendamento")} />
              </div>

              {/* Descrição */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-1">Descrição *</label>
                <Input data-testid="input-descricao" {...register("descricao")} placeholder="Motivo da transferência" />
                {errors.descricao && <p className="text-destructive text-xs mt-1">{errors.descricao.message}</p>}
              </div>

              {/* Observações */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-1">Observações</label>
                <textarea
                  data-testid="input-observacoes"
                  {...register("observacoes")}
                  rows={3}
                  placeholder="Observações opcionais"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <Link href="/financeiro/transferencias" data-testid="btn-cancelar">
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
