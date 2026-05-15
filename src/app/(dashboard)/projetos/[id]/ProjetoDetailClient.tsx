'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  Edit,
  FolderOpen,
  MapPin,
  PauseCircle,
  PlayCircle,
  TrendingDown,
  TrendingUp,
  Trash2,
  User,
  XCircle,
} from 'lucide-react';

import { Badge } from '@gladpros/ui/badge'
import { Button } from '@gladpros/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@gladpros/ui/card'
import { Loading } from '@gladpros/ui/loading'
import { ModulePageHeader } from '@gladpros/ui/module-page-header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@gladpros/ui/tabs';
import EtapasManager from '@/components/projetos/etapas/EtapasManager';
import { TarefasKanban } from '@/components/projetos/tarefas/TarefasKanban';
import { MateriaisLista } from '@/components/projetos/materiais/MateriaisLista';
import { MateriaisEstoqueTab } from '@/components/projetos/materiais/MateriaisEstoqueTab';
import { FinanceiroDashboard } from '@/components/projetos/financeiro/FinanceiroDashboard';
import { EquipeManager } from '@/components/projetos/equipe/EquipeManager';
import { ProjetoJobsList } from '@/components/projetos/jobs/ProjetoJobsList';
import { ProjetoHistorico } from '@/components/projetos/historico/ProjetoHistorico';
import { ProjectDecisionPanel } from '@/components/projetos/health/ProjectDecisionPanel';
import { GanttView } from '@/components/projetos/GanttView';
import { useProjetoOperations } from '@/hooks/projetos/useProjetoOperations';
import type { Projeto } from '@/lib/projetos/types';
import {
  PROJETO_PRIORIDADE_LABELS,
  PROJETO_STATUS_LABELS,
} from '@/lib/projetos/constants';
import {
  calculateEVMMetrics,
  calculateProjectFinancials,
  isOverBudget,
} from '@/lib/projetos/calculations';
import {
  calculateProgress,
  daysDelayed,
  formatClienteName,
  formatCurrency,
  formatDate,
  isProjectDelayed,
  timeRemaining,
} from '@/lib/projetos/formatting';
import {
  PRIORITY_BADGE_VARIANTS,
  STATUS_BADGE_VARIANTS,
  getHealthBadge,
} from '@/lib/projetos/ui';

/**
 * Página de detalhes do projeto
 * 
 * Features:
 * - Visualização completa do projeto
 * - Status e prioridade visual
 * - Métricas financeiras e EVM conforme permissão
 * - Indicadores de saúde do projeto
 * - Ações rápidas conforme permissão (editar, excluir)
 * - Navegação por abas (futuro: etapas, tarefas, materiais)
 * - Timeline de datas importantes
 */
type ProjetoDetailPermissions = {
  canUpdate: boolean;
  canDelete: boolean;
  canReadStock: boolean;
  canManageStock: boolean;
  canViewFinancials: boolean;
  userRole: string;
};

