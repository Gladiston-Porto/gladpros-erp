"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  Mail,
  Phone,
  MapPin,
  FileText,
  Calendar,
  Pencil,
  CheckCircle2,
  XCircle,
  Building2,
  User,
  Hash,
  DollarSign,
  Briefcase,
  ClipboardList,
} from "lucide-react";

const AVATAR_BG_CLASSES = [
  "bg-sky-600",
  "bg-teal-600",
  "bg-orange-600",
  "bg-indigo-600",
  "bg-emerald-600",
  "bg-rose-600",
];

const LOADING_WIDTH_CLASSES = ["w-[55%]", "w-[67%]", "w-[79%]", "w-[91%]"];

interface ClienteDetails {
  id: number;
  tipo: "PF" | "PJ";
  nomeCompleto?: string | null;
  razaoSocial?: string | null;
  nomeFantasia?: string | null;
  email: string;
  telefone: string;
  addressStreet?: string | null;
  addressUnit?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  addressZip?: string | null;
  addressCounty?: string | null;
  observacoes?: string | null;
  ativo: boolean;
  documentoMasked: string;
  criadoEm: string;
  atualizadoEm: string;
  metrics?: {
    canViewFinancial?: boolean;
    lifetimeValue?: number;
    outstandingValue?: number;
    paidInvoices?: number;
    openInvoices?: number;
    projetosCount: number;
    serviceOrdersCount: number;
    completedServiceOrdersCount: number;
    lastInvoiceAt: string | null;
  };
}

function avatarBgClass(name: string): string {
  const idx =
    name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) %
    AVATAR_BG_CLASSES.length;
  return AVATAR_BG_CLASSES[idx];
}

