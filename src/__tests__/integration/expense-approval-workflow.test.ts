/**
 * Testes de Integração - Expense Approval Workflow
 * 
 * Testes completos do workflow de aprovação usando Prisma diretamente
 * Foco: Lógica de negócio, transições de estado, validações
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Expense Approval Workflow', () => {
  
  let testEmpresaId: number;
  let testCategoriaId: number;
  let testFornecedorId: number;
  let testUserId: number;
  let testAprovadorId: number;

  // ========================================
  // SETUP
  // ========================================

  beforeAll(async () => {
    let empresa = await prisma.empresa.findFirst({
      where: { ativo: true }
    });
    
    if (!empresa) {
      empresa = await prisma.empresa.create({
        data: {
          nome: 'Test Empresa',
          razaoSocial: 'Test Empresa LTDA',
          cnpj: '00000000000100',
          ativo: true
        }
      });
    }
    testEmpresaId = empresa.id;

    const users = await prisma.usuario.findMany({
      take: 2
    });
    testUserId = users[0]?.id || 1;
    testAprovadorId = users[1]?.id || 2;

    let fornecedor = await prisma.fornecedor.findFirst();
    if (!fornecedor) {
      fornecedor = await prisma.fornecedor.create({
        data: {
          nome: 'Test Approval Fornecedor LTDA',
          tipoDocumento: 'CNPJ',
          documento: '98765432000188',
          ativo: true,
        }
      });
    }
    testFornecedorId = fornecedor.id;

    let categoria = await prisma.expenseCategory.findFirst({
      where: {
        empresaId: testEmpresaId,
        nome: 'Test Approval Category'
      }
    });
    
    if (!categoria) {
      categoria = await prisma.expenseCategory.create({
        data: {
          empresaId: testEmpresaId,
          nome: 'Test Approval Category',
          descricao: 'Categoria para testes de aprovação',
          cor: '#8B5CF6',
          ativo: true,
          orcamentoMensal: 50000.00
        }
      });
    }
    testCategoriaId = categoria.id;
  });

  afterEach(async () => {
    await prisma.expenseApproval.deleteMany({
      where: {
        expense: {
          descricao: { contains: 'Test Approval' }
        }
      }
    });
    await prisma.expense.deleteMany({
      where: {
        descricao: { contains: 'Test Approval' }
      }
    });
  });

  afterAll(async () => {
    await prisma.expenseCategory.deleteMany({
      where: { nome: 'Test Approval Category' }
    });
  });

  // ========================================
  // APROVAÇÃO SIMPLES
  // ========================================

  describe('Aprovação de Um Nível', () => {
    it('deve criar despesa com aprovação pendente', async () => {
      const expense = await prisma.expense.create({
        data: {
          empresaId: testEmpresaId,
          categoriaId: testCategoriaId,
          fornecedorId: testFornecedorId,
          descricao: 'Test Approval - Despesa Simples',
          valor: 3000.00,
          tipo: 'OPERACIONAL',
          formaPagamento: 'TRANSFERENCIA',
          status: 'AGUARDANDO_APROVACAO',
          dataEmissao: new Date('2025-10-20'),
          dataVencimento: new Date('2025-10-30'),
          requerAprovacao: true,
          criadoPor: testUserId
        }
      });

      const approval = await prisma.expenseApproval.create({
        data: {
          expenseId: expense.id,
          aprovadorId: testAprovadorId,
          tipoAprovador: 'GERENTE',
          nivelAprovacao: 1,
          requerProximoNivel: false,
          status: 'PENDENTE',
          justificativa: 'Despesa operacional necessária'
        }
      });

      expect(expense.requerAprovacao).toBe(true);
      expect(expense.status).toBe('AGUARDANDO_APROVACAO');
      expect(approval.status).toBe('PENDENTE');
      expect(approval.nivelAprovacao).toBe(1);
    });

    it('deve aprovar despesa e atualizar status', async () => {
      const expense = await prisma.expense.create({
        data: {
          empresaId: testEmpresaId,
          categoriaId: testCategoriaId,
          fornecedorId: testFornecedorId,
          descricao: 'Test Approval - Para Aprovar',
          valor: 2000.00,
          tipo: 'OPERACIONAL',
          formaPagamento: 'PIX',
          status: 'AGUARDANDO_APROVACAO',
          dataEmissao: new Date('2025-10-20'),
          dataVencimento: new Date('2025-10-30'),
          requerAprovacao: true,
          criadoPor: testUserId
        }
      });

      const approval = await prisma.expenseApproval.create({
        data: {
          expenseId: expense.id,
          aprovadorId: testAprovadorId,
          tipoAprovador: 'GERENTE',
          nivelAprovacao: 1,
          requerProximoNivel: false,
          status: 'PENDENTE'
        }
      });

      // Simular aprovação
      const [updatedExpense, updatedApproval] = await prisma.$transaction([
        prisma.expense.update({
          where: { id: expense.id },
          data: { status: 'APROVADA' }
        }),
        prisma.expenseApproval.update({
          where: { id: approval.id },
          data: {
            status: 'APROVADA',
            revisadoEm: new Date(),
            comentario: 'Aprovado conforme orçamento'
          }
        })
      ]);

      expect(updatedExpense.status).toBe('APROVADA');
      expect(updatedApproval.status).toBe('APROVADA');
      expect(updatedApproval.revisadoEm).not.toBeNull();
    });
  });

  // ========================================
  // APROVAÇÃO MULTI-NÍVEL
  // ========================================

  describe('Aprovação Multi-Nível', () => {
    it('deve criar despesa de alto valor com multi-nível', async () => {
      const expense = await prisma.expense.create({
        data: {
          empresaId: testEmpresaId,
          categoriaId: testCategoriaId,
          fornecedorId: testFornecedorId,
          descricao: 'Test Approval - Alto Valor Multi-Nível',
          valor: 60000.00,
          tipo: 'TECNOLOGIA',
          formaPagamento: 'TRANSFERENCIA',
          status: 'AGUARDANDO_APROVACAO',
          dataEmissao: new Date('2025-10-20'),
          dataVencimento: new Date('2025-11-30'),
          requerAprovacao: true,
          criadoPor: testUserId
        }
      });

      const approval = await prisma.expenseApproval.create({
        data: {
          expenseId: expense.id,
          aprovadorId: testAprovadorId,
          tipoAprovador: 'FINANCEIRO',
          nivelAprovacao: 1,
          requerProximoNivel: true,
          proximoAprovadorId: testUserId,
          status: 'PENDENTE',
          justificativa: 'Investimento em infraestrutura'
        }
      });

      expect(approval.requerProximoNivel).toBe(true);
      expect(approval.proximoAprovadorId).toBe(testUserId);
      expect(approval.nivelAprovacao).toBe(1);
    });

    it('deve progredir para próximo nível após aprovação', async () => {
      const expense = await prisma.expense.create({
        data: {
          empresaId: testEmpresaId,
          categoriaId: testCategoriaId,
          fornecedorId: testFornecedorId,
          descricao: 'Test Approval - Progressão Nível',
          valor: 55000.00,
          tipo: 'MARKETING',
          formaPagamento: 'TRANSFERENCIA',
          status: 'AGUARDANDO_APROVACAO',
          dataEmissao: new Date('2025-10-20'),
          dataVencimento: new Date('2025-11-30'),
          requerAprovacao: true,
          criadoPor: testUserId
        }
      });

      const approval = await prisma.expenseApproval.create({
        data: {
          expenseId: expense.id,
          aprovadorId: testAprovadorId,
          tipoAprovador: 'FINANCEIRO',
          nivelAprovacao: 1,
          requerProximoNivel: true,
          proximoAprovadorId: testUserId,
          status: 'PENDENTE'
        }
      });

      // Simular aprovação no nível 1 e progressão para nível 2
      const updatedApproval = await prisma.expenseApproval.update({
        where: { id: approval.id },
        data: {
          status: 'PENDENTE', // Ainda pendente para próximo nível
          nivelAprovacao: 2,
          aprovadorId: testUserId,
          comentario: 'Aprovado no nível 1. Enviando para nível 2.'
        }
      });

      expect(updatedApproval.nivelAprovacao).toBe(2);
      expect(updatedApproval.aprovadorId).toBe(testUserId);
      expect(updatedApproval.comentario).toContain('nível 1');
    });

    it('deve finalizar aprovação no último nível', async () => {
      const expense = await prisma.expense.create({
        data: {
          empresaId: testEmpresaId,
          categoriaId: testCategoriaId,
          fornecedorId: testFornecedorId,
          descricao: 'Test Approval - Finalizar Multi-Nível',
          valor: 75000.00,
          tipo: 'PESSOAL',
          formaPagamento: 'TRANSFERENCIA',
          status: 'AGUARDANDO_APROVACAO',
          dataEmissao: new Date('2025-10-20'),
          dataVencimento: new Date('2025-11-30'),
          requerAprovacao: true,
          criadoPor: testUserId
        }
      });

      const approval = await prisma.expenseApproval.create({
        data: {
          expenseId: expense.id,
          aprovadorId: testAprovadorId,
          tipoAprovador: 'ADMINISTRADOR',
          nivelAprovacao: 2,
          requerProximoNivel: false,
          status: 'PENDENTE',
          comentario: 'Aprovado no nível 1'
        }
      });

      // Aprovar no último nível
      const [updatedExpense, updatedApproval] = await prisma.$transaction([
        prisma.expense.update({
          where: { id: expense.id },
          data: { status: 'APROVADA' }
        }),
        prisma.expenseApproval.update({
          where: { id: approval.id },
          data: {
            status: 'APROVADA',
            revisadoEm: new Date(),
            comentario: 'Aprovado pela diretoria'
          }
        })
      ]);

      expect(updatedExpense.status).toBe('APROVADA');
      expect(updatedApproval.status).toBe('APROVADA');
      expect(updatedApproval.nivelAprovacao).toBe(2);
    });
  });

  // ========================================
  // REJEIÇÃO
  // ========================================

  describe('Rejeição de Despesas', () => {
    it('deve rejeitar despesa e atualizar status', async () => {
      const expense = await prisma.expense.create({
        data: {
          empresaId: testEmpresaId,
          categoriaId: testCategoriaId,
          fornecedorId: testFornecedorId,
          descricao: 'Test Approval - Para Rejeitar',
          valor: 8000.00,
          tipo: 'OPERACIONAL',
          formaPagamento: 'BOLETO',
          status: 'AGUARDANDO_APROVACAO',
          dataEmissao: new Date('2025-10-20'),
          dataVencimento: new Date('2025-10-30'),
          requerAprovacao: true,
          criadoPor: testUserId
        }
      });

      const approval = await prisma.expenseApproval.create({
        data: {
          expenseId: expense.id,
          aprovadorId: testAprovadorId,
          tipoAprovador: 'GERENTE',
          nivelAprovacao: 1,
          requerProximoNivel: false,
          status: 'PENDENTE'
        }
      });

      // Simular rejeição
      const [updatedExpense, updatedApproval] = await prisma.$transaction([
        prisma.expense.update({
          where: { id: expense.id },
          data: { status: 'REJEITADA' }
        }),
        prisma.expenseApproval.update({
          where: { id: approval.id },
          data: {
            status: 'REJEITADA',
            revisadoEm: new Date(),
            comentario: 'Rejeitado: valor acima do orçamento disponível'
          }
        })
      ]);

      expect(updatedExpense.status).toBe('REJEITADA');
      expect(updatedApproval.status).toBe('REJEITADA');
      expect(updatedApproval.comentario).toContain('Rejeitado');
    });

    it('deve rejeitar no segundo nível da aprovação', async () => {
      const expense = await prisma.expense.create({
        data: {
          empresaId: testEmpresaId,
          categoriaId: testCategoriaId,
          fornecedorId: testFornecedorId,
          descricao: 'Test Approval - Rejeitar Nível 2',
          valor: 65000.00,
          tipo: 'TECNOLOGIA',
          formaPagamento: 'TRANSFERENCIA',
          status: 'AGUARDANDO_APROVACAO',
          dataEmissao: new Date('2025-10-20'),
          dataVencimento: new Date('2025-11-30'),
          requerAprovacao: true,
          criadoPor: testUserId
        }
      });

      const approval = await prisma.expenseApproval.create({
        data: {
          expenseId: expense.id,
          aprovadorId: testAprovadorId,
          tipoAprovador: 'ADMINISTRADOR',
          nivelAprovacao: 2,
          requerProximoNivel: false,
          status: 'PENDENTE',
          comentario: 'Aprovado no nível 1'
        }
      });

      // Rejeitar no nível 2
      const [updatedExpense, updatedApproval] = await prisma.$transaction([
        prisma.expense.update({
          where: { id: expense.id },
          data: { status: 'REJEITADA' }
        }),
        prisma.expenseApproval.update({
          where: { id: approval.id },
          data: {
            status: 'REJEITADA',
            revisadoEm: new Date(),
            comentario: 'Rejeitado pela diretoria: prioridade baixa'
          }
        })
      ]);

      expect(updatedExpense.status).toBe('REJEITADA');
      expect(updatedApproval.status).toBe('REJEITADA');
      expect(updatedApproval.nivelAprovacao).toBe(2);
    });
  });

  // ========================================
  // QUERIES COMPLEXAS
  // ========================================

  describe('Queries de Aprovação', () => {
    it('deve buscar despesas pendentes de aprovação', async () => {
      const pending = await prisma.expense.findMany({
        where: {
          empresaId: testEmpresaId,
          status: 'AGUARDANDO_APROVACAO',
          requerAprovacao: true
        },
        include: {
          aprovacao: true
        }
      });

      expect(Array.isArray(pending)).toBe(true);
      pending.forEach((expense: any) => {
        expect(expense.status).toBe('AGUARDANDO_APROVACAO');
        expect(expense.requerAprovacao).toBe(true);
      });
    });

    it('deve filtrar por aprovador específico', async () => {
      const forApprover = await prisma.expenseApproval.findMany({
        where: {
          aprovadorId: testAprovadorId,
          status: 'PENDENTE'
        },
        include: {
          expense: true
        }
      });

      expect(Array.isArray(forApprover)).toBe(true);
      forApprover.forEach((approval: any) => {
        expect(approval.aprovadorId).toBe(testAprovadorId);
        expect(approval.status).toBe('PENDENTE');
      });
    });

    it('deve filtrar por nível de aprovação', async () => {
      const nivel2 = await prisma.expenseApproval.findMany({
        where: {
          nivelAprovacao: 2,
          status: 'PENDENTE'
        },
        include: {
          expense: true
        }
      });

      expect(Array.isArray(nivel2)).toBe(true);
      nivel2.forEach((approval: any) => {
        expect(approval.nivelAprovacao).toBe(2);
      });
    });
  });

  // ========================================
  // ESTATÍSTICAS DE APROVAÇÃO
  // ========================================

  describe('Estatísticas', () => {
    it('deve contar aprovações por status', async () => {
      const stats = await prisma.expenseApproval.groupBy({
        by: ['status'],
        _count: true
      });

      expect(Array.isArray(stats)).toBe(true);
      stats.forEach(stat => {
        expect(stat.status).toBeDefined();
        expect(stat._count).toBeGreaterThan(0);
      });
    });

    it('deve contar aprovações por tipo de aprovador', async () => {
      const byType = await prisma.expenseApproval.groupBy({
        by: ['tipoAprovador'],
        _count: true
      });

      expect(Array.isArray(byType)).toBe(true);
      byType.forEach(group => {
        expect(group.tipoAprovador).toBeDefined();
        expect(group._count).toBeGreaterThan(0);
      });
    });
  });
});
