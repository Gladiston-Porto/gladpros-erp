"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authenticatedFetch } from "@/lib/api/client";
import { Button } from "@gladpros/ui/button"
import { Card, CardContent } from "@gladpros/ui/card"
import { ModulePageHeader } from "@gladpros/ui/module-page-header"
import { useToast } from "@gladpros/ui/toast";
import { ArrowLeft, Save, Loader2, History, Clock, User2 } from "lucide-react";

/* ------- masks / date helpers ------- */
function applyPhoneMask(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 10);
  if (d.length <= 3) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}
function applyDateMask(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}
function isoToDisplayDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${m}/${day}/${d.getUTCFullYear()}`;
}
function displayDateToISO(display: string): string | null {
  if (!display || display.length < 10) return null;
  const [m, day, y] = display.split('/');
  if (!m || !day || !y || y.length < 4) return null;
  return `${y}-${m}-${day}`;
}

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
}

const ROLES: { value: UserRole; label: string }[] = [
  { value: "ADMIN", label: "Administrador" },
  { value: "GERENTE", label: "Gerente" },
  { value: "FINANCEIRO", label: "Financeiro" },
  { value: "USUARIO", label: "Usuário" },
  { value: "ESTOQUE", label: "Estoque" },
  { value: "CLIENTE", label: "Cliente" },
];

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
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Form state
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
      // Only send changed fields
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
        if (data.fields) {
          setFieldErrors(data.fields);
        }
        throw new Error(data.message || "Erro ao salvar");
      }

      toast.success("Salvo", "Usuário atualizado com sucesso.");
      router.push("/usuarios");
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao salvar usuário";
      toast.error("Erro", message);
    } finally {
      setSaving(false);
    }
  }

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
        <ModulePageHeader title="Erro" description={error || "Usuário não encontrado"} icon={<User2 />} accentColor="#0098DA" />
        <Button asChild variant="outline">
          <Link href="/usuarios">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ModulePageHeader
        title={`Editar: ${user.nomeCompleto}`}
        description={`ID #${user.id} · ${user.email}`}
        icon={<User2 />}
        accentColor="#0098DA"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Usuários', href: '/usuarios' },
          { label: user.nomeCompleto },
        ]}
        actions={
          <Button asChild variant="outline">
            <Link href="/usuarios">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Link>
          </Button>
        }
      />

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Dados Pessoais */}
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

          {/* Papel e Status */}
          <Card className="rounded-2xl border border-border bg-card shadow-sm dark:bg-white/5">
            <CardContent className="space-y-4 p-6">
              <h3 className="text-lg font-semibold text-foreground">Acesso</h3>

              <FieldSelect
                label="Nível"
                value={form.role}
                onChange={(v) => handleChange("role", v)}
                options={ROLES.map((r) => ({ value: r.value, label: r.label }))}
              />
              <FieldSelect
                label="Status"
                value={form.status}
                onChange={(v) => handleChange("status", v)}
                options={[
                  { value: "ATIVO", label: "Ativo" },
                  { value: "INATIVO", label: "Inativo" },
                ]}
              />

              <div className="pt-4 text-sm text-muted-foreground space-y-1">
                <p>Último login: {user.ultimoLoginEm ? new Date(user.ultimoLoginEm).toLocaleString("en-US", { timeZone: "America/Chicago" }) : "Nunca"}</p>
                <p>Criado em: {user.criadoEm ? new Date(user.criadoEm).toLocaleString("en-US", { timeZone: "America/Chicago" }) : "—"}</p>
                <p>Atualizado em: {user.atualizadoEm ? new Date(user.atualizadoEm).toLocaleString("en-US", { timeZone: "America/Chicago" }) : "—"}</p>
              </div>
            </CardContent>
          </Card>

          {/* Endereço */}
          <Card className="rounded-2xl border border-border bg-card shadow-sm dark:bg-white/5">
            <CardContent className="space-y-4 p-6">
              <h3 className="text-lg font-semibold text-foreground">Endereço</h3>

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
                  options={[{ value: "", label: "—" }, ...ESTADOS.map((s) => ({ value: s, label: s }))]}
                />
                <FieldInput
                  label="CEP/Zip"
                  value={form.cep}
                  onChange={(v) => handleChange("cep", v)}
                  error={fieldErrors.cep}
                />
              </div>
            </CardContent>
          </Card>

          {/* Anotações */}
          <Card className="rounded-2xl border border-border bg-card shadow-sm dark:bg-white/5">
            <CardContent className="space-y-4 p-6">
              <h3 className="text-lg font-semibold text-foreground">Anotações</h3>

              <textarea
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary dark:border-white/20 dark:bg-white/5"
                rows={6}
                value={form.anotacoes}
                onChange={(e) => handleChange("anotacoes", e.target.value)}
                placeholder="Notas sobre o usuário..."
              />
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-end gap-3">
          <Button type="button" variant="outline" asChild>
            <Link href="/usuarios">Cancelar</Link>
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar
          </Button>
        </div>
      </form>

      {/* Histórico de Auditoria */}
      <AuditLogPanel userId={id} userRole={user.role} />
    </div>
  );
}

