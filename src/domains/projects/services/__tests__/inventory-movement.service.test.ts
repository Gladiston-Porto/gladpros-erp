/**
 * Testes Unitários: InventoryMovementService
 * Fase 5: Ponte Estoque
 */

import { InventoryMovementService } from '../inventory-movement.service';
import { IInventoryGateway, RespostaIntegracaoEstoque, StatusIntegracaoEstoque, TipoMovimentacaoEstoque } from '../../interfaces/inventory-gateway.interface';
import prisma from '../../../../shared/lib/prisma';

// Mock do Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    projeto: {
      findUnique: jest.fn(),
    },
    projetoMaterial: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    projetoMovimentacaoEstoque: {
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
    },
    projetoHistorico: {
      create: jest.fn(),
    },
  },
}));

// Mock do Gateway
const mockGateway: jest.Mocked<IInventoryGateway> = {
  liberarMaterial: jest.fn(),
  devolverMaterial: jest.fn(),
  consultarDisponibilidade: jest.fn(),
  verificarConexao: jest.fn(),
};

describe('InventoryMovementService', () => {
  let service: InventoryMovementService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new InventoryMovementService(mockGateway);
  });

  describe('liberarMaterial', () => {
    const dadosLiberacao = {
      projetoId: 1,
      materialId: 10,
      quantidade: 50,
      usuarioId: 100,
      observacao: 'Teste de liberação',
    };

    it('deve liberar material com sucesso', async () => {
      const mockMaterial = {
        id: 10,
        projetoId: 1,
        nome: 'Material Teste',
        status: 'DISPONIVEL',
        quantidadePlanejada: 100,
        quantidadeLiberada: 20,
      }
      const mockMovimentacaoPendente = {
        id: 1,
        projetoId: 1,
        materialId: 10,
        tipoMovimentacao: 'LIBERACAO' as TipoMovimentacaoEstoque,
        quantidade: 50,
        statusIntegracao: 'PENDENTE' as StatusIntegracaoEstoque,
        usuarioId: 100,
        observacao: 'Teste de liberação',
        criadoEm: new Date(),
      }
      const mockMovimentacaoConcluida = {
        ...mockMovimentacaoPendente,
        statusIntegracao: 'CONCLUIDA' as StatusIntegracaoEstoque,
        estoqueExternoId: 'LIB-123',
      }

      ;(prisma.projetoMaterial.findFirst as jest.Mock).mockResolvedValue(mockMaterial)
      ;(prisma.projetoMovimentacaoEstoque.create as jest.Mock).mockResolvedValue(mockMovimentacaoPendente)
      ;(prisma.projetoMovimentacaoEstoque.update as jest.Mock)
        .mockResolvedValueOnce({ ...mockMovimentacaoPendente, statusIntegracao: 'PROCESSANDO' })
        .mockResolvedValueOnce(mockMovimentacaoConcluida)
      mockGateway.liberarMaterial.mockResolvedValue({ sucesso: true, estoqueExternoId: 'LIB-123', mensagem: 'ok' })
      ;(prisma.projetoMaterial.update as jest.Mock).mockResolvedValue({
        ...mockMaterial,
        quantidadeLiberada: 70,
      })
      ;(prisma.projetoHistorico.create as jest.Mock).mockResolvedValue({})

      const resultado = await service.liberarMaterial(dadosLiberacao)

      expect(resultado.statusIntegracao).toBe('CONCLUIDA')
      expect(resultado.estoqueExternoId).toBe('LIB-123')
      expect(mockGateway.liberarMaterial).toHaveBeenCalledWith(dadosLiberacao)
      expect(prisma.projetoMaterial.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: {
          quantidadeLiberada: { increment: dadosLiberacao.quantidade },
          status: 'liberado',
        },
      })
    })

    it('deve falhar se material não existir', async () => {
      // Arrange
      (prisma.projetoMaterial.findFirst as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(service.liberarMaterial(dadosLiberacao))
        .rejects.toThrow('Material não encontrado');
    });

    it('deve falhar se material não pertencer ao projeto', async () => {
      // Arrange
      const mockProjeto = { id: 1, nome: 'Projeto Teste' };
      (prisma.projeto.findUnique as jest.Mock).mockResolvedValue(mockProjeto);
      (prisma.projetoMaterial.findFirst as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(service.liberarMaterial(dadosLiberacao))
        .rejects.toThrow('Material não encontrado no projeto');
    });

    it('deve falhar se material não estiver disponível', async () => {
      const mockMaterial = {
        id: 10,
        status: 'CANCELADO',
        quantidadePlanejada: 100,
        quantidadeLiberada: 0,
      }
      ;(prisma.projetoMaterial.findFirst as jest.Mock).mockResolvedValue(mockMaterial)

      await expect(service.liberarMaterial(dadosLiberacao)).rejects.toThrow('Material não está disponível')
    })

    it('deve falhar se quantidade solicitada exceder o planejado', async () => {
      const mockMaterial = {
        id: 10,
        status: 'DISPONIVEL',
        quantidadePlanejada: 10,
        quantidadeLiberada: 10,
      }
      ;(prisma.projetoMaterial.findFirst as jest.Mock).mockResolvedValue(mockMaterial)

      await expect(service.liberarMaterial(dadosLiberacao)).rejects.toThrow('Quantidade excede o planejado')
    })

    it('deve marcar como ERRO se gateway falhar', async () => {
      // Arrange
      const mockMaterial = {
        id: 10,
        projetoId: 1,
        nome: 'Material Teste',
        codigo: 'MAT-001',
        unidade: 'UN',
        quantidadeAlocada: 100,
        quantidadeUsada: 0,
        status: 'DISPONIVEL',
      };
      const mockMovimentacaoPendente = {
        id: 1,
        tipo: 'LIBERACAO' as any,
        statusIntegracao: 'PENDENTE' as any,
        Material: { nome: 'Material Teste', codigo: 'MAT-001', unidade: 'UN' },
        Usuario: { nome: 'User Teste', email: 'user@test.com' },
      };
      const mockRespostaErro: RespostaIntegracaoEstoque = {
        sucesso: false,
        mensagem: 'Falha na integração com estoque',
      };
      const mockMovimentacaoErro = {
        ...mockMovimentacaoPendente,
        statusIntegracao: 'ERRO' as any,
        erroIntegracao: 'Falha na integração com estoque',
      };

      (prisma.projetoMaterial.findFirst as jest.Mock).mockResolvedValue(mockMaterial);
      (prisma.projetoMovimentacaoEstoque.create as jest.Mock).mockResolvedValue(mockMovimentacaoPendente);
      mockGateway.liberarMaterial.mockResolvedValue(mockRespostaErro);
      (prisma.projetoMovimentacaoEstoque.update as jest.Mock).mockResolvedValue(mockMovimentacaoErro);

      // Act
      const resultado = await service.liberarMaterial(dadosLiberacao);

      // Assert
      expect(resultado.statusIntegracao).toBe('ERRO');
      expect(resultado.erroIntegracao).toBe('Falha na integração com estoque');
    });
  });

  describe('devolverMaterial', () => {
    const dadosDevolucao = {
      projetoId: 1,
      materialId: 10,
      quantidade: 30,
      usuarioId: 100,
      observacao: 'Teste de devolução',
    };

    it('deve devolver material com sucesso', async () => {
      const mockMaterial = {
        id: 10,
        projetoId: 1,
        nome: 'Material Teste',
        status: 'DISPONIVEL',
        quantidadeLiberada: 80,
        quantidadeDevolvida: 10,
      }
      const mockMovimentacaoPendente = {
        id: 2,
        projetoId: 1,
        materialId: 10,
        tipoMovimentacao: 'DEVOLUCAO' as TipoMovimentacaoEstoque,
        quantidade: 30,
        statusIntegracao: 'PENDENTE' as StatusIntegracaoEstoque,
        usuarioId: 100,
        observacao: 'Teste de devolução',
      }
      const mockMovimentacaoConcluida = {
        ...mockMovimentacaoPendente,
        statusIntegracao: 'CONCLUIDA' as StatusIntegracaoEstoque,
        estoqueExternoId: 'DEV-456',
      }

      ;(prisma.projetoMaterial.findFirst as jest.Mock).mockResolvedValue(mockMaterial)
      ;(prisma.projetoMovimentacaoEstoque.create as jest.Mock).mockResolvedValue(mockMovimentacaoPendente)
      ;(prisma.projetoMovimentacaoEstoque.update as jest.Mock)
        .mockResolvedValueOnce({ ...mockMovimentacaoPendente, statusIntegracao: 'PROCESSANDO' })
        .mockResolvedValueOnce(mockMovimentacaoConcluida)
      mockGateway.devolverMaterial.mockResolvedValue({ sucesso: true, estoqueExternoId: 'DEV-456', mensagem: 'ok' })
      ;(prisma.projetoMaterial.update as jest.Mock).mockResolvedValue({
        ...mockMaterial,
        quantidadeDevolvida: 40,
      })
      ;(prisma.projetoHistorico.create as jest.Mock).mockResolvedValue({})

      const resultado = await service.devolverMaterial(dadosDevolucao)

      expect(resultado.statusIntegracao).toBe('CONCLUIDA')
      expect(resultado.estoqueExternoId).toBe('DEV-456')
      expect(prisma.projetoMaterial.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: {
          quantidadeDevolvida: { increment: dadosDevolucao.quantidade },
          status: 'devolucao_pendente',
        },
      })
    })

    it('deve falhar se quantidade de devolução for maior que disponível', async () => {
      const mockMaterial = {
        id: 10,
        quantidadeLiberada: 20,
        quantidadeDevolvida: 5,
        status: 'DISPONIVEL',
      }
      ;(prisma.projetoMaterial.findFirst as jest.Mock).mockResolvedValue(mockMaterial)

      await expect(service.devolverMaterial(dadosDevolucao)).rejects.toThrow('Quantidade excede a disponível')
    })
  });

  describe('listar', () => {
    it('deve listar movimentações com paginação', async () => {
      // Arrange
      const filtros = {
        projetoId: 1,
        pagina: 1,
        limite: 10,
      };
      const mockMovimentacoes = [
        {
          id: 1,
          tipo: 'LIBERACAO' as any,
          statusIntegracao: 'CONCLUIDA' as any,
          Material: { nome: 'Material 1', codigo: 'MAT-001', unidade: 'UN' },
          Usuario: { nome: 'User 1', email: 'user1@test.com' },
        },
        {
          id: 2,
          tipo: 'DEVOLUCAO' as any,
          statusIntegracao: 'CONCLUIDA' as any,
          Material: { nome: 'Material 2', codigo: 'MAT-002', unidade: 'KG' },
          Usuario: { nome: 'User 2', email: 'user2@test.com' },
        },
      ];

      (prisma.projetoMovimentacaoEstoque.findMany as jest.Mock).mockResolvedValue(mockMovimentacoes);
      (prisma.projetoMovimentacaoEstoque.count as jest.Mock).mockResolvedValue(25);

      // Act
      const resultado = await service.listar(filtros);

      // Assert
      expect(resultado.data).toHaveLength(2);
      expect(resultado.paginacao.paginaAtual).toBe(1);
      expect(resultado.paginacao.totalPaginas).toBe(3);
      expect(resultado.paginacao.totalItens).toBe(25);
      expect(resultado.paginacao.itensPorPagina).toBe(10);
    });

    it('deve aplicar filtros corretamente', async () => {
      // Arrange
      const filtros = {
        projetoId: 1,
        materialId: 10,
        tipoMovimentacao: 'LIBERACAO' as TipoMovimentacaoEstoque,
        statusIntegracao: 'CONCLUIDA' as StatusIntegracaoEstoque,
        dataInicio: new Date('2025-01-01'),
        dataFim: new Date('2025-12-31'),
      };

      (prisma.projetoMovimentacaoEstoque.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.projetoMovimentacaoEstoque.count as jest.Mock).mockResolvedValue(0);

      // Act
      await service.listar(filtros);

      // Assert
      expect(prisma.projetoMovimentacaoEstoque.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            projetoId: 1,
            materialId: 10,
            tipoMovimentacao: 'LIBERACAO',
            statusIntegracao: 'CONCLUIDA',
          }),
        })
      );
    });
  });

  describe('buscarPorId', () => {
    it('deve buscar movimentação por ID', async () => {
      // Arrange
      const mockMovimentacao = {
        id: 1,
        projetoId: 1,
        tipo: 'LIBERACAO' as any,
        statusIntegracao: 'CONCLUIDA' as any,
        Material: { nome: 'Material Teste', codigo: 'MAT-001', unidade: 'UN' },
        Usuario: { nome: 'User Teste', email: 'user@test.com' },
      };

      (prisma.projetoMovimentacaoEstoque.findFirst as jest.Mock).mockResolvedValue(mockMovimentacao);

      // Act
      const resultado = await service.buscarPorId(1, 1);

      // Assert
      expect(resultado).toBeDefined();
      expect(resultado?.id).toBe(1);
      expect(prisma.projetoMovimentacaoEstoque.findFirst).toHaveBeenCalledWith({
        where: { id: 1, projetoId: 1 },
        include: expect.any(Object),
      });
    });

    it('deve retornar null se movimentação não existir', async () => {
      // Arrange
      (prisma.projetoMovimentacaoEstoque.findFirst as jest.Mock).mockResolvedValue(null);

      // Act
      const resultado = await service.buscarPorId(999, 1);

      // Assert
      expect(resultado).toBeNull();
    });
  });
});
