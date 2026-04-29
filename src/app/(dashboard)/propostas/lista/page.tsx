"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Plus, FileText, Clock } from "lucide-react";

import { AdvancedPagination } from "@gladpros/ui/advanced-pagination"
import { Button } from "@gladpros/ui/button"
import { Card, CardContent } from "@gladpros/ui/card"
import { useConfirm } from "@gladpros/ui/confirm-dialog"
import { ModulePageHeader } from "@gladpros/ui/module-page-header"
import { useToast } from "@gladpros/ui/toast";

import { authenticatedFetch } from "@/lib/api/client";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";

import { PropostasTable } from "./_components/PropostasTable";
import { PropostasToolbar } from "./_components/PropostasToolbar";
import type {
  PropostaClienteOption,
  PropostaDTO,
  SortKey,
  StatusProposta,
} from "./_components/types";

export default function PropostasPage() {
  const [propostas, setPropostas] = useState<PropostaDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("criadoEm");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [reloadKey, setReloadKey] = useState(0);
  const [total, setTotal] = useState(0);
  const [clientes, setClientes] = useState<PropostaClienteOption[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);

  const router = useRouter();
  const { confirm, Dialog } = useConfirm();
  const toast = useToast();
  const debouncedQ = useDebouncedValue(q, 300);

  useEffect(() => {
    const controller = new AbortController();

    async function loadClientes() {
      try {
        const response = await authenticatedFetch("/api/clients?pageSize=500", {
          signal: controller.signal,
        });
        if (!response.ok) {
          return;
        }
        const payload = await response.json();
        const list = Array.isArray(payload)
          ? payload
          : payload.data || payload.clients || [];
        setClientes(
          list.map((cliente: any) => ({
            id: String(cliente.id),
            nome:
              cliente.nome ||
              cliente.nomeCompleto ||
              cliente.razaoSocial ||
              cliente.nomeFantasia ||
              "Sem nome",
          }))
        );
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }
      }
    }

    void loadClientes();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("pageSize", String(pageSize));
        params.set("sortKey", sortKey);
        params.set("sortDir", sortDir);
        if (status) {
          params.set("status", status);
        }
        if (debouncedQ) {
          params.set("search", debouncedQ);
        }
        if (clienteId) {
          params.set("clienteId", clienteId);
        }

        const response = await authenticatedFetch(`/api/propostas?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Erro ${response.status}`);
        }

        const payload = await response.json();
        const items: PropostaDTO[] = (payload.data || []).map((proposta: any) => ({
          id: String(proposta.id),
          numeroProposta: proposta.numeroProposta || "",
          titulo: proposta.titulo || "",
          cliente: proposta.cliente
            ? {
                id: String(proposta.cliente.id),
                nomeCompleto: proposta.cliente.nome,
              }
            : undefined,
          status: proposta.status as StatusProposta,
          valor: proposta.valorEstimado ?? undefined,
          criadoEm: proposta.criadoEm,
        }));

        setTotal(payload.pagination?.total ?? items.length);
        setPropostas(items);
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }
        setError(error instanceof Error ? error.message : "Erro ao carregar propostas");
      } finally {
        setLoading(false);
      }
    }

    void loadData();

    return () => controller.abort();
  }, [clienteId, debouncedQ, page, pageSize, reloadKey, sortDir, sortKey, status]);

  const selectedPropostas = useMemo(
    () => propostas.filter((proposta) => selectedIds.includes(proposta.id)),
    [propostas, selectedIds]
  );

  const handleEdit = (id: string) => {
    router.push(`/propostas/${id}`);
  };

  const handleDelete = async (id: string) => {
    const proposta = propostas.find((item) => item.id === id);
    if (!proposta) {
      return;
    }

    const confirmed = await confirm({
      title: "Excluir Proposta",
      message: `Tem certeza que deseja excluir a proposta "${proposta.titulo}"? Esta ação não pode ser desfeita.`,
      confirmText: "Excluir",
      tone: "danger",
    });

    if (!confirmed) {
      return;
    }

    try {
      const response = await authenticatedFetch(`/api/propostas/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Falha ao excluir");
      }
      toast.success("Proposta excluída com sucesso");
      setPropostas((current) => current.filter((item) => item.id !== id));
      setTotal((current) => Math.max(0, current - 1));
    } catch {
      toast.error("Erro ao excluir proposta");
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const response = await authenticatedFetch(`/api/propostas/${id}/duplicate`, {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Falha ao duplicar");
      }
      toast.success("Proposta duplicada com sucesso");
      setReloadKey((current) => current + 1);
    } catch {
      toast.error("Erro ao duplicar proposta");
    }
  };

  const handleSend = async (id: string) => {
    try {
      const response = await authenticatedFetch(`/api/propostas/${id}/send`, {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Falha ao enviar");
      }
      toast.success("Proposta enviada com sucesso");
      setPropostas((current) =>
        current.map((item) =>
          item.id === id ? { ...item, status: "ENVIADA" } : item
        )
      );
    } catch {
      toast.error("Erro ao enviar proposta");
    }
  };

  const handleExpirar = async () => {
    try {
      const response = await authenticatedFetch('/api/propostas/expirar', { method: 'POST' })
      if (!response.ok) throw new Error('Falha')
      const result = await response.json()
      const count = result.data?.expiredCount ?? 0
      if (count > 0) {
        toast.success(`${count} proposta(s) vencida(s) cancelada(s) com sucesso`)
        setReloadKey((current) => current + 1)
      } else {
        toast.success('Nenhuma proposta vencida encontrada')
      }
    } catch {
      toast.error('Erro ao expirar propostas')
    }
  }

  const handleExportAllFiltered = async (format: "csv" | "pdf") => {
    setExporting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success(`Exportação ${format.toUpperCase()} concluída`);
    } catch {
      toast.error(`Erro na exportação ${format.toUpperCase()}`);
    } finally {
      setExporting(false);
    }
  };

  if (error) {
    return (
      <Card className="border-none shadow-sm">
        <CardContent className="py-12 text-center">
          <h2 className="text-lg font-semibold text-destructive">
            Erro ao carregar propostas
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          <Button
            onClick={() => setReloadKey((current) => current + 1)}
            className="mt-4"
            variant="secondary"
          >
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <ModulePageHeader
        title="Propostas"
        description="Gerencie suas propostas comerciais"
        icon={<FileText />}
        accentColor="#FF8C00"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Propostas" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="default" onClick={handleExpirar} title="Cancelar propostas enviadas com validade vencida">
              <Clock className="h-4 w-4 mr-2" />
              Expirar Vencidas
            </Button>
            <Button asChild size="default">
              <Link href="/propostas/nova">
                <Plus className="h-4 w-4 mr-2" />
                Nova Proposta
              </Link>
            </Button>
          </div>
        }
      />

      <PropostasToolbar
        q={q}
        onQ={(value) => {
          setQ(value);
          setPage(1);
        }}
        status={status}
        onStatus={(value) => {
          setStatus(value);
          setPage(1);
        }}
        clienteId={clienteId}
        onClienteId={(value) => {
          setClienteId(value);
          setPage(1);
        }}
        total={total}
        propostas={selectedPropostas}
        scope="allFiltered"
        onExportAllFiltered={handleExportAllFiltered}
        exporting={exporting}
        clientes={clientes}
      />

      {loading ? (
        <Card className="border-none shadow-sm">
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">Carregando propostas...</p>
            </div>
          </CardContent>
        </Card>
      ) : propostas.length === 0 ? (
        <Card className="border-none shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="mb-4 h-12 w-12 text-muted-foreground/40" />
            <h3 className="mb-2 font-semibold text-foreground">Nenhuma proposta encontrada</h3>
            <p className="mb-6 text-sm text-muted-foreground">
              {total === 0 ? 'Crie sua primeira proposta para começar.' : 'Nenhuma proposta corresponde aos filtros aplicados.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-none shadow-sm">
          <CardContent className="p-0">
            <PropostasTable
              data={propostas}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
              onSend={handleSend}
              onSelectedChange={setSelectedIds}
              sortKey={sortKey}
              sortDir={sortDir}
              onSortChange={(key, dir) => {
                setSortKey(key);
                setSortDir(dir);
              }}
            />
          </CardContent>
        </Card>
      )}

      {!loading && (
        <AdvancedPagination
          currentPage={page}
          totalPages={Math.ceil(total / pageSize)}
          onPageChange={setPage}
          totalItems={total}
          pageSize={pageSize}
        />
      )}

      <Dialog />
    </div>
  );
}
