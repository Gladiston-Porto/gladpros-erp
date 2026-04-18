'use client';

import { useState, useCallback } from 'react';
import { ModulePageHeader } from '@gladpros/ui/module-page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@gladpros/ui/card';
import { Badge } from '@gladpros/ui/badge';
import { Button } from '@gladpros/ui/button';
import { Input } from '@gladpros/ui/input';
import { Label } from '@gladpros/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@gladpros/ui/tabs';
import {
  Mail,
  Bell,
  Send,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  Server,
} from 'lucide-react';
import { useToast } from '@/shared/hooks/use-toast';

// Verificar env vars que o backend espera (de config/index.ts)
const SMTP_VARS = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'] as const;

const EMAIL_TEMPLATES = [
  { id: 'mfa', name: 'Código MFA', description: 'Enviado ao solicitar autenticação multi-fator', status: 'active' },
  { id: 'reset', name: 'Reset de Senha', description: 'Link para redefinir senha esquecida', status: 'active' },
  { id: 'provisional', name: 'Senha Provisória', description: 'Senha temporária para novos usuários/desbloqueio', status: 'active' },
  { id: 'welcome', name: 'Boas-Vindas', description: 'Email de onboarding com credenciais iniciais', status: 'active' },
  { id: 'proposal-send', name: 'Envio de Proposta', description: 'Proposta enviada ao cliente com link de acesso', status: 'active' },
  { id: 'proposal-signed', name: 'Proposta Assinada', description: 'Notificação interna quando proposta é assinada', status: 'active' },
  { id: 'proposal-reminder', name: 'Lembrete de Proposta', description: 'Reenvio automático para propostas pendentes', status: 'active' },
];

const NOTIFICATION_EVENTS = [
  { event: 'OS Concluída', playbook: 'service-order-completed', targets: 'Criador + Técnico atribuído' },
  { event: 'Invoice Vencida', playbook: 'invoice-overdue', targets: 'Responsável + Criador + Todos ADMINs' },
  { event: 'Projeto Criado', playbook: 'project-created', targets: 'Responsável atribuído + Criador' },
  { event: 'OS Standalone Pendente', playbook: 'service-order-completed', targets: 'Criador (gerar fatura manual)' },
];

export default function EmailPage() {
  const { toast } = useToast();
  const [testEmail, setTestEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [smtpStatus, setSmtpStatus] = useState<'unknown' | 'checking' | 'ok' | 'error'>('unknown');

  const checkSmtp = useCallback(async () => {
    setSmtpStatus('checking');
    try {
      const res = await fetch('/api/monitoring/health');
      if (res.ok) {
        const data = await res.json();
        setSmtpStatus(data.services.email.status === 'healthy' ? 'ok' : 'error');
      } else {
        setSmtpStatus('error');
      }
    } catch {
      setSmtpStatus('error');
    }
  }, []);

  const sendTestEmail = async () => {
    if (!testEmail.trim()) {
      toast({ title: 'Erro', description: 'Informe um email para teste.', variant: 'destructive' });
      return;
    }
    setSending(true);
    try {
      const res = await fetch('/api/webhooks/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: `mailto:${testEmail}`, event: 'test.email' }),
      });
      if (res.ok) {
        toast({ title: 'Enviado', description: `Email de teste enviado para ${testEmail} (simulação).` });
      } else {
        throw new Error('Falha no envio');
      }
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message || 'Falha ao enviar.', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <ModulePageHeader
        title="Email & Notificações"
        description="Configurações de SMTP, templates de email e regras de notificação automática."
        icon={<Mail />}
        accentColor="#f59e0b"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Configurações', href: '/configuracoes' },
          { label: 'Email & Notificações' },
        ]}
      />

      <Tabs defaultValue="smtp" className="w-full">
        <TabsList>
          <TabsTrigger value="smtp">SMTP</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="notifications">Notificações Automáticas</TabsTrigger>
        </TabsList>

        {/* ===== ABA SMTP ===== */}
        <TabsContent value="smtp" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Server className="h-4 w-4" /> Configuração SMTP
                  </CardTitle>
                  <CardDescription>Variáveis de ambiente para envio de email (configuradas no .env)</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={checkSmtp} disabled={smtpStatus === 'checking'}>
                  {smtpStatus === 'checking' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                  Testar Conexão
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {smtpStatus === 'ok' && (
                <div className="mb-4 rounded-lg bg-emerald-50 p-3 flex items-center gap-2 text-sm text-emerald-700">
                  <CheckCircle className="h-4 w-4" /> Configuração SMTP válida
                </div>
              )}
              {smtpStatus === 'error' && (
                <div className="mb-4 rounded-lg bg-red-50 p-3 flex items-center gap-2 text-sm text-red-700">
                  <XCircle className="h-4 w-4" /> Configuração SMTP incompleta ou inválida
                </div>
              )}

              <div className="space-y-3">
                {SMTP_VARS.map((v) => (
                  <div key={v} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <span className="font-mono text-sm">{v}</span>
                    <Badge variant="secondary">env</Badge>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-lg bg-amber-50 p-3 flex items-start gap-2 text-sm text-amber-700">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <p>As credenciais SMTP são configuradas via variáveis de ambiente no servidor. Alterações devem ser feitas no <code className="font-mono text-xs bg-amber-100 px-1 rounded">.env</code> e requerem restart.</p>
              </div>
            </CardContent>
          </Card>

          {/* Teste de envio */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Send className="h-4 w-4" /> Enviar Email de Teste
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <div className="flex-1">
                  <Label htmlFor="testEmail" className="sr-only">Email</Label>
                  <Input
                    id="testEmail"
                    type="email"
                    placeholder="email@exemplo.com"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                  />
                </div>
                <Button onClick={sendTestEmail} disabled={sending}>
                  {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Enviar
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== ABA TEMPLATES ===== */}
        <TabsContent value="templates" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Templates de Email</CardTitle>
              <CardDescription>Templates branded pré-configurados no código-fonte</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-border/50">
                {EMAIL_TEMPLATES.map((t) => (
                  <div key={t.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.description}</p>
                    </div>
                    <Badge variant="success">Ativo</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== ABA NOTIFICAÇÕES ===== */}
        <TabsContent value="notifications" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Bell className="h-4 w-4" /> Notificações Automáticas (Playbooks)
                </CardTitle>
                <CardDescription>Eventos que disparam notificações in-app automaticamente</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 font-medium text-muted-foreground">Evento</th>
                      <th className="pb-2 font-medium text-muted-foreground">Playbook</th>
                      <th className="pb-2 font-medium text-muted-foreground">Destinatários</th>
                      <th className="pb-2 font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {NOTIFICATION_EVENTS.map((n) => (
                      <tr key={n.event} className="border-b border-border/50 last:border-0">
                        <td className="py-2.5 font-medium">{n.event}</td>
                        <td className="py-2.5 font-mono text-xs text-muted-foreground">{n.playbook}</td>
                        <td className="py-2.5 text-xs">{n.targets}</td>
                        <td className="py-2.5"><Badge variant="success">Ativo</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <Bell className="h-4 w-4 mt-0.5 shrink-0" />
                <p>As notificações são armazenadas em cache (Redis/memória) com TTL de 30 dias e polling de 30s no frontend. Para persistência permanente, será necessário migrar para tabela dedicada no banco.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
