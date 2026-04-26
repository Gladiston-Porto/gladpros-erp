"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authenticatedFetch } from "@/lib/api/client";
import { Button } from "@gladpros/ui/button";
import { Card, CardContent } from "@gladpros/ui/card";
import { ModulePageHeader } from "@gladpros/ui/module-page-header";
import { useToast } from "@gladpros/ui/toast";
import { useConfirm } from "@gladpros/ui/confirm-dialog";
import {
  ArrowLeft,
  Save,
  Loader2,
  History,
  Clock,
  User2,
  Shield,
  Power,
  PowerOff,
  Users,
  ExternalLink,
} from "lucide-react";

/* ---------- masks / date helpers ---------- */
function applyPhoneMask(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 10);
  if (d.length <= 3) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}
function applyDateMask(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}
function isoToDisplayDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${m}/${day}/${d.getUTCFullYear()}`;
}
function displayDateToISO(display: string): string | null {
  if (!display || display.length < 10) return null;
  const [m, day, y] = display.split("/");
  if (!m || !day || !y || y.length < 4) return null;
  return `${y}-${m}-${day}`;
}

/* ---------- avatar helpers ---------- */
function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join("");
}
function getAvatarBg(name: string): string {
  const palette = [
    "bg-sky-600",
    "bg-teal-600",
    "bg-orange-600",
    "bg-indigo-600",
    "bg-emerald-600",
    "bg-rose-600",
  ];
  const index = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % palette.length;
  return palette[index];
}

/* ---------- types ---------- */
type UserRole = "ADMIN" | "GERENTE" | "USUARIO" | "FINANCEIRO" | "ESTOQUE" | "CLIENTE";
type UserStatus = "ATIVO" | "INATIVO";

interface UserData {
  id: number;
  email: string;
  nomeCompleto: string;
  role: UserRole;
  status: UserStatus | null;
  telefone: string | null;
  dataNascimento: string | null;
  endereco1: string | null;
  endereco2: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  anotacoes: string | null;
  avatarUrl: string | null;
  ultimoLoginEm: string | null;
  criadoEm: string | null;
  atualizadoEm: string | null;
  workerId: number | null;
}

const ROLES: { value: UserRole; label: string }[] = [
  { value: "ADMIN", label: "Administrador" },
  { value: "GERENTE", label: "Gerente" },
  { value: "FINANCEIRO", label: "Financeiro" },
  { value: "USUARIO", label: "Usuário" },
  { value: "ESTOQUE", label: "Estoque" },
  { value: "CLIENTE", label: "Cliente" },
];

// Cores para badges no hero header (fundo escuro)
const ROLE_BADGE: Record<UserRole, { label: string; className: string }> = {
  ADMIN:      { label: "Administrador", className: "bg-red-500/20 text-red-100 border border-red-400/30" },
  GERENTE:    { label: "Gerente",       className: "bg-teal-500/20 text-teal-100 border border-teal-400/30" },
  FINANCEIRO: { label: "Financeiro",    className: "bg-blue-500/20 text-blue-100 border border-blue-400/30" },
  ESTOQUE:    { label: "Estoque",       className: "bg-orange-500/20 text-orange-100 border border-orange-400/30" },
  USUARIO:    { label: "Usuário",       className: "bg-white/20 text-white border border-white/30" },
  CLIENTE:    { label: "Cliente",       className: "bg-purple-500/20 text-purple-100 border border-purple-400/30" },
};

const ESTADOS = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
];

export default function UserEditClient({ id }: { id: string }) {
  const router = useRouter();
  const toast = useToast();
  const { confirm, Dialog } = useConfirm();

  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    nomeCompleto: "",
    email: "",
    role: "USUARIO" as UserRole,
    status: "ATIVO" as UserStatus,
    telefone: "",
    dataNascimento: "",
    endereco1: "",
    endereco2: "",
    cidade: "",
    estado: "",
    cep: "",
    anotacoes: "",
  });

  useEffect(() => {
    async function fetchUser() {
      try {
        setLoading(true);
        const res = await authenticatedFetch(`/api/usuarios/${id}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || "Usuário não encontrado");
        }
        const data: UserData = await res.json();
        setUser(data);
        setForm({
          nomeCompleto: data.nomeCompleto || "",
          email: data.email || "",
          role: data.role || "USUARIO",
          status: data.status || "ATIVO",
          telefone: data.telefone || "",
          dataNascimento: isoToDisplayDate(data.dataNascimento),
          endereco1: data.endereco1 || "",
          endereco2: data.endereco2 || "",
          cidade: data.cidade || "",
          estado: data.estado || "",
          cep: data.cep || "",
          anotacoes: data.anotacoes || "",
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Erro ao carregar usuário";
        setError(message);
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, [id]);

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFieldErrors({});

    try {
      const payload: Record<string, string> = {};
      if (form.nomeCompleto !== (user?.nomeCompleto || "")) payload.nomeCompleto = form.nomeCompleto;
      if (form.email !== (user?.email || "")) payload.email = form.email;
      if (form.role !== (user?.role || "USUARIO")) payload.role = form.role;
      if (form.status !== (user?.status || "ATIVO")) payload.status = form.status;
      if (form.telefone !== (user?.telefone || "")) payload.telefone = form.telefone;
      if (form.dataNascimento !== isoToDisplayDate(user?.dataNascimento)) {
        const isoDate = displayDateToISO(form.dataNascimento);
        if (isoDate) payload.dataNascimento = isoDate;
        else if (!form.dataNascimento) payload.dataNascimento = "";
      }
      if (form.endereco1 !== (user?.endereco1 || "")) payload.endereco1 = form.endereco1;
      if (form.endereco2 !== (user?.endereco2 || "")) payload.endereco2 = form.endereco2;
      if (form.cidade !== (user?.cidade || "")) payload.cidade = form.cidade;
      if (form.estado !== (user?.estado || "")) payload.estado = form.estado;
      if (form.cep !== (user?.cep || "")) payload.cep = form.cep;
      if (form.anotacoes !== (user?.anotacoes || "")) payload.anotacoes = form.anotacoes;

      if (Object.keys(payload).length === 0) {
        toast.info("Sem alterações", "Nenhum campo foi modificado.");
        setSaving(false);
        return;
      }

      const res = await authenticatedFetch(`/api/usuarios/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.fields) setFieldErrors(data.fields);
        throw new Error(data.message || "Erro ao salvar");
      }

      setUser((prev) => prev ? { ...prev, ...form } : prev);
      toast.success("Salvo", "Usuário atualizado com sucesso.");
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao salvar usuário";
      toast.error("Erro", message);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus() {
    if (!user) return;
    const newStatus: UserStatus = form.status === "ATIVO" ? "INATIVO" : "ATIVO";
    const action = newStatus === "ATIVO" ? "ativar" : "desativar";
    const ok = await confirm({
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} usuário`,
      message: `Tem certeza que deseja ${action} este usuário?`,
      confirmText: action.charAt(0).toUpperCase() + action.slice(1),
      tone: newStatus === "INATIVO" ? "danger" : "default",
      subject: { name: user.nomeCompleto, description: user.email, avatarUrl: user.avatarUrl },
      impactNote: newStatus === "INATIVO" ? "O histórico e os dados do usuário serão preservados." : undefined,
    });
    if (!ok) return;

    setTogglingStatus(true);
    try {
      const res = await authenticatedFetch(`/api/usuarios/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Erro ao alterar status");
      setForm((prev) => ({ ...prev, status: newStatus }));
      setUser((prev) => prev ? { ...prev, status: newStatus } : prev);
      toast.success(
        "Sucesso",
        `Usuário ${newStatus === "ATIVO" ? "ativado" : "desativado"} com sucesso.`
      );
    } catch {
      toast.error("Erro", "Não foi possível alterar o status.");
    } finally {
      setTogglingStatus(false);
    }
  }

  /* ---------- loading / error states ---------- */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="space-y-6">
        <ModulePageHeader
          title="Erro"
          description={error || "Usuário não encontrado"}
          icon={<User2 />}
          accentColor="#0098DA"
        />
        <Button asChild variant="outline">
          <Link href="/usuarios">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Link>
        </Button>
      </div>
    );
  }

  const isActive = form.status === "ATIVO";
  const roleBadge = ROLE_BADGE[form.role] ?? ROLE_BADGE.USUARIO;
  const initials = getInitials(user.nomeCompleto);
  const avatarBg = getAvatarBg(user.nomeCompleto);

  return (
    <div className="space-y-6">
      <Dialog />

      {/* ── Hero header ─────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-hero-gradient p-6 text-white">
        <div className="flex items-center gap-5">
          {/* Avatar */}
          <div className="shrink-0">
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatarUrl}
                alt={user.nomeCompleto}
                className="h-16 w-16 rounded-2xl object-cover ring-2 ring-white/30"
              />
            ) : (
              <div
                className={`flex h-16 w-16 items-center justify-center rounded-2xl text-xl font-bold text-white ring-2 ring-white/30 ${avatarBg}`}
              >
                {initials}
              </div>
            )}
          </div>

          {/* Nome + badges */}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-bold">{user.nomeCompleto}</h1>
            <p className="mt-0.5 truncate text-sm opacity-75">{user.email}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${roleBadge.className}`}
              >
                <Shield className="h-3 w-3" />
                {roleBadge.label}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  isActive
                    ? "border border-emerald-400/30 bg-emerald-500/20 text-emerald-100"
                    : "border border-red-400/30 bg-red-500/20 text-red-100"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-emerald-300" : "bg-red-300"}`}
                />
                {isActive ? "Ativo" : "Inativo"}
              </span>
              {user.ultimoLoginEm && (
                <span className="text-xs opacity-60">
                  Último login:{" "}
                  {new Date(user.ultimoLoginEm).toLocaleDateString("en-US", {
                    timeZone: "America/Chicago",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              )}
            </div>
          </div>

          {/* Botão voltar */}
          <div className="shrink-0">
            <Link href="/usuarios">
              <Button
                variant="outline"
                size="sm"
                className="border-white/30 bg-white/10 text-white hover:bg-white/20"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Layout da página ───────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.9fr)_380px]">

          {/* ── Col 1: Dados + Endereço ─── */}
          <div className="space-y-4">
          <Card>
            <CardContent className="space-y-4 p-6">
              <h3 className="text-lg font-semibold">Dados Pessoais</h3>
              <FieldInput
                label="Nome Completo"
                value={form.nomeCompleto}
                onChange={(v) => handleChange("nomeCompleto", v)}
                error={fieldErrors.nomeCompleto}
              />
              <FieldInput
                label="E-mail"
                type="email"
                value={form.email}
                onChange={(v) => handleChange("email", v)}
                error={fieldErrors.email}
              />
              <FieldInput
                label="Telefone"
                value={form.telefone}
                onChange={(v) => handleChange("telefone", applyPhoneMask(v))}
                placeholder="(469) 334-6918"
                error={fieldErrors.telefone}
              />
              <FieldInput
                label="Data de Nascimento"
                value={form.dataNascimento}
                onChange={(v) => handleChange("dataNascimento", applyDateMask(v))}
                placeholder="MM/DD/YYYY"
                error={fieldErrors.dataNascimento}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 p-6">
              <h3 className="text-lg font-semibold">Endereço</h3>
              <FieldInput
                label="Endereço 1"
                value={form.endereco1}
                onChange={(v) => handleChange("endereco1", v)}
                error={fieldErrors.endereco1}
              />
              <FieldInput
                label="Endereço 2"
                value={form.endereco2}
                onChange={(v) => handleChange("endereco2", v)}
                error={fieldErrors.endereco2}
              />
              <div className="grid grid-cols-3 gap-3">
                <FieldInput
                  label="Cidade"
                  value={form.cidade}
                  onChange={(v) => handleChange("cidade", v)}
                  error={fieldErrors.cidade}
                />
                <FieldSelect
                  label="Estado"
                  value={form.estado}
                  onChange={(v) => handleChange("estado", v)}
                  options={[
                    { value: "", label: "—" },
                    ...ESTADOS.map((s) => ({ value: s, label: s })),
                  ]}
                />
                <FieldInput
                  label="ZIP Code"
                  value={form.cep}
                  onChange={(v) => handleChange("cep", v)}
                  error={fieldErrors.cep}
                />
              </div>
            </CardContent>
          </Card>
          </div>

          {/* ── Col 2: Acesso + Ações + Informações ─── */}
          <div className="space-y-4">
          <Card>
            <CardContent className="space-y-4 p-6">
              <h3 className="flex items-center gap-2 text-base font-semibold">
                <Shield className="h-4 w-4 text-brand-primary" />
                Conta e Acesso
              </h3>
              <FieldSelect
                label="Nível de acesso"
                value={form.role}
                onChange={(v) => handleChange("role", v)}
                options={ROLES.map((r) => ({ value: r.value, label: r.label }))}
              />
              <FieldSelect
                label="Status da conta"
                value={form.status}
                onChange={(v) => handleChange("status", v)}
                options={[
                  { value: "ATIVO", label: "Ativo" },
                  { value: "INATIVO", label: "Inativo" },
                ]}
              />
              <div>
                <span className="mb-1 block text-sm font-medium">Função</span>
                <span className="inline-flex items-center rounded-full bg-brand-primary/10 px-2.5 py-1 text-xs font-medium text-brand-primary">
                  {ROLE_BADGE[form.role]?.label ?? form.role}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Ações rápidas */}
          <Card>
            <CardContent className="space-y-3 p-6">
              <h3 className="flex items-center gap-2 text-base font-semibold">
                <Power className="h-4 w-4 text-brand-primary" />
                Ação rápida
              </h3>

              <Button
                type="button"
                variant={isActive ? "destructive" : "default"}
                className="w-full justify-start gap-2"
                onClick={handleToggleStatus}
                disabled={togglingStatus}
              >
                {togglingStatus ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isActive ? (
                  <PowerOff className="h-4 w-4" />
                ) : (
                  <Power className="h-4 w-4" />
                )}
                {togglingStatus
                  ? "Aguarde..."
                  : isActive
                  ? "Desativar Usuário"
                  : "Ativar Usuário"}
              </Button>

              {user.workerId ? (
                <Link href={`/rh/workers/${user.workerId}`}>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start gap-2"
                  >
                    <ExternalLink className="h-4 w-4 text-brand-primary" />
                    Ver Perfil Worker
                  </Button>
                </Link>
              ) : (
                <Link href={`/rh/workers/novo?usuarioId=${id}`}>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start gap-2"
                  >
                    <Users className="h-4 w-4" />
                    Vincular como Worker
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>

          {/* Informações do registro */}
          <Card>
            <CardContent className="space-y-2 p-6">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Informações
              </h3>
              <div className="space-y-1.5 text-xs text-muted-foreground">
                <p>ID: #{user.id}</p>
                {user.ultimoLoginEm && (
                  <p>
                    Último login:{" "}
                    {new Date(user.ultimoLoginEm).toLocaleString("en-US", {
                      timeZone: "America/Chicago",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                )}
                {user.criadoEm && (
                  <p>
                    Criado:{" "}
                    {new Date(user.criadoEm).toLocaleString("en-US", {
                      timeZone: "America/Chicago",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                )}
                {user.atualizadoEm && (
                  <p>
                    Atualizado:{" "}
                    {new Date(user.atualizadoEm).toLocaleString("en-US", {
                      timeZone: "America/Chicago",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
          </div>

          {/* ── Col 3: Histórico contínuo ─── */}
          <div className="min-h-0 xl:row-span-3 xl:self-start xl:sticky xl:top-6 xl:h-[calc(100vh-10rem)]">
            <AuditLogPanel userId={id} userRole={user.role} />
          </div>

          {/* ── Linha inferior: Anotações ocupando colunas 1 e 2 ─── */}
          <Card className="xl:col-span-2 xl:self-start">
            <CardContent className="flex min-h-[180px] flex-col gap-4 p-6">
              <h3 className="text-lg font-semibold">Anotações</h3>
              <textarea
                className="min-h-24 rounded-2xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
                value={form.anotacoes}
                onChange={(e) => handleChange("anotacoes", e.target.value)}
                placeholder="Notas internas sobre o usuário..."
              />
            </CardContent>
          </Card>

        </div>

        {/* ── Footer de ações ─── */}
        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" asChild>
            <Link href="/usuarios">Cancelar</Link>
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {saving ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>
      </form>
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   AuditLogPanel
──────────────────────────────────────────────────────── */

interface AuditEntry {
  id: string | number;
  acao: string;
  tabela: string;
  criadoEm: string;
  ip?: string;
  payload?: string;
  nomeCompleto?: string;
  email?: string;
}

const ACAO_LABEL: Record<string, { label: string; color: string }> = {
  UPDATE: { label: "Editou",            color: "text-blue-600 dark:text-blue-400" },
  CREATE: { label: "Criou",             color: "text-emerald-600 dark:text-emerald-400" },
  DELETE: { label: "Removeu/Desativou", color: "text-red-600 dark:text-red-400" },
  LOGIN:  { label: "Login",             color: "text-purple-600 dark:text-purple-400" },
  LOGOUT: { label: "Logout",            color: "text-muted-foreground" },
};

function AuditLogPanel({ userId, userRole }: { userId: string; userRole: string }) {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!["ADMIN", "GERENTE"].includes(userRole)) {
      setLoading(false);
      return;
    }
    authenticatedFetch(`/api/usuarios/${userId}/auditoria`)
      .then((r) => r.json())
      .then((data) =>
        setLogs(
          Array.isArray(data.data ?? data) ? (data.data ?? data) : []
        )
      )
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [userId, userRole]);

  if (!["ADMIN", "GERENTE"].includes(userRole)) return null;

  return (
    <Card className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border shadow-sm">
      <CardContent className="flex h-full min-h-0 flex-1 flex-col p-6">
        <h3 className="mb-4 flex shrink-0 items-center gap-2 text-base font-semibold">
          <History className="h-4 w-4 text-brand-primary" />
          Histórico
        </h3>

        <div className="min-h-0 flex-1 overflow-y-auto pr-2">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando…
            </div>
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma alteração registrada.
            </p>
          ) : (
            <div className="relative pl-6">
              <div className="absolute left-[11px] top-1 bottom-1 w-px bg-border" />
              <ol className="space-y-5">
              {logs.map((entry) => {
                const d = entry.criadoEm ? new Date(entry.criadoEm) : null;
                const dateLabel =
                  d && !isNaN(d.getTime())
                    ? d.toLocaleString("en-US", {
                        timeZone: "America/Chicago",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "Data indisponível";

                const acaoInfo =
                  ACAO_LABEL[entry.acao] ?? {
                    label: entry.acao,
                    color: "text-foreground",
                  };

                let changes: Record<string, unknown> = {};
                try {
                  if (entry.payload) changes = JSON.parse(entry.payload);
                } catch {
                  // ignore parse errors
                }

                return (
                  <li key={entry.id} className="relative">
                    <span className="absolute -left-[18px] top-2 h-3 w-3 rounded-full border-2 border-brand-primary bg-background" />

                    <div className="rounded-xl border border-border bg-muted/20 p-4">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-medium text-foreground">
                          {entry.nomeCompleto || entry.email || "Sistema"}
                        </span>
                        <span className={`font-medium ${acaoInfo.color}`}>
                          {acaoInfo.label}
                        </span>
                        <span className="text-muted-foreground">este usuário</span>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {dateLabel} (CT)
                        </span>
                        {entry.ip && entry.ip !== "unknown" && (
                          <span>IP: {entry.ip}</span>
                        )}
                      </div>

                      {changes.de != null && changes.para != null && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          {String(changes.campo || "campo")}: {" "}
                          <span className="line-through">{String(changes.de)}</span> →{" "}
                          <span className="font-medium text-foreground">
                            {String(changes.para)}
                          </span>
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
              </ol>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------- helper components ---------- */

function FieldInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  error?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className={`min-h-12 w-full rounded-2xl border px-3 py-2 text-sm bg-background outline-none focus:ring-1 focus:ring-brand-primary ${
          error ? "border-destructive focus:border-destructive" : "border-border focus:border-brand-primary"
        }`}
      />
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

function FieldSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="min-h-12 w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}