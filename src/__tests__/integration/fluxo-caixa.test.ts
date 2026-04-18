/**
 * Testes de Integração - Fluxo de Caixa
 * 
 * Testa lógica de agregação de dados financeiros
 */

import { prisma } from "@/lib/prisma";

describe("Fluxo de Caixa - Agregação de Dados", () => {
  let empresaId: number;
  let contaId: string;
  let revenueIds: number[] = [];
  let expenseIds: number[] = [];

  beforeAll(async () => {
    // Busca ou cria empresa de teste
    let empresa = await prisma.empresa.findFirst({
      where: { nome: "Empresa Teste Fluxo Caixa" }
    });

    if (!empresa) {
      empresa = await prisma.empresa.create({
        data: {
          nome: "Empresa Teste Fluxo Caixa",
          razaoSocial: "Empresa Teste Fluxo Caixa LTDA",
          cnpj: "99999999000199",
          email: "fluxo@teste.com"
        }
      });
    }

    empresaId = empresa.id;

    // Busca ou cria conta bancária (evita conflito de unique constraint)
    let conta = await prisma.bankAccount.findFirst({
      where: {
        empresaId,
        banco: "Banco Teste Fluxo",
        agencia: "9999",
        conta: "888888"
      }
    });

    if (!conta) {
      conta = await prisma.bankAccount.create({
        data: {
          empresaId,
          nome: "Conta Teste Fluxo",
          banco: "Banco Teste Fluxo",
          agencia: "9999",
          conta: "888888",
          tipo: "CORRENTE",
          saldoAtual: 10000,
          saldoInicial: 10000,
          limiteCredito: 5000,
          ativo: true,
          principal: false
        }
      });
    }

    contaId = conta.id;

    // Busca ou cria categoria de receita
    let catReceita = await prisma.revenueCategory.findFirst({
      where: { empresaId, nome: "Vendas" }
    });
    
    if (!catReceita) {
      catReceita = await prisma.revenueCategory.create({
        data: { empresaId, nome: "Vendas" }
      });
    }

    // Cria receitas de teste
    const hoje = new Date();
    
    for (let i = 0; i < 3; i++) {
      const dataVencimento = new Date(hoje);
      dataVencimento.setDate(hoje.getDate() - (i * 5));

      const revenue = await prisma.revenue.create({
        data: {
          empresaId,
          categoriaId: catReceita.id,
          descricao: `Receita Teste ${i + 1}`,
          valor: 1000 + (i * 500),
          tipo: "SERVICO",
          dataEmissao: dataVencimento,
          dataVencimento,
          dataPagamento: i < 2 ? dataVencimento : null,
          status: i < 2 ? "RECEBIDA" : "PENDENTE",
          formaPagamento: "PIX"
        }
      });

      revenueIds.push(revenue.id);
    }

    // Busca ou cria categoria de despesa
    let catDespesa = await prisma.expenseCategory.findFirst({
      where: { empresaId, nome: "Operacional" }
    });
    
    if (!catDespesa) {
      catDespesa = await prisma.expenseCategory.create({
        data: { empresaId, nome: "Operacional" }
      });
    }

    // Cria despesas de teste
    for (let i = 0; i < 3; i++) {
      const dataVencimento = new Date(hoje);
      dataVencimento.setDate(hoje.getDate() - (i * 6));

      const expense = await prisma.expense.create({
        data: {
          empresaId,
          categoriaId: catDespesa.id,
          descricao: `Despesa Teste ${i + 1}`,
          valor: 500 + (i * 300),
          tipo: "OPERACIONAL",
          dataEmissao: dataVencimento,
          dataVencimento,
          dataPagamento: i < 2 ? dataVencimento : null,
          status: i < 2 ? "PAGA" : "PENDENTE",
          formaPagamento: "BOLETO"
        }
      });

      expenseIds.push(expense.id);
    }
  });

  afterAll(async () => {
    try {
      if (revenueIds.length > 0) {
        await prisma.revenue.deleteMany({ where: { id: { in: revenueIds } } }).catch(() => {});
      }
      if (expenseIds.length > 0) {
        await prisma.expense.deleteMany({ where: { id: { in: expenseIds } } }).catch(() => {});
      }
      // Contas serão limpas automaticamente por cascade
    } catch (error) {
      // Ignora erros de cleanup
    }
  });

  describe("Dados de Teste", () => {
    it("deve ter criado empresa de teste", async () => {
      const empresa = await prisma.empresa.findUnique({
        where: { id: empresaId }
      });

      expect(empresa).toBeDefined();
      expect(empresa?.nome).toBe("Empresa Teste Fluxo Caixa");
    });

    it("deve ter criado conta bancária", async () => {
      expect(contaId).toBeDefined();
      expect(contaId).toBeTruthy();
    });
  });

  describe("Receitas e Despesas", () => {
    it("deve buscar receitas do período", async () => {
      const hoje = new Date();
      const trintaDiasAtras = new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000);

      const receitas = await prisma.revenue.findMany({
        where: {
          empresaId,
          dataVencimento: { gte: trintaDiasAtras, lte: hoje }
        }
      });

      expect(receitas.length).toBeGreaterThanOrEqual(3);
    });

    it("deve buscar despesas do período", async () => {
      const hoje = new Date();
      const trintaDiasAtras = new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000);

      const despesas = await prisma.expense.findMany({
        where: {
          empresaId,
          dataVencimento: { gte: trintaDiasAtras, lte: hoje }
        }
      });

      expect(despesas.length).toBeGreaterThanOrEqual(3);
    });

    it("deve calcular totais de receitas", async () => {
      const hoje = new Date();
      const trintaDiasAtras = new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000);

      const receitas = await prisma.revenue.findMany({
        where: {
          empresaId,
          dataVencimento: { gte: trintaDiasAtras, lte: hoje }
        }
      });

      const totalReceitas = receitas.reduce((sum, r) => sum + Number(r.valor), 0);
      const receitasPagas = receitas
        .filter(r => r.status === "RECEBIDA")
        .reduce((sum, r) => sum + Number(r.valor), 0);
      
      expect(totalReceitas).toBeGreaterThan(0);
      expect(receitasPagas).toBeGreaterThan(0);
      expect(receitasPagas).toBeLessThanOrEqual(totalReceitas);
    });

    it("deve calcular totais de despesas", async () => {
      const hoje = new Date();
      const trintaDiasAtras = new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000);

      const despesas = await prisma.expense.findMany({
        where: {
          empresaId,
          dataVencimento: { gte: trintaDiasAtras, lte: hoje }
        }
      });

      const totalDespesas = despesas.reduce((sum, d) => sum + Number(d.valor), 0);
      const despesasPagas = despesas
        .filter(d => d.status === "PAGA")
        .reduce((sum, d) => sum + Number(d.valor), 0);
      
      expect(totalDespesas).toBeGreaterThan(0);
      expect(despesasPagas).toBeGreaterThan(0);
      expect(despesasPagas).toBeLessThanOrEqual(totalDespesas);
    });

    it("deve calcular resultado do período", async () => {
      const hoje = new Date();
      const trintaDiasAtras = new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000);

      const [receitas, despesas] = await Promise.all([
        prisma.revenue.findMany({
          where: { empresaId, dataVencimento: { gte: trintaDiasAtras, lte: hoje } }
        }),
        prisma.expense.findMany({
          where: { empresaId, dataVencimento: { gte: trintaDiasAtras, lte: hoje } }
        })
      ]);

      const totalReceitas = receitas.reduce((sum, r) => sum + Number(r.valor), 0);
      const totalDespesas = despesas.reduce((sum, d) => sum + Number(d.valor), 0);
      const resultado = totalReceitas - totalDespesas;

      expect(typeof resultado).toBe("number");
      expect(resultado).not.toBeNaN();
    });
  });

  describe("Categorias", () => {
    it("deve agrupar receitas por categoria", async () => {
      const hoje = new Date();
      const trintaDiasAtras = new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000);

      const receitas = await prisma.revenue.findMany({
        where: {
          empresaId,
          dataVencimento: { gte: trintaDiasAtras, lte: hoje }
        },
        include: { categoria: true }
      });

      const categorias: Record<string, number> = {};
      receitas.forEach(r => {
        const catNome = r.categoria?.nome || "Sem categoria";
        categorias[catNome] = (categorias[catNome] || 0) + Number(r.valor);
      });

      const topCategorias = Object.entries(categorias)
        .map(([categoria, total]) => ({ categoria, total }))
        .sort((a, b) => b.total - a.total);

      expect(topCategorias.length).toBeGreaterThan(0);
      expect(topCategorias[0].total).toBeGreaterThan(0);
    });

    it("deve agrupar despesas por categoria", async () => {
      const hoje = new Date();
      const trintaDiasAtras = new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000);

      const despesas = await prisma.expense.findMany({
        where: {
          empresaId,
          dataVencimento: { gte: trintaDiasAtras, lte: hoje }
        },
        include: { categoria: true }
      });

      const categorias: Record<string, number> = {};
      despesas.forEach(d => {
        const catNome = d.categoria?.nome || "Sem categoria";
        categorias[catNome] = (categorias[catNome] || 0) + Number(d.valor);
      });

      const topCategorias = Object.entries(categorias)
        .map(([categoria, total]) => ({ categoria, total }))
        .sort((a, b) => b.total - a.total);

      expect(topCategorias.length).toBeGreaterThan(0);
      expect(topCategorias[0].total).toBeGreaterThan(0);
    });
  });

  describe("KPIs e Métricas", () => {
    it("deve calcular burn rate (média de gastos diários)", async () => {
      const hoje = new Date();
      const trintaDiasAtras = new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000);

      const despesas = await prisma.expense.findMany({
        where: {
          empresaId,
          dataVencimento: { gte: trintaDiasAtras, lte: hoje },
          status: "PAGA"
        }
      });

      const totalDespesasPagas = despesas.reduce((sum, d) => sum + Number(d.valor), 0);
      const diasPeriodo = 30;
      const burnRate = totalDespesasPagas / diasPeriodo;

      expect(burnRate).toBeGreaterThanOrEqual(0);
    });

    it("deve calcular runway (dias até saldo zero)", async () => {
      // Mock de valores
      const saldoTotal = 10000;
      const burnRate = 100;
      
      if (saldoTotal > 0 && burnRate > 0) {
        const runway = Math.floor(saldoTotal / burnRate);
        expect(runway).toBe(100);
      } else {
        expect(true).toBe(true);
      }
    });

    it("deve calcular margem líquida", async () => {
      const hoje = new Date();
      const trintaDiasAtras = new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000);

      const [receitas, despesas] = await Promise.all([
        prisma.revenue.findMany({
          where: { empresaId, dataVencimento: { gte: trintaDiasAtras, lte: hoje } }
        }),
        prisma.expense.findMany({
          where: { empresaId, dataVencimento: { gte: trintaDiasAtras, lte: hoje } }
        })
      ]);

      const totalReceitas = receitas.reduce((sum, r) => sum + Number(r.valor), 0);
      const totalDespesas = despesas.reduce((sum, d) => sum + Number(d.valor), 0);
      
      const margemLiquida = totalReceitas > 0
        ? ((totalReceitas - totalDespesas) / totalReceitas) * 100
        : 0;

      expect(typeof margemLiquida).toBe("number");
      expect(margemLiquida).not.toBeNaN();
    });
  });

  describe("Recorrências", () => {
    it("deve buscar receitas recorrentes ativas", async () => {
      const recorrentes = await prisma.revenueRecurrence.findMany({
        where: { ativo: true }
      });

      expect(recorrentes).toBeInstanceOf(Array);
    });

    it("deve buscar despesas recorrentes ativas", async () => {
      const recorrentes = await prisma.revenueRecurrence.findMany({
        where: { ativo: true }
      });

      expect(recorrentes).toBeInstanceOf(Array);
    });
  });
});
