// src/app/clientes/lista/page.tsx
"use client";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useConfirm } from "@gladpros/ui/confirm-dialog";
import { useToast } from "@gladpros/ui/toast";
import { AdvancedPagination } from "@gladpros/ui/advanced-pagination";
import { Search, Plus, Download, ChevronDown, Users, FileSpreadsheet, FileText as FilePdf } from "lucide-react";
import { Button } from '@gladpros/ui/button';
import { ModulePageHeader } from "@gladpros/ui/module-page-header";
import { Card, CardContent } from "@gladpros/ui/card";
import ClientesTable from "@/components/clientes/ClientesTable";
import { ClienteViewDrawer } from "./_components/ClienteViewDrawer";
import { ClienteService } from "@/shared/services/clienteService";
import type { ClienteDTO, ClienteFilters } from "@/shared/types/cliente";
import { useClientesAccess } from "../ClientesAccessContext";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import {
  DEFAULT_CLIENTE_MODULE_CONFIG,
  readClienteModuleConfig,
  type ClienteSortKey,
} from "@/shared/lib/clientes-config";

type SortKey = ClienteSortKey;

type ClientesToolbarProps = {
  q: string;
  onQ: (v: string) => void;
  tipo: string;
  onTipo: (v: "PF" | "PJ" | "all") => void;
  addressCity: string;
  onAddressCity: (v: string) => void;
  addressState: string;
  onAddressState: (v: string) => void;
  addressCounty: string;
  onAddressCounty: (v: string) => void;
  status?: string;
  onStatus?: (v: string) => void;
  total: number;
  showNew?: boolean;
  clientes?: ClienteDTO[];
  scope?: "selected" | "allFiltered";
  onExportSelected?: (format: 'csv' | 'pdf', ids: number[]) => Promise<void> | void;
  onExportAllFiltered?: (format: 'csv' | 'pdf') => Promise<void> | void;
  exporting?: boolean;
};

