/**
 * Prisma Triage Gateway — Real implementation
 * Integra o domain de projetos com o módulo de triagem via Prisma
 */
import { prisma } from '@/lib/prisma';
import type {
  ITriageGateway,
  AbrirTriagemDTO,
  FecharTriagemDTO,
  ListarTriagensDTO,
  ListarTriagensResponse,
  Triagem,
  RespostaTriagem,
  EstatisticasTriagem,
} from '../interfaces/triage-gateway.interface';
import type { TriagemTipo, TriagemStatus, TriagemPrioridade } from '@prisma/client';

// ─── Helpers ────────────────────────────────────────────────────────

function mapPrismaToTriagem(row: {
  id: number;
  projetoId: number;
  tipo: TriagemTipo;
  status: TriagemStatus;
  prioridade: TriagemPrioridade;
  motivo: string;
  itemId: number | null;
  usuarioSolicitanteId: number;
  usuarioResponsavelId: number | null;
  aberturaEm: Date;
  conclusaoEm: Date | null;
  resultado: string | null;
  observacoes: string | null;
  acoesCorretivas: string | null;
  prazoEstimado: Date | null;
}): Triagem {
  let acoes: string[] | undefined;
  if (row.acoesCorretivas) {
    try {
      acoes = JSON.parse(row.acoesCorretivas);
    } catch {
      acoes = [row.acoesCorretivas];
    }
  }

  return {
    id: String(row.id),
    projetoId: row.projetoId,
    tipo: row.tipo,
    status: row.status,
    prioridade: row.prioridade,
    motivo: row.motivo,
    itemId: row.itemId ?? undefined,
    usuarioSolicitanteId: row.usuarioSolicitanteId,
    usuarioResponsavelId: row.usuarioResponsavelId ?? undefined,
    aberturaEm: row.aberturaEm,
    conclusaoEm: row.conclusaoEm ?? undefined,
    resultado: row.resultado ?? undefined,
    observacoes: row.observacoes ?? undefined,
    acoesCorretivas: acoes,
    prazoEstimado: row.prazoEstimado ?? undefined,
  };
}

// ─── Gateway ────────────────────────────────────────────────────────

