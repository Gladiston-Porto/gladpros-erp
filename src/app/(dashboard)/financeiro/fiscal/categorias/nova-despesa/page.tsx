"use client";

import { useState } from "react";
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
import { Tag } from "lucide-react";

const formSchema = z.object({
  nome: z.string().min(2, "Nome obrigatório"),
  cor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Cor inválida (ex: #FF0000)"),
  descricao: z.string().optional(),
  scheduleCLine: z.string().optional(),
  dedutivel: z.boolean(),
});

type FormData = z.infer<typeof formSchema>;

export default function NovaCategoriadespesaPage() {
  const router = useRouter();
  const { success: showSuccess, error: showError } = useToast();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { cor: "#EF4444", dedutivel: true },
  });

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      const res = await authenticatedFetch("/api/financeiro/expense-categories", {
        method: "POST",
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || json.error);
      showSuccess("Categoria criada com sucesso!");
      router.push("/financeiro/fiscal/categorias");
    } catch (err: unknown) {
      showError("Erro", err instanceof Error ? err.message : "Tente novamente");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-hero-gradient rounded-2xl p-6">
        <ModulePageHeader
          title="Nova Categoria de Despesa"
          description="Criar categoria para classificar despesas"
          icon={<Tag className="h-6 w-6 text-white" />}
          breadcrumbs={[
            { label: "Financeiro", href: "/financeiro" },
            { label: "Fiscal", href: "/financeiro/fiscal" },
            { label: "Categorias", href: "/financeiro/fiscal/categorias" },
            { label: "Nova Categoria Despesa" },
          ]}
          className="text-white"
        />
      </div>

      <div className="bg-card border border-border rounded-2xl p-6">
        <form data-testid="form-categoria-despesa" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nome */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1">Category Name *</label>
              <Input data-testid="input-nome" {...register("nome")} placeholder="Ex: Vehicle Expenses" />
              {errors.nome && <p className="text-destructive text-xs mt-1">{errors.nome.message}</p>}
            </div>

            {/* Cor */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Color</label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  {...register("cor")}
                  className="h-10 w-14 rounded-md border border-border bg-background cursor-pointer"
                />
                <Input data-testid="input-cor" {...register("cor")} placeholder="#EF4444" className="flex-1" />
              </div>
              {errors.cor && <p className="text-destructive text-xs mt-1">{errors.cor.message}</p>}
            </div>

            {/* Schedule C Line */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Schedule C Line (e.g., Line 11)</label>
              <Input data-testid="input-scheduleCLine" {...register("scheduleCLine")} placeholder="Ex: Line 9" />
            </div>

            {/* Descrição */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1">Description</label>
              <textarea
                data-testid="input-descricao"
                {...register("descricao")}
                rows={3}
                placeholder="Descrição opcional da categoria"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
              />
            </div>

            {/* Dedutível */}
            <div>
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input data-testid="input-dedutivel" type="checkbox" {...register("dedutivel")} className="rounded" defaultChecked />
                Tax Deductible
              </label>
            </div>
          </div>

          <div className="flex gap-3 justify-end mt-6">
            <Link href="/financeiro/fiscal/categorias" data-testid="btn-cancelar">
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
