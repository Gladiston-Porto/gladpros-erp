'use client';

import { useEffect, useState, useCallback } from 'react';
import { ModulePageHeader } from '@gladpros/ui/module-page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@gladpros/ui/card';
import { Badge } from '@gladpros/ui/badge';
import { Button } from '@gladpros/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@gladpros/ui/tabs';
import {
  Shield,
  Key,
  Lock,
  Clock,
  AlertTriangle,
  RefreshCw,
  CheckCircle,
  XCircle,
  ShieldCheck,
  Monitor,
  Copy,
  Check,
} from 'lucide-react';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface SessionSummary {
  totalActive: number;
  uniqueUsers: number;
}

interface SecurityReport {
  loginAttempts?: { total: number; success: number; failed: number };
  failedLogins?: Array<{ userId: number; email: string; count: number; lastAttempt: string }>;
  activeSessions?: Array<{ userId: number; email: string; ip: string; userAgent: string; lastActivity: string }>;
}

// Valores das políticas atuais (lidos do config/index.ts — read-only display)
const POLICIES = {
  password: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecial: true,
    historySize: 5,
    bcryptRounds: 12,
  },
  mfa: {
    codeLength: 6,
    codeExpiryMin: 5,
    maxCodesPerWindow: 3,
    windowMin: 15,
    obligatory: true,
  },
  rateLimit: {
    login: { attempts: 5, windowMin: 15 },
    mfa: { attempts: 3, windowMin: 5 },
    api: { requests: 100, windowSec: 60 },
    resetPassword: { attempts: 3, windowHour: 1 },
  },
  blocking: [
    { attempts: 5, duration: '1 minuto' },
    { attempts: 8, duration: '5 minutos' },
    { attempts: 12, duration: '30 minutos' },
    { attempts: 15, duration: '2 horas' },
    { attempts: 20, duration: 'Permanente' },
  ],
  jwt: {
    accessTokenExpiry: '15 min',
    refreshTokenExpiry: '7 dias',
    rotationEnabled: true,
    reuseDetection: true,
  },
  kms: {
    algorithm: 'AES-256-GCM',
    derivation: 'HKDF (RFC 5869)',
    keyTypes: [
      { type: 'JWT_SIGNING', rotation: '90 dias', grace: '30 dias', retention: '1 ano' },
      { type: 'DOC_ENCRYPTION', rotation: '180 dias', grace: '60 dias', retention: '2 anos' },
      { type: 'SESSION', rotation: '30 dias', grace: '7 dias', retention: '90 dias' },
      { type: 'BACKUP', rotation: '365 dias', grace: '90 dias', retention: '3 anos' },
    ],
  },
};

