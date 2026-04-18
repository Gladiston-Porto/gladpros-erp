import { describe, it, expect, beforeEach } from 'vitest';

// TDD: Implementação seguindo os testes
interface Despesa {
  id?: number;
  descricao: string;
  valor: number;
  categoria:
    | 'MATERIAL'
    | 'MAO_DE_OBRA'
    | 'EQUIPAMENTO'
    | 'TRANSPORTE'
    | 'ADMINISTRATIVA'
    | 'OUTRA';
  data: Date;
  formaPagamento: 'DINHEIRO' | 'CARTAO' | 'CHEQUE' | 'TRANSFERENCIA' | 'BOLETO';
  status: 'PENDENTE' | 'PAGA' | 'CANCELADA';
  projetoId?: number;
  fornecedor?: string;
  notaFiscal?: string;
  observacoes?: string;
}

function createDespesa(data: Omit<Despesa, 'id'>): Despesa {
  return {
    id: Math.floor(Math.random() * 10000),
    ...data,
  };
}

function getDespesaById(id: number, despesas: Despesa[]): Despesa | null {
  return despesas.find((d) => d.id === id) || null;
}

function updateDespesa(
  id: number,
  data: Partial<Despesa>,
  despesas: Despesa[]
): Despesa | null {
  const index = despesas.findIndex((d) => d.id === id);
  if (index === -1) return null;

  despesas[index] = { ...despesas[index], ...data };
  return despesas[index];
}

function deleteDespesa(id: number, despesas: Despesa[]): boolean {
  const index = despesas.findIndex((d) => d.id === id);
  if (index === -1) return false;

  despesas.splice(index, 1);
  return true;
}

function getDespesasByProjeto(
  projetoId: number,
  despesas: Despesa[]
): Despesa[] {
  return despesas.filter((d) => d.projetoId === projetoId);
}

function getDespesasByCategoria(
  categoria: Despesa['categoria'],
  despesas: Despesa[]
): Despesa[] {
  return despesas.filter((d) => d.categoria === categoria);
}

function getDespesasPendentes(despesas: Despesa[]): Despesa[] {
  return despesas.filter((d) => d.status === 'PENDENTE');
}

function getTotalDespesas(despesas: Despesa[]): number {
  return despesas.reduce((total, d) => total + d.valor, 0);
}

function getDespesasByPeriodo(
  inicio: Date,
  fim: Date,
  despesas: Despesa[]
): Despesa[] {
  return despesas.filter(
    (d) => d.data >= inicio && d.data <= fim
  );
}

