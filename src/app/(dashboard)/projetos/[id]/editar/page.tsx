'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import ProjetoForm from '@/components/projetos/ProjetoForm';
import { useProjetoOperations } from '@/hooks/projetos/useProjetoOperations';
import type { Projeto } from '@/lib/projetos/types';

/**
 * Página de edição de projeto
 * 
 * Features:
 * - Carrega dados do projeto existente
 * - Formulário pré-preenchido
 * - Validação com Zod
 * - Loading states
 * - Error handling
 * - Redirecionamento após edição
 */
export default function EditarProjetoPage() {
  const params = useParams();
  const router = useRouter();
  const projetoId = Number(params.id);

  const [projeto, setProjeto] = useState<Projeto | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { fetchProjeto, fetching } = useProjetoOperations({
    onError: (error) => setError(error),
  });

  useEffect(() => {
    loadProjeto();
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
      setError('Erro ao carregar projeto');
      console.error('Erro ao carregar projeto:', err);
    }
  };

  const handleSuccess = (projetoAtualizado: Projeto) => {
    // Redireciona para a página de detalhes
    router.push(`/projetos/${projetoAtualizado.id}`);
  };

  const handleCancel = () => {
    // Volta para a página de detalhes
    router.push(`/projetos/${projetoId}`);
  };

  // Loading state
  if (fetching && !projeto) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Carregando projeto...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Voltar</span>
          </button>

          <div className="bg-card rounded-2xl shadow-sm p-8">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <AlertCircle size={24} />
              <h2 className="text-xl font-semibold">Erro ao Carregar Projeto</h2>
            </div>
            <p className="text-muted-foreground mb-6">{error}</p>
            <div className="flex gap-3">
              <button
                onClick={loadProjeto}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Tentar Novamente
              </button>
              <button
                onClick={() => router.push('/projetos')}
                className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
              >
                Voltar para Projetos
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Not found state
  if (!projeto) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Voltar</span>
          </button>

          <div className="bg-card rounded-2xl shadow-sm p-8 text-center">
            <AlertCircle size={48} className="mx-auto text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Projeto Não Encontrado
            </h2>
            <p className="text-muted-foreground mb-6">
              O projeto que você está procurando não existe ou foi removido.
            </p>
            <button
              onClick={() => router.push('/projetos')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Voltar para Projetos
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Form state
  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Voltar</span>
          </button>
          
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-foreground">
                Editar Projeto
              </h1>
              <span className="px-3 py-1 bg-muted text-foreground text-sm font-medium rounded-full">
                #{projeto.numeroProjeto}
              </span>
            </div>
            <p className="text-muted-foreground">
              {projeto.titulo}
            </p>
          </div>
        </div>

        {/* Formulário */}
        <div className="bg-card rounded-2xl shadow-sm">
          <ProjetoForm 
            projeto={projeto}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </div>
      </div>
    </div>
  );
}
