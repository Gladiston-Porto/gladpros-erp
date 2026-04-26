"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  Mail,
  Phone,
  MapPin,
  Shield,
  Clock,
  Briefcase,
  Calendar,
  Pencil,
  ExternalLink,
  CheckCircle2,
  XCircle,
  User,
  Lock,
} from "lucide-react";
import { authenticatedFetch } from "@/lib/api/client";
import type { UserRole } from "./types";

const AVATAR_BG_CLASSES = [
  "bg-sky-600",
  "bg-teal-600",
  "bg-orange-600",
  "bg-indigo-600",
  "bg-emerald-600",
  "bg-rose-600",
];

const LOADING_WIDTH_CLASSES = ["w-[55%]", "w-[67%]", "w-[79%]", "w-[91%]"];

interface DrawerUserData {
  id: number;
  email: string;
  nomeCompleto: string;
  role: UserRole;
  status: "ATIVO" | "INATIVO" | null;
  avatarUrl: string | null;
  telefone: string | null;
  endereco1: string | null;
  endereco2: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  ultimoLoginEm: string | null;
  criadoEm: string | null;
  atualizadoEm: string | null;
  workerId: number | null;
  worker?: { id: number; name: string; classification: string } | null;
}

const ROLE_CONFIG: Record<UserRole, { label: string; className: string }> = {
  ADMIN:      { label: "Administrador", className: "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20" },
  GERENTE:    { label: "Gerente",       className: "bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/20" },
  FINANCEIRO: { label: "Financeiro",    className: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20" },
  ESTOQUE:    { label: "Estoque",       className: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-500/20" },
  USUARIO:    { label: "Usuário",       className: "bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border border-neutral-500/20" },
  CLIENTE:    { label: "Cliente",       className: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20" },
};

const WORKER_CLASSIFICATION_LABEL: Record<string, string> = {
  CONTRACTOR_1099: "Contractor (1099)",
  W2_EMPLOYEE:     "Employee (W-2)",
  SUBCONTRACTOR:   "Subcontractor",
  OWNER_OPERATOR:  "Owner Operator",
};

function DrawerAvatar({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  const paletteIndex = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % AVATAR_BG_CLASSES.length;

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={avatarUrl} alt={name} className="h-16 w-16 rounded-2xl object-cover" />
    );
  }

  return (
    <div
      className={`flex h-16 w-16 items-center justify-center rounded-2xl text-xl font-semibold select-none text-white ${AVATAR_BG_CLASSES[paletteIndex]}`}
    >
      {initials}
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

type Props = {
  userId: number | null;
  onClose: () => void;
};

export function UserViewDrawer({ userId, onClose }: Props) {
  const router = useRouter();
  const [user, setUser] = useState<DrawerUserData | null>(null);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userId) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [userId, onClose]);

  useEffect(() => {
    if (!userId) { setUser(null); return; }
    setLoading(true);
    authenticatedFetch(`/api/usuarios/${userId}`)
      .then((r) => r.json())
      .then((data) => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    if (userId) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [userId]);

  function handleEdit() {
    if (!user) return;
    onClose();
    router.push(`/usuarios/${user.id}`);
  }

  const isOpen = !!userId;

  const fmt = (iso: string | null | undefined) => {
    if (!iso) return null;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleString("en-US", {
      timeZone: "America/Chicago",
      month: "2-digit", day: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  const workerData = user?.worker ?? null;
  const workerLabel = workerData?.classification
    ? (WORKER_CLASSIFICATION_LABEL[workerData.classification] ?? workerData.classification)
    : null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Painel lateral — 2xl de largura */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Visualizar usuário"
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-2xl flex-col bg-background shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
          <h2 className="text-base font-semibold text-foreground">Visualizar usuário</h2>
          <button
            onClick={onClose}
            className="flex h-12 w-12 items-center justify-center rounded-2xl text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Conteúdo ── */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="p-6 space-y-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className={`h-4 animate-pulse rounded bg-muted ${LOADING_WIDTH_CLASSES[i % LOADING_WIDTH_CLASSES.length]}`} />
              ))}
            </div>
          )}

          {!loading && !user && (
            <div className="flex items-center justify-center py-24 text-sm text-muted-foreground">
              Não foi possível carregar os dados.
            </div>
          )}

          {!loading && user && (
            <div className="p-6 space-y-5">

              {/* ── Identidade ── */}
              <div className="flex items-center gap-4">
                <DrawerAvatar name={user.nomeCompleto} avatarUrl={user.avatarUrl} />
                <div className="min-w-0 flex-1">
                  <h3 className="text-xl font-semibold text-foreground">{user.nomeCompleto}</h3>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_CONFIG[user.role]?.className}`}>
                      <Shield className="h-3 w-3" />
                      {ROLE_CONFIG[user.role]?.label ?? user.role}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      user.status === "ATIVO"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-neutral-500/10 text-neutral-500"
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${user.status === "ATIVO" ? "bg-emerald-500" : "bg-neutral-400"}`} />
                      {user.status === "ATIVO" ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                </div>
              </div>

              {/* ── Grade 2 colunas ── */}
              <div className="grid grid-cols-2 gap-4">

                {/* Dados pessoais */}
                <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
                  <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <User className="h-3.5 w-3.5" /> Dados pessoais
                  </p>
                  <InfoRow icon={<Phone className="h-4 w-4" />} label="Telefone" value={user.telefone} />
                  <InfoRow icon={<Mail className="h-4 w-4" />} label="E-mail" value={user.email} />
                </div>

                {/* Acesso */}
                <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
                  <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <Lock className="h-3.5 w-3.5" /> Acesso
                  </p>
                  <div className="flex items-start gap-3">
                    <Shield className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Perfil de acesso</p>
                      <p className="text-sm font-medium text-foreground">{ROLE_CONFIG[user.role]?.label ?? user.role}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    {user.status === "ATIVO"
                      ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
                    }
                    <div>
                      <p className="text-xs text-muted-foreground">Status da conta</p>
                      <p className="text-sm font-medium text-foreground">
                        {user.status === "ATIVO" ? "Ativo" : "Inativo"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Endereço */}
                {(user.endereco1 || user.cidade || user.estado) && (
                  <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
                    <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" /> Endereço
                    </p>
                    <div className="flex items-start gap-3">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="space-y-0.5">
                        {user.endereco1 && (
                          <p className="text-sm font-medium text-foreground">{user.endereco1}</p>
                        )}
                        <p className="text-sm text-muted-foreground">
                          {[
                            user.endereco2,
                            [user.cidade, user.estado].filter(Boolean).join(", "),
                            user.cep,
                          ].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Último acesso */}
                <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
                  <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" /> Último acesso
                  </p>
                  <InfoRow
                    icon={<Clock className="h-4 w-4" />}
                    label="Último acesso"
                    value={fmt(user.ultimoLoginEm) ?? "Nunca acessou"}
                  />
                </div>

              </div>

              {/* ── Datas ── */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-border bg-card p-4 space-y-1">
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" /> Criado em
                  </p>
                  <p className="text-sm font-medium text-foreground">{fmt(user.criadoEm) ?? "—"}</p>
                </div>
                <div className="rounded-2xl border border-border bg-card p-4 space-y-1">
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" /> Atualizado em
                  </p>
                  <p className="text-sm font-medium text-foreground">{fmt(user.atualizadoEm) ?? "—"}</p>
                </div>
              </div>

              {/* ── Worker vinculado ── */}
              {workerData ? (
                <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
                  <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <Briefcase className="h-3.5 w-3.5" /> Worker Vinculado
                  </p>
                  <a
                    href={`/rh/workers/${workerData.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      onClose();
                      router.push(`/rh/workers/${workerData.id}`);
                    }}
                    className="flex items-center gap-3 rounded-xl border border-brand-primary/20 bg-brand-primary/5 p-3 transition hover:bg-brand-primary/10"
                  >
                    <Briefcase className="h-4 w-4 shrink-0 text-brand-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{workerData.name}</p>
                      {workerLabel && <p className="text-xs text-muted-foreground">{workerLabel}</p>}
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-brand-primary" />
                  </a>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border p-4 text-center">
                  <Briefcase className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Sem worker vinculado</p>
                </div>
              )}

            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex gap-3 border-t border-border bg-card px-6 py-4">
          <button
            onClick={handleEdit}
            disabled={!user}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            <Pencil className="h-4 w-4" />
            Editar usuário
          </button>
          <button
            onClick={onClose}
            className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted"
          >
            Fechar
          </button>
        </div>
      </div>
    </>
  );
}


