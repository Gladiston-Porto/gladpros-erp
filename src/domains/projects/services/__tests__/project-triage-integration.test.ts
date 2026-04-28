/**
 * Testes de Integração: Sistema de Triagem
 * Fase 6: Gatilhos de Triagem
 */

import { ProjectService } from '../ProjectService';
import { MockTriageGateway, resetTriageGateway, getTriagensEmMemoria } from '../../gateways/mock-triage.gateway';
import prisma from '../../../../shared/lib/prisma';

// Mock do Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    projeto: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    projetoHistorico: {
      create: jest.fn(),
    },
  },
}));

describe('ProjectService - Gatilhos de Triagem (Fase 6)', () => {
  let service: ProjectService;
  let mockGateway: MockTriageGateway;

  beforeEach(() => {
    jest.clearAllMocks();
    resetTriageGateway();
    mockGateway = new MockTriageGateway(0); // sem latência nos testes
    service = new ProjectService(mockGateway);
  });

  describe('Bloqueio por triagens pendentes', () => {
    it('deve bloquear conclusão de projeto com triagens pendentes', async () => {
      // Arrange
      const mockProjeto = {
        id: 1,
        numeroProjeto: 'PROJ-001',
        status: 'em_inspecao', // Status válido para transição para concluído
      };

      (prisma.projeto.findUnique as jest.Mock).mockResolvedValue(mockProjeto);

      // Simula triagem pendente
      await mockGateway.abrirTriagem({
        projetoId: 1,
        tipo: 'MATERIAL',
        prioridade: 'ALTA',
        motivo: 'Triagem de teste',
        usuarioId: 1,
      });

      // Act & Assert
      await expect(
        service.alterarStatus(1, { novoStatus: 'concluido' }, 1)
      ).rejects.toThrow('triagens pendentes');
    });

    it('deve permitir conclusão sem triagens pendentes', async () => {
      // Arrange
      const mockProjeto = {
        id: 1,
        numeroProjeto: 'PROJ-001',
        status: 'em_inspecao',
      };
      const mockProjetoAtualizado = {
        ...mockProjeto,
        status: 'concluido',
        dataConclusao: new Date(),
        cliente: {},
        proposta: null,
        responsavel: null,
        criadoPor: null,
      };

      (prisma.projeto.findUnique as jest.Mock).mockResolvedValue(mockProjeto);
      (prisma.projeto.update as jest.Mock).mockResolvedValue(mockProjetoAtualizado);
      (prisma.projetoHistorico.create as jest.Mock).mockResolvedValue({});

      // Act
      const resultado = await service.alterarStatus(1, { novoStatus: 'concluido' }, 1);

      // Assert
      expect(resultado.status).toBe('concluido');
      expect(prisma.projeto.update).toHaveBeenCalled();
    });
  });

  describe('Gatilhos automáticos de triagem', () => {
    it('deve abrir triagens ao iniciar execução do projeto', async () => {
      // Arrange
      const mockProjeto = {
        id: 1,
        numeroProjeto: 'PROJ-001',
        status: 'planejado',
      };
      const mockProjetoAtualizado = {
        ...mockProjeto,
        status: 'em_execucao',
        cliente: {},
        proposta: null,
        responsavel: null,
        criadoPor: null,
      };

      (prisma.projeto.findUnique as jest.Mock).mockResolvedValue(mockProjeto);
      (prisma.projeto.update as jest.Mock).mockResolvedValue(mockProjetoAtualizado);
      (prisma.projetoHistorico.create as jest.Mock).mockResolvedValue({});

      const triagensAntes = getTriagensEmMemoria().size;

      // Act
      await service.alterarStatus(1, { novoStatus: 'em_execucao' }, 1);

      // Assert
      const triagensDepois = getTriagensEmMemoria().size;
      expect(triagensDepois).toBeGreaterThan(triagensAntes);
      
      const triagensDoProjetoconst = Array.from(getTriagensEmMemoria().values()).filter(t => t.projetoId === 1);
      expect(triagensDoProjetoconst).toHaveLength(2); // MATERIAL + EQUIPAMENTO
      
      const temTriagemMaterial = triagensDoProjetoconst.some(t => t.tipo === 'MATERIAL');
      const temTriagemEquipamento = triagensDoProjetoconst.some(t => t.tipo === 'EQUIPAMENTO');
      expect(temTriagemMaterial).toBe(true);
      expect(temTriagemEquipamento).toBe(true);
    });

    it('deve abrir triagem de inspeção ao suspender projeto', async () => {
      // Arrange
      const mockProjeto = {
        id: 2,
        numeroProjeto: 'PROJ-002',
        status: 'em_execucao',
      };
      const mockProjetoAtualizado = {
        ...mockProjeto,
        status: 'suspenso',
        cliente: {},
        proposta: null,
        responsavel: null,
        criadoPor: null,
      };

      (prisma.projeto.findUnique as jest.Mock).mockResolvedValue(mockProjeto);
      (prisma.projeto.update as jest.Mock).mockResolvedValue(mockProjetoAtualizado);
      (prisma.projetoHistorico.create as jest.Mock).mockResolvedValue({});

      // Act
      await service.alterarStatus(2, { novoStatus: 'suspenso' }, 1);

      // Assert
      const triagens = Array.from(getTriagensEmMemoria().values()).filter(t => t.projetoId === 2);
      expect(triagens).toHaveLength(1);
      expect(triagens[0].tipo).toBe('INSPECAO');
      expect(triagens[0].prioridade).toBe('ALTA');
    });

    it('deve abrir múltiplas triagens ao reativar projeto suspenso', async () => {
      // Arrange
      const mockProjeto = {
        id: 3,
        numeroProjeto: 'PROJ-003',
        status: 'suspenso',
      };
      const mockProjetoAtualizado = {
        ...mockProjeto,
        status: 'em_execucao',
        cliente: {},
        proposta: null,
        responsavel: null,
        criadoPor: null,
      };

      (prisma.projeto.findUnique as jest.Mock).mockResolvedValue(mockProjeto);
      (prisma.projeto.update as jest.Mock).mockResolvedValue(mockProjetoAtualizado);
      (prisma.projetoHistorico.create as jest.Mock).mockResolvedValue({});

      // Act
      await service.alterarStatus(3, { novoStatus: 'em_execucao' }, 1);

      // Assert
      const triagens = Array.from(getTriagensEmMemoria().values()).filter(t => t.projetoId === 3);
      expect(triagens.length).toBeGreaterThanOrEqual(3); // MATERIAL + EQUIPAMENTO + INSPECAO
      
      const tiposTriagem = triagens.map(t => t.tipo);
      expect(tiposTriagem).toContain('MATERIAL');
      expect(tiposTriagem).toContain('EQUIPAMENTO');
      expect(tiposTriagem).toContain('INSPECAO');
    });

    it('deve abrir triagem de inspeção final ao entrar em inspeção', async () => {
      // Arrange
      const mockProjeto = {
        id: 4,
        numeroProjeto: 'PROJ-004',
        status: 'em_execucao', // Status válido para transição
      };
      const mockProjetoAtualizado = {
        ...mockProjeto,
        status: 'em_inspecao',
        cliente: {},
        proposta: null,
        responsavel: null,
        criadoPor: null,
      };

      (prisma.projeto.findUnique as jest.Mock).mockResolvedValue(mockProjeto);
      (prisma.projeto.update as jest.Mock).mockResolvedValue(mockProjetoAtualizado);
      (prisma.projetoHistorico.create as jest.Mock).mockResolvedValue({});

      // Act
      await service.alterarStatus(4, { novoStatus: 'em_inspecao' }, 1);

      // Assert
      const triagens = Array.from(getTriagensEmMemoria().values()).filter(t => t.projetoId === 4);
      expect(triagens).toHaveLength(1);
      expect(triagens[0].tipo).toBe('INSPECAO');
      expect(triagens[0].prioridade).toBe('URGENTE');
      expect(triagens[0].motivo).toContain('Inspeção final');
    });
  });

  describe('Estatísticas e consultas de triagem', () => {
    it('deve retornar estatísticas corretas de triagens', async () => {
      // Arrange - Cria triagens com diferentes status
      await mockGateway.abrirTriagem({
        projetoId: 5,
        tipo: 'MATERIAL',
        prioridade: 'ALTA',
        motivo: 'Triagem 1',
        usuarioId: 1,
      });

      const triagem2 = await mockGateway.abrirTriagem({
        projetoId: 5,
        tipo: 'EQUIPAMENTO',
        prioridade: 'MEDIA',
        motivo: 'Triagem 2',
        usuarioId: 1,
      });

      // Conclui uma triagem
      await mockGateway.fecharTriagem({
        triagemId: triagem2.triagemId!,
        usuarioId: 1,
        resultado: 'Aprovado',
      });

      // Act
      const stats = await mockGateway.obterEstatisticas(5);

      // Assert
      expect(stats.total).toBe(2);
      expect(stats.pendentes).toBe(1);
      expect(stats.concluidas).toBe(1);
      expect(stats.emAndamento).toBe(0);
    });

    it('deve buscar apenas triagens pendentes do projeto', async () => {
      // Arrange
      await mockGateway.abrirTriagem({
        projetoId: 6,
        tipo: 'MATERIAL',
        prioridade: 'ALTA',
        motivo: 'Pendente',
        usuarioId: 1,
      });

      const triagem2 = await mockGateway.abrirTriagem({
        projetoId: 6,
        tipo: 'EQUIPAMENTO',
        prioridade: 'MEDIA',
        motivo: 'Será concluída',
        usuarioId: 1,
      });

      await mockGateway.fecharTriagem({
        triagemId: triagem2.triagemId!,
        usuarioId: 1,
        resultado: 'OK',
      });

      // Act
      const pendentes = await mockGateway.buscarTriagensPendentes(6);

      // Assert
      expect(pendentes).toHaveLength(1);
      expect(pendentes[0].status).toBe('PENDENTE');
    });
  });
});