export default function ProjetoDetailClient({ permissions }: { permissions: ProjetoDetailPermissions }) {
  const router = useRouter();
  const params = useParams();
  const projetoId = Number(params.id);

  const [projeto, setProjeto] = useState<Projeto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { fetchProjeto, deleteProjeto, fetching, loading } = useProjetoOperations({
    onSuccess: (message) => {
      if (message.includes('excluído')) {
        router.push('/projetos');
      }
    },
    onError: (errorMessage) => setError(errorMessage),
  });

  useEffect(() => {
    loadProjeto();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projetoId]);

  const loadProjeto = async () => {
    try {
      const data = await fetchProjeto(projetoId);
      if (data) {
        setProjeto(data);
      } else {
        setError('Projeto não encontrado');
      }
    } catch (err) {
      console.error('Erro ao carregar projeto:', err);
      setError('Erro ao carregar projeto');
    }
  };

  const handleDelete = async () => {
    if (!projeto) return;

    try {
      await deleteProjeto(projeto.id);
    } catch (err) {
      console.error('Erro ao excluir projeto:', err);
    }
  };

  // Loading state
  if (fetching && !projeto) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loading size="lg" text="Carregando projeto..." />
      </div>
    );
  }

  // Error state
  if (error || !projeto) {
    return (
      <div className="min-h-screen bg-background px-4 py-12">
        <div className="mx-auto max-w-2xl">
          <Card className="border-none shadow-lg">
            <CardHeader className="flex flex-row items-start gap-3">
              <AlertCircle className="h-6 w-6 text-error" />
              <div>
                <CardTitle>Projetos</CardTitle>
                <CardDescription>
                  {error || 'O projeto que você está procurando não existe ou foi removido.'}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button variant="ghost" onClick={() => router.back()} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>
              <Button variant="default" onClick={() => router.push('/projetos')}>
                Ir para Projetos
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Cálculos
  const progress = calculateProgress(projeto);
  const financials = calculateProjectFinancials(projeto);
  const evm = calculateEVMMetrics(projeto);
  const delayed = isProjectDelayed(projeto);
  const daysLate = daysDelayed(projeto);
  const overBudget = projeto.custoReal
    ? isOverBudget(projeto.custoPrevisto || 0, projeto.custoReal, progress)
    : false;
  const budgetVariance = (projeto.custoReal || 0) - (projeto.custoPrevisto || 0);

  const statusLabel = PROJETO_STATUS_LABELS[projeto.status];
  const prioridadeLabel = PROJETO_PRIORIDADE_LABELS[projeto.prioridade];
  const clienteLabel = formatClienteName(projeto.Cliente);
  const responsavelLabel = projeto.Responsavel?.nome || 'Responsável não atribuído';

  const statusVariant =
    STATUS_BADGE_VARIANTS[
    projeto.status as keyof typeof STATUS_BADGE_VARIANTS
    ] ?? 'default';

  const priorityVariant =
    PRIORITY_BADGE_VARIANTS[
    projeto.prioridade as keyof typeof PRIORITY_BADGE_VARIANTS
    ] ?? 'secondary';

   
  const _healthBadge = getHealthBadge({ delayed, daysLate, overBudget });

  const StatusIcon =
    projeto.status === 'planejado'
      ? Clock
      : projeto.status === 'em_execucao'
        ? PlayCircle
        : projeto.status === 'em_inspecao'
          ? CheckCircle2
          : projeto.status === 'aguardando_devolucoes'
            ? AlertTriangle
            : projeto.status === 'suspenso'
              ? PauseCircle
              : projeto.status === 'concluido'
                ? CheckCircle2
                : projeto.status === 'arquivado'
                  ? FolderOpen
                  : XCircle;

  const timelineItems = [
    {
      label: 'Início Previsto',
      value: formatDate(projeto.dataInicioPrevista) || 'Não definida',
      helper: projeto.dataInicioPrevista ? timeRemaining(projeto.dataInicioPrevista) : null,
    },
    projeto.dataInicioReal && {
      label: 'Início Real',
      value: formatDate(projeto.dataInicioReal),
      helper: null,
    },
    {
      label: 'Conclusão Prevista',
      value: formatDate(projeto.dataConclusaoPrevista) || 'Não definida',
      helper: projeto.dataConclusaoPrevista ? timeRemaining(projeto.dataConclusaoPrevista) : null,
    },
    projeto.dataConclusaoReal && {
      label: 'Conclusão Real',
      value: formatDate(projeto.dataConclusaoReal),
      helper: null,
    },
  ].filter(Boolean) as { label: string; value: string; helper: string | null }[];

  const financeSummary = [
    { label: 'Valor Estimado', value: formatCurrency(projeto.valorEstimado) },
    { label: 'Custo Previsto', value: formatCurrency(projeto.custoPrevisto) },
    { label: 'Custo Real', value: formatCurrency(projeto.custoReal) },
    {
      label: 'Margem',
      value: financials.margemReal
        ? `${financials.margemReal.toFixed(1)}%`
        : financials.margemPrevista
          ? `${financials.margemPrevista.toFixed(1)}%`
          : 'N/A',
      trend:
        financials.margemReal && financials.margemPrevista
          ? financials.margemReal >= financials.margemPrevista
            ? 'up'
            : 'down'
          : undefined,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <ModulePageHeader
          title={projeto.titulo}
          description={`${clienteLabel} • ${responsavelLabel}`}
          icon={<FolderOpen />}
          accentColor="#0098DA"
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Projetos', href: '/projetos' },
            { label: projeto.titulo },
          ]}
          badges={
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="secondary">#{projeto.numeroProjeto}</Badge>
              <Badge variant={statusVariant} className="gap-1">
                <StatusIcon className="h-3.5 w-3.5" />
                {statusLabel}
              </Badge>
              <Badge variant={priorityVariant}>{prioridadeLabel}</Badge>
            </div>
          }
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-2" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>
              {permissions.canUpdate && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => router.push(`/projetos/${projeto.id}/editar`)}
                >
                  <Edit className="h-4 w-4" />
                  Editar
                </Button>
              )}
              {permissions.canDelete && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-2"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  Excluir
                </Button>
              )}
            </div>
          }
        />

        <Tabs defaultValue="overview" className="space-y-6">
          {/* Banner de restrições operacionais — visível para a equipe de execução */}
          {projeto.restricoesOperacionais && (
            <div className="flex items-start gap-3 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-yellow-700 dark:text-yellow-400">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-semibold text-sm">Restrições Operacionais</p>
                <p className="text-sm whitespace-pre-line mt-0.5">{projeto.restricoesOperacionais}</p>
              </div>
            </div>
          )}
          <TabsList className="grid w-full rounded-2xl bg-card p-1 shadow-sm md:grid-cols-10">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="cronograma">Cronograma</TabsTrigger>
            <TabsTrigger value="jobs">Jobs (OS)</TabsTrigger>
            <TabsTrigger value="etapas">Etapas</TabsTrigger>
            <TabsTrigger value="tarefas">Tarefas</TabsTrigger>
            <TabsTrigger value="materiais">Materiais</TabsTrigger>
            {permissions.canReadStock && <TabsTrigger value="estoque">Estoque</TabsTrigger>}
            {permissions.canViewFinancials && <TabsTrigger value="financeiro">Financeiro</TabsTrigger>}
            <TabsTrigger value="equipe">Equipe</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {permissions.canViewFinancials && <ProjectDecisionPanel projetoId={projeto.id} />}

            {projeto.descricao && (
              <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle>Descrição</CardTitle>
                  <CardDescription>Contexto e observações principais do projeto.</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-foreground">{projeto.descricao}</p>
                </CardContent>
              </Card>
            )}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Card className="border-none shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle>Cliente</CardTitle>
                    <CardDescription>Entidade contratante</CardDescription>
                  </div>
                  <User className="h-5 w-5 text-brand-blue" />
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-semibold text-foreground">{clienteLabel}</p>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle>Responsável</CardTitle>
                    <CardDescription>Contato interno</CardDescription>
                  </div>
                  <User className="h-5 w-5 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-semibold text-foreground">{responsavelLabel}</p>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm md:col-span-2 xl:col-span-2">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle>Progresso Geral</CardTitle>
                    <CardDescription>Atualizado com base em etapas e status.</CardDescription>
                  </div>
                  <TrendingUp className="h-5 w-5 text-success" />
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 rounded-full bg-muted">
                      <div
                        className="h-3 rounded-full bg-brand-blue transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="text-2xl font-bold text-foreground">{progress}%</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-none shadow-sm">
              <CardHeader className="flex flex-row items-center gap-3">
                <Calendar className="h-5 w-5 text-brand-blue" />
                <div>
                  <CardTitle>Cronograma</CardTitle>
                  <CardDescription>Prazos planejados e reais.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {timelineItems.map((item) => (
                    <div key={item.label} className="rounded-2xl border border-border p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.label}</p>
                      <p className="text-lg font-semibold text-foreground">{item.value}</p>
                      {item.helper && (
                        <p className="text-xs text-muted-foreground">{item.helper}</p>
                      )}
                    </div>
                  ))}
                </div>
                {delayed && daysLate > 0 && (
                  <div className="flex items-center gap-2 rounded-2xl border border-error bg-error/5 px-4 py-3 text-sm font-semibold text-error">
                    <AlertTriangle className="h-4 w-4" />
                    Projeto atrasado em {daysLate} {daysLate === 1 ? 'dia' : 'dias'}
                  </div>
                )}
              </CardContent>
            </Card>

            {permissions.canViewFinancials && (
            <Card className="border-none shadow-sm">
              <CardHeader className="flex flex-row items-center gap-3">
                <DollarSign className="h-5 w-5 text-success" />
                <div>
                  <CardTitle>Financeiro & EVM</CardTitle>
                  <CardDescription>Indicadores de orçamento e valor agregado.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {financeSummary.map((metric) => (
                    <div key={metric.label} className="rounded-2xl border border-border p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">{metric.label}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-2xl font-bold text-foreground">{metric.value}</p>
                        {metric.trend === 'up' && (
                          <TrendingUp className="h-4 w-4 text-success" />
                        )}
                        {metric.trend === 'down' && (
                          <TrendingDown className="h-4 w-4 text-error" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {overBudget && budgetVariance > 0 && (
                  <div className="flex items-center gap-2 rounded-2xl border border-error bg-error/5 px-4 py-3 text-sm font-semibold text-error">
                    <AlertTriangle className="h-4 w-4" />
                    Orçamento excedido em {formatCurrency(Math.abs(budgetVariance))}
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <MetricCard label="CPI" helper="Índice de custo" value={evm.cpi.toFixed(2)} positive={evm.cpi >= 1} />
                  <MetricCard label="SPI" helper="Índice de prazo" value={evm.spi.toFixed(2)} positive={evm.spi >= 1} />
                  <MetricCard label="EAC" helper="Estimativa no término" value={formatCurrency(evm.eac)} />
                  <MetricCard label="CV" helper="Variação de custo" value={formatCurrency(evm.cv)} positive={evm.cv >= 0} />
                </div>
              </CardContent>
            </Card>
            )}

            {(projeto.localidade || projeto.endereco) && (
              <Card className="border-none shadow-sm">
                <CardHeader className="flex flex-row items-center gap-3">
                  <MapPin className="h-5 w-5 text-error" />
                  <div>
                    <CardTitle>Localização</CardTitle>
                    <CardDescription>Detalhes de execução</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  {projeto.localidade && (
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Localidade</p>
                      <p className="text-lg font-semibold text-foreground">{projeto.localidade}</p>
                    </div>
                  )}
                  {projeto.endereco && (
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Endereço</p>
                      <p className="text-lg font-semibold text-foreground">{projeto.endereco}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="jobs">
            <ProjetoJobsList projetoId={projeto.id} />
          </TabsContent>

          <TabsContent value="etapas">
            <Card className="border-none shadow-sm">
              <CardContent className="p-6">
                <EtapasManager projetoId={projeto.id} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tarefas">
            <TarefasKanban projetoId={projeto.id} />
          </TabsContent>

          <TabsContent value="materiais">
            <MateriaisLista projetoId={projeto.id} />
          </TabsContent>

          {permissions.canReadStock && (
            <TabsContent value="estoque">
              <MateriaisEstoqueTab projetoId={projeto.id} canManageMaterials={permissions.canManageStock} />
            </TabsContent>
          )}

          {permissions.canViewFinancials && (
            <TabsContent value="financeiro" className="space-y-6">
              <ProjectDecisionPanel projetoId={projeto.id} />
              <FinanceiroDashboard projeto={projeto} />
            </TabsContent>
          )}

          <TabsContent value="equipe">
            <EquipeManager projetoId={projeto.id} />
          </TabsContent>

          <TabsContent value="historico">
            <ProjetoHistorico projetoId={projeto.id} />
          </TabsContent>

          <TabsContent value="cronograma">
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-title">
                  <Calendar className="h-5 w-5 text-brand-primary" />
                  Cronograma do Projeto
                </CardTitle>
                <CardDescription>
                  Visualização Gantt das etapas. As barras mostram o período previsto ou real de cada etapa.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <GanttView projetoId={projeto.id} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {permissions.canDelete && showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
            <div className="w-full max-w-md">
              <Card className="border-none shadow-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-error">
                    <AlertCircle className="h-5 w-5" />
                    Confirmar exclusão
                  </CardTitle>
                  <CardDescription>
                    Tem certeza que deseja excluir o projeto <strong>{projeto.titulo}</strong>? Essa ação não pode ser desfeita.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap justify-end gap-3">
                  <Button
                    variant="ghost"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={loading}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="destructive"
                    className="gap-2"
                    onClick={handleDelete}
                    disabled={loading}
                  >
                    {loading ? <Loading size="sm" /> : <Trash2 className="h-4 w-4" />}
                    Excluir Projeto
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface MetricCardProps {
  label: string;
  helper?: string;
  value: string;
  positive?: boolean;
}

function MetricCard({ label, helper, value, positive }: MetricCardProps) {
  const tone = positive === undefined ? 'text-foreground' : positive ? 'text-success' : 'text-error';

  return (
    <div className="rounded-2xl border border-border p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold ${tone}`}>{value}</p>
      {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
    </div>
  );
}
