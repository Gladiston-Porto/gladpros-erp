'use server'

import { revalidatePath } from 'next/cache';
import { requireServerUser } from '@/shared/lib/requireServerUser';
import { ProjectProposalConversionService } from '@/domains/projects/services';

export async function convertProposalToProject(propostaId: number) {
  try {
    // Auth: verificar se o usuário está autenticado
    const user = await requireServerUser();
    if (!user?.id) {
      return { success: false, error: 'Não autorizado' };
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
