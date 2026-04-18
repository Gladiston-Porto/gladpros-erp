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
import { ArrowLeft, Save, Loader2, UserPlus } from "lucide-react";

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
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}{required && <span className="text-red-500 ml-1">*</span>}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-lg border px-3 py-2 text-sm ${error ? 'border-destructive' : 'border-border'} bg-background`}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
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
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}{required && <span className="text-red-500 ml-1">*</span>}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

export default function UserCreateClient() {
  const router = useRouter();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    email: "",
    nomeCompleto: "",
    role: "USUARIO" as UserRole,
    telefone: "",
    dataNascimento: "",
    endereco1: "",
    endereco2: "",
    cidade: "",
    estado: "TX",
    cep: "",
    anotacoes: "",
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
      const payload: Record<string, string> = {};
      if (form.email) payload.email = form.email;
      if (form.nomeCompleto) payload.nomeCompleto = form.nomeCompleto;
      payload.role = form.role;
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

      toast.success("Usuário criado com sucesso! Uma senha provisória foi enviada por email.");
      router.push("/usuarios");
    } catch (err) {
      toast.error("Erro ao criar usuário");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
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

      <Card>
        <CardContent className="space-y-4 pt-6">
          <h3 className="text-lg font-semibold">Dados Pessoais</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldInput label="Nome Completo" value={form.nomeCompleto} onChange={set("nomeCompleto")} required error={errors.nomeCompleto} />
            <FieldInput label="Email" value={form.email} onChange={set("email")} type="email" required error={errors.email} />
            <FieldInput label="Telefone" value={form.telefone} onChange={(v) => set("telefone")(applyPhoneMask(v))} placeholder="(469) 334-6918" />
            <FieldInput label="Data de Nascimento" value={form.dataNascimento} onChange={(v) => set("dataNascimento")(applyDateMask(v))} placeholder="MM/DD/YYYY" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <h3 className="text-lg font-semibold">Acesso</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldSelect
              label="Nível de Acesso"
              value={form.role}
              onChange={(v) => set("role")(v)}
              options={ROLES.map((r) => ({ value: r.value, label: r.label }))}
              required
            />
          </div>
          <p className="text-xs text-muted-foreground">Uma senha provisória será gerada automaticamente e enviada por email.</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <h3 className="text-lg font-semibold">Endereço</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldInput label="Endereço 1" value={form.endereco1} onChange={set("endereco1")} />
            <FieldInput label="Endereço 2" value={form.endereco2} onChange={set("endereco2")} />
            <FieldInput label="Cidade" value={form.cidade} onChange={set("cidade")} />
            <FieldSelect
              label="Estado"
              value={form.estado}
              onChange={(v) => set("estado")(v)}
              options={ESTADOS.map((e) => ({ value: e, label: e }))}
            />
            <FieldInput label="ZIP Code" value={form.cep} onChange={set("cep")} placeholder="xxxxx" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <h3 className="text-lg font-semibold">Anotações</h3>
          <div>
            <textarea
              value={form.anotacoes}
              onChange={(e) => set("anotacoes")(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              placeholder="Anotações internas sobre o usuário..."
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Link href="/usuarios">
          <Button variant="outline">Cancelar</Button>
        </Link>
        <Button onClick={handleSubmit} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {saving ? "Criando..." : "Criar Usuário"}
        </Button>
      </div>
    </div>
  );
}
