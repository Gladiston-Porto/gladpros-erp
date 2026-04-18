'use client';

import { useEffect, useState, useCallback } from 'react';
import { Badge } from '@gladpros/ui/badge';
import { Button } from '@gladpros/ui/button';
import { Card, CardContent } from '@gladpros/ui/card';
import { ModulePageHeader } from '@gladpros/ui/module-page-header';
import { AdvancedPagination } from '@gladpros/ui/advanced-pagination';
import { authenticatedFetch } from '@/lib/api/client';
import { RefreshCw, Filter, Activity, CheckCircle2, XCircle, Clock, Rss } from 'lucide-react';

interface DomainEventItem {
  id: string;
  name: string;
  aggregateType: string;
  aggregateId: string;
  correlationId: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any;
  status: string;
  error: string | null;
  occurredAt: string;
  processedAt: string | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const STATUS_COLORS: Record<string, string> = {
  PROCESSED: 'bg-green-100 text-green-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  FAILED: 'bg-red-100 text-red-800',
};

const STATUS_ICONS: Record<string, typeof CheckCircle2> = {
  PROCESSED: CheckCircle2,
  PENDING: Clock,
  FAILED: XCircle,
};

export default function EventosPage() {
  const [events, setEvents] = useState<DomainEventItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [filterName, setFilterName] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchEvents = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (filterName) params.set('name', filterName);
      if (filterStatus) params.set('status', filterStatus);

      const res = await authenticatedFetch(`/api/admin/events?${params}`);
      if (res.ok) {
        const json = await res.json();
        setEvents(json.data);
        setPagination(json.pagination);
      }
    } catch (err) {
      console.error('Failed to fetch events:', err);
    } finally {
      setLoading(false);
    }
  }, [filterName, filterStatus]);

  useEffect(() => {
    fetchEvents(1);
  }, [fetchEvents]);

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      <ModulePageHeader
        title="Eventos do Sistema"
        description="Monitoramento de eventos de domínio em tempo real"
        icon={<Rss />}
        accentColor="#0098DA"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Sistema' },
          { label: 'Eventos' },
        ]}
      />

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Activity className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">{pagination.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-sm text-muted-foreground">Processados</p>
              <p className="text-2xl font-bold text-green-600">
                {events.filter((e) => e.status === 'PROCESSED').length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-8 w-8 text-yellow-500" />
            <div>
              <p className="text-sm text-muted-foreground">Pendentes</p>
              <p className="text-2xl font-bold text-yellow-600">
                {events.filter((e) => e.status === 'PENDING').length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <XCircle className="h-8 w-8 text-red-500" />
            <div>
              <p className="text-sm text-muted-foreground">Falhas</p>
              <p className="text-2xl font-bold text-red-600">
                {events.filter((e) => e.status === 'FAILED').length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            title="Filtrar por evento"
            value={filterName}
            onChange={(e) => setFilterName(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm"
          >
            <option value="">Todos os eventos</option>
            <option value="proposal.approved">proposal.approved</option>
            <option value="project.created">project.created</option>
            <option value="project.closingRequested">project.closingRequested</option>
            <option value="invoice.overdue">invoice.overdue</option>
            <option value="serviceOrder.completed">serviceOrder.completed</option>
          </select>
        </div>
        <select
          title="Filtrar por status"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border rounded-md px-3 py-2 text-sm"
        >
          <option value="">Todos os status</option>
          <option value="PROCESSED">Processado</option>
          <option value="PENDING">Pendente</option>
          <option value="FAILED">Falha</option>
        </select>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchEvents(pagination.page)}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Events table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-medium">Evento</th>
                  <th className="text-left p-3 font-medium">Agregado</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Data</th>
                  <th className="text-left p-3 font-medium">Duração</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading && events.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      Carregando eventos...
                    </td>
                  </tr>
                ) : events.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      Nenhum evento encontrado
                    </td>
                  </tr>
                ) : (
                  events.map((event) => {
                    const StatusIcon = STATUS_ICONS[event.status] || Clock;
                    const isExpanded = expandedId === event.id;
                    const duration = event.processedAt
                      ? `${new Date(event.processedAt).getTime() - new Date(event.occurredAt).getTime()}ms`
                      : '—';

                    return (
                      <tr key={event.id} className="group">
                        <td colSpan={5} className="p-0">
                          <div
                            className="flex items-center p-3 cursor-pointer hover:bg-muted/30 transition-colors"
                            onClick={() => setExpandedId(isExpanded ? null : event.id)}
                          >
                            <div className="flex-1">
                              <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                                {event.name}
                              </code>
                            </div>
                            <div className="flex-1 text-muted-foreground">
                              {event.aggregateType}:{event.aggregateId}
                            </div>
                            <div className="flex-1">
                              <Badge className={`${STATUS_COLORS[event.status] || ''} inline-flex items-center gap-1`}>
                                <StatusIcon className="h-3 w-3" />
                                {event.status}
                              </Badge>
                            </div>
                            <div className="flex-1 text-muted-foreground text-xs">
                              {formatDate(event.occurredAt)}
                            </div>
                            <div className="w-20 text-right text-xs text-muted-foreground">
                              {duration}
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="px-3 pb-3 space-y-2 bg-muted/10 border-t">
                              <div className="grid grid-cols-2 gap-4 text-xs pt-2">
                                <div>
                                  <span className="text-muted-foreground">ID:</span>{' '}
                                  <code className="font-mono">{event.id}</code>
                                </div>
                                {event.correlationId && (
                                  <div>
                                    <span className="text-muted-foreground">Correlation:</span>{' '}
                                    <code className="font-mono">{event.correlationId}</code>
                                  </div>
                                )}
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Payload:</p>
                                <pre className="text-xs bg-muted p-2 rounded overflow-x-auto max-h-40">
                                  {JSON.stringify(event.payload, null, 2)}
                                </pre>
                              </div>
                              {event.error && (
                                <div>
                                  <p className="text-xs text-red-600 font-medium mb-1">Erro:</p>
                                  <pre className="text-xs bg-red-50 text-red-800 p-2 rounded">
                                    {event.error}
                                  </pre>
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {pagination.totalPages > 1 && (
        <AdvancedPagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          totalItems={pagination.total}
          pageSize={pagination.limit}
          onPageChange={(p) => fetchEvents(p)}
        />
      )}
    </div>
  );
}