function PolicyRow({ label, value, icon }: { label: string; value: string | React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}

export default function SegurancaPage() {
  const [report, setReport] = useState<SecurityReport>({});
  const [loading, setLoading] = useState(true);
  const [backupStatus, setBackupStatus] = useState<{ total: number; remaining: number; generatedAt: string | null } | null>(null);
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const [loginRes, failedRes, sessionsRes, backupRes] = await Promise.all([
        fetch('/api/security/reports?type=login-attempts'),
        fetch('/api/security/reports?type=failed-logins'),
        fetch('/api/security/reports?type=active-sessions'),
        fetch('/api/auth/mfa/backup-codes'),
      ]);

      const newReport: SecurityReport = {};
      if (loginRes.ok) newReport.loginAttempts = (await loginRes.json()).data;
      if (failedRes.ok) newReport.failedLogins = (await failedRes.json()).data;
      if (sessionsRes.ok) newReport.activeSessions = (await sessionsRes.json()).data;
      if (backupRes.ok) setBackupStatus((await backupRes.json()).data);
      setReport(newReport);
    } catch (err) {
      console.error('Erro ao buscar relatórios:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleGenerateBackupCodes = async () => {
    if (!confirm('Isso invalidará todos os códigos de backup anteriores. Confirmar?')) return;
    setBackupLoading(true);
    setBackupCodes(null);
    try {
      const res = await fetch('/api/auth/mfa/backup-codes', { method: 'POST' });
      const json = await res.json();
      if (res.ok && json.data?.codes) {
        setBackupCodes(json.data.codes);
        setBackupStatus(json.data.status ?? null);
      } else {
        alert(json.error || 'Erro ao gerar códigos de backup');
      }
    } catch {
      alert('Erro ao gerar códigos de backup');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleCopyCode = async (code: string, idx: number) => {
    await navigator.clipboard.writeText(code).catch(() => {});
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  return (
    <div className="flex flex-col gap-6">
      <ModulePageHeader
        title="Segurança & Criptografia"
        description="Políticas de segurança, KMS, MFA, sessões ativas e monitoramento de acessos."
        icon={<Shield />}
        accentColor="#ef4444"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Configurações', href: '/configuracoes' },
          { label: 'Segurança' },
        ]}
      />

      {/* Cards resumo */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Criptografia</p>
              <p className="text-sm font-bold">{POLICIES.kms.algorithm}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">MFA</p>
              <p className="text-sm font-bold">Obrigatório</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
              <Monitor className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Sessões ativas</p>
              <p className="text-sm font-bold">{report.activeSessions?.length ?? '—'}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Logins com falha (24h)</p>
              <p className="text-sm font-bold">{report.loginAttempts?.failed ?? '—'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="policies" className="w-full">
        <TabsList>
          <TabsTrigger value="policies">Políticas</TabsTrigger>
          <TabsTrigger value="kms">KMS & Chaves</TabsTrigger>
          <TabsTrigger value="sessions">Sessões & Acessos</TabsTrigger>
        </TabsList>

        {/* ===== ABA POLÍTICAS ===== */}
        <TabsContent value="policies" className="space-y-4 mt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Política de Senha */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Lock className="h-4 w-4" /> Política de Senha
                </CardTitle>
                <CardDescription>NIST 800-63B Compliant</CardDescription>
              </CardHeader>
              <CardContent>
                <PolicyRow label="Tamanho mínimo" value={`${POLICIES.password.minLength} caracteres`} />
                <PolicyRow label="Maiúscula obrigatória" value={<CheckCircle className="h-4 w-4 text-emerald-500" />} />
                <PolicyRow label="Número obrigatório" value={<CheckCircle className="h-4 w-4 text-emerald-500" />} />
                <PolicyRow label="Caractere especial" value={<CheckCircle className="h-4 w-4 text-emerald-500" />} />
                <PolicyRow label="Histórico de senhas" value={`Últimas ${POLICIES.password.historySize}`} />
                <PolicyRow label="Hash" value={`bcrypt (${POLICIES.password.bcryptRounds} rounds)`} />
              </CardContent>
            </Card>

            {/* MFA */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Key className="h-4 w-4" /> Autenticação Multi-Fator (MFA)
                </CardTitle>
                <CardDescription>Código por email</CardDescription>
              </CardHeader>
              <CardContent>
                <PolicyRow label="Status" value={<Badge variant="success">Obrigatório</Badge>} />
                <PolicyRow label="Comprimento do código" value={`${POLICIES.mfa.codeLength} dígitos`} />
                <PolicyRow label="Validade do código" value={`${POLICIES.mfa.codeExpiryMin} minutos`} />
                <PolicyRow label="Máximo de códigos" value={`${POLICIES.mfa.maxCodesPerWindow} / ${POLICIES.mfa.windowMin}min`} />
              </CardContent>
            </Card>

            {/* Rate Limiting */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="h-4 w-4" /> Rate Limiting
                </CardTitle>
                <CardDescription>Redis + fallback em memória</CardDescription>
              </CardHeader>
              <CardContent>
                <PolicyRow label="Login" value={`${POLICIES.rateLimit.login.attempts} tentativas / ${POLICIES.rateLimit.login.windowMin}min`} />
                <PolicyRow label="MFA" value={`${POLICIES.rateLimit.mfa.attempts} tentativas / ${POLICIES.rateLimit.mfa.windowMin}min`} />
                <PolicyRow label="API geral" value={`${POLICIES.rateLimit.api.requests} req / ${POLICIES.rateLimit.api.windowSec}s`} />
                <PolicyRow label="Reset de senha" value={`${POLICIES.rateLimit.resetPassword.attempts} / ${POLICIES.rateLimit.resetPassword.windowHour}h`} />
              </CardContent>
            </Card>

            {/* Bloqueio Progressivo */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="h-4 w-4" /> Bloqueio Progressivo
                </CardTitle>
                <CardDescription>Escalonamento automático</CardDescription>
              </CardHeader>
              <CardContent>
                {POLICIES.blocking.map((b) => (
                  <PolicyRow
                    key={b.attempts}
                    label={`${b.attempts} tentativas`}
                    value={
                      <Badge variant={b.duration === 'Permanente' ? 'error' : 'warning'}>
                        {b.duration}
                      </Badge>
                    }
                  />
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Códigos de Backup MFA */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Key className="h-4 w-4" /> Códigos de Backup MFA
                  </CardTitle>
                  <CardDescription>Use em caso de perda de acesso ao email</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateBackupCodes}
                  disabled={backupLoading}
                  aria-label="Gerar novos códigos de backup"
                >
                  {backupLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Gerar novos códigos
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {backupStatus && (
                <div className="flex flex-wrap gap-4 text-sm">
                  <span className="text-muted-foreground">
                    Restantes: <span className="font-semibold text-foreground">{backupStatus.remaining}/{backupStatus.total}</span>
                  </span>
                  {backupStatus.generatedAt && (
                    <span className="text-muted-foreground">
                      Gerados em: <span className="font-semibold text-foreground">
                        {new Date(backupStatus.generatedAt).toLocaleString('en-US', { timeZone: 'America/Chicago' })}
                      </span>
                    </span>
                  )}
                </div>
              )}
              {!backupStatus && !backupLoading && (
                <p className="text-sm text-muted-foreground">
                  Nenhum código de backup gerado ainda. Clique em &quot;Gerar novos códigos&quot; para criar.
                </p>
              )}

              {backupCodes && (
                <div className="space-y-3">
                  <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3">
                    <p className="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-1">⚠️ Atenção</p>
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      Estes códigos são exibidos apenas UMA VEZ. Guarde-os em lugar seguro. Cada código pode ser usado apenas uma vez.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {backupCodes.map((code, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-muted/40 rounded-lg px-3 py-2 font-mono text-sm">
                        <span>{code}</span>
                        <button
                          type="button"
                          onClick={() => handleCopyCode(code, idx)}
                          className="ml-2 text-muted-foreground hover:text-foreground"
                          aria-label={`Copiar código ${code}`}
                        >
                          {copiedIndex === idx ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== ABA KMS ===== */}
        <TabsContent value="kms" className="space-y-4 mt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* JWT */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Key className="h-4 w-4" /> Tokens JWT
                </CardTitle>
                <CardDescription>Rotação automática com detecção de reuso</CardDescription>
              </CardHeader>
              <CardContent>
                <PolicyRow label="Access token" value={POLICIES.jwt.accessTokenExpiry} />
                <PolicyRow label="Refresh token" value={POLICIES.jwt.refreshTokenExpiry} />
                <PolicyRow
                  label="Rotação automática"
                  value={POLICIES.jwt.rotationEnabled ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
                />
                <PolicyRow
                  label="Detecção de reuso"
                  value={POLICIES.jwt.reuseDetection ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
                />
              </CardContent>
            </Card>

            {/* KMS */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Shield className="h-4 w-4" /> Key Management System
                </CardTitle>
                <CardDescription>{POLICIES.kms.algorithm} + {POLICIES.kms.derivation}</CardDescription>
              </CardHeader>
              <CardContent>
                <PolicyRow label="Algoritmo" value={POLICIES.kms.algorithm} />
                <PolicyRow label="Derivação" value={POLICIES.kms.derivation} />
              </CardContent>
            </Card>
          </div>

          {/* Tabela de chaves */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Políticas de Rotação de Chaves</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 font-medium text-muted-foreground">Tipo</th>
                      <th className="pb-2 font-medium text-muted-foreground">Rotação</th>
                      <th className="pb-2 font-medium text-muted-foreground">Grace Period</th>
                      <th className="pb-2 font-medium text-muted-foreground">Retenção</th>
                    </tr>
                  </thead>
                  <tbody>
                    {POLICIES.kms.keyTypes.map((k) => (
                      <tr key={k.type} className="border-b border-border/50 last:border-0">
                        <td className="py-2.5 font-mono text-xs">{k.type}</td>
                        <td className="py-2.5">{k.rotation}</td>
                        <td className="py-2.5">{k.grace}</td>
                        <td className="py-2.5">{k.retention}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== ABA SESSÕES ===== */}
        <TabsContent value="sessions" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={fetchReport} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar
            </Button>
          </div>

          {/* Resumo de Login */}
          {report.loginAttempts && (
            <div className="grid gap-4 sm:grid-cols-3">
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold">{report.loginAttempts.total}</p>
                  <p className="text-xs text-muted-foreground">Total de tentativas</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-600">{report.loginAttempts.success}</p>
                  <p className="text-xs text-muted-foreground">Sucesso</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className={`text-2xl font-bold ${report.loginAttempts.failed > 0 ? 'text-red-600' : ''}`}>
                    {report.loginAttempts.failed}
                  </p>
                  <p className="text-xs text-muted-foreground">Falhas</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Sessões ativas */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Monitor className="h-4 w-4" /> Sessões Ativas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {report.activeSessions && report.activeSessions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-2 font-medium text-muted-foreground">Usuário</th>
                        <th className="pb-2 font-medium text-muted-foreground">IP</th>
                        <th className="pb-2 font-medium text-muted-foreground">Dispositivo</th>
                        <th className="pb-2 font-medium text-muted-foreground">Última atividade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.activeSessions.map((s, i) => (
                        <tr key={i} className="border-b border-border/50 last:border-0">
                          <td className="py-2.5">{s.email}</td>
                          <td className="py-2.5 font-mono text-xs">{s.ip}</td>
                          <td className="py-2.5 text-xs text-muted-foreground max-w-[200px] truncate">{s.userAgent}</td>
                          <td className="py-2.5 text-xs">{new Date(s.lastActivity).toLocaleString('pt-BR')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma sessão ativa encontrada.</p>
              )}
            </CardContent>
          </Card>

          {/* Logins com falha */}
          {report.failedLogins && report.failedLogins.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base text-red-600">
                  <AlertTriangle className="h-4 w-4" /> Tentativas com Falha (últimas 24h)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-2 font-medium text-muted-foreground">Email</th>
                        <th className="pb-2 font-medium text-muted-foreground">Tentativas</th>
                        <th className="pb-2 font-medium text-muted-foreground">Última</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.failedLogins.map((f, i) => (
                        <tr key={i} className="border-b border-border/50 last:border-0">
                          <td className="py-2.5">{f.email}</td>
                          <td className="py-2.5">
                            <Badge variant={f.count >= 5 ? 'error' : 'warning'}>{f.count}</Badge>
                          </td>
                          <td className="py-2.5 text-xs">{new Date(f.lastAttempt).toLocaleString('pt-BR')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
