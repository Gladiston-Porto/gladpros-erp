'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@gladpros/ui/badge'
import { Button } from '@gladpros/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@gladpros/ui/card';
import { Calendar, User, ExternalLink, AlertCircle } from 'lucide-react';

interface ProjectServiceOrder {
  id: number;
  ticketNumber: string;
  title: string;
  description: string | null;
  status: string;
  priority: string | null;
  scheduledDate: string | null;
  scheduleDateStart: string | null;
  total: number;
  createdAt: string;
  Cliente: { id: number; nomeCompleto: string; nomeFantasia: string | null };
  AssignedWorker: { id: number; name: string } | null;
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Rascunho',
  SCHEDULED: 'Agendado',
  IN_PROGRESS: 'Em Execução',
  COMPLETED: 'Concluído',
  AWAITING_PAYMENT: 'Aguard. Pagto',
  CLOSED: 'Fechado',
  WRITE_OFF: 'Baixa Contábil',
  CANCELED: 'Cancelado',
};

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  DRAFT: 'secondary',
  SCHEDULED: 'outline',
  IN_PROGRESS: 'default',
  COMPLETED: 'default',
  AWAITING_PAYMENT: 'outline',
  CLOSED: 'secondary',
  CANCELED: 'secondary',
};

const PRIORITY_COLOR: Record<string, string> = {
  LOW: 'text-muted-foreground',
  MEDIUM: 'text-yellow-600',
  HIGH: 'text-orange-600',
  EMERGENCY: 'text-destructive',
};

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(iso));
}

export function ProjetoJobsList({ projetoId }: { projetoId: number }) {
  const [orders, setOrders] = useState<ProjectServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProjectOrders() {
      try {
        const res = await fetch(`/api/projetos/${projetoId}/service-orders`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setError(body.message || 'Erro ao carregar ordens de serviço');
          return;
        }
        const body = await res.json();
        setOrders(body.data ?? []);
      } catch {
        setError('Erro de conexão ao carregar ordens de serviço');
      } finally {
        setLoading(false);
      }
    }
    fetchProjectOrders();
  }, [projetoId]);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-36 rounded-2xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive">
        <AlertCircle className="h-5 w-5 flex-shrink-0" />
        <span className="text-sm">{error}</span>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <Card className="border-dashed shadow-none bg-muted/50">
        <CardContent className="flex flex-col items-center justify-center p-10 text-center">
          <Calendar className="h-10 w-10 text-muted-foreground/50 mb-4" />
          <h3 className="font-semibold text-lg text-foreground">Nenhuma Ordem de Serviço</h3>
          <p className="text-sm text-muted-foreground max-w-sm mb-6">
            Este projeto ainda não possui ordens de serviço vinculadas. Crie uma OS no módulo de Service Orders e vincule-a a este projeto.
          </p>
          <Button variant="outline" asChild>
            <Link href="/service-orders/novo" aria-label="Criar nova ordem de serviço">
              <Calendar className="h-4 w-4 mr-2" />
              Criar Ordem de Serviço
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-foreground">
          Ordens de Serviço ({orders.length})
        </h3>
        <Button size="sm" variant="outline" asChild>
          <Link href="/service-orders" aria-label="Ver todas as ordens de serviço">
            <ExternalLink className="w-4 h-4 mr-2" />
            Ver Todas
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {orders.map((order) => (
          <Link
            key={order.id}
            href={`/service-orders/${order.id}`}
            className="block group"
            aria-label={`Ver ordem de serviço ${order.ticketNumber}`}
          >
            <Card className="h-full hover:shadow-md hover:border-brand-primary/30 transition-all rounded-2xl">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start gap-2">
                  <Badge variant="secondary" className="font-mono text-xs shrink-0">
                    {order.ticketNumber}
                  </Badge>
                  <Badge variant={STATUS_VARIANT[order.status] ?? 'outline'} className="text-xs">
                    {STATUS_LABELS[order.status] ?? order.status}
                  </Badge>
                </div>
                <CardTitle className="text-sm font-semibold mt-2 line-clamp-2 group-hover:text-brand-primary transition-colors">
                  {order.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {order.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{order.description}</p>
                )}

                {order.AssignedWorker && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span>{order.AssignedWorker.name}</span>
                    {order.priority && (
                      <span className={`ml-auto font-medium ${PRIORITY_COLOR[order.priority] ?? ''}`}>
                        {order.priority}
                      </span>
                    )}
                  </div>
                )}

                {(order.scheduledDate || order.scheduleDateStart) && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(order.scheduledDate ?? order.scheduleDateStart)}</span>
                  </div>
                )}

                <div className="text-xs font-medium text-foreground pt-1">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(order.total))}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

