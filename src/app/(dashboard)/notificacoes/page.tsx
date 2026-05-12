'use client';

import { useEffect, useState } from 'react';
import {
  Bell,
  CheckCheck,
  AlertCircle,
  CheckCircle,
  XCircle,
  Info,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { Badge } from '@gladpros/ui/badge'
import { Button } from '@gladpros/ui/button'
import { Card, CardContent } from '@gladpros/ui/card';

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'approval_request' | 'approval_status' | 'approval_rejected';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  data?: Record<string, unknown>;
}

const TYPE_CONFIG = {
  info:               { icon: <Info className="h-4 w-4" />,          color: 'text-blue-500',   bg: 'bg-blue-50' },
  success:            { icon: <CheckCircle className="h-4 w-4" />,   color: 'text-emerald-500', bg: 'bg-emerald-50' },
  warning:            { icon: <AlertCircle className="h-4 w-4" />,   color: 'text-amber-500',   bg: 'bg-amber-50' },
  error:              { icon: <XCircle className="h-4 w-4" />,       color: 'text-red-500',     bg: 'bg-red-50' },
  approval_request:   { icon: <AlertCircle className="h-4 w-4" />,  color: 'text-blue-500',    bg: 'bg-blue-50' },
  approval_status:    { icon: <CheckCircle className="h-4 w-4" />,  color: 'text-emerald-500', bg: 'bg-emerald-50' },
  approval_rejected:  { icon: <XCircle className="h-4 w-4" />,      color: 'text-red-500',     bg: 'bg-red-50' },
};

function timeAgo(dateString: string): string {
  const diff = (Date.now() - new Date(dateString).getTime()) / 1000;
  if (diff < 60)   return 'agora';
  if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
  return new Date(dateString).toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
}

type FilterType = 'todas' | 'nao-lidas' | 'info' | 'success' | 'warning' | 'error';

export default function NotificacoesPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('todas');
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = async (unreadOnly = false) => {
    setLoading(true);
    try {
      const url = `/api/notifications?limit=50${unreadOnly ? '&unread_only=true' : ''}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Erro ao carregar notificações');
      const result = await res.json();
      setNotifications(result.notifications ?? []);
      setUnreadCount(result.unreadCount ?? 0);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadNotifications(); }, []);

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: true }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {}
  };

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {}
  };

  const deleteNotification = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch {}
  };

  const filtered = notifications.filter((n) => {
    if (filter === 'nao-lidas') return !n.read;
    if (filter !== 'todas')     return n.type === filter || n.type.startsWith(filter);
    return true;
  });

  const FILTERS: { key: FilterType; label: string }[] = [
    { key: 'todas',     label: 'Todas' },
    { key: 'nao-lidas', label: `Não lidas${unreadCount > 0 ? ` (${unreadCount})` : ''}` },
    { key: 'info',      label: 'Info' },
    { key: 'success',   label: 'Sucesso' },
    { key: 'warning',   label: 'Alertas' },
    { key: 'error',     label: 'Erros' },
  ];

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="rounded-3xl border border-white/30 bg-linear-to-r from-[#6366F1] to-[#8B5CF6] p-6 text-white shadow-2xl">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.5em] text-white/70">CENTRAL</p>
            <h2 className="text-2xl font-semibold">Notificações</h2>
            <p className="text-sm text-white/80">Acompanhe todos os eventos e alertas do sistema</p>
          </div>
          <Badge className="bg-white/20 text-white">
            {unreadCount > 0 ? `${unreadCount} não lidas` : 'Em dia'}
          </Badge>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {[
            { label: 'Total',     value: notifications.length },
            { label: 'Não lidas', value: unreadCount },
            { label: 'Lidas',     value: notifications.length - unreadCount },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl bg-white/10 p-3 text-center backdrop-blur-sm">
              <p className="text-xl font-bold">{stat.value}</p>
              <p className="text-xs text-white/70">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filter === f.key
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button type="button" variant="outline" size="sm" onClick={markAllAsRead}>
              <CheckCheck className="mr-1.5 h-3.5 w-3.5" />
              Marcar todas como lidas
            </Button>
          )}
          <Button type="button" variant="outline" size="sm" onClick={() => loadNotifications()}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex min-h-[200px] items-center justify-center">
          <div className="text-center">
            <Bell className="mx-auto mb-2 h-8 w-8 animate-pulse text-primary" />
            <p className="text-sm text-muted-foreground">Carregando notificações...</p>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-border shadow-sm">
          <CardContent className="flex min-h-[200px] flex-col items-center justify-center gap-3">
            <Bell className="h-12 w-12 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Nenhuma notificação encontrada</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((notification) => {
            const cfg = TYPE_CONFIG[notification.type] ?? TYPE_CONFIG.info;
            return (
              <div
                key={notification.id}
                className={`group flex items-start gap-4 rounded-xl border p-4 transition-all ${
                  notification.read
                    ? 'border-border bg-card'
                    : 'border-primary/20 bg-primary/5 shadow-sm'
                }`}
              >
                {/* Ícone */}
                <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${cfg.bg} ${cfg.color}`}>
                  {cfg.icon}
                </div>

                {/* Conteúdo */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-medium ${notification.read ? 'text-foreground/80' : 'text-foreground'}`}>
                      {notification.title}
                    </p>
                    <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(notification.createdAt)}</span>
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">{notification.message}</p>
                </div>

                {/* Ações */}
                <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  {!notification.read && (
                    <button
                      type="button"
                      onClick={() => markAsRead(notification.id)}
                      title="Marcar como lida"
                      className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-primary"
                    >
                      <CheckCheck className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => deleteNotification(notification.id)}
                    title="Excluir"
                      className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Indicador não lida */}
                {!notification.read && (
                  <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
