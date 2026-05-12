'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, Clock, Flag, User } from 'lucide-react';
import { Badge } from "@gladpros/ui/badge";
import { Card, CardContent } from "@gladpros/ui/card";
import { isPast, isToday, differenceInDays } from 'date-fns';
import {  } from 'date-fns/locale';

type Tarefa = {
  id: number;
  titulo: string;
  descricao?: string | null;
  status: string;
  atribuidaPara?: number | null;
  prazo?: Date | null;
  prioridade: 'baixa' | 'media' | 'alta' | 'critica';
  etapaServico?: string | null;
  responsavelNome?: string | null;
  horasEstimadas?: number | null;
  horasReais?: number | null;
};

type Props = {
  tarefa: Tarefa;
  isDragging?: boolean;
};

const PRIORIDADE_CONFIG = {
  baixa: { label: 'Baixa', color: 'bg-muted text-foreground', border: 'border-l-gray-300' },
  media: { label: 'Média', color: 'bg-brand-primary/10 text-brand-primary', border: 'border-l-blue-500' },
  alta: { label: 'Alta', color: 'bg-orange-100 text-orange-700', border: 'border-l-orange-500' },
  critica: { label: 'Crítica', color: 'bg-destructive/10 text-destructive', border: 'border-l-red-500' },
};

function formatarHoras(h: number | null | undefined): string | null {
  if (h == null) return null;
  if (h < 1) return `${Math.round(h * 60)}min`;
  return `${h}h`;
}

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

  const prioridadeConfig = PRIORIDADE_CONFIG[tarefa.prioridade] ?? PRIORIDADE_CONFIG.media;

  const horasLabel = (() => {
    const est = formatarHoras(tarefa.horasEstimadas);
    const real = formatarHoras(tarefa.horasReais);
    if (est && real) return `${real} / ${est}`;
    if (est) return `Est: ${est}`;
    return null;
  })();

  const horasOverrun =
    tarefa.horasReais != null &&
    tarefa.horasEstimadas != null &&
    tarefa.horasReais > tarefa.horasEstimadas;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`cursor-grab border-l-4 active:cursor-grabbing ${prioridadeConfig.border} ${isDragging ? 'rotate-2 shadow-lg' : 'hover:shadow-md'}`}
    >
      <CardContent className="space-y-3 p-3">
        {/* Título */}
        <h4 className="font-medium text-foreground">{tarefa.titulo}</h4>

        {/* Descrição (truncada) */}
        {tarefa.descricao && (
          <p className="line-clamp-2 text-sm text-muted-foreground">{tarefa.descricao}</p>
        )}

        {/* Etapa */}
        {tarefa.etapaServico && (
          <Badge variant="secondary" className="text-xs">
            {tarefa.etapaServico}
          </Badge>
        )}

        {/* Footer com prioridade, responsável, prazo e horas */}
        <div className="flex flex-wrap items-center gap-2 pt-2 text-xs">
          {/* Prioridade */}
          <Badge className={`gap-1 ${prioridadeConfig.color}`}>
            <Flag className="h-3 w-3" />
            {prioridadeConfig.label}
          </Badge>

          {/* Responsável */}
          {tarefa.responsavelNome && (
            <Badge variant="default" className="gap-1">
              <User className="h-3 w-3" />
              {tarefa.responsavelNome.split(' ')[0]}
            </Badge>
          )}

          {/* Horas */}
          {horasLabel && (
            <Badge
              className={`gap-1 ${horasOverrun ? 'bg-orange-100 text-orange-700' : 'bg-muted text-muted-foreground'}`}
            >
              <Clock className="h-3 w-3" />
              {horasLabel}
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
