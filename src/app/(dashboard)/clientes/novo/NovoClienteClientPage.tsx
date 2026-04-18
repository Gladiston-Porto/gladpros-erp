"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, UserPlus } from "lucide-react";
import { Button } from "@gladpros/ui/button"
import { ModulePageHeader } from "@gladpros/ui/module-page-header"
import { useToast } from "@gladpros/ui/toast";
import { ClienteForm } from "@/components/clientes/ClienteForm";
import { ClienteCreateInput, ClienteUpdateInput } from "@/shared/types/cliente";
import { clientsApi } from "@/lib/api/client";

export default function NovoClienteClientPage() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data: ClienteCreateInput | ClienteUpdateInput) => {
    setLoading(true);
    try {
      await clientsApi.createClient(data);
      toast.success("Sucesso", "Cliente criado com sucesso");
      router.push("/clientes");
    } catch (error: unknown) {
      if (error && typeof error === "object" && "details" in error) throw error;
      const errorMessage = error instanceof Error ? error.message : "Erro ao criar cliente";
      toast.error("Erro", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <ModulePageHeader
        title="Novo Cliente"
        description="Pessoa Física (SSN/ITIN) ou Pessoa Jurídica (EIN) — endereço americano"
        icon={<UserPlus />}
        accentColor="#FF8C00"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Clientes", href: "/clientes" },
          { label: "Novo Cliente" },
        ]}
        actions={
          <Button variant="outline" size="default" asChild>
            <Link href="/clientes">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Link>
          </Button>
        }
      />

      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <ClienteForm
          onSubmit={handleSubmit}
          onCancel={() => router.push("/clientes")}
          loading={loading}
        />
      </div>
    </div>
  );
}
