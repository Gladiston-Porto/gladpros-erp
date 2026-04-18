'use client';

import { useEffect, useState, useCallback } from 'react';
import { ModulePageHeader } from '@gladpros/ui/module-page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@gladpros/ui/card';
import { Badge } from '@gladpros/ui/badge';
import { Button } from '@gladpros/ui/button';
import {
  Database,
  RefreshCw,
  HardDrive,
  AlertTriangle,
  Users,
  FileText,
  Receipt,
  Wrench,
  Package,
  Zap,
  FolderOpen,
  Loader2,
} from 'lucide-react';

interface BackupData {
  status: string;
  timestamp: string;
  database: { connected: boolean; provider: string };
  counts: {
    clientes: number;
    propostas: number;
    projetos: number;
    invoices: number;
    serviceOrders: number;
    materiais: number;
    events: number;
  };
  note: string;
}

const TABLE_META: Array<{ key: keyof BackupData['counts']; label: string; icon: React.ReactNode }> = [
  { key: 'clientes', label: 'Clientes', icon: <Users className="h-4 w-4" /> },
  { key: 'propostas', label: 'Propostas', icon: <FileText className="h-4 w-4" /> },
  { key: 'projetos', label: 'Projetos', icon: <FolderOpen className="h-4 w-4" /> },
  { key: 'invoices', label: 'Invoices', icon: <Receipt className="h-4 w-4" /> },
  { key: 'serviceOrders', label: 'Ordens de Serviço', icon: <Wrench className="h-4 w-4" /> },
  { key: 'materiais', label: 'Materiais', icon: <Package className="h-4 w-4" /> },
  { key: 'events', label: 'Eventos do Sistema', icon: <Zap className="h-4 w-4" /> },
];

export default function BackupPage() {
  const [data, setData] = useState<BackupData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/backup');
      if (!res.ok) {
        if (res.status === 403) throw new Error('Acesso restrito a administradores.');
        throw new Error('Erro ao buscar dados de backup.');
      }
      setData(await res.json());
    } catch (err: any) {
      setError(err.message || 'Falha na comunicação com o servidor.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalRecords = data ? Object.values(data.counts).reduce((a, b) => a + b, 0) : 0;

  return (
    <div className="flex flex-col gap-6">
      <ModulePageHeader
        title="Backup & Restore"
        description="Visão geral dos dados do banco, contagem de registros e orientações sobre backup."
        icon={<Database />}
        accentColor="#14b8a6"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Configurações', href: '/configuracoes' },
          { label: 'Backup & Restore' },
        ]}
      />

      {/* Status + Refresh */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {data && (
            <>
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
              </span>
              <span className="text-sm font-medium">
                {data.database.provider} conectado
              </span>
            </>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Loading */}
      {loading && !data && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Error */}
      {error && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          </CardContent>
        </Card>
      )}

      {data && (
        <>
          {/* Resumo */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100 text-teal-600">
                  <Database className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Banco de Dados</p>
                  <p className="text-lg font-bold">{data.database.provider}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                  <HardDrive className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total de registros</p>
                  <p className="text-lg font-bold">{totalRecords.toLocaleString('pt-BR')}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tabelas monitoradas</p>
                  <p className="text-lg font-bold">{TABLE_META.length}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contagem por tabela */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Registros por Entidade</CardTitle>
              <CardDescription>
                Snapshot em {new Date(data.timestamp).toLocaleString('pt-BR')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-border/50">
                {TABLE_META.map((t) => (
                  <div key={t.key} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        {t.icon}
                      </div>
                      <span className="text-sm font-medium">{t.label}</span>
                    </div>
                    <span className="text-sm font-bold tabular-nums">
                      {data.counts[t.key].toLocaleString('pt-BR')}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Orientações */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Como configurar backups</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-amber-50 p-3 flex items-start gap-2 text-sm text-amber-700">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <p>{data.note}</p>
              </div>

              <div className="space-y-3 text-sm text-muted-foreground">
                <div>
                  <p className="font-medium text-foreground">1. Backup via mysqldump (recomendado)</p>
                  <code className="mt-1 block rounded bg-muted px-3 py-2 font-mono text-xs">
                    mysqldump -u $DB_USER -p $DB_NAME {'>'} backup_$(date +%Y%m%d).sql
                  </code>
                </div>
                <div>
                  <p className="font-medium text-foreground">2. Agendar via cron</p>
                  <code className="mt-1 block rounded bg-muted px-3 py-2 font-mono text-xs">
                    0 3 * * * /usr/bin/mysqldump -u root -p mydb {'>'} /backups/daily_$(date +\%Y\%m\%d).sql
                  </code>
                </div>
                <div>
                  <p className="font-medium text-foreground">3. Cloud providers</p>
                  <p>Para ambientes de produção, considere serviços gerenciados como AWS RDS Automated Backups, Google Cloud SQL ou equivalente do seu provedor.</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="secondary">Retenção recomendada</Badge>
                <span className="text-sm text-muted-foreground">7 diários + 4 semanais + 3 mensais</span>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