function DrawerAvatar({ name, tipo }: { name: string; tipo: "PF" | "PJ" }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div
      className={`flex h-16 w-16 items-center justify-center rounded-2xl text-xl font-semibold select-none text-white ${avatarBgClass(name)}`}
      aria-label={name}
    >
      {initials || (tipo === "PF" ? "PF" : "PJ")}
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 shrink-0 text-muted-foreground">{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-3 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

type Props = {
  clienteId: number | null;
  onClose: () => void;
  onEdit?: (id: number) => void;
};

export function ClienteViewDrawer({ clienteId, onClose, onEdit }: Props) {
  const router = useRouter();
  const [cliente, setCliente] = useState<ClienteDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const isOpen = clienteId !== null;

  // Fetch details
  useEffect(() => {
    if (!clienteId) {
      setCliente(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    setCliente(null);
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    fetch(`/api/clientes/${clienteId}`, { signal: ac.signal })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "Erro ao carregar cliente");
        }
        return res.json();
      })
      .then((body) => {
        if (!ac.signal.aborted) setCliente(body.data ?? body);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Erro inesperado");
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });

    return () => ac.abort();
  }, [clienteId]);

  // Keyboard / scroll lock
  useEffect(() => {
    if (!isOpen) return;
    closeBtnRef.current?.focus();
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const displayName =
    cliente?.tipo === "PF"
      ? (cliente.nomeCompleto ?? "")
      : (cliente?.nomeFantasia ?? cliente?.razaoSocial ?? "");

  const formatUSD = (v: number | undefined) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
      v ?? 0
    );

  const formatDate = (iso: string | null | undefined) => {
    if (!iso) return null;
    return new Date(iso).toLocaleDateString("en-US", {
      timeZone: "America/Chicago",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        ref={overlayRef}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Detalhes do cliente"
        className="relative ml-auto flex h-full w-full max-w-[480px] flex-col bg-card shadow-2xl"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-title text-base font-semibold text-foreground">
            Detalhes do Cliente
          </h2>
          <button
            ref={closeBtnRef}
            onClick={onClose}
            aria-label="Fechar painel"
            className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {/* Loading skeleton */}
          {loading && (
            <div className="space-y-4 p-6" aria-busy="true">
              {/* Avatar skeleton */}
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 animate-pulse rounded-2xl bg-muted" />
                <div className="space-y-2">
                  <div className="h-4 w-40 animate-pulse rounded-md bg-muted" />
                  <div className="h-3 w-24 animate-pulse rounded-md bg-muted" />
                </div>
              </div>
              {LOADING_WIDTH_CLASSES.map((w, i) => (
                <div
                  key={i}
                  className={`h-3 animate-pulse rounded-md bg-muted ${w}`}
                />
              ))}
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="flex flex-col items-center justify-center gap-3 p-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10">
                <XCircle className="h-6 w-6 text-destructive" />
              </div>
              <p className="text-sm font-medium text-foreground">Erro ao carregar</p>
              <p className="text-xs text-muted-foreground">{error}</p>
              <button
                onClick={onClose}
                className="mt-2 rounded-xl border border-border px-4 py-2 text-sm transition hover:bg-muted"
              >
                Fechar
              </button>
            </div>
          )}

          {/* Content */}
          {!loading && !error && cliente && (
            <div className="space-y-6 p-6">
              {/* Hero: avatar + nome + status */}
              <div className="flex items-start gap-4">
                <DrawerAvatar name={displayName || "?"} tipo={cliente.tipo} />
                <div className="min-w-0 flex-1">
                  <h3 className="font-title text-lg font-semibold text-foreground leading-tight">
                    {displayName || "—"}
                  </h3>
                  {cliente.tipo === "PJ" && cliente.razaoSocial && cliente.nomeFantasia && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {cliente.razaoSocial}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border ${
                        cliente.tipo === "PF"
                          ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20"
                          : "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20"
                      }`}
                    >
                      {cliente.tipo === "PF" ? (
                        <User className="h-3 w-3" />
                      ) : (
                        <Building2 className="h-3 w-3" />
                      )}
                      {cliente.tipo === "PF" ? "Pessoa Física" : "Pessoa Jurídica"}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border ${
                        cliente.ativo
                          ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20"
                          : "bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/20"
                      }`}
                    >
                      {cliente.ativo ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <XCircle className="h-3 w-3" />
                      )}
                      {cliente.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Metrics grid */}
              {cliente.metrics && (
                <div className="grid grid-cols-2 gap-2">
                  <MetricCard
                    label="Projetos"
                    value={cliente.metrics.projetosCount}
                  />
                  <MetricCard
                    label="Ordens de Serviço"
                    value={cliente.metrics.serviceOrdersCount}
                  />
                  {cliente.metrics.canViewFinancial && (
                    <>
                      <MetricCard
                        label="Lifetime Value"
                        value={formatUSD(cliente.metrics.lifetimeValue)}
                      />
                      <MetricCard
                        label="Em Aberto"
                        value={formatUSD(cliente.metrics.outstandingValue)}
                      />
                    </>
                  )}
                </div>
              )}

              {/* Contato */}
              <div className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Contato
                </p>
                <div className="space-y-3 rounded-2xl border border-border bg-muted/20 p-4">
                  <InfoRow icon={<Mail className="h-4 w-4" />} label="E-mail" value={cliente.email} />
                  <InfoRow icon={<Phone className="h-4 w-4" />} label="Telefone" value={cliente.telefone} />
                  <InfoRow
                    icon={<Hash className="h-4 w-4" />}
                    label={cliente.tipo === "PF" ? "SSN / ITIN" : "EIN"}
                    value={cliente.documentoMasked}
                  />
                </div>
              </div>

              {/* Endereço */}
              {(cliente.addressStreet || cliente.addressCity) && (
                <div className="space-y-3">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Endereço
                  </p>
                  <div className="space-y-3 rounded-2xl border border-border bg-muted/20 p-4">
                    <InfoRow
                      icon={<MapPin className="h-4 w-4" />}
                      label="Endereço"
                      value={[
                        cliente.addressStreet,
                        cliente.addressUnit ? `Unit ${cliente.addressUnit}` : null,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    />
                    <InfoRow
                      icon={<MapPin className="h-4 w-4" />}
                      label="Cidade / Estado"
                      value={
                        [cliente.addressCity, cliente.addressState]
                          .filter(Boolean)
                          .join(", ") || null
                      }
                    />
                    <InfoRow
                      icon={<MapPin className="h-4 w-4" />}
                      label="ZIP / County"
                      value={
                        [cliente.addressZip, cliente.addressCounty]
                          .filter(Boolean)
                          .join(" · ") || null
                      }
                    />
                  </div>
                </div>
              )}

              {/* Histórico */}
              <div className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Histórico
                </p>
                <div className="space-y-3 rounded-2xl border border-border bg-muted/20 p-4">
                  <InfoRow
                    icon={<Calendar className="h-4 w-4" />}
                    label="Cadastrado em"
                    value={formatDate(cliente.criadoEm)}
                  />
                  <InfoRow
                    icon={<Calendar className="h-4 w-4" />}
                    label="Atualizado em"
                    value={formatDate(cliente.atualizadoEm)}
                  />
                  {cliente.metrics?.lastInvoiceAt && (
                    <InfoRow
                      icon={<FileText className="h-4 w-4" />}
                      label="Último invoice"
                      value={formatDate(cliente.metrics.lastInvoiceAt)}
                    />
                  )}
                </div>
              </div>

              {/* Observações */}
              {cliente.observacoes && (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Observações
                  </p>
                  <p className="rounded-2xl border border-border bg-muted/20 p-4 text-sm text-foreground">
                    {cliente.observacoes}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        {!loading && !error && cliente && (
          <div className="shrink-0 border-t border-border px-6 py-4">
            <div className="flex gap-3">
              <button
                onClick={() => router.push(`/clientes/${cliente.id}`)}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-muted/40 px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted"
              >
                Ver Página Completa
              </button>
              {onEdit && (
                <button
                  onClick={() => {
                    onClose();
                    onEdit(cliente.id);
                  }}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-primary/90"
                >
                  <Pencil className="h-4 w-4" />
                  Editar
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
