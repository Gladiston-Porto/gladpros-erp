import { describe, it, expect, beforeEach } from 'vitest';

interface Receita {
  id?: number;
  descricao: string;
  valor: number;
  categoria: 'SERVICO' | 'VENDA_MATERIAL' | 'ALUGUEL_EQUIPAMENTO' | 'OUTRA';
  data: Date;
  formaPagamento: 'DINHEIRO' | 'CARTAO' | 'CHEQUE' | 'TRANSFERENCIA' | 'PIX';
  status: 'PENDENTE' | 'RECEBIDA' | 'CANCELADA';
  projetoId?: number;
  cliente?: string;
  notaFiscal?: string;
  observacoes?: string;
}

function createReceita(data: Omit<Receita, 'id'>): Receita {
  return {
    id: Math.floor(Math.random() * 10000),
    ...data,
  };
}

function getReceitaById(id: number, receitas: Receita[]): Receita | null {
  return receitas.find((r) => r.id === id) || null;
}

function updateReceita(
  id: number,
  data: Partial<Receita>,
  receitas: Receita[]
): Receita | null {
  const index = receitas.findIndex((r) => r.id === id);
  if (index === -1) return null;

  receitas[index] = { ...receitas[index], ...data };
  return receitas[index];
}

function deleteReceita(id: number, receitas: Receita[]): boolean {
  const index = receitas.findIndex((r) => r.id === id);
  if (index === -1) return false;

  receitas.splice(index, 1);
  return true;
}

function getReceitasByProjeto(
  projetoId: number,
  receitas: Receita[]
): Receita[] {
  return receitas.filter((r) => r.projetoId === projetoId);
}

function getReceitasByCategoria(
  categoria: Receita['categoria'],
  receitas: Receita[]
): Receita[] {
  return receitas.filter((r) => r.categoria === categoria);
}

function getReceitasPendentes(receitas: Receita[]): Receita[] {
  return receitas.filter((r) => r.status === 'PENDENTE');
}

function getTotalReceitas(receitas: Receita[]): number {
  return receitas.reduce((total, r) => total + r.valor, 0);
}

function getReceitasByPeriodo(
  inicio: Date,
  fim: Date,
  receitas: Receita[]
): Receita[] {
  return receitas.filter((r) => r.data >= inicio && r.data <= fim);
}

