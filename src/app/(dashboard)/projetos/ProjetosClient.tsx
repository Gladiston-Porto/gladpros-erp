/**
 * Página de Lista de Projetos
 * 
 * Features:
 * - Lista paginada de projetos
 * - Filtros avançados (status, prioridade, cliente, responsável, datas)
 * - Busca por texto
 * - Ordenação
 * - Cards com informações resumidas
 * - Ações rápidas (visualizar, editar, deletar)
 */

'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Filter } from 'lucide-react';

import { Badge } from '@gladpros/ui/badge'
import { Button } from '@gladpros/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@gladpros/ui/card';
import { Input } from "@gladpros/ui/input";
import { Loading } from "@gladpros/ui/loading";

import { useProjetoOperations } from '@/hooks/projetos/useProjetoOperations';
import type { Projeto, ProjetoFilters } from '@/lib/projetos/types';
import {
  PROJETO_STATUS,
  PROJETO_PRIORIDADE,
  DEFAULT_PAGE_SIZE,
  SORT_OPTIONS,
} from '@/lib/projetos/constants';
import {
  formatCurrency,
  formatDate,
  formatClienteName,
  formatStatus,
  formatPriority,
  calculateProgress,
  isProjectDelayed,
  daysDelayed,
} from '@/lib/projetos/formatting';
import {
  STATUS_BADGE_VARIANTS,
  PRIORITY_BADGE_VARIANTS,
  type BadgeVariant,
} from '@/lib/projetos/ui';

