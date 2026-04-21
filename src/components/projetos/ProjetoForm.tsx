/**
 * Componente de Formulário de Projeto
 * 
 * Usado tanto para criação quanto edição de projetos
 * 
 * Features:
 * - Validação com Zod
 * - Campos com máscaras
 * - Seleção de cliente com autocomplete
 * - Seleção de proposta vinculada
 * - Date pickers
 * - Campos financeiros formatados
 * - Cálculo automático de margem
 * - Preview de dados antes de salvar
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Save,
  X,
  AlertCircle,
  Calendar,
  DollarSign,
  User,
  MapPin,
  FileText,
  ChevronDown,
  Search,
} from 'lucide-react';

import { projetoSchema, type ProjetoFormData } from '@/lib/projetos/validation';
import type { Projeto } from '@/lib/projetos/types';
import {
  PROJETO_STATUS,
  PROJETO_PRIORIDADE,
  PROJETO_STATUS_LABELS,
  PROJETO_PRIORIDADE_LABELS,
} from '@/lib/projetos/constants';
import { formatCurrency } from '@/lib/projetos/formatting';
import { calculateMargin } from '@/lib/projetos/calculations';
import { useProjetoOperations } from '@/hooks/projetos/useProjetoOperations';

interface ProjetoFormProps {
  projeto?: Projeto;
  onSubmit?: (data: ProjetoFormData) => Promise<void>;
  onSuccess?: (projeto: Projeto) => void;
  onCancel?: () => void;
  loading?: boolean;
}

export default function ProjetoForm({
  projeto,
  onSubmit,
  onSuccess,
  onCancel,
  loading: externalLoading = false,
}: ProjetoFormProps) {
  const router = useRouter();
  const isEditing = !!projeto;
  
  const { createProjeto, updateProjeto, loading: operationLoading } = useProjetoOperations({
    onSuccess: () => {},
    onError: (error: string) => {
      alert(error);
    },
  });
  
  const loading = externalLoading || operationLoading;

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(projetoSchema),
    defaultValues: projeto
      ? {
          propostaId: projeto.propostaId,
          clienteId: projeto.clienteId,
          titulo: projeto.titulo,
          descricao: projeto.descricao || '',
          status: projeto.status,
          dataInicioPrevista: projeto.dataInicioPrevista || '',
          dataInicioReal: projeto.dataInicioReal || '',
          dataConclusaoPrevista: projeto.dataConclusaoPrevista || '',
          dataConclusaoReal: projeto.dataConclusaoReal || '',
          valorEstimado: projeto.valorEstimado || undefined,
          custoPrevisto: projeto.custoPrevisto || undefined,
          custoReal: projeto.custoReal || undefined,
          margemPrevista: projeto.margemPrevista || undefined,
          margemReal: projeto.margemReal || undefined,
          lucroPrevisto: projeto.lucroPrevisto || undefined,
          lucroReal: projeto.lucroReal || undefined,
          responsavelId: projeto.responsavelId || undefined,
          prioridade: projeto.prioridade,
          localidade: projeto.localidade || '',
          endereco: projeto.endereco || '',
        }
      : {
          status: PROJETO_STATUS.PLANEJADO,
          prioridade: PROJETO_PRIORIDADE.MEDIA,
        },
  });

  // Estados para autocomplete
  const [clientes, setClientes] = useState<Array<{ id: number; nome: string }>>([]);
  const [responsaveis, setResponsaveis] = useState<Array<{ id: number; nome: string }>>([]);
  const [propostas, setPropostas] = useState<Array<{ id: number; numero: string; titulo: string }>>([]);
  
  const [searchCliente, setSearchCliente] = useState('');
  const [showClienteDropdown, setShowClienteDropdown] = useState(false);
  const [selectedClienteNome, setSelectedClienteNome] = useState('');

  // Watch para cálculos automáticos
  const valorEstimado = watch('valorEstimado');
  const custoPrevisto = watch('custoPrevisto');
  const custoReal = watch('custoReal');

  // Calcular margem prevista automaticamente
  useEffect(() => {
    if (valorEstimado && custoPrevisto) {
      const margem = calculateMargin(valorEstimado, custoPrevisto);
      setValue('margemPrevista', Number(margem.toFixed(2)));
      
      const lucro = valorEstimado - custoPrevisto;
      setValue('lucroPrevisto', Number(lucro.toFixed(2)));
    }
  }, [valorEstimado, custoPrevisto, setValue]);

  // Calcular margem real automaticamente
  useEffect(() => {
    if (valorEstimado && custoReal) {
      const margem = calculateMargin(valorEstimado, custoReal);
      setValue('margemReal', Number(margem.toFixed(2)));
      
      const lucro = valorEstimado - custoReal;
      setValue('lucroReal', Number(lucro.toFixed(2)));
    }
  }, [valorEstimado, custoReal, setValue]);

  // Carregar clientes
  useEffect(() => {
    const loadClientes = async () => {
      try {
        const response = await fetch('/api/clientes?pageSize=100');
        const result = await response.json();
        
        if (result.data) {
          setClientes(
            result.data.map((c: { id: number; nomeCompletoOuRazao: string }) => ({
              id: c.id,
              nome: c.nomeCompletoOuRazao,
            }))
          );
        }
      } catch (error) {
      }
    };

    loadClientes();
  }, []);

  // Carregar responsáveis (usuários)
  useEffect(() => {
    const loadResponsaveis = async () => {
      try {
        const response = await fetch('/api/usuarios?pageSize=100');
        const result = await response.json();
        
        if (result.data) {
          setResponsaveis(
            result.data.map((u: { id: number; nome: string }) => ({
              id: u.id,
              nome: u.nome,
            }))
          );
        }
      } catch (error) {
      }
    };

    loadResponsaveis();
  }, []);

  // Carregar propostas do cliente selecionado
  const clienteId = watch('clienteId');
  useEffect(() => {
    if (clienteId) {
      const loadPropostas = async () => {
        try {
          const response = await fetch(`/api/propostas?clienteId=${clienteId}&status=aprovada`);
          const result = await response.json();
          
          if (result.data) {
            setPropostas(
              result.data.map((p: { id: number; numero: string; titulo: string }) => ({
                id: p.id,
                numero: p.numero,
                titulo: p.titulo,
              }))
            );
          }
        } catch (error) {
        }
      };

      loadPropostas();
    } else {
      setPropostas([]);
    }
  }, [clienteId]);

  // Filtrar clientes pela busca
  const filteredClientes = clientes.filter((c) =>
    c.nome?.toLowerCase().includes(searchCliente.toLowerCase())
  );

  const handleClienteSelect = (cliente: { id: number; nome: string }) => {
    setValue('clienteId', cliente.id);
    setSelectedClienteNome(cliente.nome);
    setShowClienteDropdown(false);
    setSearchCliente('');
  };

  const handleFormSubmit = async (data: ProjetoFormData) => {
    try {
      // Se tem callback customizado, usa ele
      if (onSubmit) {
        await onSubmit(data);
        return;
      }
      
      // Caso contrário, usa a operação padrão
      let resultado: Projeto;
      if (isEditing && projeto) {
        resultado = await updateProjeto(projeto.id, data);
      } else {
        resultado = await createProjeto(data);
      }
      
      // Chama callback de sucesso se fornecido
      if (onSuccess) {
        onSuccess(resultado);
      }
    } catch (error) {
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8">
      {/* Seção: Informações Básicas */}
      <div className="bg-card rounded-2xl shadow p-6">
        <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
          <FileText size={24} className="text-brand-primary" />
          Informações Básicas
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Cliente */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-foreground mb-2">
              Cliente *
            </label>
            <div className="relative">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                  size={20}
                />
                <input
                  type="text"
                  placeholder="Buscar cliente..."
                  value={selectedClienteNome || searchCliente}
                  onChange={(e) => {
                    setSearchCliente(e.target.value);
                    setShowClienteDropdown(true);
                    setSelectedClienteNome('');
                  }}
                  onFocus={() => setShowClienteDropdown(true)}
                  className={`w-full pl-10 pr-4 py-2 border rounded-2xl focus:ring-2 focus:ring-ring ${
                    errors.clienteId ? 'border-destructive' : 'border-border'
                  }`}
                />
              </div>

              {showClienteDropdown && filteredClientes.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-2xl shadow-lg max-h-60 overflow-y-auto">
                  {filteredClientes.map((cliente) => (
                    <button
                      key={cliente.id}
                      type="button"
                      onClick={() => handleClienteSelect(cliente)}
                      className="w-full text-left px-4 py-2 hover:bg-brand-primary/10 transition-colors"
                    >
                      {cliente.nome}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {errors.clienteId && (
              <p className="mt-1 text-sm text-destructive flex items-center gap-1">
                <AlertCircle size={14} />
                {errors.clienteId.message}
              </p>
            )}
          </div>

          {/* Proposta Vinculada */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-foreground mb-2">
              Proposta Vinculada (opcional)
            </label>
            <select
              {...register('propostaId', { valueAsNumber: true })}
              className="w-full px-4 py-2 border border-border rounded-2xl focus:ring-2 focus:ring-ring"
              disabled={!clienteId}
            >
              <option value="">Nenhuma</option>
              {propostas.map((proposta) => (
                <option key={proposta.id} value={proposta.id}>
                  {proposta.numero} - {proposta.titulo}
                </option>
              ))}
            </select>
            {!clienteId && (
              <p className="mt-1 text-sm text-muted-foreground">
                Selecione um cliente primeiro
              </p>
            )}
          </div>

          {/* Título */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-foreground mb-2">
              Título do Projeto *
            </label>
            <input
              type="text"
              {...register('titulo')}
              placeholder="Ex: Reforma do escritório central"
              className={`w-full px-4 py-2 border rounded-2xl focus:ring-2 focus:ring-ring ${
                errors.titulo ? 'border-destructive' : 'border-border'
              }`}
            />
            {errors.titulo && (
              <p className="mt-1 text-sm text-destructive flex items-center gap-1">
                <AlertCircle size={14} />
                {errors.titulo.message}
              </p>
            )}
          </div>

          {/* Descrição */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-foreground mb-2">
              Descrição
            </label>
            <textarea
              {...register('descricao')}
              rows={4}
              placeholder="Descreva o escopo e objetivos do projeto..."
              className={`w-full px-4 py-2 border rounded-2xl focus:ring-2 focus:ring-ring resize-none ${
                errors.descricao ? 'border-destructive' : 'border-border'
              }`}
            />
            {errors.descricao && (
              <p className="mt-1 text-sm text-destructive flex items-center gap-1">
                <AlertCircle size={14} />
                {errors.descricao.message}
              </p>
            )}
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Status
            </label>
            <select
              {...register('status')}
              className="w-full px-4 py-2 border border-border rounded-2xl focus:ring-2 focus:ring-ring"
            >
              {Object.entries(PROJETO_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Prioridade */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Prioridade
            </label>
            <select
              {...register('prioridade')}
              className="w-full px-4 py-2 border border-border rounded-2xl focus:ring-2 focus:ring-ring"
            >
              {Object.entries(PROJETO_PRIORIDADE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Responsável */}
          <div className="md:col-span-2">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
              <User size={16} />
              Responsável
            </label>
            <select
              {...register('responsavelId', { valueAsNumber: true })}
              className="w-full px-4 py-2 border border-border rounded-2xl focus:ring-2 focus:ring-ring"
            >
              <option value="">Nenhum</option>
              {responsaveis.map((resp) => (
                <option key={resp.id} value={resp.id}>
                  {resp.nome}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Seção: Datas */}
      <div className="bg-card rounded-2xl shadow p-6">
        <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
          <Calendar size={24} className="text-brand-primary" />
          Cronograma
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Data Início Prevista */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Data Início Prevista
            </label>
            <input
              type="date"
              {...register('dataInicioPrevista')}
              className={`w-full px-4 py-2 border rounded-2xl focus:ring-2 focus:ring-ring ${
                errors.dataInicioPrevista ? 'border-destructive' : 'border-border'
              }`}
            />
            {errors.dataInicioPrevista && (
              <p className="mt-1 text-sm text-destructive">
                {errors.dataInicioPrevista.message}
              </p>
            )}
          </div>

          {/* Data Conclusão Prevista */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Data Conclusão Prevista
            </label>
            <input
              type="date"
              {...register('dataConclusaoPrevista')}
              className={`w-full px-4 py-2 border rounded-2xl focus:ring-2 focus:ring-ring ${
                errors.dataConclusaoPrevista ? 'border-destructive' : 'border-border'
              }`}
            />
            {errors.dataConclusaoPrevista && (
              <p className="mt-1 text-sm text-destructive">
                {errors.dataConclusaoPrevista.message}
              </p>
            )}
          </div>

          {/* Data Início Real */}
          {isEditing && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Data Início Real
              </label>
              <input
                type="date"
                {...register('dataInicioReal')}
                className="w-full px-4 py-2 border border-border rounded-2xl focus:ring-2 focus:ring-ring"
              />
            </div>
          )}

          {/* Data Conclusão Real */}
          {isEditing && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Data Conclusão Real
              </label>
              <input
                type="date"
                {...register('dataConclusaoReal')}
                className="w-full px-4 py-2 border border-border rounded-2xl focus:ring-2 focus:ring-ring"
              />
            </div>
          )}
        </div>
      </div>

      {/* Seção: Financeiro */}
      <div className="bg-card rounded-2xl shadow p-6">
        <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
          <DollarSign size={24} className="text-brand-primary" />
          Informações Financeiras
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Valor Estimado */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Valor Estimado
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <input
                type="number"
                step="0.01"
                {...register('valorEstimado', { valueAsNumber: true })}
                placeholder="0,00"
                className="w-full pl-10 pr-4 py-2 border border-border rounded-2xl focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {/* Custo Previsto */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Custo Previsto
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <input
                type="number"
                step="0.01"
                {...register('custoPrevisto', { valueAsNumber: true })}
                placeholder="0,00"
                className="w-full pl-10 pr-4 py-2 border border-border rounded-2xl focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {/* Margem Prevista (calculada automaticamente) */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Margem Prevista (%)
            </label>
            <input
              type="number"
              {...register('margemPrevista', { valueAsNumber: true })}
              readOnly
              className="w-full px-4 py-2 border border-border rounded-2xl bg-muted cursor-not-allowed"
              placeholder="Calculado automaticamente"
            />
          </div>

          {/* Lucro Previsto (calculado automaticamente) */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Lucro Previsto
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <input
                type="number"
                {...register('lucroPrevisto', { valueAsNumber: true })}
                readOnly
                className="w-full pl-10 pr-4 py-2 border border-border rounded-2xl bg-muted cursor-not-allowed"
                placeholder="Calculado automaticamente"
              />
            </div>
          </div>

          {/* Custo Real (apenas em edição) */}
          {isEditing && (
            <>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Custo Real
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    {...register('custoReal', { valueAsNumber: true })}
                    placeholder="0,00"
                    className="w-full pl-10 pr-4 py-2 border border-border rounded-2xl focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              {/* Margem Real (calculada) */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Margem Real (%)
                </label>
                <input
                  type="number"
                  {...register('margemReal', { valueAsNumber: true })}
                  readOnly
                  className="w-full px-4 py-2 border border-border rounded-2xl bg-muted cursor-not-allowed"
                  placeholder="Calculado automaticamente"
                />
              </div>

              {/* Lucro Real (calculado) */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Lucro Real
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <input
                    type="number"
                    {...register('lucroReal', { valueAsNumber: true })}
                    readOnly
                    className="w-full pl-10 pr-4 py-2 border border-border rounded-2xl bg-muted cursor-not-allowed"
                    placeholder="Calculado automaticamente"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Alertas Financeiros */}
        {valorEstimado && custoPrevisto && custoPrevisto > valorEstimado && (
          <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl">
            <div className="flex items-start gap-2">
              <AlertCircle className="text-yellow-600 shrink-0 mt-0.5" size={20} />
              <div>
                <p className="text-sm font-medium text-yellow-800">
                  Atenção: Custo previsto maior que valor estimado
                </p>
                <p className="text-sm text-yellow-700 mt-1">
                  O projeto está com margem negativa. Revise os valores antes de continuar.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Seção: Localização */}
      <div className="bg-card rounded-2xl shadow p-6">
        <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
          <MapPin size={24} className="text-brand-primary" />
          Localização
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Localidade */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Cidade/Estado
            </label>
            <input
              type="text"
              {...register('localidade')}
              placeholder="Ex: São Paulo - SP"
              className="w-full px-4 py-2 border border-border rounded-2xl focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Endereço */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Endereço Completo
            </label>
            <input
              type="text"
              {...register('endereco')}
              placeholder="Ex: Av. Paulista, 1000"
              className="w-full px-4 py-2 border border-border rounded-2xl focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      </div>

      {/* Botões de Ação */}
      <div className="flex items-center justify-end gap-4 bg-muted -mx-6 -mb-6 px-6 py-4 rounded-b-lg">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting || loading}
          className="px-6 py-2 border border-border text-foreground rounded-2xl hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <X size={20} />
          Cancelar
        </button>
        
        <button
          type="submit"
          disabled={isSubmitting || loading}
          className="px-6 py-2 bg-brand-primary text-primary-foreground rounded-2xl hover:bg-brand-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isSubmitting || loading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground"></div>
              Salvando...
            </>
          ) : (
            <>
              <Save size={20} />
              {isEditing ? 'Atualizar Projeto' : 'Criar Projeto'}
            </>
          )}
        </button>
      </div>
    </form>
  );
}
