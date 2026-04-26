// src/components/profile/UserProfile.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  User, MapPin, Settings, Shield, Eye, EyeOff,
  ShieldCheck, Clock, AlertTriangle, Activity, Bell, Monitor,
  Camera, KeyRound, HelpCircle, Info, CheckCircle2,
} from 'lucide-react';
import { Button } from "@gladpros/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@gladpros/ui/card";
import { Input } from "@gladpros/ui/input";
import { Label } from "@gladpros/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@gladpros/ui/tabs";
import { Badge } from "@gladpros/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@gladpros/ui/select";
import { useToast } from "@gladpros/ui/toast";
import { AvatarUpload } from './AvatarUpload';
import { SessionsList } from './SessionsList';
import { authApi, authenticatedFetch } from '@/lib/api/client';

/* ── Types ─────────────────────────────────────────────────────── */

interface UserProfileData {
  id: string;
  email: string;
  nomeCompleto?: string;
  telefone?: string;
  endereco1?: string;
  endereco2?: string;
  cidade?: string;
  estado?: string;
  zipcode?: string;
  avatarUrl?: string;
  dataNascimento?: string;
  createdAt: string;
  role?: string;
  status?: string;
  ultimoLoginEm?: string | null;
}

interface UserProfileProps {
  user: UserProfileData;
  onUpdate: (data: Partial<UserProfileData>) => Promise<void>;
  onAvatarUpload?: (file: File) => Promise<void>;
  isLoading?: boolean;
}

/* ── Helpers ────────────────────────────────────────────────────── */

function applyPhoneMask(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (!digits.length) return '';
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function applyDateMask(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (!digits.length) return '';
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function isoToDisplay(iso: string): string {
  if (!iso) return '';
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[2]}/${m[3]}/${m[1]}` : '';
}

function displayToIso(display: string): string {
  const m = display.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[1]}-${m[2]}` : '';
}

function getInitialsFor(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map((n) => n[0].toUpperCase()).join('');
}

function getAvatarBgFor(name: string): string {
  const palette = ['bg-sky-600', 'bg-teal-600', 'bg-orange-600', 'bg-indigo-600', 'bg-emerald-600', 'bg-rose-600'];
  return palette[name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % palette.length];
}

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Administrador',
  GERENTE: 'Gerente',
  FINANCEIRO: 'Financeiro',
  ESTOQUE: 'Estoque',
  USUARIO: 'Usuário',
  CLIENTE: 'Cliente',
};

const SECURITY_QUESTIONS = [
  'Qual o nome do seu primeiro animal de estimação?',
  'Qual o nome da cidade onde você nasceu?',
  'Em que cidade você passou a maior parte da infância?',
  'Qual o nome da escola primária que você estudou?',
  'Qual o nome de solteira da sua mãe?',
  'Qual era o modelo do seu primeiro carro?',
  'Qual o nome do seu melhor amigo de infância?',
  'Qual o nome do seu professor favorito no colégio?',
  'Qual o seu time esportivo favorito?',
  'Qual era o seu apelido de infância?',
] as const;

/* ── SecurityTab ────────────────────────────────────────────────── */

