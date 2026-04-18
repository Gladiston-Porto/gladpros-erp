'use client';

import { useRouter } from 'next/navigation';
import { ModulePageHeader } from "@gladpros/ui/module-page-header";
import { FolderPlus } from "lucide-react";
import ProjetoForm from '@/components/projetos/ProjetoForm';
import type { Projeto } from '@/lib/projetos/types';

/**
 * Página de criação de novo projeto
 * 
 * Features:
 * - Formulário completo de criação
 * - Validação com Zod
 * - Redirecionamento após criação
 * - Botão de voltar
 */
export default function NovoProjetoPage() {
  const router = useRouter();

  const handleSuccess = (projeto: Projeto) => {
    // Redireciona para a página de detalhes do projeto criado
    router.push(`/projetos/${projeto.id}`);
  };

  const handleCancel = () => {
    // Volta para a listagem de projetos
    router.push('/projetos');
  };

  return (
    <div className="space-y-8">
      <ModulePageHeader
        title="Novo Projeto"
        description="Preencha os dados abaixo para criar um novo projeto"
        icon={<FolderPlus />}
        accentColor="#0098DA"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Projetos", href: "/projetos" },
          { label: "Novo" },
        ]}
      />
      
      <div className="max-w-5xl mx-auto">
        <ProjetoForm onSuccess={handleSuccess} onCancel={handleCancel} />
      </div>
    </div>
  );
}