export default function ProjetosClient() {
  const router = useRouter();
   
  const { fetchProjetos, deleteProjeto, loading: _loading, fetching } = useProjetoOperations({
    onSuccess: () => {
      // Recarregar lista após ação bem-sucedida
      loadProjetos();
    },
    onError: (error) => {
      // TODO: Implementar toast notification
      console.error(error);
    },
  });

  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    totalRecords: 0,
    totalPages: 0,
  });

  const [filters, setFilters] = useState<ProjetoFilters>({
    status: '',
    prioridade: '',
    clienteId: '',
    responsavelId: '',
    search: '',
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    sortBy: 'criadoEm',
    sortOrder: 'desc',
  });

  const [showFilters, setShowFilters] = useState(false);
  const loadProjetos = useCallback(async () => {
    try {
      const result = await fetchProjetos(filters);
      setProjetos(result.data);
      setPagination(result.pagination);
    } catch (error) {
      console.error('Erro ao carregar projetos:', error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const handlePageChange = (newPage: number) => {
    setFilters((prev) => ({
      ...prev,
      page: newPage,
    }));
  };

  const handleFilterChange = (key: keyof ProjetoFilters, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: 1,
    }));
  };

  const handleSearch = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      search: value,
      page: 1,
    }));
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja deletar este projeto?')) {
      return;
    }

    try {
      await deleteProjeto(id);
    } catch (error) {
      console.error('Erro ao deletar projeto:', error);
    }
  };

  const handleClearFilters = () => {
    setFilters({
      status: '',
      prioridade: '',
      clienteId: '',
      responsavelId: '',
      search: '',
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
      sortBy: 'criadoEm',
      sortOrder: 'desc',
    });
  };

  const activeFiltersCount =
    (filters.status ? 1 : 0) +
    (filters.prioridade ? 1 : 0) +
    (filters.clienteId ? 1 : 0) +
    (filters.responsavelId ? 1 : 0);

  return (
    <div className="space-y-6">
        <Card className="border-none shadow-sm">
          <CardContent className="space-y-4 pt-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Busca global
                </p>
                <div className="relative mt-2">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={filters.search || ''}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Buscar por número, cliente ou responsável"
                    className="h-12 rounded-2xl border-border pl-10 text-sm"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant={showFilters ? 'primary' : 'ghost'}
                  size="sm"
                  className="gap-2 rounded-2xl"
                  onClick={() => setShowFilters((prev) => !prev)}
                >
                  <Filter size={16} />
                  {showFilters ? 'Ocultar filtros' : 'Filtros avançados'}
                  {activeFiltersCount > 0 && (
                    <span className="rounded-full bg-foreground/20 px-2 text-xs font-semibold">
                      {activeFiltersCount}
                    </span>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-2xl"
                  onClick={handleClearFilters}
                  disabled={activeFiltersCount === 0 && !filters.search}
                >
                  Limpar
                </Button>
              </div>
            </div>

            {showFilters && (
              <div className="grid gap-4 border-t border-border pt-4 md:grid-cols-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Status
                  </p>
                  <select
                    value={filters.status || ''}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="mt-2 h-12 w-full rounded-2xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Todos</option>
                    <option value={PROJETO_STATUS.PLANEJADO}>Planejado</option>
                    <option value={PROJETO_STATUS.EM_EXECUCAO}>Em Execução</option>
                    <option value={PROJETO_STATUS.EM_INSPECAO}>Em Inspeção</option>
                    <option value={PROJETO_STATUS.AGUARDANDO_DEVOLUCOES}>Ag. Devoluções</option>
                    <option value={PROJETO_STATUS.SUSPENSO}>Suspenso</option>
                    <option value={PROJETO_STATUS.CONCLUIDO}>Concluído</option>
                    <option value={PROJETO_STATUS.ARQUIVADO}>Arquivado</option>
                    <option value={PROJETO_STATUS.CANCELADO}>Cancelado</option>
                  </select>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Prioridade
                  </p>
                  <select
                    value={filters.prioridade || ''}
                    onChange={(e) => handleFilterChange('prioridade', e.target.value)}
                    className="mt-2 h-12 w-full rounded-2xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Todas</option>
                    <option value={PROJETO_PRIORIDADE.BAIXA}>Baixa</option>
                    <option value={PROJETO_PRIORIDADE.MEDIA}>Média</option>
                    <option value={PROJETO_PRIORIDADE.ALTA}>Alta</option>
                    <option value={PROJETO_PRIORIDADE.CRITICA}>Crítica</option>
                  </select>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Ordenação
                  </p>
                  <select
                    value={`${filters.sortBy}_${filters.sortOrder}`}
                    onChange={(e) => {
                      const [sortBy, sortOrder] = e.target.value.split('_');
                      setFilters((prev) => ({
                        ...prev,
                        sortBy,
                        sortOrder: sortOrder as 'asc' | 'desc',
                      }));
                    }}
                    className="mt-2 h-12 w-full rounded-2xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {SORT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full rounded-2xl"
                    onClick={handleClearFilters}
                  >
                    Resetar filtros
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

      {/* Lista de Projetos */}
        {fetching ? (
          <Card className="border-none shadow-sm">
            <CardContent className="flex flex-col items-center justify-center gap-3 py-16">
              <Loading size="lg" text="Carregando projetos..." />
              <p className="text-sm text-muted-foreground">Buscando dados mais recentes</p>
            </CardContent>
          </Card>
        ) : projetos.length === 0 ? (
          <Card className="border-none text-center shadow-sm">
            <CardContent className="flex flex-col items-center gap-4 py-16">
              <p className="text-lg text-muted-foreground">Nenhum projeto encontrado</p>
              <Button className="gap-2" onClick={() => router.push('/projetos/novo')}>
                <Plus size={18} />
                Criar primeiro projeto
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {projetos.map((projeto) => (
                <ProjetoCard
                  key={projeto.id}
                  projeto={projeto}
                  onView={() => router.push(`/projetos/${projeto.id}`)}
                  onEdit={() => router.push(`/projetos/${projeto.id}/editar`)}
                  onDelete={() => handleDelete(projeto.id)}
                />
              ))}
            </div>

            {pagination && pagination.totalPages > 1 && (
              <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm md:flex-row md:items-center md:justify-between">
                <div className="text-sm text-muted-foreground">
                  Mostrando {((pagination.page - 1) * pagination.pageSize) + 1} -{' '}
                  {Math.min(pagination.page * pagination.pageSize, pagination.totalRecords)} de{' '}
                  {pagination.totalRecords} projetos
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                  >
                    Anterior
                  </Button>

                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={page === pagination.page ? 'primary' : 'ghost'}
                      size="sm"
                      onClick={() => handlePageChange(page)}
                    >
                      {page}
                    </Button>
                  ))}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
    </div>
  );
}

// Componente de Card do Projeto
interface ProjetoCardProps {
  projeto: Projeto;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function ProjetoCard({ projeto, onView, onEdit, onDelete }: ProjetoCardProps) {
  const progress = calculateProgress(projeto);
  const isDelayed = isProjectDelayed(projeto);
  const delayDays = daysDelayed(projeto);
  const statusVariant =
    STATUS_BADGE_VARIANTS[
      projeto.status as keyof typeof STATUS_BADGE_VARIANTS
    ] ?? 'default';

  const priorityVariant =
    PRIORITY_BADGE_VARIANTS[
      projeto.prioridade as keyof typeof PRIORITY_BADGE_VARIANTS
    ] ?? 'secondary';
  const healthVariant: BadgeVariant = isDelayed ? (delayDays > 7 ? 'error' : 'warning') : 'success';
  const healthLabel = isDelayed ? `Atrasado ${delayDays}d` : 'No prazo';
  const progressColor =
    progress >= 75 ? 'bg-emerald-500' :
    progress >= 50 ? 'bg-brand-blue' :
    progress >= 25 ? 'bg-amber-500' :
    'bg-orange-500';

  return (
    <Card className="flex h-full flex-col border-border shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
      <CardHeader className="space-y-3 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Projeto #{projeto.numeroProjeto}
            </p>
            <CardTitle className="text-xl text-foreground">{projeto.titulo}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {projeto.Cliente ? formatClienteName(projeto.Cliente) : 'Cliente não informado'}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 text-right">
            <Badge variant={statusVariant}>{formatStatus(projeto.status)}</Badge>
            <Badge variant={priorityVariant}>{formatPriority(projeto.prioridade)}</Badge>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant={healthVariant} className="px-3 py-1 text-[11px] uppercase tracking-wide">
            {healthLabel}
          </Badge>
          <span className="font-medium text-foreground/70">{projeto.Responsavel?.nome || 'Sem responsável'}</span>
          <span className="text-muted-foreground">•</span>
          <span>{projeto._count?.Tarefas || 0} tarefas</span>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-4">
        <div>
          <div className="flex items-center justify-between text-sm font-medium text-muted-foreground">
            <span>Progresso</span>
            <span className="text-foreground">{progress}%</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-muted">
            <div
              className={`${progressColor} h-2 rounded-full transition-all`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="space-y-1 rounded-2xl border border-border bg-muted/50 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Conclusão prevista</p>
            <p className={`font-semibold ${isDelayed ? 'text-destructive' : 'text-foreground'}`}>
              {formatDate(projeto.dataConclusaoPrevista) || 'Não definida'}
            </p>
            {isDelayed && (
              <span className="text-xs text-destructive">Atraso de {delayDays}d</span>
            )}
          </div>

          <div className="space-y-1 rounded-2xl border border-border bg-card p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Valor estimado</p>
            <p className="text-lg font-semibold text-foreground">
              {formatCurrency(projeto.valorEstimado)}
            </p>
          </div>

          <div className="space-y-1 rounded-2xl border border-border bg-card p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Cliente</p>
            <p className="font-medium text-foreground">
              {projeto.Cliente ? formatClienteName(projeto.Cliente) : '—'}
            </p>
          </div>

          <div className="space-y-1 rounded-2xl border border-border bg-card p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Status financeiro</p>
            <p className="font-medium text-foreground">
              {projeto.custoReal ? formatCurrency(projeto.custoReal) : 'Não iniciado'}
            </p>
          </div>
        </div>
      </CardContent>

      <div className="border-t border-border" />

      <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-4 text-sm text-muted-foreground">
        <span className="text-muted-foreground">
          Última atualização {formatDate(projeto.atualizadoEm) || 'indisponível'}
        </span>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" onClick={onView}>
            Visualizar
          </Button>
          <Button variant="outline" size="sm" onClick={onEdit}>
            Editar
          </Button>
          <Button variant="destructive" size="sm" onClick={onDelete}>
            Excluir
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