describe('Receita CRUD Operations', () => {
  let testReceitas: Receita[];

  beforeEach(() => {
    testReceitas = [];
  });

  describe('Create Receita', () => {
    it('deve criar receita com dados completos', () => {
      const receitaData: Omit<Receita, 'id'> = {
        descricao: 'Serviço de instalação elétrica',
        valor: 5000.00,
        categoria: 'SERVICO',
        data: new Date('2025-11-01'),
        formaPagamento: 'PIX',
        status: 'RECEBIDA',
        projetoId: 1,
        cliente: 'João Silva',
        notaFiscal: 'NFS-001',
        observacoes: 'Projeto residencial',
      };

      const receita = createReceita(receitaData);

      expect(receita.id).toBeDefined();
      expect(receita.descricao).toBe('Serviço de instalação elétrica');
      expect(receita.valor).toBe(5000.00);
      expect(receita.categoria).toBe('SERVICO');
      expect(receita.status).toBe('RECEBIDA');
    });

    it('deve criar receita sem campos opcionais', () => {
      const receita = createReceita({
        descricao: 'Venda de material',
        valor: 850.00,
        categoria: 'VENDA_MATERIAL',
        data: new Date(),
        formaPagamento: 'DINHEIRO',
        status: 'RECEBIDA',
      });

      expect(receita.id).toBeDefined();
      expect(receita.projetoId).toBeUndefined();
      expect(receita.cliente).toBeUndefined();
    });

    it('deve aceitar todas as categorias', () => {
      const categorias: Receita['categoria'][] = [
        'SERVICO',
        'VENDA_MATERIAL',
        'ALUGUEL_EQUIPAMENTO',
        'OUTRA',
      ];

      categorias.forEach((cat) => {
        const receita = createReceita({
          descricao: `Receita ${cat}`,
          valor: 1000,
          categoria: cat,
          data: new Date(),
          formaPagamento: 'PIX',
          status: 'RECEBIDA',
        });

        expect(receita.categoria).toBe(cat);
      });
    });

    it('deve aceitar PIX como forma de pagamento', () => {
      const receita = createReceita({
        descricao: 'Pagamento via PIX',
        valor: 2500,
        categoria: 'SERVICO',
        data: new Date(),
        formaPagamento: 'PIX',
        status: 'RECEBIDA',
      });

      expect(receita.formaPagamento).toBe('PIX');
    });
  });

  describe('Read Receita', () => {
    beforeEach(() => {
      testReceitas.push(
        createReceita({
          descricao: 'Serviço 1',
          valor: 3000,
          categoria: 'SERVICO',
          data: new Date('2025-11-01'),
          formaPagamento: 'PIX',
          status: 'RECEBIDA',
          projetoId: 1,
        })
      );
      testReceitas.push(
        createReceita({
          descricao: 'Venda material',
          valor: 1500,
          categoria: 'VENDA_MATERIAL',
          data: new Date('2025-11-02'),
          formaPagamento: 'CARTAO',
          status: 'RECEBIDA',
          projetoId: 1,
        })
      );
      testReceitas.push(
        createReceita({
          descricao: 'Aluguel betoneira',
          valor: 500,
          categoria: 'ALUGUEL_EQUIPAMENTO',
          data: new Date('2025-11-03'),
          formaPagamento: 'DINHEIRO',
          status: 'PENDENTE',
          projetoId: 2,
        })
      );
    });

    it('deve buscar receita por ID', () => {
      const receita = testReceitas[0];
      const found = getReceitaById(receita.id!, testReceitas);

      expect(found).toBeDefined();
      expect(found?.descricao).toBe('Serviço 1');
    });

    it('deve buscar receitas por projeto', () => {
      const receitas = getReceitasByProjeto(1, testReceitas);

      expect(receitas).toHaveLength(2);
      expect(receitas[0].projetoId).toBe(1);
    });

    it('deve buscar receitas por categoria', () => {
      const receitas = getReceitasByCategoria('SERVICO', testReceitas);

      expect(receitas).toHaveLength(1);
      expect(receitas[0].categoria).toBe('SERVICO');
    });

    it('deve buscar receitas pendentes', () => {
      const receitas = getReceitasPendentes(testReceitas);

      expect(receitas).toHaveLength(1);
      expect(receitas[0].status).toBe('PENDENTE');
    });
  });

  describe('Update Receita', () => {
    let receitaId: number;

    beforeEach(() => {
      const receita = createReceita({
        descricao: 'Receita teste',
        valor: 2000,
        categoria: 'SERVICO',
        data: new Date(),
        formaPagamento: 'PIX',
        status: 'PENDENTE',
      });
      testReceitas.push(receita);
      receitaId = receita.id!;
    });

    it('deve marcar receita como recebida', () => {
      const updated = updateReceita(
        receitaId,
        { status: 'RECEBIDA' },
        testReceitas
      );

      expect(updated?.status).toBe('RECEBIDA');
    });

    it('deve atualizar valor', () => {
      const updated = updateReceita(
        receitaId,
        { valor: 2500 },
        testReceitas
      );

      expect(updated?.valor).toBe(2500);
    });

    it('deve adicionar nota fiscal', () => {
      const updated = updateReceita(
        receitaId,
        { notaFiscal: 'NFS-9999' },
        testReceitas
      );

      expect(updated?.notaFiscal).toBe('NFS-9999');
    });
  });

  describe('Delete Receita', () => {
    it('deve deletar receita existente', () => {
      const receita = createReceita({
        descricao: 'Teste',
        valor: 100,
        categoria: 'OUTRA',
        data: new Date(),
        formaPagamento: 'DINHEIRO',
        status: 'RECEBIDA',
      });
      testReceitas.push(receita);

      const deleted = deleteReceita(receita.id!, testReceitas);

      expect(deleted).toBe(true);
      expect(testReceitas).toHaveLength(0);
    });
  });

  describe('Cálculos Financeiros', () => {
    beforeEach(() => {
      testReceitas.push(
        createReceita({
          descricao: 'Receita 1',
          valor: 2000,
          categoria: 'SERVICO',
          data: new Date(),
          formaPagamento: 'PIX',
          status: 'RECEBIDA',
        })
      );
      testReceitas.push(
        createReceita({
          descricao: 'Receita 2',
          valor: 3500,
          categoria: 'VENDA_MATERIAL',
          data: new Date(),
          formaPagamento: 'CARTAO',
          status: 'RECEBIDA',
        })
      );
      testReceitas.push(
        createReceita({
          descricao: 'Receita 3',
          valor: 1000,
          categoria: 'ALUGUEL_EQUIPAMENTO',
          data: new Date(),
          formaPagamento: 'PIX',
          status: 'PENDENTE',
        })
      );
    });

    it('deve calcular total de receitas', () => {
      const total = getTotalReceitas(testReceitas);
      expect(total).toBe(6500);
    });

    it('deve calcular total apenas de recebidas', () => {
      const recebidas = testReceitas.filter((r) => r.status === 'RECEBIDA');
      const total = getTotalReceitas(recebidas);
      expect(total).toBe(5500);
    });

    it('deve calcular total por categoria', () => {
      const servicos = getReceitasByCategoria('SERVICO', testReceitas);
      const total = getTotalReceitas(servicos);
      expect(total).toBe(2000);
    });
  });

  describe('Filtros por Período', () => {
    beforeEach(() => {
      testReceitas.push(
        createReceita({
          descricao: 'Janeiro',
          valor: 5000,
          categoria: 'SERVICO',
          data: new Date('2025-01-15'),
          formaPagamento: 'PIX',
          status: 'RECEBIDA',
        })
      );
      testReceitas.push(
        createReceita({
          descricao: 'Fevereiro',
          valor: 3000,
          categoria: 'VENDA_MATERIAL',
          data: new Date('2025-02-10'),
          formaPagamento: 'CARTAO',
          status: 'RECEBIDA',
        })
      );
      testReceitas.push(
        createReceita({
          descricao: 'Março',
          valor: 2000,
          categoria: 'SERVICO',
          data: new Date('2025-03-05'),
          formaPagamento: 'PIX',
          status: 'PENDENTE',
        })
      );
    });

    it('deve filtrar receitas por período', () => {
      const inicio = new Date('2025-01-01');
      const fim = new Date('2025-02-28');
      const receitas = getReceitasByPeriodo(inicio, fim, testReceitas);

      expect(receitas).toHaveLength(2);
    });

    it('deve calcular faturamento mensal', () => {
      const inicio = new Date('2025-01-01');
      const fim = new Date('2025-01-31');
      const receitas = getReceitasByPeriodo(inicio, fim, testReceitas);
      const total = getTotalReceitas(receitas);

      expect(total).toBe(5000);
    });
  });
});