describe('Despesa CRUD Operations', () => {
  let testDespesas: Despesa[];

  beforeEach(() => {
    testDespesas = [];
  });

  describe('Create Despesa', () => {
    it('deve criar despesa com dados completos', () => {
      const despesaData: Omit<Despesa, 'id'> = {
        descricao: 'Compra de material elétrico',
        valor: 1500.00,
        categoria: 'MATERIAL',
        data: new Date('2025-11-01'),
        formaPagamento: 'TRANSFERENCIA',
        status: 'PAGA',
        projetoId: 1,
        fornecedor: 'Elétrica Central',
        notaFiscal: 'NF-12345',
        observacoes: 'Fios e disjuntores',
      };

      const despesa = createDespesa(despesaData);

      expect(despesa.id).toBeDefined();
      expect(despesa.descricao).toBe('Compra de material elétrico');
      expect(despesa.valor).toBe(1500.00);
      expect(despesa.categoria).toBe('MATERIAL');
      expect(despesa.status).toBe('PAGA');
    });

    it('deve criar despesa sem campos opcionais', () => {
      const despesa = createDespesa({
        descricao: 'Almoço equipe',
        valor: 85.50,
        categoria: 'OUTRA',
        data: new Date(),
        formaPagamento: 'DINHEIRO',
        status: 'PAGA',
      });

      expect(despesa.id).toBeDefined();
      expect(despesa.projetoId).toBeUndefined();
      expect(despesa.fornecedor).toBeUndefined();
      expect(despesa.notaFiscal).toBeUndefined();
    });

    it('deve criar despesa pendente', () => {
      const despesa = createDespesa({
        descricao: 'Aluguel equipamento',
        valor: 2500.00,
        categoria: 'EQUIPAMENTO',
        data: new Date(),
        formaPagamento: 'BOLETO',
        status: 'PENDENTE',
      });

      expect(despesa.status).toBe('PENDENTE');
    });

    it('deve aceitar todas as categorias', () => {
      const categorias: Despesa['categoria'][] = [
        'MATERIAL',
        'MAO_DE_OBRA',
        'EQUIPAMENTO',
        'TRANSPORTE',
        'ADMINISTRATIVA',
        'OUTRA',
      ];

      categorias.forEach((cat) => {
        const despesa = createDespesa({
          descricao: `Despesa ${cat}`,
          valor: 100,
          categoria: cat,
          data: new Date(),
          formaPagamento: 'DINHEIRO',
          status: 'PAGA',
        });

        expect(despesa.categoria).toBe(cat);
      });
    });

    it('deve aceitar todas as formas de pagamento', () => {
      const formas: Despesa['formaPagamento'][] = [
        'DINHEIRO',
        'CARTAO',
        'CHEQUE',
        'TRANSFERENCIA',
        'BOLETO',
      ];

      formas.forEach((forma) => {
        const despesa = createDespesa({
          descricao: 'Teste pagamento',
          valor: 100,
          categoria: 'OUTRA',
          data: new Date(),
          formaPagamento: forma,
          status: 'PAGA',
        });

        expect(despesa.formaPagamento).toBe(forma);
      });
    });
  });

  describe('Read Despesa', () => {
    beforeEach(() => {
      testDespesas.push(
        createDespesa({
          descricao: 'Material construção',
          valor: 3000,
          categoria: 'MATERIAL',
          data: new Date('2025-11-01'),
          formaPagamento: 'TRANSFERENCIA',
          status: 'PAGA',
          projetoId: 1,
        })
      );
      testDespesas.push(
        createDespesa({
          descricao: 'Mão de obra',
          valor: 5000,
          categoria: 'MAO_DE_OBRA',
          data: new Date('2025-11-02'),
          formaPagamento: 'TRANSFERENCIA',
          status: 'PAGA',
          projetoId: 1,
        })
      );
      testDespesas.push(
        createDespesa({
          descricao: 'Aluguel betoneira',
          valor: 800,
          categoria: 'EQUIPAMENTO',
          data: new Date('2025-11-03'),
          formaPagamento: 'BOLETO',
          status: 'PENDENTE',
          projetoId: 2,
        })
      );
    });

    it('deve buscar despesa por ID', () => {
      const despesa = testDespesas[0];
      const found = getDespesaById(despesa.id!, testDespesas);

      expect(found).toBeDefined();
      expect(found?.descricao).toBe('Material construção');
    });

    it('deve retornar null para ID inexistente', () => {
      const found = getDespesaById(99999, testDespesas);
      expect(found).toBeNull();
    });

    it('deve buscar despesas por projeto', () => {
      const despesas = getDespesasByProjeto(1, testDespesas);

      expect(despesas).toHaveLength(2);
      expect(despesas[0].projetoId).toBe(1);
      expect(despesas[1].projetoId).toBe(1);
    });

    it('deve buscar despesas por categoria', () => {
      const despesas = getDespesasByCategoria('MATERIAL', testDespesas);

      expect(despesas).toHaveLength(1);
      expect(despesas[0].categoria).toBe('MATERIAL');
    });

    it('deve buscar despesas pendentes', () => {
      const despesas = getDespesasPendentes(testDespesas);

      expect(despesas).toHaveLength(1);
      expect(despesas[0].status).toBe('PENDENTE');
    });
  });

  describe('Update Despesa', () => {
    let despesaId: number;

    beforeEach(() => {
      const despesa = createDespesa({
        descricao: 'Despesa teste',
        valor: 1000,
        categoria: 'MATERIAL',
        data: new Date(),
        formaPagamento: 'DINHEIRO',
        status: 'PENDENTE',
      });
      testDespesas.push(despesa);
      despesaId = despesa.id!;
    });

    it('deve marcar despesa como paga', () => {
      const updated = updateDespesa(
        despesaId,
        { status: 'PAGA' },
        testDespesas
      );

      expect(updated?.status).toBe('PAGA');
    });

    it('deve atualizar valor', () => {
      const updated = updateDespesa(
        despesaId,
        { valor: 1500 },
        testDespesas
      );

      expect(updated?.valor).toBe(1500);
    });

    it('deve adicionar nota fiscal', () => {
      const updated = updateDespesa(
        despesaId,
        { notaFiscal: 'NF-9999' },
        testDespesas
      );

      expect(updated?.notaFiscal).toBe('NF-9999');
    });

    it('deve cancelar despesa', () => {
      const updated = updateDespesa(
        despesaId,
        { status: 'CANCELADA' },
        testDespesas
      );

      expect(updated?.status).toBe('CANCELADA');
    });
  });

  describe('Delete Despesa', () => {
    it('deve deletar despesa existente', () => {
      const despesa = createDespesa({
        descricao: 'Teste',
        valor: 100,
        categoria: 'OUTRA',
        data: new Date(),
        formaPagamento: 'DINHEIRO',
        status: 'PAGA',
      });
      testDespesas.push(despesa);

      const deleted = deleteDespesa(despesa.id!, testDespesas);

      expect(deleted).toBe(true);
      expect(testDespesas).toHaveLength(0);
    });

    it('deve retornar false para ID inexistente', () => {
      const deleted = deleteDespesa(99999, testDespesas);
      expect(deleted).toBe(false);
    });
  });

  describe('Cálculos Financeiros', () => {
    beforeEach(() => {
      testDespesas.push(
        createDespesa({
          descricao: 'Despesa 1',
          valor: 1000,
          categoria: 'MATERIAL',
          data: new Date(),
          formaPagamento: 'DINHEIRO',
          status: 'PAGA',
        })
      );
      testDespesas.push(
        createDespesa({
          descricao: 'Despesa 2',
          valor: 2500,
          categoria: 'MAO_DE_OBRA',
          data: new Date(),
          formaPagamento: 'TRANSFERENCIA',
          status: 'PAGA',
        })
      );
      testDespesas.push(
        createDespesa({
          descricao: 'Despesa 3',
          valor: 500,
          categoria: 'TRANSPORTE',
          data: new Date(),
          formaPagamento: 'DINHEIRO',
          status: 'PENDENTE',
        })
      );
    });

    it('deve calcular total de despesas', () => {
      const total = getTotalDespesas(testDespesas);
      expect(total).toBe(4000);
    });

    it('deve calcular total apenas de pagas', () => {
      const pagas = testDespesas.filter((d) => d.status === 'PAGA');
      const total = getTotalDespesas(pagas);
      expect(total).toBe(3500);
    });

    it('deve calcular total por categoria', () => {
      const materiais = getDespesasByCategoria('MATERIAL', testDespesas);
      const total = getTotalDespesas(materiais);
      expect(total).toBe(1000);
    });
  });

  describe('Filtros por Período', () => {
    beforeEach(() => {
      testDespesas.push(
        createDespesa({
          descricao: 'Janeiro',
          valor: 1000,
          categoria: 'MATERIAL',
          data: new Date('2025-01-15'),
          formaPagamento: 'DINHEIRO',
          status: 'PAGA',
        })
      );
      testDespesas.push(
        createDespesa({
          descricao: 'Fevereiro',
          valor: 2000,
          categoria: 'MAO_DE_OBRA',
          data: new Date('2025-02-10'),
          formaPagamento: 'TRANSFERENCIA',
          status: 'PAGA',
        })
      );
      testDespesas.push(
        createDespesa({
          descricao: 'Março',
          valor: 1500,
          categoria: 'EQUIPAMENTO',
          data: new Date('2025-03-05'),
          formaPagamento: 'BOLETO',
          status: 'PENDENTE',
        })
      );
    });

    it('deve filtrar despesas por período', () => {
      const inicio = new Date('2025-01-01');
      const fim = new Date('2025-02-28');
      const despesas = getDespesasByPeriodo(inicio, fim, testDespesas);

      expect(despesas).toHaveLength(2);
    });

    it('deve filtrar despesas de um único mês', () => {
      const inicio = new Date('2025-02-01');
      const fim = new Date('2025-02-28');
      const despesas = getDespesasByPeriodo(inicio, fim, testDespesas);

      expect(despesas).toHaveLength(1);
      expect(despesas[0].descricao).toBe('Fevereiro');
    });
  });
});
