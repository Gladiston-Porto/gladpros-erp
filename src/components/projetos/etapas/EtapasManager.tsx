/**
 * Gerenciador de Etapas do Projeto
 * 
 * Features:
 * - Lista de etapas com progresso
 * - CRUD inline/modal
 * - Drag & drop para reordenar
 * - Status visual (pendente, em_andamento, concluida, bloqueada)
 * - Dependências entre etapas
 */

'use client';

import { useState, useEffect } from 'react';
import { Plus, GripVertical, AlertCircle } from 'lucide-react';
import { useProjetoOperations } from '@/hooks/projetos/useProjetoOperations';
import type { ProjetoEtapa } from '@/lib/projetos/types';
import EtapasList from './EtapasList';
import EtapaForm from './EtapaForm';

interface EtapasManagerProps {
  projetoId: number;
}

export default function EtapasManager({ projetoId }: EtapasManagerProps) {
  const [etapas, setEtapas] = useState<ProjetoEtapa[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingEtapa, setEditingEtapa] = useState<ProjetoEtapa | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { listEtapas, fetching } = useProjetoOperations({
    onSuccess: (message) => {
      console.log(message);
      setShowForm(false);
      setEditingEtapa(null);
      loadEtapas();
    },
    onError: (error) => {
      setError(error);
      setTimeout(() => setError(null), 5000);
    },
  });

  useEffect(() => {
    loadEtapas();
  }, [projetoId]);

  const loadEtapas = async () => {
    try {
      const data = await listEtapas(projetoId);
      setEtapas(data);
    } catch (err) {
      console.error('Erro ao carregar etapas:', err);
    }
  };

  const handleEdit = (etapa: ProjetoEtapa) => {
    setEditingEtapa(etapa);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingEtapa(null);
  };

  const handleSuccess = () => {
    setShowForm(false);
    setEditingEtapa(null);
    loadEtapas();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Etapas do Projeto</h2>
          <p className="text-gray-600 mt-1">
            Organize as etapas em ordem de execução
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          disabled={showForm}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={20} />
          Nova Etapa
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-800">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Form (quando aberto) */}
      {showForm && (
        <div className="bg-white border-2 border-blue-200 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingEtapa ? 'Editar Etapa' : 'Nova Etapa'}
          </h3>
          <EtapaForm
            projetoId={projetoId}
            etapa={editingEtapa}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </div>
      )}

      {/* Loading State */}
      {fetching && etapas.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Carregando etapas...</p>
          </div>
        </div>
      )}

      {/* Lista de Etapas */}
      {!fetching && etapas.length > 0 && (
        <EtapasList
          etapas={etapas}
          onEdit={handleEdit}
          onReorder={setEtapas}
          onRefresh={loadEtapas}
        />
      )}

      {/* Empty State */}
      {!fetching && etapas.length === 0 && !showForm && (
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
          <GripVertical size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Nenhuma etapa cadastrada
          </h3>
          <p className="text-gray-600 mb-6">
            Comece adicionando a primeira etapa do projeto
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            Adicionar Primeira Etapa
          </button>
        </div>
      )}

      {/* Info Box */}
      {etapas.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="p-1">
              <AlertCircle size={20} className="text-blue-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-blue-900 mb-1">Dica</h4>
              <p className="text-sm text-blue-800">
                Arraste as etapas usando o ícone <GripVertical size={16} className="inline" /> para reordenar.
                A ordem das etapas define a sequência de execução do projeto.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
