/**
 * Testes de Validação - Expense Schemas
 * 
 * Validação completa de todos os schemas Zod do módulo Despesas
 * Objetivo: 100% de cobertura e excelência
 */

import {
  createExpenseSchema,
  updateExpenseSchema,
  expenseFiltersSchema,
  approveExpenseSchema,
  rejectExpenseSchema,
  payExpenseSchema,
  createExpenseCategorySchema,
  updateExpenseCategorySchema,
  TipoDespesaEnum,
  StatusDespesaEnum,
  StatusAprovacaoEnum,
  TipoAprovadorEnum,
  FormaPagamentoEnum,
  canUserApprove,
  determineApprovalType,
  requiresMultiLevelApproval
} from '@/schemas/expense.schema';

describe('Expense Schemas - Validação', () => {
  
  // ========================================
  // CREATE EXPENSE SCHEMA
  // ========================================
  
  describe('createExpenseSchema', () => {
    const validData = {
      empresaId: 1,
      categoriaId: 1,
      fornecedorId: 1,
      descricao: 'Salário do mês de outubro',
      valor: 5000.00,
      tipo: 'PESSOAL' as const,
      formaPagamento: 'TRANSFERENCIA' as const,
      status: 'PENDENTE' as const,
      dataEmissao: new Date('2025-10-01'),
      dataVencimento: new Date('2025-10-05'),
      dataPagamento: null,
      requerAprovacao: false,
      anexoUrl: null,
      numeroDocumento: 'NF-12345',
      observacoes: 'Pagamento mensal',
      criadoPor: 1
    };

    it('deve validar despesa completa válida', () => {
      const result = createExpenseSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('deve validar despesa com aprovação', () => {
      const dataComAprovacao = {
        ...validData,
        requerAprovacao: true,
        aprovacao: {
          aprovadorId: 2,
          tipoAprovador: 'GERENTE' as const,
          nivelAprovacao: 1,
          requerProximoNivel: false,
          proximoAprovadorId: null,
          justificativa: 'Despesa necessária para operação do departamento'
        }
      };
      const result = createExpenseSchema.safeParse(dataComAprovacao);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar empresaId inválido', () => {
      const result = createExpenseSchema.safeParse({
        ...validData,
        empresaId: -1
      });
      expect(result.success).toBe(false);
    });

    it('deve rejeitar categoriaId inválido', () => {
      const result = createExpenseSchema.safeParse({
        ...validData,
        categoriaId: 0
      });
      expect(result.success).toBe(false);
    });

    it('deve rejeitar descrição muito curta', () => {
      const result = createExpenseSchema.safeParse({
        ...validData,
        descricao: 'Ab'
      });
      expect(result.success).toBe(false);
    });

    it('deve rejeitar descrição muito longa', () => {
      const result = createExpenseSchema.safeParse({
        ...validData,
        descricao: 'A'.repeat(256)
      });
      expect(result.success).toBe(false);
    });

    it('deve rejeitar valor zero', () => {
      const result = createExpenseSchema.safeParse({
        ...validData,
        valor: 0
      });
      expect(result.success).toBe(false);
    });

    it('deve rejeitar valor negativo', () => {
      const result = createExpenseSchema.safeParse({
        ...validData,
        valor: -100
      });
      expect(result.success).toBe(false);
    });

    it('deve rejeitar valor acima do máximo', () => {
      const result = createExpenseSchema.safeParse({
        ...validData,
        valor: 1000000000 // 1 bilhão
      });
      expect(result.success).toBe(false);
    });

    it('deve validar todos os tipos de despesa', () => {
      // Usar valores do enum diretamente para evitar dessincronia
      const tipos = TipoDespesaEnum.options;
      
      tipos.forEach(tipo => {
        const result = createExpenseSchema.safeParse({
          ...validData,
          tipo
        });
        expect(result.success).toBe(true);
      });
    });

    it('deve validar todas as formas de pagamento', () => {
      // Usar valores do enum diretamente para evitar dessincronia
      const formas = FormaPagamentoEnum.options;
      
      formas.forEach(forma => {
        const result = createExpenseSchema.safeParse({
          ...validData,
          formaPagamento: forma
        });
        expect(result.success).toBe(true);
      });
    });

    it('deve rejeitar dataVencimento anterior à dataEmissao', () => {
      const result = createExpenseSchema.safeParse({
        ...validData,
        dataEmissao: new Date('2025-10-10'),
        dataVencimento: new Date('2025-10-05')
      });
      expect(result.success).toBe(false);
    });

    it('deve validar dataVencimento igual à dataEmissao', () => {
      const data = new Date('2025-10-10');
      const result = createExpenseSchema.safeParse({
        ...validData,
        dataEmissao: data,
        dataVencimento: data
      });
      expect(result.success).toBe(true);
    });

    it('deve rejeitar status PAGA sem dataPagamento', () => {
      const result = createExpenseSchema.safeParse({
        ...validData,
        status: 'PAGA',
        dataPagamento: null
      });
      expect(result.success).toBe(false);
    });

    it('deve validar status PAGA com dataPagamento', () => {
      const result = createExpenseSchema.safeParse({
        ...validData,
        status: 'PAGA',
        dataPagamento: new Date('2025-10-05')
      });
      expect(result.success).toBe(true);
    });

    it('deve rejeitar requerAprovacao=true sem dados de aprovação', () => {
      const result = createExpenseSchema.safeParse({
        ...validData,
        requerAprovacao: true
      });
      expect(result.success).toBe(false);
    });

    it('deve rejeitar aprovação sem aprovadorId', () => {
      const result = createExpenseSchema.safeParse({
        ...validData,
        requerAprovacao: true,
        aprovacao: {
          tipoAprovador: 'GERENTE' as const,
          nivelAprovacao: 1,
          requerProximoNivel: false
        }
      });
      expect(result.success).toBe(false);
    });

    it('deve validar campos opcionais como null', () => {
      const result = createExpenseSchema.safeParse({
        ...validData,
        fornecedorId: null,
        dataPagamento: null,
        anexoUrl: null,
        numeroDocumento: null,
        observacoes: null,
        criadoPor: undefined
      });
      expect(result.success).toBe(true);
    });

    it('deve validar URL de anexo válida', () => {
      const result = createExpenseSchema.safeParse({
        ...validData,
        anexoUrl: 'https://example.com/nota-fiscal.pdf'
      });
      expect(result.success).toBe(true);
    });

    it('deve validar caminho de anexo com extensão', () => {
      const result = createExpenseSchema.safeParse({
        ...validData,
        anexoUrl: '/storage/uploads/nota-fiscal.pdf'
      });
      expect(result.success).toBe(true);
    });

    it('deve rejeitar URL de anexo inválida', () => {
      const result = createExpenseSchema.safeParse({
        ...validData,
        anexoUrl: 'invalid-url'
      });
      expect(result.success).toBe(false);
    });
  });

  // ========================================
  // UPDATE EXPENSE SCHEMA
  // ========================================

  describe('updateExpenseSchema', () => {
    it('deve validar atualização parcial', () => {
      const result = updateExpenseSchema.safeParse({
        descricao: 'Nova descrição',
        valor: 6000.00
      });
      expect(result.success).toBe(true);
    });

    it('deve validar todos os campos opcionais', () => {
      const result = updateExpenseSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('deve validar atualização de um único campo', () => {
      const result = updateExpenseSchema.safeParse({
        observacoes: 'Observação atualizada'
      });
      expect(result.success).toBe(true);
    });

    it('deve rejeitar dataVencimento anterior à dataEmissao', () => {
      const result = updateExpenseSchema.safeParse({
        dataEmissao: new Date('2025-10-10'),
        dataVencimento: new Date('2025-10-05')
      });
      expect(result.success).toBe(false);
    });

    it('deve validar apenas dataVencimento', () => {
      const result = updateExpenseSchema.safeParse({
        dataVencimento: new Date('2025-10-20')
      });
      expect(result.success).toBe(true);
    });
  });

  // ========================================
  // EXPENSE FILTERS SCHEMA
  // ========================================

  describe('expenseFiltersSchema', () => {
    const validFilters = {
      empresaId: 1,
      page: 1,
      limit: 20,
      sortBy: 'dataVencimento' as const,
      sortOrder: 'desc' as const
    };

    it('deve validar filtros mínimos', () => {
      const result = expenseFiltersSchema.safeParse(validFilters);
      expect(result.success).toBe(true);
    });

    it('deve validar todos os filtros', () => {
      const result = expenseFiltersSchema.safeParse({
        ...validFilters,
        status: 'PENDENTE',
        tipo: 'OPERACIONAL',
        formaPagamento: 'PIX',
        categoriaId: 1,
        fornecedorId: 1,
        criadoPor: 1,
        valorMin: 100,
        valorMax: 10000,
        dataEmissaoInicio: new Date('2025-10-01'),
        dataEmissaoFim: new Date('2025-10-31'),
        dataVencimentoInicio: new Date('2025-10-01'),
        dataVencimentoFim: new Date('2025-10-31'),
        requerAprovacao: true,
        aprovada: true,
        search: 'salário'
      });
      expect(result.success).toBe(true);
    });

    it('deve aplicar valores padrão', () => {
      const result = expenseFiltersSchema.safeParse({
        empresaId: 1
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
        expect(result.data.sortBy).toBe('dataVencimento');
        expect(result.data.sortOrder).toBe('desc');
      }
    });

    it('deve rejeitar empresaId ausente', () => {
      const result = expenseFiltersSchema.safeParse({
        page: 1
      });
      expect(result.success).toBe(false);
    });

    it('deve rejeitar page menor que 1', () => {
      const result = expenseFiltersSchema.safeParse({
        ...validFilters,
        page: 0
      });
      expect(result.success).toBe(false);
    });

    it('deve rejeitar limit maior que 100', () => {
      const result = expenseFiltersSchema.safeParse({
        ...validFilters,
        limit: 150
      });
      expect(result.success).toBe(false);
    });

    it('deve rejeitar valorMax menor que valorMin', () => {
      const result = expenseFiltersSchema.safeParse({
        ...validFilters,
        valorMin: 1000,
        valorMax: 500
      });
      expect(result.success).toBe(false);
    });

    it('deve validar valorMax igual a valorMin', () => {
      const result = expenseFiltersSchema.safeParse({
        ...validFilters,
        valorMin: 1000,
        valorMax: 1000
      });
      expect(result.success).toBe(true);
    });

    it('deve rejeitar range de datas inválido', () => {
      const result = expenseFiltersSchema.safeParse({
        ...validFilters,
        dataEmissaoInicio: new Date('2025-10-31'),
        dataEmissaoFim: new Date('2025-10-01')
      });
      expect(result.success).toBe(false);
    });

    it('deve validar todos os sortBy válidos', () => {
      const campos = ['dataEmissao', 'dataVencimento', 'dataPagamento', 
                      'valor', 'status', 'descricao', 'criadoEm'];
      
      campos.forEach(campo => {
        const result = expenseFiltersSchema.safeParse({
          ...validFilters,
          sortBy: campo
        });
        expect(result.success).toBe(true);
      });
    });
  });

  // ========================================
  // APPROVE EXPENSE SCHEMA
  // ========================================

  describe('approveExpenseSchema', () => {
    const validApproval = {
      expenseId: 1,
      aprovadorId: 2,
      comentario: 'Aprovado conforme orçamento',
      requerProximoNivel: false,
      proximoAprovadorId: null
    };

    it('deve validar aprovação simples', () => {
      const result = approveExpenseSchema.safeParse(validApproval);
      expect(result.success).toBe(true);
    });

    it('deve validar aprovação multi-nível', () => {
      const result = approveExpenseSchema.safeParse({
        ...validApproval,
        requerProximoNivel: true,
        proximoAprovadorId: 3
      });
      expect(result.success).toBe(true);
    });

    it('deve rejeitar expenseId inválido', () => {
      const result = approveExpenseSchema.safeParse({
        ...validApproval,
        expenseId: -1
      });
      expect(result.success).toBe(false);
    });

    it('deve rejeitar aprovadorId inválido', () => {
      const result = approveExpenseSchema.safeParse({
        ...validApproval,
        aprovadorId: 0
      });
      expect(result.success).toBe(false);
    });

    it('deve rejeitar próximo nível sem aprovador', () => {
      const result = approveExpenseSchema.safeParse({
        ...validApproval,
        requerProximoNivel: true,
        proximoAprovadorId: null
      });
      expect(result.success).toBe(false);
    });

    it('deve validar comentário opcional', () => {
      const result = approveExpenseSchema.safeParse({
        expenseId: 1,
        aprovadorId: 2,
        requerProximoNivel: false
      });
      expect(result.success).toBe(true);
    });
  });

  // ========================================
  // REJECT EXPENSE SCHEMA
  // ========================================

  describe('rejectExpenseSchema', () => {
    const validRejection = {
      expenseId: 1,
      aprovadorId: 2,
      comentario: 'Valor acima do orçamento disponível para este mês'
    };

    it('deve validar rejeição válida', () => {
      const result = rejectExpenseSchema.safeParse(validRejection);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar comentário muito curto', () => {
      const result = rejectExpenseSchema.safeParse({
        ...validRejection,
        comentario: 'Curto'
      });
      expect(result.success).toBe(false);
    });

    it('deve rejeitar comentário ausente', () => {
      const result = rejectExpenseSchema.safeParse({
        expenseId: 1,
        aprovadorId: 2
      });
      expect(result.success).toBe(false);
    });

    it('deve validar comentário no limite mínimo', () => {
      const result = rejectExpenseSchema.safeParse({
        ...validRejection,
        comentario: '1234567890' // Exatamente 10 caracteres
      });
      expect(result.success).toBe(true);
    });

    it('deve rejeitar comentário muito longo', () => {
      const result = rejectExpenseSchema.safeParse({
        ...validRejection,
        comentario: 'A'.repeat(1001)
      });
      expect(result.success).toBe(false);
    });
  });

  // ========================================
  // PAY EXPENSE SCHEMA
  // ========================================

  describe('payExpenseSchema', () => {
    const validPayment = {
      expenseId: 1,
      dataPagamento: new Date('2025-10-25'),
      formaPagamento: 'TRANSFERENCIA' as const,
      observacoes: 'Pagamento realizado via TED'
    };

    it('deve validar pagamento completo', () => {
      const result = payExpenseSchema.safeParse(validPayment);
      expect(result.success).toBe(true);
    });

    it('deve validar pagamento sem observações', () => {
      const result = payExpenseSchema.safeParse({
        expenseId: 1,
        dataPagamento: new Date('2025-10-25')
      });
      expect(result.success).toBe(true);
    });

    it('deve validar alteração de forma de pagamento', () => {
      const result = payExpenseSchema.safeParse({
        expenseId: 1,
        dataPagamento: new Date('2025-10-25'),
        formaPagamento: 'PIX' as const
      });
      expect(result.success).toBe(true);
    });

    it('deve rejeitar expenseId inválido', () => {
      const result = payExpenseSchema.safeParse({
        ...validPayment,
        expenseId: 0
      });
      expect(result.success).toBe(false);
    });
  });

  // ========================================
  // EXPENSE CATEGORY SCHEMA
  // ========================================

  describe('createExpenseCategorySchema', () => {
    const validCategory = {
      empresaId: 1,
      nome: 'Consultoria Externa',
      descricao: 'Serviços de consultoria especializada',
      cor: '#8B5CF6',
      icone: 'briefcase',
      ativo: true,
      orcamentoMensal: 10000.00
    };

    it('deve validar categoria completa', () => {
      const result = createExpenseCategorySchema.safeParse(validCategory);
      expect(result.success).toBe(true);
    });

    it('deve aplicar valores padrão', () => {
      const result = createExpenseCategorySchema.safeParse({
        empresaId: 1,
        nome: 'Nova Categoria'
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.cor).toBe('#EF4444');
        expect(result.data.ativo).toBe(true);
      }
    });

    it('deve rejeitar nome muito curto', () => {
      const result = createExpenseCategorySchema.safeParse({
        ...validCategory,
        nome: 'AB'
      });
      expect(result.success).toBe(false);
    });

    it('deve rejeitar nome muito longo', () => {
      const result = createExpenseCategorySchema.safeParse({
        ...validCategory,
        nome: 'A'.repeat(101)
      });
      expect(result.success).toBe(false);
    });

    it('deve rejeitar cor inválida', () => {
      const result = createExpenseCategorySchema.safeParse({
        ...validCategory,
        cor: 'red'
      });
      expect(result.success).toBe(false);
    });

    it('deve validar cor em minúsculas', () => {
      const result = createExpenseCategorySchema.safeParse({
        ...validCategory,
        cor: '#aabbcc'
      });
      expect(result.success).toBe(true);
    });

    it('deve validar cor em maiúsculas', () => {
      const result = createExpenseCategorySchema.safeParse({
        ...validCategory,
        cor: '#AABBCC'
      });
      expect(result.success).toBe(true);
    });

    it('deve rejeitar orçamento negativo', () => {
      const result = createExpenseCategorySchema.safeParse({
        ...validCategory,
        orcamentoMensal: -1000
      });
      expect(result.success).toBe(false);
    });

    it('deve rejeitar orçamento acima do máximo', () => {
      const result = createExpenseCategorySchema.safeParse({
        ...validCategory,
        orcamentoMensal: 1000000000
      });
      expect(result.success).toBe(false);
    });
  });

  // ========================================
  // HELPERS DE VALIDAÇÃO
  // ========================================

  describe('Helpers de Validação', () => {
    describe('canUserApprove', () => {
      it('deve permitir ADMINISTRADOR aprovar qualquer nível', () => {
        expect(canUserApprove('ADMINISTRADOR', 'GERENTE')).toBe(true);
        expect(canUserApprove('ADMINISTRADOR', 'DIRETOR')).toBe(true);
        expect(canUserApprove('ADMINISTRADOR', 'FINANCEIRO')).toBe(true);
        expect(canUserApprove('ADMINISTRADOR', 'ADMINISTRADOR')).toBe(true);
      });

      it('deve permitir DIRETOR aprovar até DIRETOR', () => {
        expect(canUserApprove('DIRETOR', 'GERENTE')).toBe(true);
        expect(canUserApprove('DIRETOR', 'DIRETOR')).toBe(true);
        expect(canUserApprove('DIRETOR', 'FINANCEIRO')).toBe(false);
        expect(canUserApprove('DIRETOR', 'ADMINISTRADOR')).toBe(false);
      });

      it('deve permitir FINANCEIRO aprovar até DIRETOR', () => {
        expect(canUserApprove('FINANCEIRO', 'GERENTE')).toBe(true);
        expect(canUserApprove('FINANCEIRO', 'FINANCEIRO')).toBe(true);
        expect(canUserApprove('FINANCEIRO', 'DIRETOR')).toBe(true);
        expect(canUserApprove('FINANCEIRO', 'ADMINISTRADOR')).toBe(false);
      });

      it('deve permitir GERENTE aprovar apenas GERENTE', () => {
        expect(canUserApprove('GERENTE', 'GERENTE')).toBe(true);
        expect(canUserApprove('GERENTE', 'FINANCEIRO')).toBe(false);
      });
    });

    describe('determineApprovalType', () => {
      it('deve retornar GERENTE para valores baixos', () => {
        expect(determineApprovalType(1000)).toBe('GERENTE');
        expect(determineApprovalType(4999)).toBe('GERENTE');
      });

      it('deve retornar FINANCEIRO para valores médios', () => {
        expect(determineApprovalType(5000)).toBe('FINANCEIRO');
        expect(determineApprovalType(10000)).toBe('FINANCEIRO');
        expect(determineApprovalType(19999)).toBe('FINANCEIRO');
      });

      it('deve retornar DIRETOR para valores altos', () => {
        expect(determineApprovalType(20000)).toBe('DIRETOR');
        expect(determineApprovalType(30000)).toBe('DIRETOR');
        expect(determineApprovalType(49999)).toBe('DIRETOR');
      });

      it('deve retornar ADMINISTRADOR para valores muito altos', () => {
        expect(determineApprovalType(50000)).toBe('ADMINISTRADOR');
        expect(determineApprovalType(100000)).toBe('ADMINISTRADOR');
        expect(determineApprovalType(1000000)).toBe('ADMINISTRADOR');
      });
    });

    describe('requiresMultiLevelApproval', () => {
      it('deve requerer múltiplos níveis para valores > R$ 50.000', () => {
        expect(requiresMultiLevelApproval(50001, 'OPERACIONAL')).toBe(true);
        expect(requiresMultiLevelApproval(100000, 'ADMINISTRATIVA')).toBe(true);
      });

      it('deve requerer múltiplos níveis para PESSOAL > R$ 10.000', () => {
        expect(requiresMultiLevelApproval(10001, 'PESSOAL')).toBe(true);
        expect(requiresMultiLevelApproval(15000, 'PESSOAL')).toBe(true);
      });

      it('não deve requerer múltiplos níveis para PESSOAL <= R$ 10.000', () => {
        expect(requiresMultiLevelApproval(10000, 'PESSOAL')).toBe(false);
        expect(requiresMultiLevelApproval(5000, 'PESSOAL')).toBe(false);
      });

      it('deve sempre requerer múltiplos níveis para IMPOSTOS', () => {
        expect(requiresMultiLevelApproval(100, 'IMPOSTOS')).toBe(true);
        expect(requiresMultiLevelApproval(1000, 'IMPOSTOS')).toBe(true);
        expect(requiresMultiLevelApproval(50000, 'IMPOSTOS')).toBe(true);
      });

      it('não deve requerer múltiplos níveis para valores baixos', () => {
        expect(requiresMultiLevelApproval(1000, 'OPERACIONAL')).toBe(false);
        expect(requiresMultiLevelApproval(5000, 'MARKETING')).toBe(false);
        expect(requiresMultiLevelApproval(10000, 'TECNOLOGIA')).toBe(false);
      });
    });
  });
});
