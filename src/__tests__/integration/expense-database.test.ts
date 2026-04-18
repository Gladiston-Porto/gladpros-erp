/**
 * Testes de Integração - Expense Database Operations
 * 
 * Testes das operações CRUD e queries complexas do Prisma
 * Objetivo: 100% de cobertura do modelo de dados
 */

import { PrismaClient } from '@prisma/client';
import {
  createExpenseSchema,
  updateExpenseSchema
} from '@/schemas/expense.schema';

const prisma = new PrismaClient();

describe('Expense Database Integration', () => {
  
  let testEmpresaId: number;
  let testCategoriaId: number;
  let testFornecedorId: number;
  let testUserId: number;
  let testExpenseId: number;

  // ========================================
  // SETUP
  // ========================================

  beforeAll(async () => {
    // Buscar ou criar empresa
    let empresa = await prisma.empresa.findFirst({
      where: { ativo: true }
    });
    
    if (!empresa) {
      empresa = await prisma.empresa.create({
        data: {
          nome: 'Test Empresa',
          razaoSocial: 'Test Empresa LTDA',
          cnpj: '00000000000101',
          ativo: true
        }
      });
    }
    testEmpresaId = empresa.id;

    // Buscar usuário
    const user = await prisma.usuario.findFirst();
    testUserId = user?.id || 1;

    // Buscar ou criar fornecedor
    let fornecedor = await prisma.fornecedor.findFirst();
    if (!fornecedor) {
      fornecedor = await prisma.fornecedor.create({
        data: {
          nome: 'Test Fornecedor LTDA',
          tipoDocumento: 'CNPJ',
          documento: '12345678000199',
          ativo: true
        }
      });
    }
    testFornecedorId = fornecedor.id;

    // Criar categoria de teste
    const categoria = await prisma.expenseCategory.create({
      data: {
        empresaId: testEmpresaId,
        nome: 'Test API Category',
        descricao: 'Categoria para testes de integração',
        cor: '#10B981',
        ativo: true,
        orcamentoMensal: 10000.00
      }
    });
    testCategoriaId = categoria.id;
  });

  afterAll(async () => {
    // Limpar dados de teste
    await prisma.expenseApproval.deleteMany({
      where: {
        expense: {
          descricao: { contains: 'Test API' }
        }
      }
    });
    await prisma.expense.deleteMany({
      where: {
        descricao: { contains: 'Test API' }
      }
    });
    await prisma.expenseCategory.deleteMany({
      where: { nome: 'Test API Category' }
    });
    // Jest vai fazer o cleanup automaticamente
  });

  // ========================================
  // CREATE OPERATIONS
  // ========================================

  describe('Criar Despesas', () => {
    it('deve criar despesa simples', async () => {
      const data = {
        empresaId: testEmpresaId,
        categoriaId: testCategoriaId,
        fornecedorId: testFornecedorId,
        descricao: 'Test API - Despesa Simples',
        valor: 500.00,
        tipo: 'OPERACIONAL' as const,
        formaPagamento: 'PIX' as const,
        status: 'PENDENTE' as const,
        dataEmissao: new Date('2025-10-20'),
        dataVencimento: new Date('2025-10-25'),
        requerAprovacao: false,
        numeroDocumento: 'TEST-001',
        observacoes: 'Despesa criada em teste',
        criadoPor: testUserId
      };

      // Validar com schema
      const validation = createExpenseSchema.safeParse(data);
      expect(validation.success).toBe(true);

      // Criar no banco
      const expense = await prisma.expense.create({
        data,
        include: {
          categoria: true,
          fornecedor: true
        }
      });

      expect(expense.id).toBeDefined();
      expect(expense.descricao).toBe('Test API - Despesa Simples');
      expect(expense.valor.toNumber()).toBe(500.00);
      expect(expense.status).toBe('PENDENTE');
      expect(expense.categoria.nome).toBe('Test API Category');

      testExpenseId = expense.id;
    });

    it('deve criar despesa com aprovação', async () => {
      const expense = await prisma.expense.create({
        data: {
          empresaId: testEmpresaId,
          categoriaId: testCategoriaId,
          fornecedorId: testFornecedorId,
          descricao: 'Test API - Com Aprovação',
          valor: 15000.00,
          tipo: 'TECNOLOGIA',
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
          aprovadorId: testUserId,
          tipoAprovador: 'FINANCEIRO',
          nivelAprovacao: 1,
          requerProximoNivel: false,
          status: 'PENDENTE',
          justificativa: 'Despesa necessária'
        }
      });

      expect(expense.id).toBeDefined();
      expect(expense.requerAprovacao).toBe(true);
      expect(expense.status).toBe('AGUARDANDO_APROVACAO');
      expect(approval.status).toBe('PENDENTE');

      // Limpar
      await prisma.expenseApproval.delete({ where: { id: approval.id } });
      await prisma.expense.delete({ where: { id: expense.id } });
    });

    it('deve respeitar constraint de categoria única por empresa', async () => {
      await expect(
        prisma.expenseCategory.create({
          data: {
            empresaId: testEmpresaId,
            nome: 'Test API Category', // Nome duplicado
            cor: '#EF4444',
            ativo: true
          }
        })
      ).rejects.toThrow();
    });
  });

  // ========================================
  // READ OPERATIONS
  // ========================================

  describe('Listar e Buscar Despesas', () => {
    it('deve buscar despesa por ID com relacionamentos', async () => {
      const expense = await prisma.expense.findUnique({
        where: { id: testExpenseId },
        include: {
          categoria: true,
          fornecedor: true,
          empresa: true,
          usuario: true
        }
      });

      expect(expense).not.toBeNull();
      expect(expense?.id).toBe(testExpenseId);
      expect(expense?.categoria).toBeDefined();
      expect(expense?.fornecedor).toBeDefined();
      expect(expense?.empresa).toBeDefined();
    });

    it('deve filtrar despesas por status', async () => {
      const expenses = await prisma.expense.findMany({
        where: {
          empresaId: testEmpresaId,
          status: 'PENDENTE'
        },
        take: 10
      });

      expect(Array.isArray(expenses)).toBe(true);
      expenses.forEach(expense => {
        expect(expense.status).toBe('PENDENTE');
      });
    });

    it('deve filtrar despesas por categoria', async () => {
      const expenses = await prisma.expense.findMany({
        where: {
          empresaId: testEmpresaId,
          categoriaId: testCategoriaId
        }
      });

      expect(Array.isArray(expenses)).toBe(true);
      expect(expenses.length).toBeGreaterThan(0);
      expenses.forEach(expense => {
        expect(expense.categoriaId).toBe(testCategoriaId);
      });
    });

    it('deve filtrar despesas por range de valor', async () => {
      const expenses = await prisma.expense.findMany({
        where: {
          empresaId: testEmpresaId,
          valor: {
            gte: 100,
            lte: 1000
          }
        }
      });

      expect(Array.isArray(expenses)).toBe(true);
      expenses.forEach(expense => {
        const valor = expense.valor.toNumber();
        expect(valor).toBeGreaterThanOrEqual(100);
        expect(valor).toBeLessThanOrEqual(1000);
      });
    });

    it('deve ordenar despesas por data de vencimento', async () => {
      const expenses = await prisma.expense.findMany({
        where: { empresaId: testEmpresaId },
        orderBy: { dataVencimento: 'desc' },
        take: 5
      });

      expect(Array.isArray(expenses)).toBe(true);
      // Verificar ordenação
      for (let i = 0; i < expenses.length - 1; i++) {
        expect(
          expenses[i].dataVencimento >= expenses[i + 1].dataVencimento
        ).toBe(true);
      }
    });

    it('deve implementar paginação corretamente', async () => {
      const page1 = await prisma.expense.findMany({
        where: { empresaId: testEmpresaId },
        take: 2,
        skip: 0,
        orderBy: { criadoEm: 'desc' }
      });

      const page2 = await prisma.expense.findMany({
        where: { empresaId: testEmpresaId },
        take: 2,
        skip: 2,
        orderBy: { criadoEm: 'desc' }
      });

      expect(page1.length).toBeLessThanOrEqual(2);
      expect(page2.length).toBeLessThanOrEqual(2);
      // IDs devem ser diferentes
      if (page1.length > 0 && page2.length > 0) {
        expect(page1[0].id).not.toBe(page2[0].id);
      }
    });
  });

  // ========================================
  // UPDATE OPERATIONS
  // ========================================

  describe('Atualizar Despesas', () => {
    it('deve atualizar campos da despesa', async () => {
      const updateData = {
        descricao: 'Test API - Descrição Atualizada',
        valor: 750.00,
        observacoes: 'Observação adicionada'
      };

      // Validar com schema
      const validation = updateExpenseSchema.safeParse(updateData);
      expect(validation.success).toBe(true);

      // Atualizar no banco
      const updated = await prisma.expense.update({
        where: { id: testExpenseId },
        data: updateData
      });

      expect(updated.descricao).toBe('Test API - Descrição Atualizada');
      expect(updated.valor.toNumber()).toBe(750.00);
      expect(updated.observacoes).toBe('Observação adicionada');
    });

    it('deve atualizar apenas campos fornecidos', async () => {
      const before = await prisma.expense.findUnique({
        where: { id: testExpenseId }
      });

      await prisma.expense.update({
        where: { id: testExpenseId },
        data: { observacoes: 'Nova observação' }
      });

      const after = await prisma.expense.findUnique({
        where: { id: testExpenseId }
      });

      expect(after?.observacoes).toBe('Nova observação');
      expect(after?.descricao).toBe(before?.descricao); // Não mudou
      expect(after?.valor).toEqual(before?.valor); // Não mudou
    });
  });

  // ========================================
  // DELETE OPERATIONS
  // ========================================

  describe('Deletar Despesas', () => {
    it('deve cancelar despesa (soft delete)', async () => {
      const expense = await prisma.expense.create({
        data: {
          empresaId: testEmpresaId,
          categoriaId: testCategoriaId,
          descricao: 'Test API - Para Cancelar',
          valor: 300.00,
          tipo: 'OPERACIONAL',
          formaPagamento: 'PIX',
          status: 'PENDENTE',
          dataEmissao: new Date('2025-10-20'),
          dataVencimento: new Date('2025-10-25'),
          requerAprovacao: false,
          criadoPor: testUserId
        }
      });

      // Soft delete: atualizar status para CANCELADA
      const cancelled = await prisma.expense.update({
        where: { id: expense.id },
        data: { status: 'CANCELADA' }
      });

      expect(cancelled.status).toBe('CANCELADA');

      // Verificar que ainda existe no banco
      const exists = await prisma.expense.findUnique({
        where: { id: expense.id }
      });
      expect(exists).not.toBeNull();

      // Limpar
      await prisma.expense.delete({ where: { id: expense.id } });
    });
  });

  // ========================================
  // CATEGORIAS
  // ========================================

  describe('Categorias de Despesas', () => {
    it('deve listar categorias com agregações', async () => {
      const categories = await prisma.expenseCategory.findMany({
        where: { empresaId: testEmpresaId },
        include: {
          _count: {
            select: { despesas: true }
          }
        }
      });

      expect(Array.isArray(categories)).toBe(true);
      categories.forEach(cat => {
        expect(cat).toHaveProperty('_count');
        expect(cat._count).toHaveProperty('despesas');
      });
    });

    it('deve criar categoria com orçamento', async () => {
      const category = await prisma.expenseCategory.create({
        data: {
          empresaId: testEmpresaId,
          nome: 'Test API Temp Category',
          descricao: 'Categoria temporária',
          cor: '#F59E0B',
          ativo: true,
          orcamentoMensal: 5000.00
        }
      });

      expect(category.id).toBeDefined();
      expect(category.orcamentoMensal?.toNumber()).toBe(5000.00);

      // Limpar
      await prisma.expenseCategory.delete({
        where: { id: category.id }
      });
    });

    it('deve atualizar orçamento da categoria', async () => {
      const before = await prisma.expenseCategory.findUnique({
        where: { id: testCategoriaId }
      });

      await prisma.expenseCategory.update({
        where: { id: testCategoriaId },
        data: { orcamentoMensal: 12000.00 }
      });

      const after = await prisma.expenseCategory.findUnique({
        where: { id: testCategoriaId }
      });

      expect(after?.orcamentoMensal?.toNumber()).toBe(12000.00);

      // Restaurar
      await prisma.expenseCategory.update({
        where: { id: testCategoriaId },
        data: { orcamentoMensal: before?.orcamentoMensal }
      });
    });
  });

  // ========================================
  // AGREGAÇÕES E STATS
  // ========================================

  describe('Estatísticas e Agregações', () => {
    it('deve calcular soma de valores por categoria', async () => {
      const result = await prisma.expense.aggregate({
        where: {
          empresaId: testEmpresaId,
          categoriaId: testCategoriaId,
          status: { not: 'CANCELADA' }
        },
        _sum: { valor: true },
        _count: true,
        _avg: { valor: true }
      });

      expect(result._sum.valor).toBeDefined();
      expect(result._count).toBeGreaterThan(0);
      expect(result._avg.valor).toBeDefined();
    });

    it('deve contar despesas por status', async () => {
      const statusCount = await prisma.expense.groupBy({
        by: ['status'],
        where: { empresaId: testEmpresaId },
        _count: true
      });

      expect(Array.isArray(statusCount)).toBe(true);
      statusCount.forEach(group => {
        expect(group.status).toBeDefined();
        expect(group._count).toBeGreaterThan(0);
      });
    });

    it('deve identificar despesas vencidas', async () => {
      const hoje = new Date();
      const vencidas = await prisma.expense.findMany({
        where: {
          empresaId: testEmpresaId,
          status: { in: ['PENDENTE', 'AGUARDANDO_APROVACAO'] },
          dataVencimento: { lt: hoje }
        }
      });

      expect(Array.isArray(vencidas)).toBe(true);
      vencidas.forEach(expense => {
        expect(expense.dataVencimento < hoje).toBe(true);
        expect(['PENDENTE', 'AGUARDANDO_APROVACAO']).toContain(expense.status);
      });
    });
  });
});
