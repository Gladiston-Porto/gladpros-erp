"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, History, UserCog, AlertTriangle } from "lucide-react";
import { Button } from "@gladpros/ui/button"
import { ModulePageHeader } from "@gladpros/ui/module-page-header"
import { useToast } from "@gladpros/ui/toast";
import { ClienteForm } from "@/components/clientes/ClienteForm";
import { ClienteHistorico } from "@/components/clientes/ClienteHistorico";
import { ClienteCreateInput, ClienteUpdateInput } from "@/shared/types/cliente";
import { parseApiError } from "@/lib/api/parseApiError";

type Aba = "dados" | "historico";

export default function EditClienteClientPage({ id }: { id: string }) {
  const clienteId = Number(id);
  const router = useRouter();
  const toast = useToast();
  const [cliente, setCliente] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [operationLoading, setOperationLoading] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<Aba>("dados");

  useEffect(() => {
    let cancelled = false;

    const fetchCliente = async () => {
      try {
        const response = await fetch(`/api/clientes/${id}`);
        if (!response.ok) throw new Error("Cliente não encontrado");
        const data = await response.json();
        if (!cancelled) setCliente(data.data ?? data);
      } catch (error: unknown) {
        if (cancelled) return;
        const errorMessage = error instanceof Error ? error.message : "Erro ao carregar cliente";
        toast.error("Erro", errorMessage);
        router.push("/clientes");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchCliente();
    return () => {
      cancelled = true;
    };
  }, [id, router, toast]);

  const handleSubmit = async (data: ClienteCreateInput | ClienteUpdateInput) => {
    setOperationLoading(true);
    try {
      const response = await fetch(`/api/clientes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        const { fieldErrors: parsedFieldErrors, firstMessage } = parseApiError(error, "Erro ao atualizar cliente");
        const fieldErrors: Record<string, string> = { ...parsedFieldErrors };

        // Legacy: details com formato Zod issues
        if (error?.details && Object.keys(fieldErrors).length === 0) {
          throw { message: firstMessage, details: error.details };
        }

        // Mapeamento de mensagens de conflito (email/documento) que ainda não vêm como validationErrors
        const msg: string = firstMessage;
        if (/e-mail.*cadastrado|E-mail.*cadastrado/i.test(msg) && !fieldErrors.email) {
          fieldErrors.email = msg;
        }
        if (/Documento.*cadastrado/i.test(msg)) {
          const dto = data as Record<string, unknown>;
          if (dto?.tipo === "PJ" && dto?.ein && !fieldErrors.ein) fieldErrors.ein = msg;
          if (dto?.tipo === "PF") {
            if (dto?.tipoDocumentoPF === "SSN" && dto?.ssn && !fieldErrors.ssn) fieldErrors.ssn = msg;
            if (dto?.tipoDocumentoPF === "ITIN" && dto?.itin && !fieldErrors.itin) fieldErrors.itin = msg;
          }
        }

        if (Object.keys(fieldErrors).length) throw { message: msg, fieldErrors };
        throw new Error(msg);
      }

      toast.success("Sucesso", "Cliente atualizado com sucesso");
      router.push("/clientes");
    } catch (error: unknown) {
      if (error && typeof error === "object" && "details" in error) throw error;
      const errorMessage = error instanceof Error ? error.message : "Erro ao atualizar cliente";
      toast.error("Erro", errorMessage);
    } finally {
      setOperationLoading(false);
    }
  };

  const nomeCliente = loading
    ? "Carregando..."
    : ((cliente?.nomeCompleto || cliente?.nomeFantasia || cliente?.razaoSocial || "Cliente") as string);

  return (
    <div className="space-y-6">
      <ModulePageHeader
        title="Editar Cliente"
        description={nomeCliente}
        icon={<UserCog />}
        accentColor="#FF8C00"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Clientes", href: "/clientes" },
          { label: nomeCliente },
        ]}
        badges={
          cliente ? (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
              {cliente.tipo === "PF" ? "Pessoa Física" : "Pessoa Jurídica"}
              {(() => {
                const city = String(cliente.addressCity ?? '');
                const state = String(cliente.addressState ?? '');
                const loc = [city, state].filter(Boolean).join(", ");
                return loc ? ` · ${loc}` : null;
              })()}
            </span>
          ) : undefined
        }
        actions={
          <Button variant="outline" size="default" asChild>
            <Link href="/clientes">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Link>
          </Button>
        }
      />

      <div className="flex gap-2 border-b border-border pb-3">
        <button
          onClick={() => setAbaAtiva("dados")}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            abaAtiva === "dados" ? "bg-brand-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          <UserCog className="h-4 w-4" />
          Dados Cadastrais
        </button>
        <button
          onClick={() => setAbaAtiva("historico")}
          disabled={loading}
          className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
            abaAtiva === "historico" ? "bg-brand-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          <History className="h-4 w-4" />
          Histórico
        </button>
      </div>

      {abaAtiva === "dados" && (
        <div className="space-y-4">
          {!loading && cliente && !cliente.documentoMasked && (
            <div className="flex items-start gap-3 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-700 dark:text-yellow-400">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">Documento fiscal não cadastrado</p>
                <p className="mt-0.5 text-yellow-600 dark:text-yellow-500">
                  Este cliente não possui SSN, ITIN ou EIN registrado. Recomendamos adicionar para garantir
                  rastreabilidade fiscal e relatórios corretos.
                </p>
              </div>
            </div>
          )}
          <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
            {loading ? (
              <div className="py-12 text-center text-sm text-muted-foreground">Carregando dados do cliente...</div>
            ) : (
              <ClienteForm cliente={cliente} onSubmit={handleSubmit} onCancel={() => router.push("/clientes")} loading={operationLoading} />
            )}
          </div>
        </div>
      )}

      {abaAtiva === "historico" && !loading && (
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <div className="mb-4">
            <h3 className="font-title text-base font-semibold text-foreground">Histórico do Cliente</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Todas as ordens de serviço, propostas, projetos e faturas vinculadas a este cliente.
            </p>
          </div>
          <ClienteHistorico clienteId={clienteId} />
        </div>
      )}
    </div>
  );
}
