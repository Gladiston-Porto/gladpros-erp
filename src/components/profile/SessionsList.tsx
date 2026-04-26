'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatDistanceToNow, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Laptop, Smartphone, Globe, Trash2, ShieldAlert, LogOut } from 'lucide-react';
import { Badge } from "@gladpros/ui/badge";
import { Button } from "@gladpros/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@gladpros/ui/card";
import { useToast } from "@gladpros/ui/toast";
import { authenticatedFetch } from "@/lib/api/client";

interface Session {
  id: number;
  ip: string;
  userAgent: string | null;
  cidade: string | null;
  pais: string | null;
  criadoEm: string;
  ultimaAtividade: string;
  isCurrent: boolean;
}

export function SessionsList() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<number | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);
  const { success, error } = useToast();

  const fetchSessions = useCallback(async () => {
    try {
      const res = await authenticatedFetch('/api/auth/me/sessions');
      if (res.ok) {
        const data = await res.json();
        setSessions(data.data ?? []);
      }
    } catch {
      // silently fail — lista permanece vazia, usuário vê estado vazio
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleRevokeSession = async (sessionId: number) => {
    setRevoking(sessionId);
    try {
      const res = await authenticatedFetch(`/api/auth/me/sessions/${sessionId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        success('Sessão encerrada', 'O dispositivo foi desconectado com sucesso');
        await fetchSessions();
      } else {
        const data = await res.json().catch(() => ({}));
        error('Erro', (data as { message?: string }).message ?? 'Não foi possível encerrar a sessão');
      }
    } catch {
      error('Erro', 'Não foi possível encerrar a sessão');
    } finally {
      setRevoking(null);
    }
  };

  const handleRevokeOthers = async () => {
    setRevokingAll(true);
    try {
      const res = await authenticatedFetch('/api/auth/me/sessions', { method: 'POST' });
      if (res.ok) {
        success('Sessões encerradas', 'Todos os outros dispositivos foram desconectados');
        await fetchSessions();
      } else {
        error('Erro', 'Não foi possível encerrar as outras sessões');
      }
    } catch {
      error('Erro', 'Não foi possível encerrar as outras sessões');
    } finally {
      setRevokingAll(false);
    }
  };

  const getDeviceIcon = (ua: string | null) => {
    if (!ua) return <Globe className="h-5 w-5 text-muted-foreground" />;
    if (/mobile|android|iphone/i.test(ua)) return <Smartphone className="h-5 w-5 text-sky-500" />;
    return <Laptop className="h-5 w-5 text-purple-500" />;
  };

  const getBrowserName = (ua: string | null) => {
    if (!ua) return 'Desconhecido';
    if (ua.includes('Chrome') && !ua.includes('Edge')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    return 'Navegador Web';
  };

  const formatRelative = (iso: string) => {
    const d = new Date(iso);
    return isValid(d) ? formatDistanceToNow(d, { addSuffix: true, locale: ptBR }) : '—';
  };

  const otherSessions = sessions.filter((s) => !s.isCurrent);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldAlert className="h-4 w-4" />
            Sessões Ativas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="h-4 w-4" />
              Sessões Ativas
            </CardTitle>
            <CardDescription className="mt-1">
              Dispositivos conectados à sua conta. Encerre sessões desconhecidas.
            </CardDescription>
          </div>
          {otherSessions.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRevokeOthers}
              disabled={revokingAll}
              className="text-destructive border-destructive/40 hover:bg-destructive/10"
            >
              <LogOut className="h-3.5 w-3.5 mr-1.5" />
              {revokingAll ? 'Encerrando...' : 'Encerrar outras'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma sessão ativa encontrada.
          </p>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-3 border border-border rounded-xl hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                    {getDeviceIcon(session.userAgent)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">
                        {getBrowserName(session.userAgent)}
                      </p>
                      {session.isCurrent && (
                        <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">
                          Sessão atual
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {session.ip !== '—' && `${session.ip} • `}
                      {session.cidade ? `${session.cidade}${session.pais ? `, ${session.pais}` : ''} • ` : ''}
                      Último uso: {formatRelative(session.ultimaAtividade)}
                    </p>
                  </div>
                </div>
                {!session.isCurrent && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => handleRevokeSession(session.id)}
                    disabled={revoking === session.id}
                    aria-label="Encerrar sessão"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
