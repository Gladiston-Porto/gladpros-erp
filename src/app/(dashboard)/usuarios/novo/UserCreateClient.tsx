"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authenticatedFetch } from "@/lib/api/client";
import { parseApiError } from "@/lib/api/parseApiError";
import { Button } from "@gladpros/ui/button"
import { Card, CardContent } from "@gladpros/ui/card"
import { ModulePageHeader } from "@gladpros/ui/module-page-header"
import { useToast } from "@gladpros/ui/toast";
import { ArrowLeft, Save, Loader2, UserPlus, Key, MapPin, FileText, Info, Camera } from "lucide-react";

type UserRole = "ADMIN" | "GERENTE" | "USUARIO" | "FINANCEIRO" | "ESTOQUE" | "CLIENTE";

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

function FieldInput({ label, value, onChange, type = "text", required = false, error, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; error?: string; placeholder?: string;
}) {
  const inputId = `user-create-${label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <div>
      <label htmlFor={inputId} className="mb-1 block text-sm font-medium">{label}{required && <span className="text-destructive ml-1">*</span>}</label>
      <input
        id={inputId}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        placeholder={placeholder}
        className={`min-h-12 w-full rounded-2xl border px-3 py-2 text-sm ${error ? 'border-destructive' : 'border-border'} bg-background`}
      />
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

/* ------- masks ------- */
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
function displayDateToISO(display: string): string | null {
  if (!display || display.length < 10) return null;
  const [m, day, y] = display.split('/');
  if (!m || !day || !y || y.length < 4) return null;
  return `${y}-${m}-${day}`;
}

function FieldSelect({ label, value, onChange, options, required = false }: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; required?: boolean;
}) {
  const selectId = `user-create-${label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <div>
      <label htmlFor={selectId} className="mb-1 block text-sm font-medium">{label}{required && <span className="text-destructive ml-1">*</span>}</label>
      <select
        id={selectId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="min-h-12 w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

const WORKER_CLASSIFICATIONS = [
  { value: "CONTRACTOR_1099", label: "Contractor (1099)" },
  { value: "W2_EMPLOYEE", label: "Employee (W-2)" },
  { value: "SUBCONTRACTOR", label: "Subcontractor" },
  { value: "OWNER_OPERATOR", label: "Owner Operator" },
];

function ToggleOption({ label, description, checked, onChange }: {
  label: string; description?: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="flex min-h-12 w-full items-start gap-3 rounded-2xl border border-border p-3 text-left transition hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span
        className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors ${checked ? 'bg-brand-primary' : 'bg-muted'}`}
        aria-hidden="true"
      >
        <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </span>
      <span className="flex-1">
        <span className="text-sm font-medium leading-none">{label}</span>
        {description && <span className="mt-1 block text-xs text-muted-foreground">{description}</span>}
      </span>
    </button>
  );
}

export default function UserCreateClient() {
  const router = useRouter();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sendInviteEmail, setSendInviteEmail] = useState(true);
  const [exigirTrocaSenha, setExigirTrocaSenha] = useState(true);
  const [vincularWorker, setVincularWorker] = useState(false);
  const [workerClassification, setWorkerClassification] = useState("CONTRACTOR_1099");

  const [form, setForm] = useState({
    email: "",
    nomeCompleto: "",
    role: "USUARIO" as UserRole,
    status: "ATIVO",
    telefone: "",
    dataNascimento: "",
    endereco1: "",
    endereco2: "",
    cidade: "",
    estado: "TX",
    cep: "",
    anotacoes: "",
    expiresAt: "",
  });

  const set = (field: string) => (value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.email.trim()) errs.email = "Email é obrigatório";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Email inválido";
    if (!form.nomeCompleto.trim()) errs.nomeCompleto = "Nome completo é obrigatório";
    return errs;
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, string | boolean> = {};
      if (form.email) payload.email = form.email;
      if (form.nomeCompleto) payload.nomeCompleto = form.nomeCompleto;
      payload.role = form.role;
      payload.status = form.status;
      if (form.telefone) payload.telefone = form.telefone;
      if (form.dataNascimento) {
        const isoDate = displayDateToISO(form.dataNascimento);
        if (isoDate) payload.dataNascimento = isoDate;
      }
      if (form.endereco1) payload.endereco1 = form.endereco1;
      if (form.endereco2) payload.endereco2 = form.endereco2;
      if (form.cidade) payload.cidade = form.cidade;
      if (form.estado) payload.estado = form.estado;
      if (form.cep) payload.cep = form.cep;
      if (form.anotacoes) payload.anotacoes = form.anotacoes;
      if (form.expiresAt) {
        const isoExpires = displayDateToISO(form.expiresAt);
        if (isoExpires) payload.expiresAt = isoExpires;
      }
      payload.sendInviteEmail = sendInviteEmail;
      payload.exigirTrocaSenha = exigirTrocaSenha;
      payload.vincularWorker = vincularWorker;
      if (vincularWorker) payload.workerClassification = workerClassification;

      const res = await authenticatedFetch("/api/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const { fieldErrors, firstMessage } = parseApiError(data, `Erro ${res.status}`);
        if (Object.keys(fieldErrors).length > 0) {
          setErrors(fieldErrors);
        }
        toast.error(firstMessage);
        return;
      }

      const result = await res.json().catch(() => ({}));
      const toastParts: string[] = ["Usuário criado com sucesso!"];
      if (sendInviteEmail) toastParts.push("E-mail de boas-vindas enviado.");
      if (vincularWorker) {
        if (result?.data?.workerLinked) toastParts.push("Perfil Worker criado em Workforce.");
        else toastParts.push("Aviso: vincular ao Workforce falhou — complete em RH › Workers.");
      }
      toast.success(toastParts.join(" "));
      router.push("/usuarios");
    } catch {
      toast.error("Erro ao criar usuário");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <ModulePageHeader
        title="Novo Usuário"
        description="Preencha os dados para criar um novo usuário"
        icon={<UserPlus />}
        accentColor="#0098DA"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Usuários', href: '/usuarios' },
          { label: 'Novo Usuário' },
        ]}
        actions={
          <Link href="/usuarios">
            <Button variant="outline" size="sm"><ArrowLeft className="mr-2 h-4 w-4" />Voltar</Button>
          </Link>
        }
      />

      <form onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit();
      }} className="space-y-6">
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.95fr)]">
          <div className="space-y-4">
            <Card>
              <CardContent className="space-y-4 p-6">
                <h3 className="flex items-center gap-2 text-lg font-semibold">
                  <UserPlus className="h-5 w-5 text-brand-primary" />
                  Dados pessoais
                </h3>

                <div className="grid gap-4 lg:grid-cols-[120px_minmax(0,1fr)_minmax(0,1fr)] lg:grid-rows-[auto_auto]">
                  <div className="row-span-2 flex min-h-[156px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 p-4 text-center">
                    <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <Camera className="h-7 w-7" />
                    </div>
                    <p className="text-sm font-medium">Adicionar foto</p>
                    <p className="mt-1 text-xs text-muted-foreground">PNG, JPG ou GIF</p>
                    <p className="text-xs text-muted-foreground">Max. 2MB</p>
                  </div>

                  <FieldInput
                    label="Nome completo"
                    value={form.nomeCompleto}
                    onChange={set("nomeCompleto")}
                    required
                    error={errors.nomeCompleto}
                    placeholder="Digite o nome completo"
                  />
                  <FieldInput
                    label="E-mail"
                    value={form.email}
                    onChange={set("email")}
                    type="email"
                    required
                    error={errors.email}
                    placeholder="usuario@empresa.com"
                  />
                  <FieldInput
                    label="Telefone"
                    value={form.telefone}
                    onChange={(v) => set("telefone")(applyPhoneMask(v))}
                    placeholder="(00) 00000-0000"
                  />
                  <FieldInput
                    label="Data de nascimento"
                    value={form.dataNascimento}
                    onChange={(v) => set("dataNascimento")(applyDateMask(v))}
                    placeholder="dd/mm/aaaa"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-4 p-6">
                <h3 className="flex items-center gap-2 text-lg font-semibold">
                  <MapPin className="h-5 w-5 text-brand-primary" />
                  Endereço
                </h3>

                <div className="grid gap-4 md:grid-cols-2">
                  <FieldInput label="Endereço 1" value={form.endereco1} onChange={set("endereco1")} placeholder="Rua, Avenida, Número" />
                  <FieldInput label="Endereço 2 (opcional)" value={form.endereco2} onChange={set("endereco2")} placeholder="Complemento, apto, sala, etc." />
                </div>

                <div className="grid gap-4 md:grid-cols-[1fr_240px_240px]">
                  <FieldInput label="Cidade" value={form.cidade} onChange={set("cidade")} placeholder="Digite a cidade" />
                  <FieldSelect
                    label="Estado"
                    value={form.estado}
                    onChange={(v) => set("estado")(v)}
                    options={ESTADOS.map((e) => ({ value: e, label: e }))}
                  />
                  <FieldInput label="CEP / Zip" value={form.cep} onChange={set("cep")} placeholder="00000-000" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-4 p-6">
                <h3 className="flex items-center gap-2 text-lg font-semibold">
                  <FileText className="h-5 w-5 text-brand-primary" />
                  Anotações
                </h3>
                <div>
                  <label className="mb-1 block text-sm font-medium">Observações adicionais (opcional)</label>
                  <textarea
                    aria-label="Observações adicionais"
                    value={form.anotacoes}
                    onChange={(e) => set("anotacoes")(e.target.value)}
                    rows={3}
                    className="min-h-12 w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
                    placeholder="Digite observações sobre o usuário..."
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardContent className="space-y-5 p-6">
                <h3 className="flex items-center gap-2 text-lg font-semibold">
                  <Key className="h-5 w-5 text-brand-primary" />
                  Acesso e Conta
                </h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FieldSelect
                    label="Nível de acesso"
                    value={form.role}
                    onChange={(v) => set("role")(v)}
                    options={[{ value: "", label: "Selecione o nível de acesso" }, ...ROLES.map((r) => ({ value: r.value, label: r.label }))]}
                    required
                  />
                  <FieldSelect
                    label="Status da conta"
                    value={form.status}
                    onChange={(v) => set("status")(v)}
                    options={[
                      { value: "ATIVO", label: "Ativo" },
                      { value: "INATIVO", label: "Inativo" },
                    ]}
                  />
                </div>

                <FieldInput
                  label="Expiração da conta (opcional)"
                  value={form.expiresAt}
                  onChange={(v) => set("expiresAt")(applyDateMask(v))}
                  placeholder="MM/DD/YYYY"
                />

                <div className="rounded-2xl border border-border bg-muted/40 p-4">
                  <div className="flex items-start gap-3">
                    <Key className="mt-0.5 h-4 w-4 shrink-0 text-brand-primary" />
                    <div>
                      <p className="text-sm font-medium">Senha gerada automaticamente</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Uma senha temporária de 12 caracteres será criada pelo sistema e incluída no e-mail de boas-vindas.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <ToggleOption
                    label="Enviar convite por e-mail"
                    description="Um e-mail será enviado com as instruções de acesso"
                    checked={sendInviteEmail}
                    onChange={setSendInviteEmail}
                  />
                  <ToggleOption
                    label="Exigir troca de senha no primeiro acesso"
                    description="O usuário deverá definir uma nova senha no primeiro login"
                    checked={exigirTrocaSenha}
                    onChange={setExigirTrocaSenha}
                  />
                  <ToggleOption
                    label="Vincular como Worker"
                    description="Cria automaticamente um perfil no Workforce"
                    checked={vincularWorker}
                    onChange={setVincularWorker}
                  />
                </div>

                {vincularWorker && (
                  <div className="rounded-2xl border border-brand-primary/30 bg-brand-primary/5 p-4 space-y-3">
                    <p className="text-sm font-medium text-brand-primary">Configuração do Worker</p>
                    <FieldSelect
                      label="Tipo de vínculo"
                      value={workerClassification}
                      onChange={setWorkerClassification}
                      options={WORKER_CLASSIFICATIONS}
                    />
                    <p className="text-xs text-muted-foreground">
                      O perfil completo pode ser concluído depois em RH › Workers.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-4 p-6">
                <h3 className="flex items-center gap-2 text-lg font-semibold">
                  <Info className="h-5 w-5 text-brand-primary" />
                  Resumo da criação
                </h3>
                <div className="rounded-xl border border-brand-primary/20 bg-brand-primary/5 p-4 text-sm text-muted-foreground">
                  <p>O usuário será criado com as configurações definidas ao lado.</p>
                  <p className="mt-1">{sendInviteEmail ? "Um convite será enviado por e-mail." : "O convite por e-mail não será enviado automaticamente."}</p>
                  <p className="mt-1">{vincularWorker ? "Um perfil Worker também será criado." : "Você poderá vincular o usuário ao Workforce depois."}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Link href="/usuarios">
            <Button variant="outline">Cancelar</Button>
          </Link>
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {saving ? "Criando..." : "Criar Usuário"}
          </Button>
        </div>
      </form>
    </div>
  );
}
