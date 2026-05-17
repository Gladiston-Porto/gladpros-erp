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
import { TrendingUp } from "lucide-react";

const formSchema = z.object({
  descricao: z.string().min(3, "Mínimo 3 caracteres"),
  valor: z.coerce.number().positive("Valor deve ser positivo"),
  categoriaId: z.coerce.number().int().positive("Categoria obrigatória"),
  clienteId: z.coerce.number().int().positive().optional().or(z.literal("")),
  tipo: z.enum(["SERVICO", "VENDA_PRODUTO", "CONSULTORIA", "MENSALIDADE", "COMISSAO", "OUTROS"]),
  formaPagamento: z.enum(["DINHEIRO", "CARTAO_CREDITO", "CARTAO_DEBITO", "PIX", "TRANSFERENCIA", "BOLETO", "CHEQUE"]),
  dataEmissao: z.string().min(1, "Data de emissão obrigatória"),
  dataVencimento: z.string().min(1, "Data de vencimento obrigatória"),
  status: z.enum(["PENDENTE", "RECEBIDA", "CANCELADA"]).default("PENDENTE"),
  observacoes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface Categoria { id: number; nome: string }
interface Cliente { id: number; nomeCompleto?: string; razaoSocial?: string }

export default function NovaReceitaPage() {
  const router = useRouter();
  const { success: showSuccess, error: showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema) as Resolver<FormData>,
    defaultValues: { status: "PENDENTE" },
  });

  useEffect(() => {
    async function load() {
      try {
        const [catRes, cliRes] = await Promise.all([
          authenticatedFetch("/api/financeiro/receitas/categorias"),
          authenticatedFetch("/api/clientes?pageSize=200"),
        ]);
        const catJson = await catRes.json();
        const cliJson = await cliRes.json();
        setCategorias(catJson.data ?? []);
        setClientes(cliJson.data ?? []);
      } catch {
        showError("Erro", "Falha ao carregar dados");
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
        clienteId: data.clienteId || undefined,
        dataEmissao: new Date(data.dataEmissao).toISOString(),
        dataVencimento: new Date(data.dataVencimento).toISOString(),
        recorrente: false,
      };
      const res = await authenticatedFetch("/api/financeiro/receitas", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || json.error);
      showSuccess("Receita criada com sucesso!");
      router.push("/financeiro/receitas");
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
          title="Nova Receita"
          description="Registrar nova receita"
          icon={<TrendingUp className="h-6 w-6 text-white" />}
          breadcrumbs={[
            { label: "Financeiro", href: "/financeiro" },
            { label: "Receitas", href: "/financeiro/receitas" },
            { label: "Nova Receita" },
          ]}
          className="text-white"
        />
      </div>

      <div className="bg-card border border-border rounded-2xl p-6">
        {loadingData ? (
          <div className="animate-pulse h-64 rounded-xl bg-muted" />
        ) : (
          <form data-testid="form-receita" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Descrição */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-1">Descrição *</label>
                <Input data-testid="input-descricao" {...register("descricao")} placeholder="Descrição da receita" />
                {errors.descricao && <p className="text-destructive text-xs mt-1">{errors.descricao.message}</p>}
              </div>

              {/* Valor */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Value (USD) *</label>
                <Input data-testid="input-valor" type="number" step="0.01" {...register("valor")} placeholder="0.00" />
                {errors.valor && <p className="text-destructive text-xs mt-1">{errors.valor.message}</p>}
              </div>

              {/* Categoria */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Categoria *</label>
                <select
                  data-testid="select-categoriaId"
                  {...register("categoriaId")}
                  className="w-full h-10 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                >
                  <option value="">Selecione...</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
                {errors.categoriaId && <p className="text-destructive text-xs mt-1">{errors.categoriaId.message}</p>}
              </div>

              {/* Tipo */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Tipo *</label>
                <select
                  data-testid="select-tipo"
                  {...register("tipo")}
                  className="w-full h-10 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                >
                  <option value="">Selecione...</option>
                  <option value="SERVICO">Service</option>
                  <option value="VENDA_PRODUTO">Product Sale</option>
                  <option value="CONSULTORIA">Consulting</option>
                  <option value="MENSALIDADE">Monthly Fee</option>
                  <option value="COMISSAO">Commission</option>
                  <option value="OUTROS">Other</option>
                </select>
                {errors.tipo && <p className="text-destructive text-xs mt-1">{errors.tipo.message}</p>}
              </div>

              {/* Forma de Pagamento */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Forma de Pagamento *</label>
                <select
                  data-testid="select-formaPagamento"
                  {...register("formaPagamento")}
                  className="w-full h-10 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                >
                  <option value="">Selecione...</option>
                  <option value="DINHEIRO">Cash</option>
                  <option value="CARTAO_CREDITO">Credit Card</option>
                  <option value="CARTAO_DEBITO">Debit Card</option>
                  <option value="PIX">PIX</option>
                  <option value="TRANSFERENCIA">Transfer</option>
                  <option value="BOLETO">Boleto</option>
                  <option value="CHEQUE">Check</option>
                </select>
                {errors.formaPagamento && <p className="text-destructive text-xs mt-1">{errors.formaPagamento.message}</p>}
              </div>

              {/* Cliente */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Cliente (opcional)</label>
                <select
                  data-testid="select-clienteId"
                  {...register("clienteId")}
                  className="w-full h-10 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                >
                  <option value="">Nenhum</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>{c.nomeCompleto ?? c.razaoSocial}</option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Status</label>
                <select
                  data-testid="select-status"
                  {...register("status")}
                  className="w-full h-10 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                >
                  <option value="PENDENTE">Pending</option>
                  <option value="RECEBIDA">Received</option>
                  <option value="CANCELADA">Cancelled</option>
                </select>
              </div>

              {/* Data de Emissão */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Issue Date *</label>
                <Input data-testid="input-dataEmissao" type="date" {...register("dataEmissao")} />
                {errors.dataEmissao && <p className="text-destructive text-xs mt-1">{errors.dataEmissao.message}</p>}
              </div>

              {/* Data de Vencimento */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Due Date *</label>
                <Input data-testid="input-dataVencimento" type="date" {...register("dataVencimento")} />
                {errors.dataVencimento && <p className="text-destructive text-xs mt-1">{errors.dataVencimento.message}</p>}
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
              <Link href="/financeiro/receitas" data-testid="btn-cancelar">
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
