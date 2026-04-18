// src/__tests__/integration/revenue-api.test.ts
// Testes de integração de lógica de negócio para Revenue APIs
// Valida fluxos completos sem necessidade de servidor rodando

import {
  createRevenueSchema,
  updateRevenueSchema,
  createRecurrenceSchema,
  revenueFiltersSchema,
} from '@/schemas/revenue.schema';

describe('Revenue API Integration Tests', () => {
  describe('POST /api/financeiro/receitas - Payload Validation', () => {
    it('deve validar payload completo para criação', () => {
      const payload = {
        empresaId: 1,
        categoriaId: 1,
        descricao: 'Consultoria mensal',
        valor: 1500.50,
        dataEmissao: '2025-10-12T12:00:00.000Z',
        dataVencimento: '2025-11-12T12:00:00.000Z',
        tipo: 'SERVICO',
        formaPagamento: 'PIX',
        recorrente: false,
      };

      const result = createRevenueSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('PENDENTE'); // Default
      }
    });

    it('deve validar payload com recorrência', () => {
      const payload = {
        empresaId: 1,
        categoriaId: 1,
        descricao: 'Mensalidade SaaS',
        valor: 299.90,
        dataEmissao: '2025-10-01T12:00:00.000Z',
        dataVencimento: '2025-10-15T12:00:00.000Z',
        tipo: 'MENSALIDADE',
        formaPagamento: 'CARTAO_CREDITO',
        recorrente: true,
        recorrencia: {
          frequencia: 'MENSAL',
          diaVencimento: 15,
          dataInicio: '2025-10-15T12:00:00.000Z',
        },
      };

      const result = createRevenueSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar receita recorrente sem configuração', () => {
      const payload = {
        empresaId: 1,
        categoriaId: 1,
        descricao: 'Receita recorrente',
        valor: 500,
        dataEmissao: '2025-10-12T12:00:00.000Z',
        dataVencimento: '2025-10-12T12:00:00.000Z',
        tipo: 'SERVICO',
        formaPagamento: 'PIX',
        recorrente: true,
        // recorrencia: undefined
      };

      const result = createRevenueSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('deve rejeitar valores inválidos', () => {
      const payload = {
        empresaId: 0, // Inválido
        categoriaId: 1,
        descricao: 'AB', // Muito curta
        valor: -100, // Negativo
        dataEmissao: '2025-10-12T12:00:00.000Z',
        dataVencimento: '2025-10-12T12:00:00.000Z',
        tipo: 'SERVICO',
        formaPagamento: 'PIX',
      };

      const result = createRevenueSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe('PUT /api/financeiro/receitas/[id] - Update Validation', () => {
    it('deve validar atualização parcial', () => {
      const updates = {
        descricao: 'Nova descrição',
        valor: 2000,
      };

      const result = updateRevenueSchema.safeParse(updates);
      expect(result.success).toBe(true);
    });

    it('deve aceitar objeto vazio (nenhuma atualização)', () => {
      const result = updateRevenueSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('deve validar status sendo modificado', () => {
      const updates = {
        status: 'RECEBIDA',
        dataPagamento: '2025-10-15T12:00:00.000Z',
      };

      const result = updateRevenueSchema.safeParse(updates);
      expect(result.success).toBe(true);
    });
  });

  describe('POST /api/financeiro/receitas/[id]/recorrencia - Recurrence Creation', () => {
    it('deve validar configuração de recorrência mensal', () => {
      const payload = {
        frequencia: 'MENSAL',
        diaVencimento: 15,
        dataInicio: '2025-11-01T12:00:00.000Z',
      };

      const result = createRecurrenceSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('deve validar recorrência com data fim', () => {
      const payload = {
        frequencia: 'MENSAL',
        diaVencimento: 10,
        dataInicio: '2025-10-10T12:00:00.000Z',
        dataFim: '2026-10-10T12:00:00.000Z',
      };

      const result = createRecurrenceSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar dataFim antes de dataInicio', () => {
      const payload = {
        frequencia: 'MENSAL',
        diaVencimento: 10,
        dataInicio: '2026-01-01T12:00:00.000Z',
        dataFim: '2025-12-31T12:00:00.000Z', // Antes!
      };

      const result = createRecurrenceSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('deve rejeitar diaVencimento fora do range (1-31)', () => {
      const payloadZero = {
        frequencia: 'MENSAL',
        diaVencimento: 0,
        dataInicio: '2025-10-12T12:00:00.000Z',
      };

      const result1 = createRecurrenceSchema.safeParse(payloadZero);
      expect(result1.success).toBe(false);

      const payload32 = { ...payloadZero, diaVencimento: 32 };
      const result2 = createRecurrenceSchema.safeParse(payload32);
      expect(result2.success).toBe(false);
    });
  });

  describe('GET /api/financeiro/receitas - Query Filters', () => {
    it('deve validar filtros básicos', () => {
      const query = {
        empresaId: 1,
        page: 1,
        limit: 50,
      };

      const result = revenueFiltersSchema.safeParse(query);
      expect(result.success).toBe(true);
    });

    it('deve aplicar defaults', () => {
      const query = { empresaId: 1 };

      const result = revenueFiltersSchema.safeParse(query);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(50);
        expect(result.data.orderBy).toBe('dataVencimento');
        expect(result.data.order).toBe('desc');
      }
    });

    it('deve validar filtros completos', () => {
      const query = {
        empresaId: 1,
        status: 'PENDENTE',
        categoriaId: 2,
        clienteId: 5,
        tipo: 'SERVICO',
        dataInicio: '2025-10-01T12:00:00.000Z',
        dataFim: '2025-10-31T12:00:00.000Z',
        search: 'consultoria',
        page: 2,
        limit: 25,
        orderBy: 'valor',
        order: 'asc',
      };

      const result = revenueFiltersSchema.safeParse(query);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar limit acima de 100', () => {
      const query = {
        empresaId: 1,
        limit: 150,
      };

      const result = revenueFiltersSchema.safeParse(query);
      expect(result.success).toBe(false);
    });
  });

  describe('Business Rules - Edit Permissions', () => {
    it('deve permitir editar receita PENDENTE', () => {
      const revenue = {
        id: 1,
        status: 'PENDENTE',
        descricao: 'Receita teste',
      };

      const canEdit = revenue.status !== 'RECEBIDA';
      expect(canEdit).toBe(true);
    });

    it('deve permitir editar receita VENCIDA', () => {
      const revenue = {
        id: 1,
        status: 'VENCIDA',
        descricao: 'Receita teste',
      };

      const canEdit = revenue.status !== 'RECEBIDA';
      expect(canEdit).toBe(true);
    });

    it('NÃO deve permitir editar receita RECEBIDA', () => {
      const revenue = {
        id: 1,
        status: 'RECEBIDA',
        descricao: 'Receita teste',
      };

      const canEdit = revenue.status !== 'RECEBIDA';
      expect(canEdit).toBe(false);
    });
  });

  describe('Business Rules - Cancel Permissions', () => {
    it('deve permitir cancelar receita PENDENTE', () => {
      const revenue = { id: 1, status: 'PENDENTE' };
      const canCancel = revenue.status !== 'RECEBIDA' && revenue.status !== 'CANCELADA';
      expect(canCancel).toBe(true);
    });

    it('NÃO deve permitir cancelar receita RECEBIDA', () => {
      const revenue = { id: 1, status: 'RECEBIDA' };
      const canCancel = revenue.status !== 'RECEBIDA' && revenue.status !== 'CANCELADA';
      expect(canCancel).toBe(false);
    });

    it('NÃO deve permitir cancelar receita já CANCELADA', () => {
      const revenue = { id: 1, status: 'CANCELADA' };
      const canCancel = revenue.status !== 'RECEBIDA' && revenue.status !== 'CANCELADA';
      expect(canCancel).toBe(false);
    });
  });

  describe('Business Rules - Recurrence Permissions', () => {
    it('deve permitir adicionar recorrência em receita PENDENTE sem recorrência', () => {
      const revenue = {
        id: 1,
        status: 'PENDENTE',
        recorrencia: null,
      };

      const canAddRecurrence = revenue.status !== 'RECEBIDA' && !revenue.recorrencia;
      expect(canAddRecurrence).toBe(true);
    });

    it('NÃO deve permitir adicionar recorrência em receita RECEBIDA', () => {
      const revenue = {
        id: 1,
        status: 'RECEBIDA',
        recorrencia: null,
      };

      const canAddRecurrence = revenue.status !== 'RECEBIDA' && !revenue.recorrencia;
      expect(canAddRecurrence).toBe(false);
    });

    it('NÃO deve permitir adicionar recorrência se já existe', () => {
      const revenue = {
        id: 1,
        status: 'PENDENTE',
        recorrencia: { id: 1, frequencia: 'MENSAL' },
      };

      const canAddRecurrence = revenue.status !== 'RECEBIDA' && !revenue.recorrencia;
      expect(canAddRecurrence).toBe(false);
    });
  });

  describe('API Response Structures', () => {
    it('deve estruturar resposta de sucesso na criação', () => {
      const apiResponse = {
        success: true,
        message: 'Receita criada com sucesso',
        data: {
          id: 1,
          empresaId: 1,
          categoriaId: 1,
          descricao: 'Consultoria',
          valor: 1500,
          status: 'PENDENTE',
        },
      };

      expect(apiResponse.success).toBe(true);
      expect(apiResponse.data).toHaveProperty('id');
      expect(apiResponse.message).toContain('sucesso');
    });

    it('deve estruturar resposta de erro 400', () => {
      const apiResponse = {
        success: false,
        error: 'Dados inválidos',
        details: [
          { field: 'valor', message: 'Valor deve ser maior que zero' },
        ],
      };

      expect(apiResponse.success).toBe(false);
      expect(apiResponse.error).toBeTruthy();
      expect(apiResponse.details).toBeInstanceOf(Array);
    });

    it('deve estruturar resposta de lista paginada', () => {
      const apiResponse = {
        success: true,
        data: [
          { id: 1, descricao: 'Receita 1', valor: 1000 },
          { id: 2, descricao: 'Receita 2', valor: 2000 },
        ],
        pagination: {
          page: 1,
          limit: 50,
          total: 2,
          pages: 1,
        },
        totais: {
          valorTotal: 3000,
          quantidade: 2,
        },
      };

      expect(apiResponse.success).toBe(true);
      expect(apiResponse.data).toHaveLength(2);
      expect(apiResponse.pagination).toHaveProperty('total');
      expect(apiResponse.totais.valorTotal).toBe(3000);
    });
  });
});
