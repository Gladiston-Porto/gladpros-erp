"use client";

/**
 * Ordens de Serviço — Lista — GladPros Design System v3.1
 */

import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { AdvancedPagination } from "@gladpros/ui/advanced-pagination"
import { Badge } from "@gladpros/ui/badge"
import { Button } from "@gladpros/ui/button"
import { Card, CardContent } from "@gladpros/ui/card"
import { ModulePageHeader } from "@gladpros/ui/module-page-header";
import {
  Search, Plus, ArrowUpDown, Eye, FileText,
  User, Calendar, AlertCircle, ClipboardList, X,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────
type ServiceOrderStatus =
  | "DRAFT" | "SCHEDULED" | "IN_PROGRESS" | "COMPLETED"
  | "AWAITING_PAYMENT" | "CLOSED" | "WRITE_OFF" | "CANCELED";

type ServiceOrderDTO = {
  id: number;
  ticketNumber: string;
  title: string;
  status: ServiceOrderStatus;
  scheduledDate: string | null;
  scheduleType: string;
  total: number;
  cliente: { id: number; name: string };
  assignedTech: { id: number; name: string } | null;
  hasPendingMaterials: boolean;
  createdAt: string;
};

type SortKey = "ticketNumber" | "title" | "cliente" | "status" | "total" | "scheduledDate" | "createdAt";

// ─── Status config ────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<ServiceOrderStatus, {
  variant: 'outline' | 'info' | 'warning' | 'success' | 'secondary' | 'error';
  label: string;
}> = {
  DRAFT:           { variant: 'outline',   label: 'Rascunho' },
  SCHEDULED:       { variant: 'info',      label: 'Agendado' },
  IN_PROGRESS:     { variant: 'warning',   label: 'Em Execução' },
  COMPLETED:       { variant: 'success',   label: 'Concluído' },
  AWAITING_PAYMENT:{ variant: 'warning',   label: 'Ag. Pagamento' },
  CLOSED:          { variant: 'secondary', label: 'Fechado' },
  WRITE_OFF:       { variant: 'error',     label: 'Write-Off' },
  CANCELED:        { variant: 'error',     label: 'Cancelado' },
};