function SecurityTab() {
  const { success, error } = useToast();

  // ── Senha ──
  const [pwForm, setPwForm] = useState({ senhaAtual: '', novaSenha: '', confirmacao: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwShow, setPwShow] = useState({ atual: false, nova: false, conf: false });

  // ── PIN ──
  const [pinForm, setPinForm] = useState({ senhaAtual: '', novoPIN: '' });
  const [pinSaving, setPinSaving] = useState(false);
  const [pinShow, setPinShow] = useState({ atual: false, pin: false });

  // ── Pergunta Secreta ──
  const [secForm, setSecForm] = useState({ senhaAtual: '', perguntaSecreta: '', respostaSecreta: '' });
  const [secSaving, setSecSaving] = useState(false);
  const [secShow, setSecShow] = useState({ atual: false, resposta: false });

  const handlePasswordChange = async () => {
    if (pwForm.novaSenha !== pwForm.confirmacao) {
      error('Erro', 'As senhas não coincidem');
      return;
    }
    setPwSaving(true);
    try {
      await authApi.changePassword(pwForm.senhaAtual, pwForm.novaSenha);
      success('Senha alterada', 'Sua senha foi alterada com sucesso. Faça login novamente.');
      setPwForm({ senhaAtual: '', novaSenha: '', confirmacao: '' });
    } catch (err) {
      error('Erro', (err as Error).message || 'Erro ao alterar senha');
    } finally {
      setPwSaving(false);
    }
  };

  const handlePinChange = async () => {
    if (!/^\d{4}$/.test(pinForm.novoPIN)) {
      error('Erro', 'O PIN deve ter exatamente 4 dígitos numéricos');
      return;
    }
    setPinSaving(true);
    try {
      await authApi.changePin(pinForm.senhaAtual, pinForm.novoPIN);
      success('PIN alterado', 'Seu PIN de segurança foi atualizado');
      setPinForm({ senhaAtual: '', novoPIN: '' });
    } catch (err) {
      error('Erro', (err as Error).message || 'Erro ao alterar PIN');
    } finally {
      setPinSaving(false);
    }
  };

  const handleSecurityChange = async () => {
    if (secForm.perguntaSecreta.trim().length < 5) {
      error('Erro', 'A pergunta deve ter ao menos 5 caracteres');
      return;
    }
    if (secForm.respostaSecreta.trim().length < 2) {
      error('Erro', 'A resposta deve ter ao menos 2 caracteres');
      return;
    }
    setSecSaving(true);
    try {
      await authApi.changeSecurityQuestion(secForm.senhaAtual, secForm.perguntaSecreta, secForm.respostaSecreta);
      success('Segurança atualizada', 'Pergunta e resposta de segurança atualizadas');
      setSecForm({ senhaAtual: '', perguntaSecreta: '', respostaSecreta: '' });
    } catch (err) {
      error('Erro', (err as Error).message || 'Erro ao atualizar pergunta de segurança');
    } finally {
      setSecSaving(false);
    }
  };

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_280px]">

      {/* ── Coluna esquerda: formulários ── */}
      <div className="space-y-4">

      {/* Troca de Senha */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4" />
            Alterar Senha
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pw-senhaAtual">Senha Atual</Label>
            <div className="relative">
              <Input
                id="pw-senhaAtual"
                type={pwShow.atual ? 'text' : 'password'}
                value={pwForm.senhaAtual}
                onChange={(e) => setPwForm((p) => ({ ...p, senhaAtual: e.target.value }))}
                placeholder="Digite sua senha atual"
                className="pr-10"
              />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                onClick={() => setPwShow((p) => ({ ...p, atual: !p.atual }))}
                aria-label={pwShow.atual ? 'Ocultar senha' : 'Mostrar senha'}>
                {pwShow.atual ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="novaSenha">Nova Senha</Label>
              <div className="relative">
                <Input id="novaSenha" type={pwShow.nova ? 'text' : 'password'} value={pwForm.novaSenha}
                  onChange={(e) => setPwForm((p) => ({ ...p, novaSenha: e.target.value }))}
                  placeholder="Mín. 9 chars" className="pr-10" />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setPwShow((p) => ({ ...p, nova: !p.nova }))}
                  aria-label={pwShow.nova ? 'Ocultar senha' : 'Mostrar senha'}>
                  {pwShow.nova ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmacaoSenha">Confirmar Nova Senha</Label>
              <div className="relative">
                <Input id="confirmacaoSenha" type={pwShow.conf ? 'text' : 'password'} value={pwForm.confirmacao}
                  onChange={(e) => setPwForm((p) => ({ ...p, confirmacao: e.target.value }))}
                  placeholder="Repita a nova senha" className="pr-10" />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setPwShow((p) => ({ ...p, conf: !p.conf }))}
                  aria-label={pwShow.conf ? 'Ocultar senha' : 'Mostrar senha'}>
                  {pwShow.conf ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handlePasswordChange}
              disabled={pwSaving || !pwForm.senhaAtual || !pwForm.novaSenha || !pwForm.confirmacao}>
              {pwSaving ? 'Alterando...' : 'Alterar Senha'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* PIN de Segurança */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-4 w-4" />
            PIN de Segurança
          </CardTitle>
          <CardDescription>Usado para confirmar ações sensíveis no sistema</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pin-senhaAtual">Senha Atual</Label>
              <div className="relative">
                <Input id="pin-senhaAtual" type={pinShow.atual ? 'text' : 'password'} value={pinForm.senhaAtual}
                  onChange={(e) => setPinForm((p) => ({ ...p, senhaAtual: e.target.value }))}
                  placeholder="Confirme sua senha" className="pr-10" />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setPinShow((p) => ({ ...p, atual: !p.atual }))}
                  aria-label={pinShow.atual ? 'Ocultar senha' : 'Mostrar senha'}>
                  {pinShow.atual ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="novoPIN">Novo PIN</Label>
              <div className="relative">
                <Input id="novoPIN"
                  type={pinShow.pin ? 'text' : 'password'}
                  value={pinForm.novoPIN}
                  onChange={(e) => setPinForm((p) => ({ ...p, novoPIN: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                  placeholder="0000"
                  maxLength={4}
                  inputMode="numeric"
                  className="pr-10 tracking-widest text-lg"
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setPinShow((p) => ({ ...p, pin: !p.pin }))}
                  aria-label={pinShow.pin ? 'Ocultar PIN' : 'Mostrar PIN'}>
                  {pinShow.pin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">Apenas números, exatamente 4 dígitos</p>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handlePinChange}
              disabled={pinSaving || !pinForm.senhaAtual || pinForm.novoPIN.length !== 4}>
              {pinSaving ? 'Alterando...' : 'Alterar PIN'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pergunta de Segurança */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <HelpCircle className="h-4 w-4" />
            Pergunta de Segurança
          </CardTitle>
          <CardDescription>Usada para recuperação de conta e confirmação de identidade</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sec-senhaAtual">Senha Atual</Label>
            <div className="relative">
              <Input id="sec-senhaAtual" type={secShow.atual ? 'text' : 'password'} value={secForm.senhaAtual}
                onChange={(e) => setSecForm((p) => ({ ...p, senhaAtual: e.target.value }))}
                placeholder="Confirme sua senha" className="pr-10" />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                onClick={() => setSecShow((p) => ({ ...p, atual: !p.atual }))}
                aria-label={secShow.atual ? 'Ocultar senha' : 'Mostrar senha'}>
                {secShow.atual ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="perguntaSecreta">Pergunta de Segurança</Label>
            <Select
              value={secForm.perguntaSecreta}
              onValueChange={(v) => setSecForm((p) => ({ ...p, perguntaSecreta: v }))}
            >
              <SelectTrigger id="perguntaSecreta">
                <SelectValue placeholder="Selecione uma pergunta..." />
              </SelectTrigger>
              <SelectContent>
                {SECURITY_QUESTIONS.map((q) => (
                  <SelectItem key={q} value={q}>{q}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="respostaSecreta">Resposta</Label>
            <div className="relative">
              <Input id="respostaSecreta" type={secShow.resposta ? 'text' : 'password'} value={secForm.respostaSecreta}
                onChange={(e) => setSecForm((p) => ({ ...p, respostaSecreta: e.target.value }))}
                placeholder="Sua resposta" maxLength={191} className="pr-10" />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                onClick={() => setSecShow((p) => ({ ...p, resposta: !p.resposta }))}
                aria-label={secShow.resposta ? 'Ocultar resposta' : 'Mostrar resposta'}>
                {secShow.resposta ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">A resposta não diferencia maiúsculas/minúsculas</p>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSecurityChange}
              disabled={secSaving || !secForm.senhaAtual || !secForm.perguntaSecreta || !secForm.respostaSecreta}>
              {secSaving ? 'Salvando...' : 'Salvar Pergunta de Segurança'}
            </Button>
          </div>
        </CardContent>
      </Card>

      </div>{/* fim coluna esquerda */}

      {/* ── Sidebar: MFA + dicas ── */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4" />
              Autenticação (MFA)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-green-600 shrink-0" />
                <div>
                  <p className="text-xs font-medium">Ativo via e-mail</p>
                  <p className="text-xs text-muted-foreground">Código enviado a cada login</p>
                </div>
              </div>
              <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-xs shrink-0">Ativo</Badge>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Obrigatório — não pode ser desativado.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Info className="h-4 w-4 text-brand-primary" />
              Dicas de Segurança
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { icon: Shield,      text: 'Use ao menos 9 caracteres com maiúscula, número e símbolo' },
              { icon: KeyRound,    text: 'Nunca compartilhe seu PIN com ninguém' },
              { icon: HelpCircle,  text: 'Escolha uma pergunta cuja resposta só você conhece' },
              { icon: ShieldCheck, text: 'Troque sua senha periodicamente como boa prática' },
            ].map(({ icon: Icon, text }, i) => (
              <div key={i} className="flex items-start gap-2">
                <Icon className="h-3.5 w-3.5 text-brand-primary mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground leading-relaxed">{text}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}

/* ── PreferencesTab ─────────────────────────────────────────────── */

interface Preferences {
  tema: 'light' | 'dark' | 'system';
  idioma: 'pt-BR' | 'en-US';
  timezone: 'America/Chicago' | 'America/New_York' | 'America/Los_Angeles';
  itensPorPagina: number;
  notificacoesEmail: boolean;
  notificacoesSistema: boolean;
}

function PreferencesTab() {
  const { success, error } = useToast();
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    authenticatedFetch('/api/auth/me/preferences')
      .then((r) => r.json())
      .then((d) => setPrefs(d.data ?? null))
      .catch(() => error('Erro', 'Não foi possível carregar as preferências'))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    if (!prefs) return;
    setSaving(true);
    try {
      const res = await authenticatedFetch('/api/auth/me/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
      });
      if (res.ok) {
        success('Preferências salvas', 'Suas preferências foram atualizadas');
      } else {
        const d = await res.json().catch(() => ({}));
        error('Erro', (d as { message?: string }).message ?? 'Erro ao salvar');
      }
    } catch {
      error('Erro', 'Não foi possível salvar as preferências');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !prefs) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="space-y-4 animate-pulse">
            {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-muted/50 rounded-xl" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_280px]">

      {/* ── Coluna esquerda ── */}
      <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Monitor className="h-4 w-4" />
            Interface
          </CardTitle>
          <CardDescription>Personalize sua experiência de uso no sistema</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tema">Tema</Label>
              <Select value={prefs.tema} onValueChange={(v) => setPrefs((p) => p ? { ...p, tema: v as Preferences['tema'] } : p)}>
                <SelectTrigger id="tema"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dark">Escuro</SelectItem>
                  <SelectItem value="light">Claro</SelectItem>
                  <SelectItem value="system">Sistema</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="idioma">Idioma</Label>
              <Select value={prefs.idioma} onValueChange={(v) => setPrefs((p) => p ? { ...p, idioma: v as Preferences['idioma'] } : p)}>
                <SelectTrigger id="idioma"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                  <SelectItem value="en-US">English (US)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Fuso Horário</Label>
              <Select value={prefs.timezone} onValueChange={(v) => setPrefs((p) => p ? { ...p, timezone: v as Preferences['timezone'] } : p)}>
                <SelectTrigger id="timezone"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="America/Chicago">Central (America/Chicago)</SelectItem>
                  <SelectItem value="America/New_York">Eastern (America/New_York)</SelectItem>
                  <SelectItem value="America/Los_Angeles">Pacific (America/Los_Angeles)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="itensPorPagina">Itens por Página</Label>
              <Select value={String(prefs.itensPorPagina)} onValueChange={(v) => setPrefs((p) => p ? { ...p, itensPorPagina: Number(v) } : p)}>
                <SelectTrigger id="itensPorPagina"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar Preferências'}
        </Button>
      </div>
      </div>{/* fim coluna esquerda */}

      {/* ── Sidebar ── */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="h-4 w-4" />
              Notificações
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {[
              { key: 'notificacoesEmail' as const, label: 'Por e-mail', desc: 'Alertas importantes por e-mail' },
              { key: 'notificacoesSistema' as const, label: 'No sistema', desc: 'Avisos dentro do ERP' },
            ].map((item, idx) => (
              <div key={item.key} className={`flex items-center justify-between py-2.5 ${idx > 0 ? 'border-t border-border' : ''}`}>
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <label
                  className={`relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full transition-colors focus-within:outline-none focus-within:ring-2 focus-within:ring-brand-primary focus-within:ring-offset-2 ${
                    prefs[item.key] ? 'bg-brand-primary' : 'bg-muted-foreground/30'
                  }`}
                >
                  <input
                    type="checkbox"
                    role="switch"
                    className="sr-only"
                    checked={prefs[item.key]}
                    onChange={() => setPrefs((p) => p ? { ...p, [item.key]: !p[item.key] } : p)}
                    aria-label={item.label}
                  />
                  <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${prefs[item.key] ? 'translate-x-6' : 'translate-x-1'}`} />
                </label>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-brand-primary mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                Suas preferências são salvas por conta e aplicadas automaticamente em todos os dispositivos ao fazer login.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}

/* ── AuditTab ───────────────────────────────────────────────────── */

interface AuditLog { tipo: 'audit'; id: string; acao: string; entidade: string; entidadeId: string; timestamp: string; }
interface LoginAttempt { tipo: 'login_attempt'; id: string; sucesso: boolean; motivo: string | null; ip: string | null; timestamp: string; }

const PAGE_SIZE_AUDIT = 15;

interface AuditPagination { totalAudit: number; totalTentativas: number; pageSize: number; }

function AuditTab() {
  const { error } = useToast();
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [tentativas, setTentativas] = useState<LoginAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<AuditPagination | null>(null);

  const fetchAudit = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await authenticatedFetch(`/api/auth/me/audit?page=${p}&pageSize=${PAGE_SIZE_AUDIT}`);
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.data?.auditLogs ?? []);
        setTentativas(data.data?.tentativasLogin ?? []);
        setPagination(data.pagination ?? null);
      }
    } catch {
      error('Erro', 'Não foi possível carregar o histórico');
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => { fetchAudit(page); }, [fetchAudit, page]);

  const fmt = (iso: string) =>
    new Intl.DateTimeFormat('en-US', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Chicago' }).format(new Date(iso));

  const totalPages = pagination
    ? Math.max(
        Math.ceil(pagination.totalAudit / PAGE_SIZE_AUDIT),
        Math.ceil(pagination.totalTentativas / PAGE_SIZE_AUDIT),
      )
    : 1;

  if (loading) {
    return (
      <Card><CardContent className="py-8">
        <div className="space-y-3 animate-pulse">
          {[1,2,3,4].map((i) => <div key={i} className="h-12 bg-muted/50 rounded-xl" />)}
        </div>
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Activity className="h-4 w-4" />Tentativas de Login</CardTitle>
          <CardDescription>Últimos acessos e tentativas à sua conta</CardDescription>
        </CardHeader>
        <CardContent>
          {tentativas.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum registro encontrado.</p>
          ) : (
            <div className="space-y-2">
              {tentativas.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-3 border border-border rounded-xl">
                  <div className="flex items-center gap-3">
                    {t.sucesso ? <ShieldCheck className="h-4 w-4 text-green-600 shrink-0" /> : <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />}
                    <div>
                      <p className="text-sm font-medium">{t.sucesso ? 'Login realizado' : `Falha${t.motivo ? ` — ${t.motivo}` : ''}`}</p>
                      {t.ip && <p className="text-xs text-muted-foreground">IP: {t.ip}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={t.sucesso ? 'bg-green-500/10 text-green-600 border-green-500/20' : 'bg-destructive/10 text-destructive border-destructive/20'}>
                      {t.sucesso ? 'Sucesso' : 'Falha'}
                    </Badge>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{fmt(t.timestamp)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Clock className="h-4 w-4" />Histórico de Ações</CardTitle>
          <CardDescription>Alterações realizadas na sua conta</CardDescription>
        </CardHeader>
        <CardContent>
          {auditLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma ação registrada.</p>
          ) : (
            <div className="space-y-2">
              {auditLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 border border-border rounded-xl">
                  <div>
                    <p className="text-sm font-medium">{log.acao}</p>
                    <p className="text-xs text-muted-foreground">{log.entidade}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{fmt(log.timestamp)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Controles de paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            ← Anterior
          </Button>
          <span className="text-xs text-muted-foreground">Página {page} de {totalPages}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            Próxima →
          </Button>
        </div>
      )}
    </div>
  );
}

/* ── Main Component ─────────────────────────────────────────────── */

export function UserProfile({ user, onUpdate, onAvatarUpload, isLoading = false }: UserProfileProps) {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'profile');
  const { error: toastError } = useToast();

  const [formData, setFormData] = useState({
    nomeCompleto: user.nomeCompleto || '',
    telefone: user.telefone || '',
    endereco1: user.endereco1 || '',
    endereco2: user.endereco2 || '',
    cidade: user.cidade || '',
    estado: user.estado || '',
    zipcode: user.zipcode || '',
    dataNascimento: isoToDisplay(user.dataNascimento || ''),
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdate({
        nomeCompleto: formData.nomeCompleto,
        telefone: formData.telefone || undefined,
        endereco1: formData.endereco1 || undefined,
        endereco2: formData.endereco2 || undefined,
        cidade: formData.cidade || undefined,
        estado: formData.estado || undefined,
        zipcode: formData.zipcode || undefined,
        dataNascimento: formData.dataNascimento ? displayToIso(formData.dataNascimento) : undefined,
      });
    } catch (err) {
      toastError('Erro', (err as Error).message || 'Erro ao salvar');
    } finally {
      setIsSaving(false);
    }
  };

  const displayName = user.nomeCompleto || user.email;
  const initials = getInitialsFor(displayName);
  const avatarBg = getAvatarBgFor(displayName);
  const isActive = user.status === 'ATIVO';

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
      <TabsList className="grid w-full grid-cols-5 bg-muted/50 p-1 rounded-xl h-auto">
        <TabsTrigger value="profile" className="py-2">Perfil</TabsTrigger>
        <TabsTrigger value="avatar" className="py-2">Foto</TabsTrigger>
        <TabsTrigger value="security" className="py-2">Segurança</TabsTrigger>
        <TabsTrigger value="preferences" className="py-2">Preferências</TabsTrigger>
        <TabsTrigger value="audit" className="py-2">Histórico</TabsTrigger>
      </TabsList>

      {/* ── Aba: Perfil ─── */}
      <TabsContent value="profile">
        <div className="grid items-start gap-6 lg:grid-cols-[1fr_300px]">

          {/* ── Col esquerda: formulários ── */}
          <div className="space-y-4">
            {/* Informações Pessoais */}
            <Card>
              <CardContent className="space-y-4 p-6">
                <h3 className="flex items-center gap-2 text-base font-semibold">
                  <User className="h-4 w-4 text-brand-primary" />
                  Informações Pessoais
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nomeCompleto">Nome Completo</Label>
                    <Input
                      id="nomeCompleto"
                      value={formData.nomeCompleto}
                      onChange={(e) => handleInputChange('nomeCompleto', e.target.value)}
                      placeholder="Digite seu nome completo"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email-display">E-mail</Label>
                    <Input
                      id="email-display"
                      value={user.email}
                      disabled
                      className="bg-muted opacity-70"
                      aria-label="E-mail (somente leitura)"
                    />
                    <p className="text-xs text-muted-foreground">Não pode ser alterado por aqui</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telefone">Telefone</Label>
                    <Input
                      id="telefone"
                      type="tel"
                      value={formData.telefone}
                      onChange={(e) => handleInputChange('telefone', applyPhoneMask(e.target.value))}
                      placeholder="(469) 000-0000"
                      maxLength={14}
                      inputMode="tel"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dataNascimento">Data de Nascimento</Label>
                    <Input
                      id="dataNascimento"
                      value={formData.dataNascimento}
                      onChange={(e) => handleInputChange('dataNascimento', applyDateMask(e.target.value))}
                      placeholder="MM/DD/YYYY"
                      maxLength={10}
                      inputMode="numeric"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Endereço */}
            <Card>
              <CardContent className="space-y-4 p-6">
                <h3 className="flex items-center gap-2 text-base font-semibold">
                  <MapPin className="h-4 w-4 text-brand-primary" />
                  Endereço
                </h3>

                <div className="space-y-2">
                  <Label htmlFor="endereco1">Street Address</Label>
                  <Input
                    id="endereco1"
                    value={formData.endereco1}
                    onChange={(e) => handleInputChange('endereco1', e.target.value)}
                    placeholder="Street, number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endereco2">Apt / Suite</Label>
                  <Input
                    id="endereco2"
                    value={formData.endereco2}
                    onChange={(e) => handleInputChange('endereco2', e.target.value)}
                    placeholder="Apt, Suite (optional)"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2 col-span-1">
                    <Label htmlFor="cidade">City</Label>
                    <Input
                      id="cidade"
                      value={formData.cidade}
                      onChange={(e) => handleInputChange('cidade', e.target.value)}
                      placeholder="Dallas"
                    />
                  </div>
                  <div className="space-y-2 col-span-1">
                    <Label htmlFor="estado">State</Label>
                    <Input
                      id="estado"
                      value={formData.estado}
                      onChange={(e) => handleInputChange('estado', e.target.value)}
                      placeholder="TX"
                      maxLength={2}
                    />
                  </div>
                  <div className="space-y-2 col-span-1">
                    <Label htmlFor="zipcode">ZIP Code</Label>
                    <Input
                      id="zipcode"
                      value={formData.zipcode}
                      onChange={(e) => handleInputChange('zipcode', e.target.value)}
                      placeholder="75201"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Botão salvar */}
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </div>

          {/* ── Col direita: sidebar ── */}
          <div className="space-y-4">
            {/* Card compacto de perfil */}
            <Card>
              <CardContent className="pt-6 pb-5">
                <div className="flex flex-col items-center text-center gap-3">
                  {/* Avatar */}
                  <div className="relative group">
                    {user.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={user.avatarUrl}
                        alt={displayName}
                        className="h-20 w-20 rounded-2xl object-cover ring-2 ring-border"
                      />
                    ) : (
                      <div className={`flex h-20 w-20 items-center justify-center rounded-2xl text-2xl font-bold text-white ${avatarBg}`}>
                        {initials}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="space-y-0.5">
                    <p className="font-semibold text-foreground leading-tight">{displayName}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                    <div className="flex justify-center gap-1.5 mt-2 flex-wrap">
                      {user.role && (
                        <Badge variant="secondary" className="text-xs">
                          {ROLE_LABEL[user.role] ?? user.role}
                        </Badge>
                      )}
                      <Badge
                        className={
                          isActive
                            ? 'bg-green-500/10 text-green-600 border-green-500/20 text-xs'
                            : 'bg-destructive/10 text-destructive border-destructive/20 text-xs'
                        }
                      >
                        {isActive ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                  </div>

                  {/* Botão alterar foto */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-1 gap-2"
                    onClick={() => setActiveTab('avatar')}
                  >
                    <Camera className="h-3.5 w-3.5" />
                    Alterar foto
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Sessões ativas */}
            <SessionsList />
          </div>
        </div>
      </TabsContent>

      {/* ── Aba: Foto ─── */}
      <TabsContent value="avatar">
        <div className="grid items-start gap-6 lg:grid-cols-[1fr_300px]">
          <AvatarUpload
            currentAvatar={user.avatarUrl}
            onAvatarChange={onAvatarUpload || (() => Promise.resolve())}
            userInitials={initials}
            isLoading={isLoading}
          />

          {/* ── Sidebar: como aparece + requisitos ── */}
          <div className="space-y-4">

            {/* Como aparece no sistema */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Como aparece no sistema</CardTitle>
                <CardDescription>Prévia nos diferentes contextos</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { size: 'h-16 w-16', rounded: 'rounded-2xl', textSize: 'text-xl', label: 'Perfil',      desc: '64 × 64 px' },
                  { size: 'h-10 w-10', rounded: 'rounded-xl',  textSize: 'text-sm', label: 'Menu lateral', desc: '40 × 40 px' },
                  { size: 'h-7 w-7',   rounded: 'rounded-lg',  textSize: 'text-xs', label: 'Atividades',   desc: '28 × 28 px' },
                ].map(({ size, rounded, textSize, label, desc }) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className={`${size} ${rounded} flex items-center justify-center font-bold text-white shrink-0 ${avatarBg}`}>
                      <span className={textSize}>{initials}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium leading-none">{label}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Requisitos da foto */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Requisitos da foto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {[
                  'Formatos aceitos: PNG, JPG, GIF ou WebP',
                  'Tamanho máximo: 5 MB',
                  'Recomendado: 200 × 200 px ou maior',
                  'Use uma foto de rosto bem iluminada',
                ].map((tip) => (
                  <div key={tip} className="flex items-start gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-brand-primary mt-0.5 shrink-0" />
                    <p className="text-xs text-muted-foreground leading-relaxed">{tip}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

          </div>
        </div>
      </TabsContent>

      {/* ── Aba: Segurança ─── */}
      <TabsContent value="security">
        <SecurityTab />
      </TabsContent>

      {/* ── Aba: Preferências ─── */}
      <TabsContent value="preferences">
        <PreferencesTab />
      </TabsContent>

      {/* ── Aba: Histórico ─── */}
      <TabsContent value="audit">
        <AuditTab />
      </TabsContent>
    </Tabs>
  );
}