function ClientesToolbar({
  q,
  onQ,
  tipo,
  onTipo,
  addressCity,
  onAddressCity,
  addressState,
  onAddressState,
  addressCounty,
  onAddressCounty,
  status,
  onStatus,
  total,
  showNew = true,
  clientes = [],
  scope = "selected",
  onExportSelected,
  onExportAllFiltered,
  exporting = false,
}: ClientesToolbarProps) {
  const toast = useToast();
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportScope, setExportScope] = useState<"selected" | "allFiltered">(scope);
  const exportRef = useRef<HTMLDivElement>(null);

  const handleExport = async (format: 'csv' | 'pdf') => {
    setShowExportMenu(false);
    const scopeNow = exportScope;

    try {
      if (scopeNow === 'selected') {
        if (clientes.length === 0) {
          toast.error('Exportação', 'Nenhum cliente selecionado para exportar');
          return;
        }
        if (!onExportSelected) {
          toast.error('Exportação', 'Exportação de selecionados não está disponível');
          return;
        }
        await onExportSelected(format, clientes.map((cliente) => cliente.id));
      } else {
        if (!onExportAllFiltered) {
          toast.error('Exportação', 'Exportação dos filtrados não está disponível');
          return;
        }
        await onExportAllFiltered(format);
      }
    } catch {
      toast.error('Exportação', `Erro ao exportar ${format.toUpperCase()}`);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };

    if (showExportMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showExportMenu]);

  const inputCls = "h-9 rounded-xl border border-border bg-background text-foreground px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-brand-primary transition";

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            aria-label="Buscar clientes"
            data-testid="clientes-search-input"
            value={q}
            onChange={(e) => onQ(e.target.value)}
            placeholder="Buscar por nome ou documento"
            className={`${inputCls} pl-9 w-full`}
          />
        </div>

        {/* Tipo */}
        <select
          aria-label="Filtrar por tipo"
          value={tipo}
          onChange={(e) => onTipo(e.target.value as "PF" | "PJ" | "all")}
          className={inputCls}
        >
          <option value="all">Todos os Tipos</option>
          <option value="PF">Pessoa Física</option>
          <option value="PJ">Pessoa Jurídica</option>
        </select>

        {/* Status */}
        <select
          aria-label="Filtrar por status"
          value={status ?? ""}
          onChange={(e) => { if (onStatus) onStatus(e.target.value); }}
          className={inputCls}
        >
          <option value="all">Todos os Status</option>
          <option value="true">Ativos</option>
          <option value="false">Inativos</option>
        </select>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Export scope */}
        <select
          aria-label="Escopo de exportação"
          value={exportScope}
          onChange={(e) => setExportScope(e.target.value as 'selected' | 'allFiltered')}
          className={inputCls}
          title="Escopo de exportação"
        >
          <option value="selected">Selecionados</option>
          <option value="allFiltered">Todos os filtrados</option>
        </select>

        {/* Export dropdown */}
        <div className="relative" ref={exportRef}>
          <button
            type="button"
            onClick={() => setShowExportMenu(!showExportMenu)}
            disabled={exporting}
            data-testid="clientes-export-button"
            className="flex items-center gap-1.5 h-9 rounded-md border border-border bg-background px-3 text-sm transition hover:bg-muted disabled:cursor-wait disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            {exporting ? 'Exportando…' : 'Exportar'}
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </button>

          {showExportMenu && (
            <div className="absolute right-0 top-full mt-1 w-44 rounded-md border border-border bg-card shadow-lg z-10 overflow-hidden">
              <button
                type="button"
                onClick={() => handleExport('csv')}
                className="w-full px-4 py-2.5 text-left text-sm transition hover:bg-muted flex items-center gap-2"
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                Exportar CSV
              </button>
              <button
                type="button"
                onClick={() => handleExport('pdf')}
                className="w-full px-4 py-2.5 text-left text-sm transition hover:bg-muted flex items-center gap-2"
              >
                <FilePdf className="h-4 w-4 text-rose-600" />
                Exportar PDF
              </button>
            </div>
          )}
        </div>

        {showNew && (
          <Button asChild size="sm">
            <Link href="/clientes/novo">
              <Plus className="h-4 w-4" />
              Novo Cliente
            </Link>
          </Button>
        )}
      </div>

      {/* Location filters */}
      <div className="grid gap-2 md:grid-cols-3">
        <input
          value={addressCity}
          onChange={(e) => onAddressCity(e.target.value)}
          placeholder="Filtrar por cidade"
          className={inputCls}
        />
        <input
          value={addressState}
          onChange={(e) => onAddressState(e.target.value.toUpperCase().slice(0, 2))}
          placeholder="Estado (ex: TX)"
          className={inputCls}
        />
        <input
          value={addressCounty}
          onChange={(e) => onAddressCounty(e.target.value)}
          placeholder="Filtrar por county"
          className={inputCls}
        />
      </div>

      <p className="text-xs text-muted-foreground">{total.toLocaleString("en-US")} resultado(s)</p>
    </div>
  );
}

