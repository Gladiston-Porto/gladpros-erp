// src/__tests__/unit/revenue-validations.test.ts
// Testes das validações Zod para Revenue (Receitas)

import {
  createRevenueSchema,
  updateRevenueSchema,
  createRecurrenceSchema,
  revenueFiltersSchema,
} from '@/schemas/revenue.schema';

describe('Revenue Validations', () => {
  describe('createRevenueSchema', () => {
    const validData = {
      empresaId: 1,
      categoriaId: 1,
      clienteId: 1,
      descricao: 'Pagamento de consultoria',
      valor: 1500.50,
      dataEmissao: '2025-10-12T10:00:00.000Z',
      dataVencimento: '2025-11-12T10:00:00.000Z',
      tipo: 'SERVICO',
      formaPagamento: 'PIX',
      status: 'PENDENTE',
      recorrente: false,
    };

    it('deve validar dados corretos', () => {
      const result = createRevenueSchema.parse(validData);
      expect(result).toMatchObject(validData);
    });

    it('deve validar com cliente opcional', () => {
      const { clienteId, ...dataWithoutClient } = validData;
      const result = createRevenueSchema.parse(dataWithoutClient);
      expect(result.clienteId).toBeUndefined();
    });

    it('deve validar com data de pagamento', () => {
      const dataWithPayment = {
        ...validData,
        dataPagamento: '2025-11-11T15:00:00.000Z',
      };
      const result = createRevenueSchema.parse(dataWithPayment);
      expect(result.dataPagamento).toBe(dataWithPayment.dataPagamento);
    });

    it('deve rejeitar empresaId inválido', () => {
      expect(() => {
        createRevenueSchema.parse({ ...validData, empresaId: 0 });
      }).toThrow();
    });

    it('deve rejeitar descrição muito curta', () => {
      expect(() => {
        createRevenueSchema.parse({ ...validData, descricao: 'AB' });
      }).toThrow();
    });

    it('deve rejeitar descrição muito longa', () => {
      expect(() => {
        createRevenueSchema.parse({ ...validData, descricao: 'A'.repeat(256) });
      }).toThrow();
    });

    it('deve rejeitar valor negativo', () => {
      expect(() => {
        createRevenueSchema.parse({ ...validData, valor: -100 });
      }).toThrow();
    });

    it('deve rejeitar valor zero', () => {
      expect(() => {
        createRevenueSchema.parse({ ...validData, valor: 0 });
      }).toThrow();
    });

    it('deve rejeitar valor acima do máximo', () => {
      expect(() => {
        createRevenueSchema.parse({ ...validData, valor: 10000000 });
      }).toThrow();
    });

    it('deve rejeitar tipo inválido', () => {
      expect(() => {
        createRevenueSchema.parse({ ...validData, tipo: 'INVALIDO' });
      }).toThrow();
    });

    it('deve rejeitar forma de pagamento inválida', () => {
      expect(() => {
        createRevenueSchema.parse({ ...validData, formaPagamento: 'INVALIDO' });
      }).toThrow();
    });

    it('deve rejeitar data de vencimento anterior à emissão', () => {
      expect(() => {
        createRevenueSchema.parse({
          ...validData,
          dataEmissao: '2025-11-12T10:00:00.000Z',
          dataVencimento: '2025-10-12T10:00:00.000Z',
        });
      }).toThrow();
    });

    it('deve rejeitar data de pagamento anterior à emissão', () => {
      expect(() => {
        createRevenueSchema.parse({
          ...validData,
          dataPagamento: '2025-10-11T10:00:00.000Z',
        });
      }).toThrow();
    });

    it('deve aceitar data de vencimento igual à emissão', () => {
      const result = createRevenueSchema.parse({
        ...validData,
        dataEmissao: '2025-10-12T10:00:00.000Z',
        dataVencimento: '2025-10-12T10:00:00.000Z',
      });
      expect(result).toBeDefined();
    });

    it('deve validar receita recorrente sem configuração de recorrência', () => {
      expect(() => {
        createRevenueSchema.parse({
          ...validData,
          recorrente: true,
          // Sem recorrencia
        });
      }).toThrow();
    });

    it('deve validar receita recorrente COM configuração', () => {
      const dataWithRecurrence = {
        ...validData,
        recorrente: true,
        recorrencia: {
          frequencia: 'MENSAL',
          diaVencimento: 15,
          dataInicio: '2025-10-15T10:00:00.000Z',
        },
      };
      const result = createRevenueSchema.parse(dataWithRecurrence);
      expect(result.recorrente).toBe(true);
      expect(result.recorrencia).toBeDefined();
    });

    it('deve validar todos os tipos de receita', () => {
      const tipos = ['SERVICO', 'VENDA_PRODUTO', 'CONSULTORIA', 'MENSALIDADE', 'COMISSAO', 'OUTROS'];
      tipos.forEach((tipo) => {
        const result = createRevenueSchema.parse({ ...validData, tipo });
        expect(result.tipo).toBe(tipo);
      });
    });

    it('deve validar todas as formas de pagamento', () => {
      const formas = [
        'DINHEIRO',
        'CARTAO_CREDITO',
        'CARTAO_DEBITO',
        'PIX',
        'TRANSFERENCIA',
        'BOLETO',
        'CHEQUE',
      ];
      formas.forEach((formaPagamento) => {
        const result = createRevenueSchema.parse({ ...validData, formaPagamento });
        expect(result.formaPagamento).toBe(formaPagamento);
      });
    });

    it('deve aplicar status padrão PENDENTE', () => {
      const { status, ...dataWithoutStatus } = validData;
      const result = createRevenueSchema.parse(dataWithoutStatus);
      expect(result.status).toBe('PENDENTE');
    });

    it('deve aplicar recorrente padrão false', () => {
      const { recorrente, ...dataWithoutRecorrente } = validData;
      const result = createRevenueSchema.parse(dataWithoutRecorrente);
      expect(result.recorrente).toBe(false);
    });
  });

  describe('updateRevenueSchema', () => {
    it('deve validar atualização parcial', () => {
      const result = updateRevenueSchema.parse({
        descricao: 'Nova descrição',
        valor: 2000,
      });
      expect(result.descricao).toBe('Nova descrição');
      expect(result.valor).toBe(2000);
    });

    it('deve aceitar clienteId null', () => {
      const result = updateRevenueSchema.parse({
        clienteId: null,
      });
      expect(result.clienteId).toBeNull();
    });

    it('deve aceitar objeto vazio', () => {
      const result = updateRevenueSchema.parse({});
      expect(result).toEqual({});
    });

    it('deve rejeitar valor inválido na atualização', () => {
      expect(() => {
        updateRevenueSchema.parse({ valor: -100 });
      }).toThrow();
    });
  });

  describe('createRecurrenceSchema', () => {
    const validRecurrence = {
      frequencia: 'MENSAL',
      diaVencimento: 15,
      dataInicio: '2025-10-15T10:00:00.000Z',
    };

    it('deve validar recorrência válida', () => {
      const result = createRecurrenceSchema.parse(validRecurrence);
      expect(result).toMatchObject(validRecurrence);
    });

    it('deve validar com data de fim', () => {
      const dataWithEnd = {
        ...validRecurrence,
        dataFim: '2026-10-15T10:00:00.000Z',
      };
      const result = createRecurrenceSchema.parse(dataWithEnd);
      expect(result.dataFim).toBe(dataWithEnd.dataFim);
    });

    it('deve rejeitar diaVencimento < 1', () => {
      expect(() => {
        createRecurrenceSchema.parse({ ...validRecurrence, diaVencimento: 0 });
      }).toThrow();
    });

    it('deve rejeitar diaVencimento > 31', () => {
      expect(() => {
        createRecurrenceSchema.parse({ ...validRecurrence, diaVencimento: 32 });
      }).toThrow();
    });

    it('deve rejeitar dataFim antes de dataInicio', () => {
      expect(() => {
        createRecurrenceSchema.parse({
          ...validRecurrence,
          dataInicio: '2025-10-15T10:00:00.000Z',
          dataFim: '2025-09-15T10:00:00.000Z',
        });
      }).toThrow();
    });

    it('deve validar todas as frequências', () => {
      const frequencias = [
        'SEMANAL',
        'QUINZENAL',
        'MENSAL',
        'BIMESTRAL',
        'TRIMESTRAL',
        'SEMESTRAL',
        'ANUAL',
      ];
      frequencias.forEach((frequencia) => {
        const result = createRecurrenceSchema.parse({ ...validRecurrence, frequencia });
        expect(result.frequencia).toBe(frequencia);
      });
    });
  });

  describe('revenueFiltersSchema', () => {
    it('deve validar filtros básicos', () => {
      const result = revenueFiltersSchema.parse({
        empresaId: 1,
      });
      expect(result.empresaId).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(50);
      expect(result.orderBy).toBe('dataVencimento');
      expect(result.order).toBe('desc');
    });

    it('deve validar filtros completos', () => {
      const filters = {
        empresaId: 1,
        status: 'PENDENTE',
        categoriaId: 5,
        clienteId: 10,
        tipo: 'SERVICO',
        dataInicio: '2025-01-01T00:00:00.000Z',
        dataFim: '2025-12-31T23:59:59.000Z',
        page: 2,
        limit: 100,
        orderBy: 'valor',
        order: 'asc',
      };
      const result = revenueFiltersSchema.parse(filters);
      expect(result).toMatchObject(filters);
    });

    it('deve aplicar valores padrão', () => {
      const result = revenueFiltersSchema.parse({ empresaId: 1 });
      expect(result.page).toBe(1);
      expect(result.limit).toBe(50);
      expect(result.orderBy).toBe('dataVencimento');
      expect(result.order).toBe('desc');
    });

    it('deve rejeitar limit acima de 100', () => {
      expect(() => {
        revenueFiltersSchema.parse({ empresaId: 1, limit: 101 });
      }).toThrow();
    });

    it('deve rejeitar page zero ou negativo', () => {
      expect(() => {
        revenueFiltersSchema.parse({ empresaId: 1, page: 0 });
      }).toThrow();
    });
  });
});
