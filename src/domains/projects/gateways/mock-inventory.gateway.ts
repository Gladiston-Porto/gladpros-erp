/**
 * Implementação Mockada do Gateway de Estoque
 * Fase 5: Ponte Estoque
 * 
 * Esta implementação simula as operações de integração com sistema de estoque.
 * Quando o módulo de estoque for implementado, esta classe será substituída
 * pela implementação real que se comunicará com o sistema de estoque/almoxarifado.
 * 
 * @note Esta é uma implementação temporária para desenvolvimento e testes
 */

import {
  IInventoryGateway,
  LiberarMaterialDTO,
  DevolverMaterialDTO,
  RespostaIntegracaoEstoque,
  DisponibilidadeMaterial,
} from '../interfaces/inventory-gateway.interface';

/**
 * Gateway mockado para simulação de integração com estoque
 * 
 * Comportamento atual:
 * - Sempre retorna sucesso nas operações
 * - Gera IDs mockados para rastreamento
 * - Simula latência de rede (100ms)
 * - Retorna disponibilidade ilimitada para qualquer material
 * 
 * @todo Substituir por implementação real quando módulo de estoque estiver pronto
 */
export class MockInventoryGateway implements IInventoryGateway {
  private simulateLatency = true;
  private latencyMs = 100;

  constructor(options?: { simulateLatency?: boolean; latencyMs?: number }) {
    if (options?.simulateLatency !== undefined) {
      this.simulateLatency = options.simulateLatency;
    }
    if (options?.latencyMs !== undefined) {
      this.latencyMs = options.latencyMs;
    }
  }

  /**
   * Simula liberação de material do estoque
   * 
   * Comportamento mockado:
   * - Sempre retorna sucesso
   * - Gera ID mockado no formato 'LIB-{timestamp}'
   * - Processa 100% da quantidade solicitada
   */
  async liberarMaterial(dados: LiberarMaterialDTO): Promise<RespostaIntegracaoEstoque> {
    await this.delay();

    const estoqueExternoId = `LIB-${Date.now()}-${dados.materialId}`;

    return {
      sucesso: true,
      estoqueExternoId,
      mensagem: `Material liberado com sucesso. Quantidade: ${dados.quantidade}`,
      detalhes: {
        projetoId: dados.projetoId,
        materialId: dados.materialId,
        quantidade: dados.quantidade,
        usuarioId: dados.usuarioId,
        observacao: dados.observacao,
        tipo: 'LIBERACAO',
        sistemaOrigem: 'MOCK_INVENTORY',
      },
      quantidadeProcessada: dados.quantidade,
      processadoEm: new Date(),
    };
  }

  /**
   * Simula devolução de material ao estoque
   * 
   * Comportamento mockado:
   * - Sempre retorna sucesso
   * - Gera ID mockado no formato 'DEV-{timestamp}'
   * - Processa 100% da quantidade devolvida
   * - Registra condição do material
   */
  async devolverMaterial(dados: DevolverMaterialDTO): Promise<RespostaIntegracaoEstoque> {
    await this.delay();

    const estoqueExternoId = `DEV-${Date.now()}-${dados.materialId}`;

    return {
      sucesso: true,
      estoqueExternoId,
      mensagem: `Material devolvido com sucesso. Quantidade: ${dados.quantidade}`,
      detalhes: {
        projetoId: dados.projetoId,
        materialId: dados.materialId,
        quantidade: dados.quantidade,
        usuarioId: dados.usuarioId,
        observacao: dados.observacao,
        condicao: dados.condicao || 'BOM',
        tipo: 'DEVOLUCAO',
        sistemaOrigem: 'MOCK_INVENTORY',
      },
      quantidadeProcessada: dados.quantidade,
      processadoEm: new Date(),
    };
  }

  /**
   * Simula consulta de disponibilidade de material
   * 
   * Comportamento mockado:
   * - Sempre retorna disponibilidade ilimitada (999999)
   * - Usa dados genéricos de localização
   * - Retorna unidade 'UN' por padrão
   */
  async consultarDisponibilidade(
    codigoMaterial: string
  ): Promise<DisponibilidadeMaterial | null> {
    await this.delay();

    // Mock: sempre retorna alta disponibilidade
    return {
      codigoMaterial,
      nomeMaterial: `Material ${codigoMaterial}`,
      quantidadeDisponivel: 999999, // Quantidade ilimitada mockada
      unidadeMedida: 'UN',
      localizacao: 'ALMOXARIFADO-CENTRAL',
      atualizadoEm: new Date(),
    };
  }

  /**
   * Verifica conexão com sistema de estoque
   * 
   * Comportamento mockado:
   * - Sempre retorna true (conectado)
   */
  async verificarConexao(): Promise<boolean> {
    await this.delay();
    return true; // Mock: sempre conectado
  }

  /**
   * Simula latência de rede
   */
  private async delay(): Promise<void> {
    if (this.simulateLatency) {
      await new Promise((resolve) => setTimeout(resolve, this.latencyMs));
    }
  }
}

/**
 * Factory para criar instância do gateway
 * 
 * Por enquanto retorna a implementação mockada.
 * Futuramente, esta factory verificará variáveis de ambiente para decidir
 * qual implementação usar (mock vs real).
 * 
 * @example
 * ```typescript
 * const gateway = createInventoryGateway();
 * const resultado = await gateway.liberarMaterial({ ... });
 * ```
 */
export function createInventoryGateway(): IInventoryGateway {
  // TODO: Verificar env vars para decidir qual implementação usar
  // if (process.env.USE_REAL_INVENTORY === 'true') {
  //   return new RealInventoryGateway();
  // }
  
  return new MockInventoryGateway();
}

/**
 * Singleton do gateway para reutilização
 */
let gatewayInstance: IInventoryGateway | null = null;

/**
 * Retorna instância singleton do gateway de estoque
 * 
 * @example
 * ```typescript
 * const gateway = getInventoryGateway();
 * ```
 */
export function getInventoryGateway(): IInventoryGateway {
  if (!gatewayInstance) {
    gatewayInstance = createInventoryGateway();
  }
  return gatewayInstance;
}

/**
 * Reseta o singleton (útil para testes)
 */
export function resetInventoryGateway(): void {
  gatewayInstance = null;
}
