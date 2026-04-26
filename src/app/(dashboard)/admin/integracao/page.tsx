'use client';

import { useEffect, useState, useCallback } from 'react';
import { Badge } from '@gladpros/ui/badge';
import { Button } from '@gladpros/ui/button';
import { Card, CardContent } from '@gladpros/ui/card';
import { ModulePageHeader } from '@gladpros/ui/module-page-header';
import { AdvancedPagination } from '@gladpros/ui/advanced-pagination';
import { authenticatedFetch } from '@/lib/api/client';
import {
  RefreshCw,
  Wifi,
  WifiOff,
  Database,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Filter,
  ClipboardList,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────

interface GatewayInfo {
  name: string;
  connected: boolean;
  error?: string;
}

interface GatewayStatus {
  mode: 'mock' | 'prisma';
  gateways: {
    finance: GatewayInfo;
    inventory: GatewayInfo;
    triage: GatewayInfo;
  };
}

interface TriagemItem {
  id: number;
  projetoId: number;
  tipo: string;
  status: string;
  prioridade: string;
  motivo: string;
  resultado: string | null;
  observacoes: string | null;
  acoesCorretivas: string[] | null;
  prazoEstimado: string | null;
  aberturaEm: string;
  conclusaoEm: string | null;
  projeto: { numeroProjeto: string; titulo: string };
  solicitante: { nomeCompleto: string | null; email: string };
  responsavel: { nomeCompleto: string | null; email: string } | null;
}

interface TriagemStats {
  total: number;
  pendentes: number;
  emAndamento: number;
  concluidas: number;
  canceladas: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ─── Constants ──────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  PENDENTE: 'bg-yellow-100 text-yellow-800',
  EM_ANDAMENTO: 'bg-blue-100 text-blue-800',
  CONCLUIDA: 'bg-green-100 text-green-800',
  CANCELADA: 'bg-muted text-muted-foreground',
};

const PRIORIDADE_COLORS: Record<string, string> = {
  BAIXA: 'bg-slate-100 text-slate-600',
  MEDIA: 'bg-blue-100 text-blue-700',
  ALTA: 'bg-orange-100 text-orange-700',
  URGENTE: 'bg-red-100 text-red-800',
};

const TIPO_LABELS: Record<string, string> = {
  MATERIAL: 'Material',
  EQUIPAMENTO: 'Equipamento',
  FERRAMENTA: 'Ferramenta',
  INSPECAO: 'Inspeção',
};

// ─── Component ──────────────────────────────────────────────────────

export default function IntegracaoPage() {
  // Gateway status
  const [gatewayStatus, setGatewayStatus] = useState<GatewayStatus | null>(null);
  const [gatewayLoading, setGatewayLoading] = useState(true);

  // Triagens
  const [triagens, setTriagens] = useState<TriagemItem[]>([]);
  const [stats, setStats] = useState<TriagemStats>({ total: 0, pendentes: 0, emAndamento: 0, concluidas: 0, canceladas: 0 });
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [triagemLoading, setTriagemLoading] = useState(true);
  const [filterTipo, setFilterTipo] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // ── Fetch gateways ──
  const fetchGatewayStatus = useCallback(async () => {
    setGatewayLoading(true);
    try {
      const res = await authenticatedFetch('/api/admin/gateways/status');
      if (res.ok) {
        const data = await res.json();
        setGatewayStatus(data);
      }
    } finally {
      setGatewayLoading(false);
    }
  }, []);

  // ── Fetch triagens ──
  const fetchTriagens = useCallback(async (page = 1) => {
    setTriagemLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (filterTipo) params.set('tipo', filterTipo);
      if (filterStatus) params.set('status', filterStatus);
      const res = await authenticatedFetch(`/api/admin/triagens?${params}`);
      if (res.ok) {
        const data = await res.json();
        setTriagens(data.data);
        setStats(data.stats);
        setPagination(data.pagination);
      }
    } finally {
      setTriagemLoading(false);
    }
  }, [filterTipo, filterStatus]);

  useEffect(() => { fetchGatewayStatus(); }, [fetchGatewayStatus]);
  useEffect(() => { fetchTriagens(1); }, [fetchTriagens]);

  // ── Render ──
  return (
    <div className="space-y-6">
      <ModulePageHeader
        title="Integração & Gateways"
        description="Status de conectividade e triagens do sistema"
        icon={<Database />}
        accentColor="#0098DA"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Admin" },
          { label: "Integração" },
        ]}
      />

      {/* ── Gateway Status Cards ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Database className="h-5 w-5" /> Gateways
          </h2>
          <div className="flex items-center gap-2">
            {gatewayStatus && (
              <Badge className={gatewayStatus.mode === 'prisma' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}>
                Modo: {gatewayStatus.mode.toUpperCase()}
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={fetchGatewayStatus} disabled={gatewayLoading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${gatewayLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {gatewayStatus ? (
            Object.entries(gatewayStatus.gateways).map(([key, gw]) => (
              <Card key={key}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{gw.name}</span>
                    {gw.connected ? (
                      <Wifi className="h-5 w-5 text-green-500" />
                    ) : (
                      <WifiOff className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${gw.connected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {gw.connected ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      {gw.connected ? 'Conectado' : 'Desconectado'}
                    </span>
                  </div>
                  {gw.error && (
                    <p className="text-xs text-red-600 mt-2 break-all">{gw.error}</p>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="h-12 animate-pulse bg-muted rounded" />
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* ── Triagem Stats ── */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <ClipboardList className="h-5 w-5" /> Triagens
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.pendentes}</div>
              <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <Clock className="h-3 w-3" /> Pendentes
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.emAndamento}</div>
              <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <RefreshCw className="h-3 w-3" /> Em Andamento
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.concluidas}</div>
              <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Concluídas
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-muted-foreground">{stats.canceladas}</div>
              <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <XCircle className="h-3 w-3" /> Canceladas
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Filters ── */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              className="border rounded px-3 py-1.5 text-sm"
              title="Filtrar por tipo"
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value)}
            >
              <option value="">Todos os tipos</option>
              <option value="MATERIAL">Material</option>
              <option value="EQUIPAMENTO">Equipamento</option>
              <option value="FERRAMENTA">Ferramenta</option>
              <option value="INSPECAO">Inspeção</option>
            </select>
            <select
              className="border rounded px-3 py-1.5 text-sm"
              title="Filtrar por status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">Todos os status</option>
              <option value="PENDENTE">Pendente</option>
              <option value="EM_ANDAMENTO">Em Andamento</option>
              <option value="CONCLUIDA">Concluída</option>
              <option value="CANCELADA">Cancelada</option>
            </select>
            <Button variant="outline" size="sm" onClick={() => fetchTriagens(1)} disabled={triagemLoading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${triagemLoading ? 'animate-spin' : ''}`} />
              Buscar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Triagens Table ── */}
      <Card>
        <CardContent className="p-0">
          {triagemLoading && triagens.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">Carregando triagens...</div>
          ) : triagens.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              Nenhuma triagem encontrada
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">ID</th>
                    <th className="text-left p-3 font-medium">Projeto</th>
                    <th className="text-left p-3 font-medium">Tipo</th>
                    <th className="text-left p-3 font-medium">Prioridade</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">Motivo</th>
                    <th className="text-left p-3 font-medium">Solicitante</th>
                    <th className="text-left p-3 font-medium">Abertura</th>
                    <th className="text-left p-3 font-medium">Prazo</th>
                  </tr>
                </thead>
                <tbody>
                  {triagens.map((t) => (
                    <tr key={t.id} className="border-t hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-mono text-xs">#{t.id}</td>
                      <td className="p-3">
                        <div className="font-medium text-xs">{t.projeto.numeroProjeto}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">{t.projeto.titulo}</div>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-xs">{TIPO_LABELS[t.tipo] || t.tipo}</Badge>
                      </td>
                      <td className="p-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${PRIORIDADE_COLORS[t.prioridade] || ''}`}>
                          {t.prioridade}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[t.status] || ''}`}>
                          {t.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-3 text-xs max-w-[200px] truncate">{t.motivo}</td>
                      <td className="p-3 text-xs">{t.solicitante.nomeCompleto || t.solicitante.email}</td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {new Date(t.aberturaEm).toLocaleDateString('en-US', { timeZone: 'America/Chicago' })}
                      </td>
                      <td className="p-3 text-xs">
                        {t.prazoEstimado ? (
                          <span className={new Date(t.prazoEstimado) < new Date() && t.status !== 'CONCLUIDA' && t.status !== 'CANCELADA' ? 'text-red-600 font-medium' : 'text-muted-foreground'}>
                            {new Date(t.prazoEstimado).toLocaleDateString('en-US', { timeZone: 'America/Chicago' })}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {pagination.totalPages > 1 && (
            <div className="p-4 border-t">
              <AdvancedPagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                totalItems={pagination.total}
                pageSize={pagination.limit}
                onPageChange={(p) => fetchTriagens(p)}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
