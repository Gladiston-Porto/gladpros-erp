/**
 * Componente TarefasKanban
 * 
 * Kanban board para gestão de tarefas de projeto
 * - Drag and drop entre colunas de status
 * - Criação inline de tarefas
 * - Filtros por responsável e etapa
 * - Badge de prioridade e prazo
 */

'use client';

import { useState, useEffect } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { AlertCircle, Calendar, CheckCircle2, Clock, Flag, Loader2, Pause, Plus, User, X } from 'lucide-react';
import { Badge } from "@gladpros/ui/badge";
import { Button } from '@gladpros/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from "@gladpros/ui/card";
import { Loading } from "@gladpros/ui/loading";
import { Input } from "@gladpros/ui/input";
import { TarefaCard } from '@/components/projetos/tarefas/TarefaCard';
import { TarefaForm } from '@/components/projetos/tarefas/TarefaForm';

type TarefaStatus = 'aberta' | 'em_andamento' | 'bloqueada' | 'concluida' | 'cancelada';

type Tarefa = {
  id: number;
  projetoId: number;
  etapaId?: number | null;
  titulo: string;
  descricao?: string | null;
  status: TarefaStatus;
  atribuidaPara?: number | null;
  prazo?: Date | null;
  prioridade: 'baixa' | 'media' | 'alta' | 'critica';
  criadoPor: number;
  criadoEm: Date;
  atualizadoEm?: Date | null;
  etapaServico?: string | null;
  responsavelNome?: string | null;
  CriadoPor: {
    id: number;
    nome: string;
  };
};

type KanbanColumn = {
  id: TarefaStatus;
  title: string;
  icon: React.ReactNode;
  color: string;
  tarefas: Tarefa[];
};

type Props = {
  projetoId: number;
};

const STATUS_CONFIG: Record<TarefaStatus, { title: string; icon: React.ReactNode; color: string }> = {
  aberta: {
    title: 'Abertas',
    icon: <Clock className="h-4 w-4" />,
    color: 'bg-muted text-foreground',
  },
  em_andamento: {
    title: 'Em Andamento',
    icon: <Loader2 className="h-4 w-4 animate-spin" />,
    color: 'bg-brand-primary/10 text-brand-primary',
  },
  bloqueada: {
    title: 'Bloqueadas',
    icon: <AlertCircle className="h-4 w-4" />,
    color: 'bg-orange-100 text-orange-700',
  },
  concluida: {
    title: 'Concluídas',
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: 'bg-green-500/10 text-green-600',
  },
  cancelada: {
    title: 'Canceladas',
    icon: <X className="h-4 w-4" />,
    color: 'bg-destructive/10 text-destructive',
  },
};

export function TarefasKanban({ projetoId }: Props) {
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTarefa, setActiveTarefa] = useState<Tarefa | null>(null);
  const [showNewTaskForm, setShowNewTaskForm] = useState<TarefaStatus | null>(null);
  const [searchFilter, setSearchFilter] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    loadTarefas();
  }, [projetoId]);

  const loadTarefas = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/projetos/${projetoId}/tarefas`);
      if (!response.ok) {
        throw new Error('Erro ao carregar tarefas');
      }

      const data = await response.json();
      setTarefas(data.data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const tarefa = tarefas.find((t) => t.id === event.active.id);
    setActiveTarefa(tarefa || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTarefa(null);

    if (!over) return;

    const tarefaId = active.id as number;
    const newStatus = over.id as TarefaStatus;

    const tarefa = tarefas.find((t) => t.id === tarefaId);
    if (!tarefa || tarefa.status === newStatus) return;

    // Update optimistically
    setTarefas((prev) =>
      prev.map((t) => (t.id === tarefaId ? { ...t, status: newStatus } : t))
    );

    try {
      const response = await fetch(`/api/projetos/${projetoId}/tarefas/${tarefaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Erro ao atualizar tarefa');
      }
    } catch (err: unknown) {
      // Rollback on error
      setTarefas((prev) =>
        prev.map((t) => (t.id === tarefaId ? { ...t, status: tarefa.status } : t))
      );
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleCreateTask = async (data: { titulo: string; status: string; projetoId: number; prioridade?: string }) => {
    try {
      const response = await fetch(`/api/projetos/${projetoId}/tarefas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Erro ao criar tarefa');
      }

      const { data: novaTarefa } = await response.json();
      setTarefas((prev) => [...prev, novaTarefa]);
      setShowNewTaskForm(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const filteredTarefas = tarefas.filter((tarefa) => {
    if (!searchFilter) return true;
    const search = searchFilter.toLowerCase();
    return (
      tarefa.titulo.toLowerCase().includes(search) ||
      tarefa.descricao?.toLowerCase().includes(search) ||
      tarefa.responsavelNome?.toLowerCase().includes(search)
    );
  });

  const columns: KanbanColumn[] = Object.entries(STATUS_CONFIG).map(([status, config]) => ({
    id: status as TarefaStatus,
    title: config.title,
    icon: config.icon,
    color: config.color,
    tarefas: filteredTarefas.filter((t) => t.status === status),
  }));

  if (loading) {
    return <Loading text="Carregando tarefas..." />;
  }

  if (error) {
    return (
      <Card className="border-destructive/30 bg-destructive/10">
        <CardContent className="py-8">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <p>{error}</p>
          </div>
          <Button variant="outline" className="mt-4" onClick={loadTarefas}>
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header com busca e stats */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-1 gap-2">
          <Input
            placeholder="Buscar tarefas..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="max-w-sm"
          />
        </div>

        <div className="flex gap-2">
          {columns.map((col) => (
            <Badge key={col.id} variant="secondary" className="gap-1">
              {col.icon}
              <span>{col.tarefas.length}</span>
            </Badge>
          ))}
        </div>
      </div>

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {columns.map((column) => (
            <Card key={column.id} className="border-none shadow-sm">
              <CardHeader className={`rounded-t-lg ${column.color}`}>
                <CardTitle className="flex items-center justify-between text-sm font-medium">
                  <div className="flex items-center gap-2">
                    {column.icon}
                    {column.title}
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {column.tarefas.length}
                  </Badge>
                </CardTitle>
              </CardHeader>

              <CardContent className="min-h-[400px] space-y-2 p-2">
                <SortableContext
                  id={column.id}
                  items={column.tarefas.map((t) => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {column.tarefas.map((tarefa) => (
                    <TarefaCard key={tarefa.id} tarefa={tarefa} />
                  ))}
                </SortableContext>

                {showNewTaskForm === column.id ? (
                  <TarefaForm
                    projetoId={projetoId}
                    initialStatus={column.id}
                    onSubmit={handleCreateTask}
                    onCancel={() => setShowNewTaskForm(null)}
                  />
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full gap-2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowNewTaskForm(column.id)}
                    aria-label={`Adicionar nova tarefa na coluna ${column.title}`}
                  >
                    <Plus className="h-4 w-4" />
                    Nova tarefa
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <DragOverlay>
          {activeTarefa ? <TarefaCard tarefa={activeTarefa} isDragging /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
