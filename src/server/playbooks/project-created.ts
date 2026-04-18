/**
 * Playbook: project.created
 * Triggered when a project is created (from proposal conversion or manual)
 * 
 * Steps:
 * 1. Validate the project exists and has proper data
 * 2. Open initial triage (if project originated from a proposal with materials)
 * 3. Notify responsible user and creator
 */
import { PlaybookStep, PlaybookContext } from './types';
import { prisma } from '@/lib/prisma';
import { getTriageGateway } from '@/domains/projects/gateways';
import { NotificationService } from '@/shared/lib/notifications';

export interface ProjectCreatedContext extends PlaybookContext {
  projetoId: number;
  fromPropostaId?: number;
  createdBy: number;
  // Populated by steps
  triagemId?: string;
}

export function createProjectCreatedSteps(ctx: ProjectCreatedContext): PlaybookStep[] {
  return [
    {
      name: 'validate-project',
      async run() {
        const projeto = await prisma.projeto.findUnique({
          where: { id: ctx.projetoId },
          select: { id: true, status: true, titulo: true, numeroProjeto: true },
        });
        if (!projeto) {
          throw new Error(`Projeto ${ctx.projetoId} não encontrado`);
        }
      },
    },
    {
      name: 'open-initial-triage',
      async run() {
        // Only open triage if project has materials from proposal
        if (!ctx.fromPropostaId) return;

        const materiais = await prisma.propostaMaterial.findMany({
          where: { propostaId: ctx.fromPropostaId },
          select: { id: true },
        });

        if (materiais.length === 0) return;

        const triageGateway = getTriageGateway();
        const result = await triageGateway.abrirTriagem({
          projetoId: ctx.projetoId,
          tipo: 'MATERIAL',
          prioridade: 'MEDIA',
          motivo: `Triagem inicial de ${materiais.length} material(is) da proposta #${ctx.fromPropostaId}`,
          usuarioId: ctx.createdBy,
          prazoEstimadoDias: 7,
        });

        if (result.sucesso) {
          ctx.triagemId = result.triagemId;
        }
      },
    },
    {
      name: 'notify-team',
      async run() {
        const projeto = await prisma.projeto.findUnique({
          where: { id: ctx.projetoId },
          select: { numeroProjeto: true, titulo: true, responsavelId: true, criadoPor: true },
        });

        if (!projeto) return;

        // Notify the responsible user (if different from creator)
        if (projeto.responsavelId && projeto.responsavelId !== ctx.createdBy) {
          await NotificationService.create({
            userId: projeto.responsavelId,
            type: 'info',
            title: 'Novo projeto atribuído',
            message: `Projeto ${projeto.numeroProjeto} — ${projeto.titulo} foi atribuído a você`,
            data: { type: 'project_created', projetoId: ctx.projetoId },
          }).catch(() => {}); // best-effort
        }

        // Notify creator
        await NotificationService.create({
          userId: ctx.createdBy,
          type: 'success',
          title: 'Projeto criado',
          message: `Projeto ${projeto.numeroProjeto} — ${projeto.titulo} criado com sucesso${ctx.triagemId ? '. Triagem inicial aberta.' : ''}`,
          data: { type: 'project_created', projetoId: ctx.projetoId, triagemId: ctx.triagemId },
        }).catch(() => {});
      },
    },
  ];
}
