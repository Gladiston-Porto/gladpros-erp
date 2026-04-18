'use client';

import { useState, useEffect } from 'react';
import { formatDistanceToNow, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Laptop, Smartphone, Globe, Trash2, ShieldAlert } from 'lucide-react';
import { Badge } from "@gladpros/ui/badge"
import { Button } from "@gladpros/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@gladpros/ui/card"
import { useToast } from "@gladpros/ui/toast";
import { authenticatedFetch } from "@/lib/api/client";

interface Session {
  id: number;
  ip: string;
  userAgent: string | null;
  criadoEm: string;
  ultimoUsoEm: string;
  ativo: boolean;
  isCurrent?: boolean; // Flag para identificar sessão atual (se implementado no backend)
}

interface SessionsListProps {
  userId: string;
}

export function SessionsList({ userId }: SessionsListProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const { success, error } = useToast();

  const fetchSessions = async () => {
    try {
      const res = await authenticatedFetch(`/api/usuarios/${userId}/sessions`);
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      } else if (res.status !== 401) {
        error('Não foi possível carregar as sessões.');
      }
    } catch (err) {
      console.error('Erro ao buscar sessões:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchSessions();
    }
  }, [userId]);

  const handleRevokeSession = async (sessionId: number) => {
    try {
      const res = await authenticatedFetch(`/api/usuarios/sessions/${sessionId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        success('Sessão revogada com sucesso.');
        fetchSessions();
      } else {
        throw new Error('Falha ao revogar');
      }
    } catch (err) {
      error('Não foi possível revogar a sessão.');
    }
  };

  const handleRevokeAll = async () => {
    if (!confirm('Tem certeza? Isso desconectará você de todos os dispositivos.')) return;

    try {
      const res = await authenticatedFetch(`/api/usuarios/${userId}/sessions`, {
        method: 'DELETE'
      });

      if (res.ok) {
        success('Todas as sessões foram encerradas.');
        fetchSessions();
      } else {
        error('Erro ao revogar sessões.');
      }
    } catch (err) {
      error('Erro ao revogar sessões.');
    }
  };

  const getDeviceIcon = (ua: string | null) => {
    if (!ua) return <Globe className="h-5 w-5 text-muted-foreground" />;
    if (/mobile|android|iphone/i.test(ua)) return <Smartphone className="h-5 w-5 text-primary" />;
    return <Laptop className="h-5 w-5 text-purple-500" />;
  };

  const getBrowserName = (ua: string | null) => {
    if (!ua) return 'Desconhecido';
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    return 'Navegador Web';
  };

  if (loading) return <div className="p-4 text-center">Carregando sessões...</div>;

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-indigo-600" />
              Sessões Ativas
            </CardTitle>
            <CardDescription>Gerencie os dispositivos conectados à sua conta.</CardDescription>
          </div>
          {sessions.length > 1 && (
            <Button variant="destructive" size="sm" onClick={handleRevokeAll}>
              Desconectar Todos
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">Nenhuma sessão ativa encontrada.</p>
        ) : (
          <div className="space-y-4">
            {sessions.map((session) => {
              const lastUse = session.ultimoUsoEm ? new Date(session.ultimoUsoEm) : null;
              const lastUseLabel = lastUse && isValid(lastUse)
                ? formatDistanceToNow(lastUse, { addSuffix: true, locale: ptBR })
                : 'Data indisponível';
              return (
                <div key={session.id} className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/40 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-muted rounded-full">
                      {getDeviceIcon(session.userAgent)}
                    </div>
                    <div>
                      <p className="font-medium text-sm text-foreground">
                        {getBrowserName(session.userAgent)}
                        {session.isCurrent && <Badge variant="secondary" className="ml-2 text-xs">Atual</Badge>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        IP: {session.ip} • Último uso: {lastUseLabel}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => handleRevokeSession(session.id)}
                    title="Revogar acesso"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
