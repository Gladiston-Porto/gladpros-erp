"use client";

import { useState } from "react";
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
import { Landmark } from "lucide-react";

const formSchema = z.object({
  nome: z.string().min(3, "Nome deve ter mínimo 3 caracteres"),
  banco: z.string().min(2, "Nome do banco obrigatório"),
  agencia: z.string().min(1, "Agência obrigatória").regex(/^\d+(-\d+)?$/, "Formato inválido"),
  conta: z.string().min(1, "Conta obrigatória").regex(/^\d+$/, "Apenas dígitos"),
  digito: z.string().regex(/^\d+$/, "Apenas dígitos").optional().or(z.literal("")),
  tipo: z.enum(["CORRENTE", "POUPANCA", "INVESTIMENTO", "CAIXA", "CARTEIRA_DIGITAL"]),
  saldoInicial: z.coerce.number().default(0),
  principal: z.boolean().default(false),
  ativo: z.boolean().default(true),
});

type FormData = z.infer<typeof formSchema>;

export default function NovaContaPage() {
  const router = useRouter();
  const { success: showSuccess, error: showError } = useToast();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema) as Resolver<FormData>,
    defaultValues: { tipo: "CORRENTE", saldoInicial: 0, principal: false, ativo: true },
  });

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      const payload = {
        ...data,
        digito: data.digito || undefined,
      };
      const res = await authenticatedFetch("/api/financeiro/contas", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || json.error);
      showSuccess("Conta criada com sucesso!");
      router.push("/financeiro/contas");
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
          title="Nova Conta"
          description="Cadastrar conta bancária"
          icon={<Landmark className="h-6 w-6 text-white" />}
          breadcrumbs={[
            { label: "Financeiro", href: "/financeiro" },
            { label: "Contas", href: "/financeiro/contas" },
            { label: "Nova Conta" },
          ]}
          className="text-white"
        />
      </div>

      <div className="bg-card border border-border rounded-2xl p-6">
        <form data-testid="form-conta" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nome */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1">Account Name *</label>
              <Input data-testid="input-nome" {...register("nome")} placeholder="Ex: Chase Business Checking" />
              {errors.nome && <p className="text-destructive text-xs mt-1">{errors.nome.message}</p>}
            </div>

            {/* Banco */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Bank Name *</label>
              <Input data-testid="input-banco" {...register("banco")} placeholder="Ex: Chase Bank" />
              {errors.banco && <p className="text-destructive text-xs mt-1">{errors.banco.message}</p>}
            </div>

            {/* Tipo */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Tipo *</label>
              <select data-testid="select-tipo" {...register("tipo")} className={selectClass}>
                <option value="CORRENTE">Checking</option>
                <option value="POUPANCA">Savings</option>
                <option value="INVESTIMENTO">Investment</option>
                <option value="CAIXA">Cash</option>
                <option value="CARTEIRA_DIGITAL">Digital Wallet</option>
              </select>
            </div>

            {/* Agência */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Branch (Routing) *</label>
              <Input data-testid="input-agencia" {...register("agencia")} placeholder="Ex: 021000021" />
              {errors.agencia && <p className="text-destructive text-xs mt-1">{errors.agencia.message}</p>}
            </div>

            {/* Conta */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Account Number *</label>
              <Input data-testid="input-conta" {...register("conta")} placeholder="Ex: 1234567890" />
              {errors.conta && <p className="text-destructive text-xs mt-1">{errors.conta.message}</p>}
            </div>

            {/* Dígito */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Check Digit</label>
              <Input data-testid="input-digito" {...register("digito")} placeholder="Ex: 5" />
              {errors.digito && <p className="text-destructive text-xs mt-1">{errors.digito.message}</p>}
            </div>

            {/* Saldo Inicial */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Initial Balance (USD)</label>
              <Input data-testid="input-saldoInicial" type="number" step="0.01" {...register("saldoInicial")} placeholder="0.00" />
            </div>

            {/* Checkboxes */}
            <div className="md:col-span-2 flex gap-6">
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input data-testid="input-principal" type="checkbox" {...register("principal")} className="rounded" />
                Primary Account
              </label>
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input data-testid="input-ativo" type="checkbox" {...register("ativo")} className="rounded" defaultChecked />
                Active
              </label>
            </div>
          </div>

          <div className="flex gap-3 justify-end mt-6">
            <Link href="/financeiro/contas" data-testid="btn-cancelar">
              <Button type="button" variant="outline">Cancelar</Button>
            </Link>
            <Button type="submit" disabled={loading} data-testid="btn-salvar" className="bg-brand-primary text-white">
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
