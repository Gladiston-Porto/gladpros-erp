'use client';

import { useRouter } from 'next/navigation';
import {
  Settings,
  Users,
  Bell,
  Shield,
  Database,
  Mail,
  Webhook,
  ChevronRight,
  Building,
  Sliders,
  FileText,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent } from '@gladpros/ui/card';

interface ConfigSection {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  badge?: string;
  color: string;
}

const SECTIONS: ConfigSection[] = [
  {
    id: 'geral',
    title: 'Geral',
    description: 'Nome da empresa, fuso horário, formato de data e moeda',
    icon: <Building className="h-5 w-5" />,
    href: '/configuracoes/geral',
    color: 'bg-blue-100 text-blue-600',
  },
  {
    id: 'usuarios',
    title: 'Usuários & Permissões',
    description: 'Gerencie usuários, papéis e matriz de permissões RBAC',
    icon: <Users className="h-5 w-5" />,
    href: '/usuarios',
    color: 'bg-indigo-100 text-indigo-600',
  },
  {
    id: 'seguranca',
    title: 'Segurança',
    description: 'Políticas de senha, MFA, KMS, sessões ativas e bloqueio de IPs',
    icon: <Shield className="h-5 w-5" />,
    href: '/configuracoes/seguranca',
    color: 'bg-red-100 text-red-600',
  },
  {
    id: 'email',
    title: 'Email & Notificações',
    description: 'Configurações de SMTP, templates de email e alertas automáticos',
    icon: <Mail className="h-5 w-5" />,
    href: '/configuracoes/email',
    color: 'bg-amber-100 text-amber-600',
  },
  {
    id: 'notificacoes',
    title: 'Central de Notificações',
    description: 'Visualize e gerencie todas as notificações do sistema',
    icon: <Bell className="h-5 w-5" />,
    href: '/notificacoes',
    color: 'bg-purple-100 text-purple-600',
  },
  {
    id: 'aprovacoes',
    title: 'Regras de Aprovação',
    description: 'Configure fluxos automáticos de aprovação por valor e departamento',
    icon: <Sliders className="h-5 w-5" />,
    href: '/aprovacoes/regras',
    color: 'bg-emerald-100 text-emerald-600',
  },
  {
    id: 'webhooks',
    title: 'Webhooks',
    description: 'Integre com sistemas externos via webhooks de eventos do sistema',
    icon: <Webhook className="h-5 w-5" />,
    href: '/admin/integracao',
    color: 'bg-orange-100 text-orange-600',
  },
  {
    id: 'backup',
    title: 'Backup & Restore',
    description: 'Faça backup dos dados e restaure versões anteriores',
    icon: <Database className="h-5 w-5" />,
    href: '/configuracoes/backup',
    color: 'bg-teal-100 text-teal-600',
  },
  {
    id: 'logs',
    title: 'Logs do Sistema',
    description: 'Auditoria de ações, eventos críticos e histórico de acessos',
    icon: <FileText className="h-5 w-5" />,
    href: '/admin/eventos',
    color: 'bg-slate-100 text-slate-600',
  },
  {
    id: 'categorias',
    title: 'Categorias',
    description: 'Categorias de estoque, despesas e receitas',
    icon: <Settings className="h-5 w-5" />,
    href: '/configuracoes/categorias',
    color: 'bg-pink-100 text-pink-600',
  },
  {
    id: 'health',
    title: 'Saúde do Sistema',
    description: 'Status em tempo real do banco de dados, Redis e serviços',
    icon: <RefreshCw className="h-5 w-5" />,
    href: '/configuracoes/health',
    color: 'bg-cyan-100 text-cyan-600',
  },
];

export default function ConfiguracoesPage() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="rounded-3xl border border-white/30 bg-gradient-to-r from-[#374151] to-[#1F2937] p-6 text-white shadow-2xl">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.5em] text-white/70">SISTEMA</p>
            <h2 className="text-2xl font-semibold">Configurações</h2>
            <p className="text-sm text-white/80">Gerencie todas as preferências e integrações do GladPros</p>
          </div>
          <Settings className="h-10 w-10 text-white/20" />
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {[
            { label: 'Módulos',      value: SECTIONS.length },
            { label: 'Segurança',    value: 'AES-256' },
            { label: 'Versão',       value: 'v2.0' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl bg-white/10 p-3 text-center backdrop-blur-sm">
              <p className="text-xl font-bold">{stat.value}</p>
              <p className="text-xs text-white/70">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Grid de seções */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() => router.push(section.href)}
            className="group text-left"
          >
            <Card className="h-full cursor-pointer border-border shadow-sm transition-all hover:border-primary/30 hover:shadow-md">
              <CardContent className="flex items-start gap-4 p-4">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${section.color}`}>
                  {section.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{section.title}</p>
                    {section.badge && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        {section.badge}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{section.description}</p>
                </div>
                <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
              </CardContent>
            </Card>
          </button>
        ))}
      </div>
    </div>
  );
}