export default function ClientesListPage() {
  const router = useRouter();
  const { confirm, Dialog } = useConfirm();
  const toast = useToast();
  const { canCreate, canUpdate, canDelete } = useClientesAccess();
  const [q, setQ] = useState("");
  const [tipo, setTipo] = useState<"PF" | "PJ" | "all">(DEFAULT_CLIENTE_MODULE_CONFIG.defaultTipo);
  const [status, setStatus] = useState(DEFAULT_CLIENTE_MODULE_CONFIG.defaultStatus);
  const [addressCity, setAddressCity] = useState("");
  const [addressState, setAddressState] = useState("");
  const [addressCounty, setAddressCounty] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_CLIENTE_MODULE_CONFIG.defaultPageSize);
  const [total, setTotal] = useState(0);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [exporting, setExporting] = useState(false);
  const [data, setData] = useState<ClienteDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>(DEFAULT_CLIENTE_MODULE_CONFIG.defaultSortKey);
  const [sortDir, setSortDir] = useState<"asc" | "desc">(DEFAULT_CLIENTE_MODULE_CONFIG.defaultSortDir);
  const [viewClienteId, setViewClienteId] = useState<number | null>(null);
  const [showDocumentoColumn, setShowDocumentoColumn] = useState(DEFAULT_CLIENTE_MODULE_CONFIG.showDocumentoColumn);
  const [showEnderecoColumn, setShowEnderecoColumn] = useState(DEFAULT_CLIENTE_MODULE_CONFIG.showEnderecoColumn);
  const [configReady, setConfigReady] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const debouncedQuery = useDebouncedValue(q, 300);
  const debouncedAddressCity = useDebouncedValue(addressCity, 300);
  const debouncedAddressState = useDebouncedValue(addressState, 300);
  const debouncedAddressCounty = useDebouncedValue(addressCounty, 300);

  useEffect(() => {
    const config = readClienteModuleConfig();
    setTipo(config.defaultTipo);
    setStatus(config.defaultStatus);
    setPageSize(config.defaultPageSize);
    setSortKey(config.defaultSortKey);
    setSortDir(config.defaultSortDir);
    setShowDocumentoColumn(config.showDocumentoColumn);
    setShowEnderecoColumn(config.showEnderecoColumn);
    setConfigReady(true);
  }, []);

  const load = useCallback(async () => {
    if (!configReady) return;
    setLoading(true);
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const filters: ClienteFilters = {
        q: debouncedQuery || undefined,
        tipo: tipo === "all" ? undefined : tipo,
        ativo: status === "all" ? "all" : status === "true",
        addressCity: debouncedAddressCity || undefined,
        addressState: debouncedAddressState || undefined,
        addressCounty: debouncedAddressCounty || undefined,
        page,
        pageSize,
        sortKey,
        sortDir,
      };

      const response = await ClienteService.getClientes(filters, ac.signal);
      if (ac.signal.aborted) return;
      setData(response.data);
      setTotal(response.total);
      setSelectedIds([]);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      toast.error('Erro', 'Falha ao carregar clientes');
    } finally {
      if (!ac.signal.aborted) {
        setLoading(false);
      }
    }
  }, [configReady, debouncedQuery, tipo, status, debouncedAddressCity, debouncedAddressState, debouncedAddressCounty, page, pageSize, sortKey, sortDir, toast]);

  const updateQuery = useCallback((value: string) => {
    setQ(value);
    setPage(1);
  }, []);

  const updateTipo = useCallback((value: "PF" | "PJ" | "all") => {
    setTipo(value);
    setPage(1);
  }, []);

  const updateStatus = useCallback((value: string) => {
    setStatus(value as "all" | "true" | "false");
    setPage(1);
  }, []);

  const updateAddressCity = useCallback((value: string) => {
    setAddressCity(value);
    setPage(1);
  }, []);

  const updateAddressState = useCallback((value: string) => {
    setAddressState(value);
    setPage(1);
  }, []);

  const updateAddressCounty = useCallback((value: string) => {
    setAddressCounty(value);
    setPage(1);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const handleEdit = useCallback((id: number) => {
    if (!canUpdate) return;
    router.push(`/clientes/${id}`);
  }, [canUpdate, router]);

  const handleView = useCallback((id: number) => {
    setViewClienteId(id);
  }, []);

  const handleDelete = useCallback(async (id: number) => {
    if (!canDelete) return;
    const ok = await confirm({
      title: "Excluir cliente",
      message: "Tem certeza que deseja excluir este cliente?",
      confirmText: "Excluir",
      tone: "danger"
    });

    if (!ok) return;

    try {
      await ClienteService.deleteCliente(id);
      toast.success('Excluído', 'Cliente excluído com sucesso');
      await load();
    } catch (error) {
      toast.error('Erro', error instanceof Error ? error.message : 'Falha ao excluir cliente');
    }
  }, [canDelete, confirm, toast, load]);

  const handleToggleStatus = useCallback(async (id: number, currentStatus: boolean) => {
    if (!canUpdate) return;
    const action = currentStatus ? "desativar" : "ativar";
    const ok = await confirm({
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} cliente`,
      message: `Tem certeza que deseja ${action} este cliente?`,
      confirmText: action.charAt(0).toUpperCase() + action.slice(1),
      tone: currentStatus ? "danger" : "default"
    });

    if (!ok) return;

    try {
      await ClienteService.toggleClienteStatus(id);
      toast.success('Sucesso', 'Status atualizado com sucesso');
      await load();
    } catch (error) {
      toast.error('Erro', error instanceof Error ? error.message : 'Falha ao alterar status do cliente');
    }
  }, [canUpdate, confirm, toast, load]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  const selectedClientes = useMemo(() => {
    const activeSet = new Set(selectedIds);
    return data.filter((cliente) => activeSet.has(cliente.id));
  }, [data, selectedIds]);

  const handleBulkDelete = useCallback(async () => {
    if (!canDelete || selectedIds.length === 0) return;

    const ok = await confirm({
      title: "Excluir clientes",
      message: `Tem certeza que deseja excluir ${selectedIds.length} cliente(s)?`,
      confirmText: "Excluir",
      tone: "danger",
    });

    if (!ok) return;

    try {
      const result = await ClienteService.bulkClientes('delete', 'selected', { ids: selectedIds });
      toast.success('Removido', `${result.processed} cliente(s) removido(s) com sucesso`);
      setSelectedIds([]);
      await load();
    } catch (error) {
      toast.error('Erro', error instanceof Error ? error.message : 'Falha ao remover clientes');
    }
  }, [canDelete, selectedIds, confirm, load, toast]);

  const handleBulkStatusChange = useCallback(async (newStatus: boolean) => {
    if (!canUpdate || selectedIds.length === 0) return;

    const action = newStatus ? "ativar" : "desativar";
    const ok = await confirm({
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} clientes`,
      message: `Tem certeza que deseja ${action} ${selectedIds.length} cliente(s)?`,
      confirmText: action.charAt(0).toUpperCase() + action.slice(1),
      tone: newStatus ? "default" : "danger",
    });

    if (!ok) return;

    try {
      const eligibleIds = selectedIds.filter((id) => {
        const cliente = data.find((item) => item.id === id);
        if (!cliente) return false;
        return newStatus ? !cliente.ativo : cliente.ativo;
      });

      if (eligibleIds.length === 0) {
        toast.success('Sucesso', 'Nenhum cliente precisava de alteração');
        setSelectedIds([]);
        return;
      }

      const result = await ClienteService.bulkClientes(newStatus ? 'activate' : 'deactivate', 'selected', {
        ids: eligibleIds,
      });
      toast.success('Sucesso', `Status de ${result.processed} cliente(s) alterado`);
      setSelectedIds([]);
      await load();
    } catch (error) {
      toast.error('Erro', error instanceof Error ? error.message : 'Falha ao alterar status dos clientes');
    }
  }, [canUpdate, selectedIds, confirm, data, load, toast]);

  const downloadBlob = useCallback((blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }, []);

  const handleExportSelected = useCallback(async (format: 'csv' | 'pdf', ids: number[]) => {
    if (ids.length === 0) return;
    setExporting(true);
    try {
      const blob =
        format === 'csv'
          ? await ClienteService.exportClientesCSV(undefined, ids)
          : await ClienteService.exportClientesPDF(undefined, ids);
      downloadBlob(blob, `clientes-selecionados.${format}`);
      toast.success('Exportação', `${format === 'csv' ? 'CSV' : 'PDF'} baixado com sucesso`);
    } catch (error) {
      toast.error('Erro', error instanceof Error ? error.message : 'Falha ao exportar clientes selecionados');
    } finally {
      setExporting(false);
    }
  }, [downloadBlob, toast]);

  const handleExportAllFiltered = useCallback(async (format: 'csv' | 'pdf') => {
    setExporting(true);
    const filters: ClienteFilters = {
      q: q || undefined,
      tipo: tipo === 'all' ? undefined : tipo,
      ativo: status === 'all' ? 'all' : status === 'true',
      addressCity: addressCity || undefined,
      addressState: addressState || undefined,
      addressCounty: addressCounty || undefined,
      sortKey,
      sortDir,
    };

    try {
      const blob =
        format === 'csv'
          ? await ClienteService.exportClientesCSV(filters)
          : await ClienteService.exportClientesPDF(filters);
      downloadBlob(blob, `clientes.${format}`);
      toast.success('Exportação', `${format === 'csv' ? 'CSV' : 'PDF'} baixado com sucesso`);
    } catch (error) {
      toast.error('Erro', error instanceof Error ? error.message : 'Falha ao exportar clientes');
    } finally {
      setExporting(false);
    }
  }, [downloadBlob, q, tipo, status, addressCity, addressState, addressCounty, sortKey, sortDir, toast]);

  return (
    <div className="space-y-6">
      <ModulePageHeader
        title="Clientes"
        description="Gerencie sua base de clientes (PF e PJ)"
        icon={<Users />}
        accentColor="#FF8C00"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Clientes', href: '/clientes' },
          { label: 'Lista' }
        ]}
        actions={
          canCreate ? (
            <Button asChild size="default">
              <Link href="/clientes/novo">
                <Plus className="h-4 w-4" />
                Novo Cliente
              </Link>
            </Button>
          ) : undefined
        }
      />

      {canUpdate && selectedIds.length > 0 && (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-3 py-3 text-sm">
            <span className="text-muted-foreground font-medium">{selectedIds.length} cliente(s) selecionado(s)</span>
            <div className="flex flex-wrap gap-2 md:ml-auto">
              <button
                type="button"
                onClick={() => handleBulkStatusChange(true)}
                className="rounded-md border border-border px-3 py-1 text-sm text-emerald-600 transition hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
              >
                Ativar
              </button>
              <button
                type="button"
                onClick={() => handleBulkStatusChange(false)}
                className="rounded-md border border-border px-3 py-1 text-sm text-amber-600 transition hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30"
              >
                Desativar
              </button>
              {canDelete ? (
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  className="rounded-md border border-border px-3 py-1 text-sm text-destructive transition hover:border-destructive hover:bg-destructive/5"
                >
                  Excluir
                </button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      )}

      <ClientesToolbar
        q={q}
        onQ={updateQuery}
        tipo={tipo}
        onTipo={updateTipo}
        addressCity={addressCity}
        onAddressCity={updateAddressCity}
        addressState={addressState}
        onAddressState={updateAddressState}
        addressCounty={addressCounty}
        onAddressCounty={updateAddressCounty}
        status={status}
        onStatus={updateStatus}
        total={total}
        clientes={selectedClientes}
        scope="selected"
        onExportSelected={handleExportSelected}
        onExportAllFiltered={handleExportAllFiltered}
        exporting={exporting}
        showNew={false}
      />

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 text-sm opacity-60">Carregando…</div>
          ) : (
            <ClientesTable
              data={data}
              onView={handleView}
              onEdit={canUpdate ? handleEdit : undefined}
              onDelete={canDelete ? handleDelete : undefined}
              onToggleStatus={canUpdate ? handleToggleStatus : undefined}
              sortKey={sortKey}
              sortDir={sortDir}
              onSortChange={(key, dir) => {
                setSortKey(key as SortKey);
                setSortDir(dir);
              }}
              selectedIds={selectedIds}
              onSelectedChange={setSelectedIds}
              showSelection={canUpdate || canDelete}
              showDocumentoColumn={showDocumentoColumn}
              showEnderecoColumn={showEnderecoColumn}
            />
          )}
        </CardContent>
      </Card>

      <Dialog />

      <ClienteViewDrawer
        clienteId={viewClienteId}
        onClose={() => setViewClienteId(null)}
        onEdit={canUpdate ? (id) => { setViewClienteId(null); handleEdit(id); } : undefined}
      />

      <AdvancedPagination
        currentPage={page}
        totalPages={totalPages}
        totalItems={total}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(newPageSize) => {
          setPageSize(newPageSize);
          setPage(1);
        }}
        className="mt-4"
      />
    </div>
  );
}
