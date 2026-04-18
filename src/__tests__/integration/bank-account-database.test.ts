/**
 * TESTES - DATABASE/INTEGRAÇÃO - CONTAS BANCÁRIAS
 * 
 * Testa operações CRUD e queries complexas
 * Meta: ~20 testes
 */

import { prisma } from "@/lib/prisma";

describe("Bank Accounts - Database Integration", () => {
  
  let empresaId: number;
  let contaId: number;
  let conta2Id: number;
  
  beforeAll(async () => {
    // Usa empresa existente ou cria uma nova
    const empresa = await prisma.empresa.findFirst();
    if (empresa) {
      empresaId = empresa.id;
    } else {
      const novaEmpresa = await prisma.empresa.create({
        data: {
          nome: "Empresa Teste Banco",
          razaoSocial: "Empresa Teste Banco LTDA",
          cnpj: "12345678000199",
          ativo: true
        }
      });
      empresaId = novaEmpresa.id;
    }
    
    // Limpa contas de teste anteriores
    const contasTeste = await prisma.bankAccount.findMany({
      where: {
        OR: [
          { nome: { contains: "Teste" } },
          { banco: "Banco Teste" }
        ]
      }
    });
    
    for (const conta of contasTeste) {
      await prisma.bankTransaction.deleteMany({ where: { accountId: conta.id } });
      await prisma.bankTransfer.deleteMany({ 
        where: { OR: [{ fromAccountId: conta.id }, { toAccountId: conta.id }] } 
      });
    }
    
    await prisma.bankAccount.deleteMany({
      where: {
        OR: [
          { nome: { contains: "Teste" } },
          { banco: "Banco Teste" }
        ]
      }
    });
  });
  
  afterAll(async () => {
    // Limpa dados de teste
    try {
      if (contaId) {
        await prisma.bankTransaction.deleteMany({ where: { accountId: contaId } }).catch(() => {});
        await prisma.bankAccount.deleteMany({ where: { id: contaId } }).catch(() => {});
      }
      if (conta2Id) {
        await prisma.bankTransaction.deleteMany({ where: { accountId: conta2Id } }).catch(() => {});
        await prisma.bankTransfer.deleteMany({ where: { OR: [{ fromAccountId: conta2Id }, { toAccountId: conta2Id }] } }).catch(() => {});
        await prisma.bankAccount.deleteMany({ where: { id: conta2Id } }).catch(() => {});
      }
    } catch (error) {
      // Ignora erros de limpeza
    }
  });
  
  // ========================================================================
  // CRUD - BANK ACCOUNTS
  // ========================================================================
  
  describe("CRUD - Bank Accounts", () => {
    
    it("deve criar uma conta bancária", async () => {
      const conta = await prisma.bankAccount.create({
        data: {
          empresaId,
          nome: "Conta Corrente Teste",
          banco: "Banco Teste",
          agencia: "1234",
          conta: "567890",
          digito: "1",
          tipo: "CORRENTE",
          saldoAtual: 10000,
          saldoInicial: 10000,
          limiteCredito: 5000,
          ativo: true,
          principal: true
        }
      });
      
      contaId = conta.id;
      
      expect(conta).toBeDefined();
      expect(conta.nome).toBe("Conta Corrente Teste");
      expect(Number(conta.saldoAtual)).toBe(10000);
      expect(conta.principal).toBe(true);
    });
    
    it("deve buscar conta por ID", async () => {
      const conta = await prisma.bankAccount.findUnique({
        where: { id: contaId }
      });
      
      expect(conta).toBeDefined();
      expect(conta?.nome).toBe("Conta Corrente Teste");
    });
    
    it("deve atualizar dados da conta", async () => {
      const contaAtualizada = await prisma.bankAccount.update({
        where: { id: contaId },
        data: {
          nome: "Conta Corrente Atualizada",
          observacoes: "Conta atualizada em teste"
        }
      });
      
      expect(contaAtualizada.nome).toBe("Conta Corrente Atualizada");
      expect(contaAtualizada.observacoes).toBe("Conta atualizada em teste");
    });
    
    it("deve listar contas ativas", async () => {
      const contas = await prisma.bankAccount.findMany({
        where: {
          empresaId,
          ativo: true
        }
      });
      
      expect(contas.length).toBeGreaterThan(0);
      expect(contas.every(c => c.ativo)).toBe(true);
    });
  });
  
  // ========================================================================
  // TRANSAÇÕES BANCÁRIAS
  // ========================================================================
  
  describe("Bank Transactions", () => {
    
    it("deve criar transação de crédito", async () => {
      const transacao = await prisma.bankTransaction.create({
        data: {
          accountId: contaId,
          empresaId,
          tipo: "CREDITO",
          categoria: "Receita",
          valor: 5000,
          descricao: "Recebimento de cliente",
          dataTransacao: new Date(),
          saldoAnterior: 10000,
          saldoPosterior: 15000,
          reconciliada: false
        }
      });
      
      expect(transacao).toBeDefined();
      expect(transacao.tipo).toBe("CREDITO");
      expect(Number(transacao.valor)).toBe(5000);
    });
    
    it("deve atualizar saldo da conta após transação", async () => {
      await prisma.bankAccount.update({
        where: { id: contaId },
        data: { saldoAtual: 15000 }
      });
      
      const conta = await prisma.bankAccount.findUnique({
        where: { id: contaId }
      });
      
      expect(Number(conta?.saldoAtual)).toBe(15000);
    });
    
    it("deve criar transação de débito", async () => {
      const transacao = await prisma.bankTransaction.create({
        data: {
          accountId: contaId,
          empresaId,
          tipo: "DEBITO",
          categoria: "Despesa",
          valor: 3000,
          descricao: "Pagamento de fornecedor",
          dataTransacao: new Date(),
          saldoAnterior: 15000,
          saldoPosterior: 12000,
          reconciliada: false
        }
      });
      
      expect(transacao.tipo).toBe("DEBITO");
      expect(Number(transacao.saldoPosterior)).toBe(12000);
      
      // Atualiza saldo
      await prisma.bankAccount.update({
        where: { id: contaId },
        data: { saldoAtual: 12000 }
      });
    });
    
    it("deve listar transações da conta", async () => {
      const transacoes = await prisma.bankTransaction.findMany({
        where: { accountId: contaId },
        orderBy: { dataTransacao: "desc" }
      });
      
      expect(transacoes.length).toBeGreaterThanOrEqual(2);
    });
    
    it("deve calcular totais por tipo", async () => {
      const totais = await prisma.bankTransaction.groupBy({
        by: ["tipo"],
        where: { accountId: contaId },
        _sum: { valor: true },
        _count: true
      });
      
      expect(totais.length).toBeGreaterThan(0);
      
      const creditos = totais.find(t => t.tipo === "CREDITO");
      const debitos = totais.find(t => t.tipo === "DEBITO");
      
      expect(Number(creditos?._sum.valor || 0)).toBeGreaterThanOrEqual(5000);
      expect(Number(debitos?._sum.valor || 0)).toBeGreaterThanOrEqual(3000);
    });
    
    it("deve reconciliar transações", async () => {
      const transacoes = await prisma.bankTransaction.findMany({
        where: {
          accountId: contaId,
          reconciliada: false
        }
      });
      
      const ids = transacoes.map(t => t.id);
      
      await prisma.bankTransaction.updateMany({
        where: { id: { in: ids } },
        data: {
          reconciliada: true,
          dataReconciliacao: new Date()
        }
      });
      
      const reconciliadas = await prisma.bankTransaction.count({
        where: {
          accountId: contaId,
          reconciliada: true
        }
      });
      
      expect(reconciliadas).toBe(transacoes.length);
    });
  });
  
  // ========================================================================
  // TRANSFERÊNCIAS BANCÁRIAS
  // ========================================================================
  
  describe("Bank Transfers", () => {
    
    beforeAll(async () => {
      // Cria segunda conta para transferências
      const conta2 = await prisma.bankAccount.create({
        data: {
          empresaId,
          nome: "Conta Poupança Teste",
          banco: "Banco Teste",
          agencia: "5678",
          conta: "123456",
          tipo: "POUPANCA",
          saldoAtual: 5000,
          saldoInicial: 5000,
          ativo: true,
          principal: false
        }
      });
      conta2Id = conta2.id;
    });
    
    it("deve criar transferência pendente", async () => {
      const transfer = await prisma.bankTransfer.create({
        data: {
          empresaId,
          fromAccountId: contaId,
          toAccountId: conta2Id,
          valor: 2000,
          descricao: "Transferência para poupança",
          status: "PENDENTE"
        }
      });
      
      expect(transfer).toBeDefined();
      expect(transfer.status).toBe("PENDENTE");
      expect(Number(transfer.valor)).toBe(2000);
    });
    
    it("deve executar transferência completa", async () => {
      // Busca saldos antes
      const contaOrigemAntes = await prisma.bankAccount.findUnique({ where: { id: contaId } });
      const contaDestinoAntes = await prisma.bankAccount.findUnique({ where: { id: conta2Id } });
      
      const saldoOrigemAntes = Number(contaOrigemAntes?.saldoAtual || 0);
      const saldoDestinoAntes = Number(contaDestinoAntes?.saldoAtual || 0);
      
      const valorTransf = 1000;
      
      // Executa transferência em transação
      await prisma.$transaction(async (tx) => {
        // Cria registro de transferência
        const transfer = await tx.bankTransfer.create({
          data: {
            empresaId,
            fromAccountId: contaId,
            toAccountId: conta2Id,
            valor: valorTransf,
            descricao: "Transferência teste",
            status: "PROCESSANDO"
          }
        });
        
        // Cria transação de saída
        await tx.bankTransaction.create({
          data: {
            accountId: contaId,
            empresaId,
            tipo: "TRANSFERENCIA_SAIDA",
            categoria: "Transferência",
            valor: valorTransf,
            descricao: "Transferência para poupança",
            dataTransacao: new Date(),
            saldoAnterior: saldoOrigemAntes,
            saldoPosterior: saldoOrigemAntes - valorTransf,
            transferId: transfer.id,
            reconciliada: true
          }
        });
        
        // Cria transação de entrada
        await tx.bankTransaction.create({
          data: {
            accountId: conta2Id,
            empresaId,
            tipo: "TRANSFERENCIA_ENTRADA",
            categoria: "Transferência",
            valor: valorTransf,
            descricao: "Recebimento de conta corrente",
            dataTransacao: new Date(),
            saldoAnterior: saldoDestinoAntes,
            saldoPosterior: saldoDestinoAntes + valorTransf,
            transferId: transfer.id,
            reconciliada: true
          }
        });
        
        // Atualiza saldos
        await tx.bankAccount.update({
          where: { id: contaId },
          data: { saldoAtual: saldoOrigemAntes - valorTransf }
        });
        
        await tx.bankAccount.update({
          where: { id: conta2Id },
          data: { saldoAtual: saldoDestinoAntes + valorTransf }
        });
        
        // Atualiza status
        await tx.bankTransfer.update({
          where: { id: transfer.id },
          data: {
            status: "CONCLUIDA",
            dataExecucao: new Date(),
            dataConclusao: new Date()
          }
        });
      });
      
      // Verifica saldos após
      const contaOrigemDepois = await prisma.bankAccount.findUnique({ where: { id: contaId } });
      const contaDestinoDepois = await prisma.bankAccount.findUnique({ where: { id: conta2Id } });
      
      expect(Number(contaOrigemDepois?.saldoAtual)).toBe(saldoOrigemAntes - valorTransf);
      expect(Number(contaDestinoDepois?.saldoAtual)).toBe(saldoDestinoAntes + valorTransf);
    });
    
    it("deve listar transferências concluídas", async () => {
      const transfers = await prisma.bankTransfer.findMany({
        where: {
          empresaId,
          status: "CONCLUIDA"
        },
        include: {
          fromAccount: {
            select: { nome: true }
          },
          toAccount: {
            select: { nome: true }
          }
        }
      });
      
      expect(transfers.length).toBeGreaterThan(0);
      expect(transfers.every(t => t.status === "CONCLUIDA")).toBe(true);
    });
  });
  
  // ========================================================================
  // ESTATÍSTICAS E AGREGAÇÕES
  // ========================================================================
  
  describe("Statistics and Aggregations", () => {
    
    it("deve calcular saldo total de todas as contas", async () => {
      const totais = await prisma.bankAccount.aggregate({
        where: {
          empresaId,
          ativo: true
        },
        _sum: {
          saldoAtual: true,
          limiteCredito: true
        },
        _count: true
      });
      
      expect(totais._count).toBeGreaterThan(0);
      expect(totais._sum.saldoAtual).toBeDefined();
    });
    
    it("deve contar transações por categoria", async () => {
      const porCategoria = await prisma.bankTransaction.groupBy({
        by: ["categoria"],
        where: {
          empresaId,
          categoria: { not: null }
        },
        _count: true,
        _sum: { valor: true }
      });
      
      expect(porCategoria.length).toBeGreaterThan(0);
    });
    
    it("deve buscar transações não reconciliadas", async () => {
      const naoReconciliadas = await prisma.bankTransaction.findMany({
        where: {
          empresaId,
          reconciliada: false
        }
      });
      
      expect(Array.isArray(naoReconciliadas)).toBe(true);
    });
    
    it("deve buscar conta principal", async () => {
      const principal = await prisma.bankAccount.findFirst({
        where: {
          empresaId,
          principal: true,
          ativo: true
        }
      });
      
      expect(principal).toBeDefined();
      expect(principal?.principal).toBe(true);
    });
  });
});
