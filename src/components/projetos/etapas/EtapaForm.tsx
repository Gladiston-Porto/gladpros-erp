/**
 * Formulário de Etapa
 * 
 * Features:
 * - Criar e editar etapa
 * - Validação com Zod
 * - Campos: nome, descrição, status, datas, progresso
 * - Seleção de responsável
 */

'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, X } from 'lucide-react';
import { useProjetoOperations } from '@/hooks/projetos/useProjetoOperations';
import { ETAPA_STATUS } from '@/lib/projetos/constants';
import type { ProjetoEtapa, EtapaInput } from '@/lib/projetos/types';

const etapaSchema = z.object({
  nome: z.string().min(3, 'Mínimo 3 caracteres').max(150, 'Máximo 150 caracteres'),
  descricao: z.string().optional(),
  status: z.enum(['pendente', 'em_andamento', 'concluida', 'bloqueada']),
  dataInicioPrevista: z.string().nullable().optional(),
  dataInicioReal: z.string().nullable().optional(),
  dataConclusaoPrevista: z.string().nullable().optional(),
  dataConclusaoReal: z.string().nullable().optional(),
  percentualConclusao: z.number().min(0).max(100),
  responsavelId: z.number().nullable().optional(),
});

type EtapaFormData = z.infer<typeof etapaSchema>;

interface EtapaFormProps {
  projetoId: number;
  etapa?: ProjetoEtapa | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function EtapaForm({
  projetoId,
  etapa,
  onSuccess,
  onCancel,
}: EtapaFormProps) {
  const isEditing = !!etapa;

  const { createEtapa, updateEtapa, loading } = useProjetoOperations({
    onSuccess: () => {
      if (onSuccess) onSuccess();
    },
    onError: (error: string) => {
      alert(error);
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EtapaFormData>({
    resolver: zodResolver(etapaSchema),
    defaultValues: etapa
      ? {
          nome: etapa.servico,
          descricao: etapa.descricao || '',
          status: etapa.status,
          dataInicioPrevista: etapa.inicioPrevisto || '',
          dataInicioReal: etapa.inicioReal || '',
          dataConclusaoPrevista: etapa.fimPrevisto || '',
          dataConclusaoReal: etapa.fimReal || '',
          percentualConclusao: etapa.porcentagem ? Number(etapa.porcentagem) : 0,
          responsavelId: etapa.responsavelId || null,
        }
      : {
          status: ETAPA_STATUS.PENDENTE,
          percentualConclusao: 0,
        },
  });

  const handleFormSubmit = async (data: EtapaFormData) => {
    try {
      const etapaData: EtapaInput = {
        servico: data.nome,
        descricao: data.descricao || undefined,
        status: data.status,
        ordem: etapa?.ordem || 0, // Backend vai calcular
        inicioPrevisto: data.dataInicioPrevista || undefined,
        inicioReal: data.dataInicioReal || undefined,
        fimPrevisto: data.dataConclusaoPrevista || undefined,
        fimReal: data.dataConclusaoReal || undefined,
        porcentagem: data.percentualConclusao,
        responsavelId: data.responsavelId || undefined,
      };

      if (isEditing && etapa) {
        await updateEtapa(etapa.id, etapaData);
      } else {
        await createEtapa(projetoId, etapaData);
      }
    } catch (error) {
      console.error('Erro ao salvar etapa:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Nome */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Nome da Etapa *
        </label>
        <input
          {...register('nome')}
          type="text"
          className="w-full px-4 py-2 border border-border rounded-2xl bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-transparent"
          placeholder="Ex: Fundação, Estrutura, Acabamento..."
        />
        {errors.nome && (
          <span className="text-destructive text-sm mt-1">{errors.nome.message}</span>
        )}
      </div>

      {/* Descrição */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Descrição
        </label>
        <textarea
          {...register('descricao')}
          rows={3}
          className="w-full px-4 py-2 border border-border rounded-2xl bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-transparent"
          placeholder="Descreva os detalhes desta etapa..."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Status *
          </label>
          <select
            {...register('status')}
            className="w-full px-4 py-2 border border-border rounded-2xl bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-transparent"
          >
            <option value="pendente">Pendente</option>
            <option value="em_andamento">Em Andamento</option>
            <option value="concluida">Concluída</option>
            <option value="bloqueada">Bloqueada</option>
          </select>
        </div>

        {/* Progresso */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Progresso (%)
          </label>
          <input
            {...register('percentualConclusao', { valueAsNumber: true })}
            type="number"
            min="0"
            max="100"
            step="1"
            className="w-full px-4 py-2 border border-border rounded-2xl bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-transparent"
          />
          {errors.percentualConclusao && (
            <span className="text-destructive text-sm mt-1">
              {errors.percentualConclusao.message}
            </span>
          )}
        </div>
      </div>

      {/* Datas Previstas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Data Início Prevista
          </label>
          <input
            {...register('dataInicioPrevista')}
            type="date"
            className="w-full px-4 py-2 border border-border rounded-2xl bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Data Conclusão Prevista
          </label>
          <input
            {...register('dataConclusaoPrevista')}
            type="date"
            className="w-full px-4 py-2 border border-border rounded-2xl bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-transparent"
          />
        </div>
      </div>

      {/* Datas Reais (se editando) */}
      {isEditing && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Data Início Real
            </label>
            <input
              {...register('dataInicioReal')}
              type="date"
              className="w-full px-4 py-2 border border-border rounded-2xl bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Data Conclusão Real
            </label>
            <input
              {...register('dataConclusaoReal')}
              type="date"
              className="w-full px-4 py-2 border border-border rounded-2xl bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-transparent"
            />
          </div>
        </div>
      )}

      {/* Ações */}
      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-6 py-2 bg-muted text-foreground rounded-2xl hover:bg-muted/80 transition-colors disabled:opacity-50"
        >
          <X size={18} className="inline mr-2" />
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-brand-primary text-primary-foreground rounded-2xl hover:bg-brand-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></div>
              Salvando...
            </>
          ) : (
            <>
              <Save size={18} />
              {isEditing ? 'Atualizar' : 'Criar'} Etapa
            </>
          )}
        </button>
      </div>
    </form>
  );
}
