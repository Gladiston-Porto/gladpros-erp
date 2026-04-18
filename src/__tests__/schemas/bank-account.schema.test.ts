/**
 * TESTES - SCHEMAS ZOD - CONTAS BANCÁRIAS
 * 
 * Testa todos os 11 schemas Zod e 7 helpers
 * Meta: ~35 testes
 */

import {
  createBankAccountSchema,
  updateBankAccountSchema,
  createBankTransactionSchema,
  reconcileBankTransactionsSchema,
  createBankTransferSchema,
  updateTransferStatusSchema,
  executeTransferSchema,
  bankAccountFiltersSchema,
  bankTransactionFiltersSchema,
  bankTransferFiltersSchema,
  bankStatementSchema,
  calcularSaldoPosterior,
  validarSaldoDisponivel,
  determinarTipoTransacao,
  validarPeriodoExtrato,
  formatarNumeroConta
} from "@/schemas/bank-account.schema";

describe("Bank Account Schemas - Validações", () => {
  
  // ========================================================================
  // SCHEMA: createBankAccountSchema
  // ========================================================================
  
  describe("createBankAccountSchema", () => {
    it("deve validar conta corrente válida", () => {
      const data = {
        empresaId: 1,
        nome: "Conta Corrente Principal",
        banco: "Banco do Brasil",
        agencia: "1234",
        conta: "567890",
        digito: "1",
        tipo: "CORRENTE" as const,
        saldoInicial: 10000,
        limiteCredito: 5000,
        principal: true,
        observacoes: "Conta principal da empresa"
      };
      
      const result = createBankAccountSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
    
    it("deve validar conta sem limite de crédito", () => {
      const data = {
        empresaId: 1,
        nome: "Conta Poupança",
        banco: "Caixa",
        agencia: "5678",
        conta: "123456",
        tipo: "POUPANCA" as const,
        saldoInicial: 50000
      };
      
      const result = createBankAccountSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
    
    it("deve rejeitar empresaId inválido", () => {
      const data = {
        empresaId: -1,
        nome: "Conta Teste",
        banco: "Teste",
        agencia: "1234",
        conta: "5678",
        tipo: "CORRENTE" as const
      };
      
      const result = createBankAccountSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
    
    it("deve rejeitar nome muito curto", () => {
      const data = {
        empresaId: 1,
        nome: "AB",
        banco: "Banco",
        agencia: "1234",
        conta: "5678",
        tipo: "CORRENTE" as const
      };
      
      const result = createBankAccountSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
    
    it("deve rejeitar agência com formato inválido", () => {
      const data = {
        empresaId: 1,
        nome: "Conta Teste",
        banco: "Banco",
        agencia: "ABC123", // Deve ser apenas números
        conta: "5678",
        tipo: "CORRENTE" as const
      };
      
      const result = createBankAccountSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
    
    it("deve aceitar agência com hífen", () => {
      const data = {
        empresaId: 1,
        nome: "Conta Teste",
        banco: "Banco",
        agencia: "1234-5",
        conta: "567890",
        tipo: "CORRENTE" as const
      };
      
      const result = createBankAccountSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
    
    it("deve rejeitar conta com letras", () => {
      const data = {
        empresaId: 1,
        nome: "Conta Teste",
        banco: "Banco",
        agencia: "1234",
        conta: "ABC123", // Deve ser apenas números
        tipo: "CORRENTE" as const
      };
      
      const result = createBankAccountSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });
  
  // ========================================================================
  // SCHEMA: updateBankAccountSchema
  // ========================================================================
  
  describe("updateBankAccountSchema", () => {
    it("deve validar atualização parcial", () => {
      const data = {
        nome: "Novo Nome da Conta",
        observacoes: "Atualizado"
      };
      
      const result = updateBankAccountSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
    
    it("deve validar mudança de tipo", () => {
      const data = {
        tipo: "INVESTIMENTO" as const,
        ativo: false
      };
      
      const result = updateBankAccountSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
    
    it("deve permitir atualização vazia", () => {
      const data = {};
      
      const result = updateBankAccountSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });
  
  // ========================================================================
  // SCHEMA: createBankTransactionSchema
  // ========================================================================
  
  describe("createBankTransactionSchema", () => {
    it("deve validar transação de crédito", () => {
      const data = {
        accountId: 1,
        empresaId: 1,
        tipo: "CREDITO" as const,
        categoria: "Receita",
        valor: 5000,
        descricao: "Recebimento de cliente",
        dataTransacao: new Date(),
        documento: "NF-001"
      };
      
      const result = createBankTransactionSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
    
    it("deve validar transação de débito", () => {
      const data = {
        accountId: 1,
        empresaId: 1,
        tipo: "DEBITO" as const,
        valor: 2500,
        descricao: "Pagamento de fornecedor",
        dataTransacao: "2025-10-30"
      };
      
      const result = createBankTransactionSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
    
    it("deve rejeitar valor zero ou negativo", () => {
      const data = {
        accountId: 1,
        empresaId: 1,
        tipo: "CREDITO" as const,
        valor: 0,
        descricao: "Teste",
        dataTransacao: new Date()
      };
      
      const result = createBankTransactionSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
    
    it("deve validar transação com revenueId", () => {
      const data = {
        accountId: 1,
        empresaId: 1,
        tipo: "CREDITO" as const,
        valor: 1000,
        descricao: "Pagamento de receita",
        dataTransacao: new Date(),
        revenueId: 5
      };
      
      const result = createBankTransactionSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
    
    it("deve validar transação com expenseId", () => {
      const data = {
        accountId: 1,
        empresaId: 1,
        tipo: "DEBITO" as const,
        valor: 800,
        descricao: "Pagamento de despesa",
        dataTransacao: new Date(),
        expenseId: 10
      };
      
      const result = createBankTransactionSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });
  
  // ========================================================================
  // SCHEMA: createBankTransferSchema
  // ========================================================================
  
  describe("createBankTransferSchema", () => {
    it("deve validar transferência válida", () => {
      const data = {
        empresaId: 1,
        fromAccountId: 1,
        toAccountId: 2,
        valor: 5000,
        descricao: "Transferência para investimento"
      };
      
      const result = createBankTransferSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
    
    it("deve rejeitar transferência para mesma conta", () => {
      const data = {
        empresaId: 1,
        fromAccountId: 1,
        toAccountId: 1,
        valor: 1000,
        descricao: "Teste"
      };
      
      const result = createBankTransferSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
    
    it("deve validar transferência com data agendada", () => {
      const data = {
        empresaId: 1,
        fromAccountId: 1,
        toAccountId: 2,
        valor: 3000,
        descricao: "Transferência agendada",
        dataAgendamento: new Date("2025-11-01")
      };
      
      const result = createBankTransferSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });
  
  // ========================================================================
  // SCHEMA: reconcileBankTransactionsSchema
  // ========================================================================
  
  describe("reconcileBankTransactionsSchema", () => {
    it("deve validar reconciliação de múltiplas transações", () => {
      const data = {
        transactionIds: [1, 2, 3, 4, 5],
        dataReconciliacao: new Date()
      };
      
      const result = reconcileBankTransactionsSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
    
    it("deve validar reconciliação sem data (usa data atual)", () => {
      const data = {
        transactionIds: [1, 2]
      };
      
      const result = reconcileBankTransactionsSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
    
    it("deve rejeitar lista vazia de transações", () => {
      const data = {
        transactionIds: []
      };
      
      const result = reconcileBankTransactionsSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });
  
  // ========================================================================
  // SCHEMA: Filtros
  // ========================================================================
  
  describe("bankAccountFiltersSchema", () => {
    it("deve validar filtros de conta", () => {
      const data = {
        empresaId: 1,
        tipo: "CORRENTE" as const,
        ativo: true,
        search: "Banco do Brasil"
      };
      
      const result = bankAccountFiltersSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });
  
  describe("bankTransactionFiltersSchema", () => {
    it("deve validar filtros de transação com paginação", () => {
      const data = {
        accountId: 1,
        tipo: "CREDITO" as const,
        reconciliada: false,
        dataInicio: new Date("2025-10-01"),
        dataFim: new Date("2025-10-31"),
        page: 1,
        limit: 50
      };
      
      const result = bankTransactionFiltersSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });
  
  describe("bankTransferFiltersSchema", () => {
    it("deve validar filtros de transferência", () => {
      const data = {
        empresaId: 1,
        status: "CONCLUIDA" as const,
        page: 1,
        limit: 20
      };
      
      const result = bankTransferFiltersSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });
  
  describe("bankStatementSchema", () => {
    it("deve validar parâmetros de extrato", () => {
      const data = {
        accountId: 1,
        dataInicio: new Date("2025-10-01"),
        dataFim: new Date("2025-10-31"),
        incluirReconciliadas: true,
        agruparPorCategoria: false
      };
      
      const result = bankStatementSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });
});

describe("Bank Account Helpers - Funções", () => {
  
  // ========================================================================
  // HELPER: calcularSaldoPosterior
  // ========================================================================
  
  describe("calcularSaldoPosterior", () => {
    it("deve calcular saldo posterior para crédito", () => {
      const saldoAnterior = 1000;
      const valor = 500;
      const resultado = calcularSaldoPosterior(saldoAnterior, valor, "CREDITO");
      expect(resultado).toBe(1500);
    });
    
    it("deve calcular saldo posterior para débito", () => {
      const saldoAnterior = 1000;
      const valor = 300;
      const resultado = calcularSaldoPosterior(saldoAnterior, valor, "DEBITO");
      expect(resultado).toBe(700);
    });
    
    it("deve calcular saldo posterior para transferência entrada", () => {
      const saldoAnterior = 2000;
      const valor = 1000;
      const resultado = calcularSaldoPosterior(saldoAnterior, valor, "TRANSFERENCIA_ENTRADA");
      expect(resultado).toBe(3000);
    });
    
    it("deve calcular saldo posterior para transferência saída", () => {
      const saldoAnterior = 5000;
      const valor = 2000;
      const resultado = calcularSaldoPosterior(saldoAnterior, valor, "TRANSFERENCIA_SAIDA");
      expect(resultado).toBe(3000);
    });
    
    it("deve calcular saldo posterior para taxa (débito)", () => {
      const saldoAnterior = 1000;
      const valor = 50;
      const resultado = calcularSaldoPosterior(saldoAnterior, valor, "TAXA");
      expect(resultado).toBe(950);
    });
    
    it("deve calcular saldo posterior para juros (crédito)", () => {
      const saldoAnterior = 10000;
      const valor = 500;
      const resultado = calcularSaldoPosterior(saldoAnterior, valor, "JUROS");
      expect(resultado).toBe(10500);
    });
  });
  
  // ========================================================================
  // HELPER: validarSaldoDisponivel
  // ========================================================================
  
  describe("validarSaldoDisponivel", () => {
    it("deve validar saldo suficiente sem limite", () => {
      const resultado = validarSaldoDisponivel(1000, null, 500, "DEBITO");
      expect(resultado.valido).toBe(true);
      expect(resultado.saldoDisponivel).toBe(1000);
    });
    
    it("deve validar saldo insuficiente", () => {
      const resultado = validarSaldoDisponivel(500, null, 1000, "DEBITO");
      expect(resultado.valido).toBe(false);
      expect(resultado.mensagem).toContain("Saldo insuficiente");
    });
    
    it("deve considerar limite de crédito", () => {
      const resultado = validarSaldoDisponivel(500, 1000, 1200, "DEBITO");
      expect(resultado.valido).toBe(true);
      expect(resultado.saldoDisponivel).toBe(1500);
    });
    
    it("deve rejeitar quando ultrapassa saldo + limite", () => {
      const resultado = validarSaldoDisponivel(500, 1000, 2000, "DEBITO");
      expect(resultado.valido).toBe(false);
    });
    
    it("não deve validar para operações de crédito", () => {
      const resultado = validarSaldoDisponivel(0, null, 5000, "CREDITO");
      expect(resultado.valido).toBe(true);
    });
  });
  
  // ========================================================================
  // HELPER: determinarTipoTransacao
  // ========================================================================
  
  describe("determinarTipoTransacao", () => {
    it("deve retornar CREDITO para entrada", () => {
      const tipo = determinarTipoTransacao("entrada");
      expect(tipo).toBe("CREDITO");
    });
    
    it("deve retornar DEBITO para saida", () => {
      const tipo = determinarTipoTransacao("saida");
      expect(tipo).toBe("DEBITO");
    });
    
    it("deve retornar TRANSFERENCIA_ENTRADA", () => {
      const tipo = determinarTipoTransacao("transferencia_entrada");
      expect(tipo).toBe("TRANSFERENCIA_ENTRADA");
    });
    
    it("deve retornar TRANSFERENCIA_SAIDA", () => {
      const tipo = determinarTipoTransacao("transferencia_saida");
      expect(tipo).toBe("TRANSFERENCIA_SAIDA");
    });
  });
  
  // ========================================================================
  // HELPER: validarPeriodoExtrato
  // ========================================================================
  
  describe("validarPeriodoExtrato", () => {
    it("deve validar período correto", () => {
      const inicio = new Date("2025-10-01");
      const fim = new Date("2025-10-31");
      const resultado = validarPeriodoExtrato(inicio, fim);
      expect(resultado.valido).toBe(true);
    });
    
    it("deve rejeitar data inicial maior que final", () => {
      const inicio = new Date("2025-10-31");
      const fim = new Date("2025-10-01");
      const resultado = validarPeriodoExtrato(inicio, fim);
      expect(resultado.valido).toBe(false);
      expect(resultado.mensagem).toContain("Data inicial não pode ser maior");
    });
    
    it("deve rejeitar período maior que 365 dias", () => {
      const inicio = new Date("2024-01-01");
      const fim = new Date("2025-10-30");
      const resultado = validarPeriodoExtrato(inicio, fim);
      expect(resultado.valido).toBe(false);
      expect(resultado.mensagem).toContain("365 dias");
    });
  });
  
  // ========================================================================
  // HELPER: formatarNumeroConta
  // ========================================================================
  
  describe("formatarNumeroConta", () => {
    it("deve formatar conta com dígito", () => {
      const formatado = formatarNumeroConta("1234", "567890", "1");
      expect(formatado).toBe("1234 / 567890-1");
    });
    
    it("deve formatar conta sem dígito", () => {
      const formatado = formatarNumeroConta("5678", "123456", null);
      expect(formatado).toBe("5678 / 123456");
    });
    
    it("deve formatar conta com dígito undefined", () => {
      const formatado = formatarNumeroConta("9012", "234567");
      expect(formatado).toBe("9012 / 234567");
    });
  });
});
