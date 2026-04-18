/**
 * Mock Triage Gateway
 * Fase 6: Gatilhos de Triagem
 * 
 * Implementação mock do gateway de triagem para desenvolvimento/testes
 * Simula comportamento do futuro módulo de triagem real
 */

import {
  ITriageGateway,
  AbrirTriagemDTO,
  FecharTriagemDTO,
  ListarTriagensDTO,
  Triagem,
  ListarTriagensResponse,
  RespostaTriagem,
  EstatisticasTriagem,
  StatusTriagem,
} from '../interfaces/triage-gateway.interface';

/**
 * Armazena triagens em memória para simulação
 */
const triagensEmMemoria: Map<string, Triagem> = new Map();
let contadorTriagens = 1;

/**
 * Implementação mock do gateway de triagem
 * Simula operações de triagem sem integração real
 */
export class MockTriageGateway implements ITriageGateway {
  private latenciaMs: number;

  constructor(latenciaMs: number = 100) {
    this.latenciaMs = latenciaMs;
  }

  /**
   * Simula latência de rede
   */
  private async simularLatencia(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, this.latenciaMs));
  }

  /**
   * Abre uma nova triagem
   */
  async abrirTriagem(dados: AbrirTriagemDTO): Promise<RespostaTriagem> {
    await this.simularLatencia();

    const triagemId = `TRI-${Date.now()}-${contadorTriagens++}`;
    const prazoEstimado = dados.prazoEstimadoDias
      ? new Date(Date.now() + dados.prazoEstimadoDias * 24 * 60 * 60 * 1000)
      : undefined;

    const triagem: Triagem = {
      id: triagemId,
      projetoId: dados.projetoId,
      tipo: dados.tipo,
      status: 'PENDENTE',
      prioridade: dados.prioridade,
      motivo: dados.motivo,
      itemId: dados.itemId,
      usuarioSolicitanteId: dados.usuarioId,
      aberturaEm: new Date(),
      prazoEstimado,
    };

    triagensEmMemoria.set(triagemId, triagem);

    return {
      sucesso: true,
      triagemId,
      mensagem: `Triagem ${triagemId} aberta com sucesso`,
      detalhes: {
        tipo: dados.tipo,
        prioridade: dados.prioridade,
        prazoEstimado: prazoEstimado?.toISOString(),
      },
    };
  }

  /**
   * Fecha uma triagem existente
   */
  async fecharTriagem(dados: FecharTriagemDTO): Promise<RespostaTriagem> {
    await this.simularLatencia();

    const triagem = triagensEmMemoria.get(dados.triagemId);

    if (!triagem) {
      return {
        sucesso: false,
        mensagem: `Triagem ${dados.triagemId} não encontrada`,
      };
    }

    if (triagem.status === 'CONCLUIDA') {
      return {
        sucesso: false,
        mensagem: 'Triagem já foi concluída anteriormente',
      };
    }

    if (triagem.status === 'CANCELADA') {
      return {
        sucesso: false,
        mensagem: 'Triagem foi cancelada e não pode ser concluída',
      };
    }

    // Atualiza triagem
    triagem.status = 'CONCLUIDA';
    triagem.conclusaoEm = new Date();
    triagem.resultado = dados.resultado;
    triagem.observacoes = dados.observacoes;
    triagem.acoesCorretivas = dados.acoesCorretivas;
    triagem.usuarioResponsavelId = dados.usuarioId;

    triagensEmMemoria.set(dados.triagemId, triagem);

    return {
      sucesso: true,
      triagemId: dados.triagemId,
      mensagem: 'Triagem concluída com sucesso',
      detalhes: {
        tempoDecorrido: triagem.conclusaoEm.getTime() - triagem.aberturaEm.getTime(),
        resultado: dados.resultado,
      },
    };
  }

  /**
   * Lista triagens com filtros
   */
  async listarTriagens(filtros: ListarTriagensDTO): Promise<ListarTriagensResponse> {
    await this.simularLatencia();

    const pagina = filtros.pagina || 1;
    const limite = filtros.limite || 20;

    // Filtra triagens
    let triagens = Array.from(triagensEmMemoria.values());

    if (filtros.projetoId) {
      triagens = triagens.filter(t => t.projetoId === filtros.projetoId);
    }

    if (filtros.tipo) {
      triagens = triagens.filter(t => t.tipo === filtros.tipo);
    }

    if (filtros.status) {
      triagens = triagens.filter(t => t.status === filtros.status);
    }

    if (filtros.prioridade) {
      triagens = triagens.filter(t => t.prioridade === filtros.prioridade);
    }

    if (filtros.dataInicio) {
      triagens = triagens.filter(t => t.aberturaEm >= filtros.dataInicio!);
    }

    if (filtros.dataFim) {
      triagens = triagens.filter(t => t.aberturaEm <= filtros.dataFim!);
    }

    if (filtros.apenasEmAtraso) {
      const agora = new Date();
      triagens = triagens.filter(t => 
        t.prazoEstimado && 
        t.prazoEstimado < agora && 
        t.status !== 'CONCLUIDA' &&
        t.status !== 'CANCELADA'
      );
    }

    // Ordena por data de abertura (mais recentes primeiro)
    triagens.sort((a, b) => b.aberturaEm.getTime() - a.aberturaEm.getTime());

    // Paginação
    const total = triagens.length;
    const inicio = (pagina - 1) * limite;
    const fim = inicio + limite;
    const triagensPaginadas = triagens.slice(inicio, fim);

    return {
      data: triagensPaginadas,
      paginacao: {
        paginaAtual: pagina,
        totalPaginas: Math.ceil(total / limite),
        totalItens: total,
        itensPorPagina: limite,
      },
    };
  }

  /**
   * Busca triagens pendentes de um projeto
   */
  async buscarTriagensPendentes(projetoId: number): Promise<Triagem[]> {
    await this.simularLatencia();

    return Array.from(triagensEmMemoria.values()).filter(
      t => 
        t.projetoId === projetoId && 
        (t.status === 'PENDENTE' || t.status === 'EM_ANDAMENTO')
    );
  }

  /**
   * Obtém estatísticas de triagens do projeto
   */
  async obterEstatisticas(projetoId: number): Promise<EstatisticasTriagem> {
    await this.simularLatencia();

    const triagens = Array.from(triagensEmMemoria.values())
      .filter(t => t.projetoId === projetoId);

    const pendentes = triagens.filter(t => t.status === 'PENDENTE').length;
    const emAndamento = triagens.filter(t => t.status === 'EM_ANDAMENTO').length;
    const concluidas = triagens.filter(t => t.status === 'CONCLUIDA').length;
    const canceladas = triagens.filter(t => t.status === 'CANCELADA').length;

    const agora = new Date();
    const emAtraso = triagens.filter(t =>
      t.prazoEstimado &&
      t.prazoEstimado < agora &&
      t.status !== 'CONCLUIDA' &&
      t.status !== 'CANCELADA'
    ).length;

    // Calcula tempo médio de conclusão
    const triagensConcluidasComTempo = triagens.filter(
      t => t.status === 'CONCLUIDA' && t.conclusaoEm
    );

    let tempoMedioConclusao: number | undefined;
    if (triagensConcluidasComTempo.length > 0) {
      const tempoTotal = triagensConcluidasComTempo.reduce((acc, t) => {
        const tempo = t.conclusaoEm!.getTime() - t.aberturaEm.getTime();
        return acc + tempo;
      }, 0);
      tempoMedioConclusao = tempoTotal / triagensConcluidasComTempo.length / (1000 * 60 * 60); // em horas
    }

    return {
      total: triagens.length,
      pendentes,
      emAndamento,
      concluidas,
      canceladas,
      emAtraso,
      tempoMedioConclusao,
    };
  }

  /**
   * Verifica se há triagens bloqueando conclusão
   */
  async verificarBloqueio(projetoId: number): Promise<boolean> {
    await this.simularLatencia();

    const triagens = Array.from(triagensEmMemoria.values()).filter(
      t =>
        t.projetoId === projetoId &&
        (t.status === 'PENDENTE' || t.status === 'EM_ANDAMENTO')
    );

    return triagens.length > 0;
  }

  /**
   * Verifica conexão (sempre retorna true no mock)
   */
  async verificarConexao(): Promise<boolean> {
    await this.simularLatencia();
    return true;
  }
}

// Singleton para uso global
let triageGatewayInstance: MockTriageGateway | null = null;

/**
 * Cria uma nova instância do gateway de triagem
 */
export function createTriageGateway(latenciaMs: number = 100): ITriageGateway {
  return new MockTriageGateway(latenciaMs);
}

/**
 * Obtém instância singleton do gateway de triagem
 */
export function getTriageGateway(): ITriageGateway {
  if (!triageGatewayInstance) {
    triageGatewayInstance = new MockTriageGateway();
  }
  return triageGatewayInstance;
}

/**
 * Reseta o gateway (útil para testes)
 */
export function resetTriageGateway(): void {
  triageGatewayInstance = null;
  triagensEmMemoria.clear();
  contadorTriagens = 1;
}

/**
 * Obtém triagens em memória (útil para testes)
 */
export function getTriagensEmMemoria(): Map<string, Triagem> {
  return triagensEmMemoria;
}
