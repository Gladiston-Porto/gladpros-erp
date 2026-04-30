'use server'

import { revalidatePath } from 'next/cache';
import { requireServerUser } from '@/shared/lib/requireServerUser';
import { can, type Role } from '@/shared/lib/rbac-core';
import { ProjectProposalConversionService } from '@/domains/projects/services';

export async function convertProposalToProject(propostaId: number) {
  try {
    const user = await requireServerUser();
    if (!user?.id) {
      return { success: false, error: 'Não autorizado' };
    }
    if (!can(user.role as Role, 'projetos', 'create')) {
      return { success: false, error: 'Sem permissão para criar projetos' };
    }
    const service = new ProjectProposalConversionService();
    const projeto = await service.convertFromProposal(propostaId, Number(user.id));

    revalidatePath(`/propostas/${propostaId}`);
    return { success: true, projetoId: projeto.id };

  } catch (error) {
    console.error('Erro ao converter proposta:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
  }
}
