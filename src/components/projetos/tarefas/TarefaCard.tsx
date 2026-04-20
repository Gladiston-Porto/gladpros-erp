/**
 * TarefaCard - Card de tarefa no Kanban
 * 
 * Suporta drag and drop
 */

'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, Flag, User } from 'lucide-react';
import { Badge } from "@gladpros/ui/badge";
import { Card, CardContent } from "@gladpros/ui/card";
import { format, isPast, isToday, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Tarefa = {
  id: number;
  titulo: string;
  descricao?: string | null;
  status: string;
  atribuidaPara?: number | null;
  prazo?: Date | null;
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente';
  Etapa?: {
    id: number;
    nome: string;
  } | null;
  AtribuidaPara?: {
    id: number;
    nome: string;
    email: string;
  } | null;
};

type Props = {
  tarefa: Tarefa;
  isDragging?: boolean;
};

const PRIORIDADE_CONFIG = {
  baixa: { label: 'Baixa', color: 'bg-muted text-foreground' },
  media: { label: 'Média', color: 'bg-brand-primary/10 text-brand-primary' },
  alta: { label: 'Alta', color: 'bg-orange-100 text-orange-700' },
  urgente: { label: 'Urgente', color: 'bg-destructive/10 text-destructive' },
};

export function TarefaCard({ tarefa, isDragging }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: tarefa.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
  };

  const prazo = tarefa.prazo ? new Date(tarefa.prazo) : null;
  const isPrazoVencido = prazo ? isPast(prazo) && !isToday(prazo) : false;
  const isPrazoHoje = prazo ? isToday(prazo) : false;
  const diasRestantes = prazo ? differenceInDays(prazo, new Date()) : null;

  const prioridadeConfig = PRIORIDADE_CONFIG[tarefa.prioridade];

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`cursor-grab border-l-4 active:cursor-grabbing ${
        tarefa.prioridade === 'urgente'
          ? 'border-l-red-500'
          : tarefa.prioridade === 'alta'
            ? 'border-l-orange-500'
            : tarefa.prioridade === 'media'
              ? 'border-l-blue-500'
              : 'border-l-gray-300'
      } ${isDragging ? 'rotate-2 shadow-lg' : 'hover:shadow-md'}`}
    >
      <CardContent className="space-y-3 p-3">
        {/* Título */}
        <h4 className="font-medium text-foreground">{tarefa.titulo}</h4>

        {/* Descrição (truncada) */}
        {tarefa.descricao && (
          <p className="line-clamp-2 text-sm text-muted-foreground">{tarefa.descricao}</p>
        )}

        {/* Etapa */}
        {tarefa.Etapa && (
          <Badge variant="secondary" className="text-xs">
            {tarefa.Etapa.nome}
          </Badge>
        )}

        {/* Footer com prioridade, responsável e prazo */}
        <div className="flex flex-wrap items-center gap-2 pt-2 text-xs">
          {/* Prioridade */}
          <Badge className={`gap-1 ${prioridadeConfig.color}`}>
            <Flag className="h-3 w-3" />
            {prioridadeConfig.label}
          </Badge>

          {/* Responsável */}
          {tarefa.AtribuidaPara && (
            <Badge variant="default" className="gap-1">
              <User className="h-3 w-3" />
              {tarefa.AtribuidaPara.nome.split(' ')[0]}
            </Badge>
          )}

          {/* Prazo */}
          {prazo && (
            <Badge
              variant={isPrazoVencido ? 'error' : isPrazoHoje ? 'warning' : 'secondary'}
              className="gap-1"
            >
              <Calendar className="h-3 w-3" />
              {isPrazoVencido && `Vencido há ${Math.abs(diasRestantes!)}d`}
              {isPrazoHoje && 'Hoje'}
              {!isPrazoVencido && !isPrazoHoje && (
                <>
                  {diasRestantes! > 0 && `${diasRestantes}d`}
                  {diasRestantes! === 0 && 'Hoje'}
                </>
              )}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