function StatusBadge({ status }: { status: ServiceOrderStatus }) {
  const cfg = STATUS_CONFIG[status] ?? { variant: 'outline' as const, label: status };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

// ─── Sortable th ──────────────────────────────────────────────────────────
 
function Th({ label, sortKey: key, currentKey, currentDir: _currentDir, onSort }: {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  currentDir: "asc" | "desc";
  onSort: (k: SortKey) => void;
}) {
  const active = key === currentKey;
  return (
    <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
      <button
        onClick={() => onSort(key)}
        type="button"
        className={`inline-flex items-center gap-1 rounded px-1 py-0.5 transition-colors hover:text-foreground ${active ? "text-foreground" : ""}`}
      >
        {label}
        <ArrowUpDown className={`size-3 ${active ? "opacity-100" : "opacity-40"}`} />
      </button>
    </th>
  );
}

// ─── STATUS_OPTIONS sem emoji ─────────────────────────────────────────────
const STATUS_OPTIONS = [
  { value: "",               label: "Todos os Status" },
  { value: "DRAFT",          label: "Rascunho" },
  { value: "SCHEDULED",      label: "Agendado" },
  { value: "IN_PROGRESS",    label: "Em Execução" },
  { value: "COMPLETED",      label: "Concluído" },
  { value: "AWAITING_PAYMENT",label: "Ag. Pagamento" },
  { value: "CLOSED",         label: "Fechado" },
  { value: "WRITE_OFF",      label: "Write-Off" },
  { value: "CANCELED",       label: "Cancelado" },
];

// ─── Page ─────────────────────────────────────────────────────────────────
export default function ServiceOrdersListPage() {
  const [orders,      setOrders]      = useState<ServiceOrderDTO[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search,      setSearch]      = useState("");
  const [statusFilter,setStatusFilter]= useState("");
  const [sortKey,     setSortKey]     = useState<SortKey>("createdAt");
  const [sortDir,     setSortDir]     = useState<"asc" | "desc">("desc");
  const [page,        setPage]        = useState(1);
  const [total,       setTotal]       = useState(0);
  const PAGE_SIZE = 20;
  const router = useRouter();

  // Debounce da busca
  useEffect(() => {
    const id = window.setTimeout(() => setSearch(searchInput), 300);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(PAGE_SIZE));
      if (search)       params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      params.set("sortKey", sortKey);
      params.set("sortDir", sortDir);
      const res = await fetch(`/api/service-orders?${params}`);
      if (!res.ok) throw new Error("Erro ao carregar ordens");
      const json = await res.json();
      setOrders(json.data || []);
      setTotal(json.pagination?.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, sortKey, sortDir]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
    setPage(1);
  };

  const fmt$ = (v: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);
  const fmtDate = (s: string | null) => s ? new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/Chicago" }) : "-";

  if (error) {
    return (
      <div className="space-y-6">
        <ModulePageHeader title="Ordens de Serviço" icon={<ClipboardList />} accentColor="#0098DA" />
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm font-medium text-destructive">{error}</p>
            <Button onClick={loadData} variant="outline" size="sm" className="mt-4">Tentar novamente</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Header ────────────────────────────────────────────────────── */}
      <ModulePageHeader
        title="Ordens de Serviço"
        description="Gerencie ordens, agendamentos e execução de serviços"
        icon={<ClipboardList />}
        accentColor="#0098DA"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Ordens de Serviço" },
        ]}
        actions={
          <Link href="/ordens-servico/nova">
            <Button size="sm">
              <Plus className="size-4" />
              Nova OS
            </Button>
          </Link>
        }
      />

      {/* ── Toolbar ───────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Busca */}
        <div className="relative flex items-center">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <input
            value={searchInput}
            onChange={e => { setSearchInput(e.target.value); setPage(1); }}
            placeholder="Ticket, título ou cliente…"
            className="h-8 w-[240px] rounded-lg border border-border bg-muted/40 pl-8 pr-7 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none transition-all focus:w-[280px] focus:border-primary/50 focus:bg-background focus:ring-2 focus:ring-primary/10"
          />
          {searchInput && (
            <button
              onClick={() => { setSearchInput(""); setPage(1); }}
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Limpar busca"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Filtro de status — select nativo estilizado */}
        <select
          title="Filtrar por status"
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="h-8 rounded-lg border border-border bg-muted/40 px-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary/50 focus:bg-background"
        >
          {STATUS_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Contagem */}
        <span className="ml-auto text-[11px] text-muted-foreground tabular-nums">
          {total.toLocaleString("en-US")} resultado{total !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ── Tabela ────────────────────────────────────────────────────── */}
      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <div className="text-center space-y-3">
              <div className="mx-auto size-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-xs text-muted-foreground">Carregando ordens…</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="border-b border-border bg-muted/30">
                  <tr>
                    <Th label="Ticket"      sortKey="ticketNumber"  currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
                    <Th label="Título"      sortKey="title"         currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
                    <Th label="Cliente"     sortKey="cliente"       currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Técnico</th>
                    <Th label="Status"      sortKey="status"        currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
                    <Th label="Agendamento" sortKey="scheduledDate" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
                    <Th label="Total"       sortKey="total"         currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
                    <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {orders.map(order => (
                    <tr
                      key={order.id}
                      className="cursor-pointer transition-colors hover:bg-muted/40"
                      onClick={() => router.push(`/ordens-servico/${order.id}`)}
                    >
                      <td className="px-3 py-3 font-mono text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          {order.ticketNumber}
                          {order.hasPendingMaterials && (
                            <span title="Materiais pendentes">
                              <AlertCircle className="size-3.5 text-amber-500" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 max-w-[180px] truncate font-medium text-foreground">
                        {order.title}
                      </td>
                      <td className="px-3 py-3 text-sm text-foreground">
                        {order.cliente.name}
                      </td>
                      <td className="px-3 py-3">
                        {order.assignedTech ? (
                          <div className="flex items-center gap-1.5">
                            <User className="size-3 text-muted-foreground" />
                            <span className="text-xs text-foreground">{order.assignedTech.name}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="px-3 py-3">
                        {order.scheduledDate ? (
                          <div className="flex items-center gap-1.5 text-xs text-foreground">
                            <Calendar className="size-3 text-muted-foreground" />
                            {fmtDate(order.scheduledDate)}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-sm font-medium tabular-nums text-foreground">
                        {fmt$(Number(order.total))}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="size-7 p-0"
                            onClick={e => { e.stopPropagation(); router.push(`/ordens-servico/${order.id}`); }}
                            title="Ver detalhes"
                          >
                            <Eye className="size-3.5" />
                          </Button>
                          {order.status === "COMPLETED" && !order.total && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="size-7 p-0"
                              onClick={e => { e.stopPropagation(); }}
                              title="Gerar Fatura"
                            >
                              <FileText className="size-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-3 py-16 text-center">
                        <ClipboardList className="mx-auto mb-3 size-8 text-muted-foreground/40" />
                        <p className="text-sm font-medium text-muted-foreground">Nenhuma ordem encontrada</p>
                        <p className="mt-1 text-xs text-muted-foreground/60">Tente ajustar os filtros ou crie uma nova OS</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Paginação ─────────────────────────────────────────────────── */}
      {!loading && total > PAGE_SIZE && (
        <AdvancedPagination
          currentPage={page}
          totalPages={Math.ceil(total / PAGE_SIZE)}
          onPageChange={setPage}
          totalItems={total}
          pageSize={PAGE_SIZE}
        />
      )}
    </div>
  );
}