export class PrismaTriageGateway implements ITriageGateway {
  async abrirTriagem(dados: AbrirTriagemDTO): Promise<RespostaTriagem> {
    try {
      const prazoEstimado = dados.prazoEstimadoDias
        ? new Date(Date.now() + dados.prazoEstimadoDias * 86_400_000)
        : undefined;

      const triagem = await prisma.triagem.create({
        data: {
          projetoId: dados.projetoId,
          tipo: dados.tipo as TriagemTipo,
          prioridade: dados.prioridade as TriagemPrioridade,
          motivo: dados.motivo,
          itemId: dados.itemId ?? null,
          usuarioSolicitanteId: dados.usuarioId,
          prazoEstimado,
        },
      });

      return {
        sucesso: true,
        triagemId: String(triagem.id),
        mensagem: `Triagem #${triagem.id} aberta com sucesso`,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return { sucesso: false, mensagem: `Erro ao abrir triagem: ${msg}` };
    }
  }

  async fecharTriagem(dados: FecharTriagemDTO): Promise<RespostaTriagem> {
    try {
      const id = Number(dados.triagemId);
      const existing = await prisma.triagem.findUnique({ where: { id } });

      if (!existing) {
        return { sucesso: false, mensagem: `Triagem ${dados.triagemId} não encontrada` };
      }

      if (existing.status === 'CONCLUIDA' || existing.status === 'CANCELADA') {
        return { sucesso: false, mensagem: `Triagem já está ${existing.status.toLowerCase()}` };
      }

      await prisma.triagem.update({
        where: { id },
        data: {
          status: 'CONCLUIDA',
          resultado: dados.resultado,
          observacoes: dados.observacoes ?? null,
          acoesCorretivas: dados.acoesCorretivas ? JSON.stringify(dados.acoesCorretivas) : null,
          usuarioResponsavelId: dados.usuarioId,
          conclusaoEm: new Date(),
        },
      });

      return {
        sucesso: true,
        triagemId: dados.triagemId,
        mensagem: `Triagem #${dados.triagemId} concluída com sucesso`,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return { sucesso: false, mensagem: `Erro ao fechar triagem: ${msg}` };
    }
  }

  async listarTriagens(filtros: ListarTriagensDTO): Promise<ListarTriagensResponse> {
    const pagina = filtros.pagina ?? 1;
    const limite = filtros.limite ?? 20;
    const skip = (pagina - 1) * limite;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (filtros.projetoId) where.projetoId = filtros.projetoId;
    if (filtros.tipo) where.tipo = filtros.tipo;
    if (filtros.status) where.status = filtros.status;
    if (filtros.prioridade) where.prioridade = filtros.prioridade;

    if (filtros.dataInicio || filtros.dataFim) {
      where.aberturaEm = {};
      if (filtros.dataInicio) where.aberturaEm.gte = filtros.dataInicio;
      if (filtros.dataFim) where.aberturaEm.lte = filtros.dataFim;
    }

    if (filtros.apenasEmAtraso) {
      where.prazoEstimado = { lt: new Date() };
      where.status = { in: ['PENDENTE', 'EM_ANDAMENTO'] };
    }

    const [rows, total] = await Promise.all([
      prisma.triagem.findMany({
        where,
        skip,
        take: limite,
        orderBy: { aberturaEm: 'desc' },
      }),
      prisma.triagem.count({ where }),
    ]);

    return {
      data: rows.map(mapPrismaToTriagem),
      paginacao: {
        paginaAtual: pagina,
        totalPaginas: Math.ceil(total / limite),
        totalItens: total,
        itensPorPagina: limite,
      },
    };
  }

  async buscarTriagensPendentes(projetoId: number): Promise<Triagem[]> {
    const rows = await prisma.triagem.findMany({
      where: {
        projetoId,
        status: { in: ['PENDENTE', 'EM_ANDAMENTO'] },
      },
      orderBy: [
        { prioridade: 'desc' },
        { aberturaEm: 'asc' },
      ],
    });

    return rows.map(mapPrismaToTriagem);
  }

  async obterEstatisticas(projetoId: number): Promise<EstatisticasTriagem> {
    const all = await prisma.triagem.findMany({
      where: { projetoId },
      select: {
        status: true,
        aberturaEm: true,
        conclusaoEm: true,
        prazoEstimado: true,
      },
    });

    const now = new Date();
    let pendentes = 0;
    let emAndamento = 0;
    let concluidas = 0;
    let canceladas = 0;
    let emAtraso = 0;
    let totalTempoMs = 0;
    let countConcluidas = 0;

    for (const t of all) {
      switch (t.status) {
        case 'PENDENTE':
          pendentes++;
          if (t.prazoEstimado && t.prazoEstimado < now) emAtraso++;
          break;
        case 'EM_ANDAMENTO':
          emAndamento++;
          if (t.prazoEstimado && t.prazoEstimado < now) emAtraso++;
          break;
        case 'CONCLUIDA':
          concluidas++;
          if (t.conclusaoEm) {
            totalTempoMs += t.conclusaoEm.getTime() - t.aberturaEm.getTime();
            countConcluidas++;
          }
          break;
        case 'CANCELADA':
          canceladas++;
          break;
      }
    }

    return {
      total: all.length,
      pendentes,
      emAndamento,
      concluidas,
      canceladas,
      emAtraso,
      tempoMedioConclusao: countConcluidas > 0
        ? Math.round(totalTempoMs / countConcluidas / 3_600_000) // convert ms → hours
        : undefined,
    };
  }

  async verificarBloqueio(projetoId: number): Promise<boolean> {
    const count = await prisma.triagem.count({
      where: {
        projetoId,
        status: { in: ['PENDENTE', 'EM_ANDAMENTO'] },
      },
    });
    return count > 0;
  }

  async verificarConexao(): Promise<boolean> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}
