/**
 * Lista de Etapas com Drag & Drop
 * 
 * Features:
 * - Visualização de etapas ordenadas
 * - Drag & drop para reordenação
 * - Status visual com cores
 * - Progresso de cada etapa
 * - Ações (editar, deletar)
 */

'use client';

import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useProjetoOperations } from '@/hooks/projetos/useProjetoOperations';
import type { ProjetoEtapa } from '@/lib/projetos/types';
import EtapaCard from './EtapaCard';

interface EtapasListProps {
  etapas: ProjetoEtapa[];
  onEdit: (etapa: ProjetoEtapa) => void;
  onReorder: (etapas: ProjetoEtapa[]) => void;
  onRefresh: () => void;
}

export default function EtapasList({
  etapas,
  onEdit,
  onReorder,
  onRefresh,
}: EtapasListProps) {
  const [activeId, setActiveId] = useState<number | null>(null);

  const { reordenarEtapas, loading } = useProjetoOperations({
    onSuccess: () => {
      console.log('Etapas reordenadas com sucesso');
      onRefresh();
    },
    onError: (error) => {
      console.error('Erro ao reordenar:', error);
      // Reverte a ordem em caso de erro
      onRefresh();
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px de movimento antes de ativar drag
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragEndEvent) => {
    setActiveId(event.active.id as number);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = etapas.findIndex((e) => e.id === active.id);
    const newIndex = etapas.findIndex((e) => e.id === over.id);

    const newOrder = arrayMove(etapas, oldIndex, newIndex);
    
    // Atualiza UI imediatamente (optimistic update)
    onReorder(newOrder);

    // Salva no backend
    try {
      const orderedIds = newOrder.map((e: any) => e.id);
      await reordenarEtapas(etapas[0].projetoId, orderedIds);
    } catch (error) {
      console.error('Erro ao salvar ordem:', error);
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  return (
    <div className="space-y-4">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext
          items={etapas.map((e) => e.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {etapas.map((etapa, index) => (
              <EtapaCard
                key={etapa.id}
                etapa={etapa}
                index={index}
                totalEtapas={etapas.length}
                isDragging={activeId === etapa.id}
                onEdit={onEdit}
                onRefresh={onRefresh}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {loading && (
        <div className="fixed bottom-4 right-4 bg-white shadow-lg rounded-lg p-4 flex items-center gap-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
          <span className="text-sm text-gray-700">Salvando ordem...</span>
        </div>
      )}
    </div>
  );
}
