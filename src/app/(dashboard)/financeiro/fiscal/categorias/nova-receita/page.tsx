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
  cor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Cor inválida (ex: #0098DA)").optional().or(z.literal("")),
  descricao: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function NovaCategoriaReceitaPage() {
  const router = useRouter();
  const { success: showSuccess, error: showError } = useToast();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { cor: "#0098DA" },
  });

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      const payload = { ...data, cor: data.cor || undefined };
      const res = await authenticatedFetch("/api/financeiro/receitas/categorias", {
        method: "POST",
        body: JSON.stringify(payload),
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
          title="Nova Categoria de Receita"
          description="Criar categoria para classificar receitas"
          icon={<Tag className="h-6 w-6 text-white" />}
          breadcrumbs={[
            { label: "Financeiro", href: "/financeiro" },
            { label: "Fiscal", href: "/financeiro/fiscal" },
            { label: "Categorias", href: "/financeiro/fiscal/categorias" },
            { label: "Nova Categoria Receita" },
          ]}
          className="text-white"
        />
      </div>

      <div className="bg-card border border-border rounded-2xl p-6">
        <form data-testid="form-categoria-receita" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nome */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1">Category Name *</label>
              <Input data-testid="input-nome" {...register("nome")} placeholder="Ex: Service Revenue" />
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
                <Input data-testid="input-cor" {...register("cor")} placeholder="#0098DA" className="flex-1" />
              </div>
              {errors.cor && <p className="text-destructive text-xs mt-1">{errors.cor.message}</p>}
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
