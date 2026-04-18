/**
 * Card Individual de Etapa
 * 
 * Features:
 * - Sortable para drag & drop
 * - Status visual com cores
 * - Progresso visual
 * - Datas de início/fim
 * - Ações (editar, deletar)
 */

'use client';

import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  Calendar,
  Edit,
  Trash2,
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import { useProjetoOperations } from '@/hooks/projetos/useProjetoOperations';
import { formatDate } from '@/lib/projetos/formatting';
import { ETAPA_STATUS_LABELS } from '@/lib/projetos/constants';
import type { ProjetoEtapa } from '@/lib/projetos/types';

interface EtapaCardProps {
  etapa: ProjetoEtapa;
  index: number;
  totalEtapas: number;
  isDragging: boolean;
  onEdit: (etapa: ProjetoEtapa) => void;
  onRefresh: () => void;
}

export default function EtapaCard({
  etapa,
  index,
  totalEtapas,
  isDragging,
  onEdit,
  onRefresh,
}: EtapaCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { deleteEtapa, loading } = useProjetoOperations({
    onSuccess: () => {
      setShowDeleteConfirm(false);
      onRefresh();
    },
    onError: (error) => {
      console.error('Erro ao deletar:', error);
      alert(error);
    },
  });

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: etapa.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
  };

  const handleDelete = async () => {
    if (!etapa.id) return;
    await deleteEtapa(etapa.id);
  };

  // Status icon e cores
  const statusConfig = {
    pendente: {
      icon: Circle,
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-700',
      borderColor: 'border-gray-300',
      label: ETAPA_STATUS_LABELS.pendente,
    },
    em_andamento: {
      icon: Clock,
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-700',
      borderColor: 'border-blue-300',
      label: ETAPA_STATUS_LABELS.em_andamento,
    },
    concluida: {
      icon: CheckCircle2,
      bgColor: 'bg-green-100',
      textColor: 'text-green-700',
      borderColor: 'border-green-300',
      label: ETAPA_STATUS_LABELS.concluida,
    },
    bloqueada: {
      icon: XCircle,
      bgColor: 'bg-red-100',
      textColor: 'text-red-700',
      borderColor: 'border-red-300',
      label: ETAPA_STATUS_LABELS.bloqueada,
    },
  };

  const config = statusConfig[etapa.status];
  const StatusIcon = config.icon;
  const progresso = etapa.porcentagem ? Number(etapa.porcentagem) : 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white border-2 rounded-lg transition-all ${
        isDragging ? 'border-blue-400 shadow-lg' : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="p-4">
        <div className="flex items-start gap-4">
          {/* Drag Handle */}
          <button
            {...attributes}
            {...listeners}
            className="mt-1 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 transition-colors"
            title="Arrastar para reordenar"
          >
            <GripVertical size={20} />
          </button>

          {/* Número da Etapa */}
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-blue-700 font-bold text-sm">
                {index + 1}
              </span>
            </div>
          </div>

          {/* Conteúdo */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-2">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {etapa.servico}
                </h3>
                {etapa.descricao && (
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {etapa.descricao}
                  </p>
                )}
              </div>

              {/* Status Badge */}
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${config.bgColor} ${config.textColor} ${config.borderColor}`}
              >
                <StatusIcon size={14} />
                {config.label}
              </span>
            </div>

            {/* Progresso */}
            <div className="mb-3">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-600">Progresso</span>
                <span className="font-semibold text-gray-900">{progresso}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    progresso === 100
                      ? 'bg-green-600'
                      : progresso > 50
                      ? 'bg-blue-600'
                      : 'bg-blue-400'
                  }`}
                  style={{ width: `${progresso}%` }}
                />
              </div>
            </div>

            {/* Datas */}
            <div className="flex items-center gap-6 text-sm text-gray-600 mb-3">
              {etapa.inicioPrevisto && (
                <div className="flex items-center gap-2">
                  <Calendar size={14} />
                  <span>
                    Início: {formatDate(etapa.inicioPrevisto)}
                  </span>
                </div>
              )}
              {etapa.fimPrevisto && (
                <div className="flex items-center gap-2">
                  <Calendar size={14} />
                  <span>
                    Fim: {formatDate(etapa.fimPrevisto)}
                  </span>
                </div>
              )}
            </div>

            {/* Ações */}
            <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
              <button
                onClick={() => onEdit(etapa)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors"
              >
                <Edit size={14} />
                Editar
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
              >
                <Trash2 size={14} />
                Excluir
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Confirmação */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <AlertTriangle size={24} />
              <h3 className="text-xl font-semibold">Confirmar Exclusão</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Tem certeza que deseja excluir a etapa <strong>{etapa.servico}</strong>?
              Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={loading}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Excluindo...
                  </>
                ) : (
                  <>
                    <Trash2 size={18} />
                    Excluir
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