/* ---------- AuditLogPanel ---------- */

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
  UPDATE: { label: "Editou", color: "text-blue-600 dark:text-blue-400" },
  CREATE: { label: "Criou", color: "text-emerald-600 dark:text-emerald-400" },
  DELETE: { label: "Removeu/Desativou", color: "text-red-600 dark:text-red-400" },
  LOGIN:  { label: "Login", color: "text-purple-600 dark:text-purple-400" },
  LOGOUT: { label: "Logout", color: "text-muted-foreground" },
};

function AuditLogPanel({ userId, userRole }: { userId: string; userRole: string }) {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!['ADMIN', 'GERENTE'].includes(userRole)) {
      setLoading(false);
      return;
    }
    authenticatedFetch(`/api/usuarios/${userId}/auditoria`)
      .then((r) => r.json())
      .then((data) => setLogs(Array.isArray(data.data ?? data) ? (data.data ?? data) : []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [userId, userRole]);

  if (!['ADMIN', 'GERENTE'].includes(userRole)) return null;

  return (
    <Card className="rounded-2xl border border-border bg-card shadow-sm dark:bg-white/5">
      <CardContent className="p-6">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
          <History className="h-5 w-5 text-primary" />
          Histórico de Alterações
        </h3>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando histórico…
          </div>
        ) : logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma alteração registrada.</p>
        ) : (
          <ol className="space-y-3">
            {logs.map((entry) => {
              const d = entry.criadoEm ? new Date(entry.criadoEm) : null;
              const dateLabel = d && !isNaN(d.getTime())
                ? d.toLocaleString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                : 'Data indisponível';
              const acaoInfo = ACAO_LABEL[entry.acao] ?? { label: entry.acao, color: 'text-foreground' };
              let changes: Record<string, unknown> = {};
              try { if (entry.payload) changes = JSON.parse(entry.payload); } catch {}

              return (
                <li key={entry.id} className="flex gap-3 text-sm">
                  <div className="mt-0.5 flex-shrink-0">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted">
                      <User2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="flex-1 rounded-xl border border-border bg-muted/30 px-4 py-2">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-medium text-foreground">{entry.nomeCompleto || entry.email || 'Sistema'}</span>
                      <span className={`font-medium ${acaoInfo.color}`}>{acaoInfo.label}</span>
                      <span className="text-muted-foreground">este usuário</span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{dateLabel} (CT)</span>
                      {entry.ip && entry.ip !== 'unknown' && <span>IP: {entry.ip}</span>}
                    </div>
                    {changes.de != null && changes.para != null && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {String(changes.campo || 'campo')}: <span className="line-through">{String(changes.de)}</span> → <span className="font-medium text-foreground">{String(changes.para)}</span>
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
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
      <label className="mb-1 block text-sm font-medium text-foreground">{label}</label>
      <input
        type={type}
        className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-1 dark:bg-white/5 dark:text-white ${
          error
            ? "border-destructive focus:border-destructive focus:ring-destructive"
            : "border-slate-200 focus:border-brand-primary focus:ring-brand-primary dark:border-white/20"
        }`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
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
      <label className="mb-1 block text-sm font-medium text-foreground">{label}</label>
      <select
        aria-label={label}
        className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary dark:border-white/20 dark:bg-white/5 dark:text-white"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
