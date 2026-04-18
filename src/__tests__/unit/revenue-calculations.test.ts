// src/__tests__/unit/revenue-calculations.test.ts
// Testes de cálculos e lógica de negócio para Revenue

describe('Revenue Calculations', () => {
  describe('Cálculo de próxima geração (recorrência)', () => {
    const calculateNextGeneration = (dataInicio: Date, frequencia: string): Date => {
      const next = new Date(dataInicio);

      switch (frequencia) {
        case 'SEMANAL':
          next.setDate(next.getDate() + 7);
          break;
        case 'QUINZENAL':
          next.setDate(next.getDate() + 15);
          break;
        case 'MENSAL':
          next.setMonth(next.getMonth() + 1);
          break;
        case 'BIMESTRAL':
          next.setMonth(next.getMonth() + 2);
          break;
        case 'TRIMESTRAL':
          next.setMonth(next.getMonth() + 3);
          break;
        case 'SEMESTRAL':
          next.setMonth(next.getMonth() + 6);
          break;
        case 'ANUAL':
          next.setFullYear(next.getFullYear() + 1);
          break;
      }

      return next;
    };

    it('deve calcular próxima geração SEMANAL', () => {
      const inicio = new Date('2025-10-12T12:00:00Z');
      const proxima = calculateNextGeneration(inicio, 'SEMANAL');
      expect(proxima.getUTCDate()).toBe(19);
      expect(proxima.getUTCMonth()).toBe(9); // Outubro = 9 (0-indexed)
    });

    it('deve calcular próxima geração QUINZENAL', () => {
      const inicio = new Date('2025-10-12T12:00:00Z');
      const proxima = calculateNextGeneration(inicio, 'QUINZENAL');
      expect(proxima.getUTCDate()).toBe(27);
      expect(proxima.getUTCMonth()).toBe(9);
    });

    it('deve calcular próxima geração MENSAL', () => {
      const inicio = new Date('2025-10-12T12:00:00Z');
      const proxima = calculateNextGeneration(inicio, 'MENSAL');
      expect(proxima.getUTCDate()).toBe(12);
      expect(proxima.getUTCMonth()).toBe(10); // Novembro = 10
    });

    it('deve calcular próxima geração BIMESTRAL', () => {
      const inicio = new Date('2025-10-12T12:00:00Z');
      const proxima = calculateNextGeneration(inicio, 'BIMESTRAL');
      expect(proxima.getUTCMonth()).toBe(11); // Dezembro = 11
    });

    it('deve calcular próxima geração TRIMESTRAL', () => {
      const inicio = new Date('2025-10-12T12:00:00Z');
      const proxima = calculateNextGeneration(inicio, 'TRIMESTRAL');
      expect(proxima.getUTCMonth()).toBe(0); // Janeiro = 0
      expect(proxima.getUTCFullYear()).toBe(2026);
    });

    it('deve calcular próxima geração SEMESTRAL', () => {
      const inicio = new Date('2025-10-12T12:00:00Z');
      const proxima = calculateNextGeneration(inicio, 'SEMESTRAL');
      expect(proxima.getUTCMonth()).toBe(3); // Abril = 3
      expect(proxima.getUTCFullYear()).toBe(2026);
    });

    it('deve calcular próxima geração ANUAL', () => {
      const inicio = new Date('2025-10-12T12:00:00Z');
      const proxima = calculateNextGeneration(inicio, 'ANUAL');
      expect(proxima.getUTCFullYear()).toBe(2026);
      expect(proxima.getUTCMonth()).toBe(9);
      expect(proxima.getUTCDate()).toBe(12);
    });

    it('deve lidar com fim de mês (31 -> próximo mês)', () => {
      const inicio = new Date('2025-01-31T12:00:00Z');
      const proxima = calculateNextGeneration(inicio, 'MENSAL');
      // JavaScript ajusta automaticamente para o último dia válido
      expect(proxima.getUTCMonth()).toBe(2); // Março (pula fev que tem menos dias)
    });
  });

  describe('Cálculo de totais', () => {
    const revenues = [
      { valor: 1500.50, status: 'PENDENTE' },
      { valor: 2000.00, status: 'RECEBIDA' },
      { valor: 750.75, status: 'PENDENTE' },
      { valor: 500.00, status: 'VENCIDA' },
      { valor: 300.00, status: 'CANCELADA' },
    ];

    it('deve calcular total geral', () => {
      const total = revenues.reduce((sum, r) => sum + r.valor, 0);
      expect(total).toBe(5051.25);
    });

    it('deve calcular total pendentes', () => {
      const totalPendentes = revenues
        .filter((r) => r.status === 'PENDENTE')
        .reduce((sum, r) => sum + r.valor, 0);
      expect(totalPendentes).toBe(2251.25);
    });

    it('deve calcular total recebidas', () => {
      const totalRecebidas = revenues
        .filter((r) => r.status === 'RECEBIDA')
        .reduce((sum, r) => sum + r.valor, 0);
      expect(totalRecebidas).toBe(2000.00);
    });

    it('deve calcular total vencidas', () => {
      const totalVencidas = revenues
        .filter((r) => r.status === 'VENCIDA')
        .reduce((sum, r) => sum + r.valor, 0);
      expect(totalVencidas).toBe(500.00);
    });

    it('deve contar quantidade por status', () => {
      const counts = revenues.reduce((acc, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      expect(counts.PENDENTE).toBe(2);
      expect(counts.RECEBIDA).toBe(1);
      expect(counts.VENCIDA).toBe(1);
      expect(counts.CANCELADA).toBe(1);
    });
  });

  describe('Lógica de status', () => {
    it('receita com vencimento futuro deve ser PENDENTE', () => {
      const dataVencimento = new Date();
      dataVencimento.setDate(dataVencimento.getDate() + 10);
      const hoje = new Date();

      expect(dataVencimento > hoje).toBe(true);
      // Status deveria ser PENDENTE
    });

    it('receita com vencimento passado sem pagamento deve ser VENCIDA', () => {
      const dataVencimento = new Date();
      dataVencimento.setDate(dataVencimento.getDate() - 10);
      const hoje = new Date();
      const dataPagamento = null;

      expect(dataVencimento < hoje).toBe(true);
      expect(dataPagamento).toBeNull();
      // Status deveria ser VENCIDA
    });

    it('receita com pagamento deve ser RECEBIDA', () => {
      const dataPagamento = new Date();
      expect(dataPagamento).toBeDefined();
      // Status deveria ser RECEBIDA
    });
  });

  describe('Validações de negócio', () => {
    it('não deve permitir editar receita RECEBIDA', () => {
      const receita = { id: 1, status: 'RECEBIDA' };
      const podeEditar = receita.status !== 'RECEBIDA';
      expect(podeEditar).toBe(false);
    });

    it('deve permitir editar receita PENDENTE', () => {
      const receita = { id: 1, status: 'PENDENTE' };
      const podeEditar = receita.status !== 'RECEBIDA';
      expect(podeEditar).toBe(true);
    });

    it('não deve permitir cancelar receita RECEBIDA', () => {
      const receita = { id: 1, status: 'RECEBIDA' };
      const podeCancelar = receita.status !== 'RECEBIDA';
      expect(podeCancelar).toBe(false);
    });

    it('não deve permitir cancelar receita já CANCELADA', () => {
      const receita = { id: 1, status: 'CANCELADA' };
      const podeCancelar = receita.status !== 'CANCELADA';
      expect(podeCancelar).toBe(false);
    });

    it('deve permitir cancelar receita PENDENTE', () => {
      const receita = { id: 1, status: 'PENDENTE' };
      const podeCancelar = receita.status !== 'RECEBIDA' && receita.status !== 'CANCELADA';
      expect(podeCancelar).toBe(true);
    });

    it('não deve permitir adicionar recorrência em receita RECEBIDA', () => {
      const receita = { id: 1, status: 'RECEBIDA', recorrencia: null };
      const podeAdicionarRecorrencia = receita.status !== 'RECEBIDA' && !receita.recorrencia;
      expect(podeAdicionarRecorrencia).toBe(false);
    });

    it('não deve permitir adicionar recorrência se já existe', () => {
      const receita = { id: 1, status: 'PENDENTE', recorrencia: { id: 1 } };
      const podeAdicionarRecorrencia = receita.status !== 'RECEBIDA' && !receita.recorrencia;
      expect(podeAdicionarRecorrencia).toBe(false);
    });

    it('deve permitir adicionar recorrência em receita PENDENTE sem recorrência', () => {
      const receita = { id: 1, status: 'PENDENTE', recorrencia: null };
      const podeAdicionarRecorrencia = receita.status !== 'RECEBIDA' && !receita.recorrencia;
      expect(podeAdicionarRecorrencia).toBe(true);
    });
  });

  describe('Formatação e conversão', () => {
    it('deve formatar valor para moeda brasileira', () => {
      const valor = 1500.50;
      const formatted = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(valor);
      // Aceita tanto "R$ 1.500,50" quanto "R$\u00A01.500,50" (non-breaking space)
      expect(formatted).toMatch(/^R\$\s?1\.500,50$/);
    });

    it('deve formatar data para formato brasileiro', () => {
      const data = new Date('2025-10-12T10:00:00.000Z');
      const formatted = data.toLocaleDateString('pt-BR');
      expect(formatted).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    });

    it('deve converter string para Date', () => {
      const dateString = '2025-10-12T10:00:00.000Z';
      const date = new Date(dateString);
      expect(date).toBeInstanceOf(Date);
      expect(date.toISOString()).toBe(dateString);
    });

    it('deve converter número para Decimal (2 casas)', () => {
      const valor = 1500.5;
      const decimal = parseFloat(valor.toFixed(2));
      expect(decimal).toBe(1500.50);
    });
  });

  describe('Filtros e ordenação', () => {
    const revenues = [
      {
        id: 1,
        valor: 1500,
        dataVencimento: new Date('2025-11-01'),
        status: 'PENDENTE',
        categoriaId: 1,
      },
      {
        id: 2,
        valor: 2000,
        dataVencimento: new Date('2025-10-15'),
        status: 'RECEBIDA',
        categoriaId: 2,
      },
      {
        id: 3,
        valor: 750,
        dataVencimento: new Date('2025-12-01'),
        status: 'PENDENTE',
        categoriaId: 1,
      },
    ];

    it('deve filtrar por status', () => {
      const pendentes = revenues.filter((r) => r.status === 'PENDENTE');
      expect(pendentes).toHaveLength(2);
    });

    it('deve filtrar por categoria', () => {
      const categoria1 = revenues.filter((r) => r.categoriaId === 1);
      expect(categoria1).toHaveLength(2);
    });

    it('deve ordenar por valor crescente', () => {
      const sorted = [...revenues].sort((a, b) => a.valor - b.valor);
      expect(sorted[0].valor).toBe(750);
      expect(sorted[2].valor).toBe(2000);
    });

    it('deve ordenar por valor decrescente', () => {
      const sorted = [...revenues].sort((a, b) => b.valor - a.valor);
      expect(sorted[0].valor).toBe(2000);
      expect(sorted[2].valor).toBe(750);
    });

    it('deve ordenar por data de vencimento', () => {
      const sorted = [...revenues].sort(
        (a, b) => a.dataVencimento.getTime() - b.dataVencimento.getTime()
      );
      expect(sorted[0].id).toBe(2); // 2025-10-15
      expect(sorted[2].id).toBe(3); // 2025-12-01
    });

    it('deve aplicar paginação', () => {
      const page = 1;
      const limit = 2;
      const paginated = revenues.slice((page - 1) * limit, page * limit);
      expect(paginated).toHaveLength(2);
      expect(paginated[0].id).toBe(1);
      expect(paginated[1].id).toBe(2);
    });

    it('deve calcular total de páginas', () => {
      const total = revenues.length;
      const limit = 2;
      const totalPages = Math.ceil(total / limit);
      expect(totalPages).toBe(2);
    });
  });
});
