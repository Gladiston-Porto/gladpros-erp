/**
 * Unit tests for Financeiro dashboard cashflow computation logic.
 * Tests the pure computations done in page.tsx and dashboard/route.ts.
 * No DB required — all pure math.
 */

// ─── helpers (mirror of page.tsx logic) ──────────────────────────────────────

function computeCashflow({
  saldoTotal,
  invoicesARSaldo,
  invoicesOverdueSaldo,
  expensesAPValor,
  expensesVencidasValor,
  projetosValorContrato,
  receitasMesValor,
  despesasMesValor,
}: {
  saldoTotal: number;
  invoicesARSaldo: number;
  invoicesOverdueSaldo: number;
  expensesAPValor: number;
  expensesVencidasValor: number;
  projetosValorContrato: number;
  receitasMesValor: number;
  despesasMesValor: number;
}) {
  const totalAR = invoicesARSaldo + invoicesOverdueSaldo;
  const totalOverdue = invoicesOverdueSaldo;
  const totalAP = expensesAPValor;
  const totalAPVencidas = expensesVencidasValor;
  const cashPosition = saldoTotal + totalAR;
  const cashflowNegativo = cashPosition < totalAP;
  const cashflowGap = totalAP - cashPosition;
  const totalPipeline = projetosValorContrato;
  const resultadoMes = receitasMesValor - despesasMesValor;

  return {
    totalAR,
    totalOverdue,
    totalAP,
    totalAPVencidas,
    cashPosition,
    cashflowNegativo,
    cashflowGap,
    totalPipeline,
    resultadoMes,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("Financeiro Dashboard — cashflow computation logic", () => {
  // ── A/R totals ──────────────────────────────────────────────────────────────
  describe("totalAR", () => {
    it("sums in-flight invoices and overdue invoices", () => {
      const r = computeCashflow({
        saldoTotal: 0,
        invoicesARSaldo: 10000,
        invoicesOverdueSaldo: 3000,
        expensesAPValor: 0,
        expensesVencidasValor: 0,
        projetosValorContrato: 0,
        receitasMesValor: 0,
        despesasMesValor: 0,
      });
      expect(r.totalAR).toBe(13000);
      expect(r.totalOverdue).toBe(3000);
    });

    it("returns 0 when no invoices open", () => {
      const r = computeCashflow({
        saldoTotal: 5000,
        invoicesARSaldo: 0,
        invoicesOverdueSaldo: 0,
        expensesAPValor: 0,
        expensesVencidasValor: 0,
        projetosValorContrato: 0,
        receitasMesValor: 0,
        despesasMesValor: 0,
      });
      expect(r.totalAR).toBe(0);
      expect(r.totalOverdue).toBe(0);
    });
  });

  // ── cash position ───────────────────────────────────────────────────────────
  describe("cashPosition", () => {
    it("is saldo + totalAR", () => {
      const r = computeCashflow({
        saldoTotal: 5000,
        invoicesARSaldo: 10000,
        invoicesOverdueSaldo: 3000,
        expensesAPValor: 0,
        expensesVencidasValor: 0,
        projetosValorContrato: 0,
        receitasMesValor: 0,
        despesasMesValor: 0,
      });
      // cashPosition = 5000 + 13000 = 18000
      expect(r.cashPosition).toBe(18000);
    });

    it("can be zero when saldo and AR are both 0", () => {
      const r = computeCashflow({
        saldoTotal: 0,
        invoicesARSaldo: 0,
        invoicesOverdueSaldo: 0,
        expensesAPValor: 1000,
        expensesVencidasValor: 0,
        projetosValorContrato: 0,
        receitasMesValor: 0,
        despesasMesValor: 0,
      });
      expect(r.cashPosition).toBe(0);
      expect(r.cashflowNegativo).toBe(true);
    });
  });

  // ── cashflowNegativo ────────────────────────────────────────────────────────
  describe("cashflowNegativo", () => {
    it("is false when cash+AR covers all payables", () => {
      const r = computeCashflow({
        saldoTotal: 20000,
        invoicesARSaldo: 5000,
        invoicesOverdueSaldo: 0,
        expensesAPValor: 24999,
        expensesVencidasValor: 0,
        projetosValorContrato: 0,
        receitasMesValor: 0,
        despesasMesValor: 0,
      });
      // cashPosition = 25000, AP = 24999 → safe
      expect(r.cashflowNegativo).toBe(false);
    });

    it("is false when cash+AR exactly equals payables", () => {
      const r = computeCashflow({
        saldoTotal: 10000,
        invoicesARSaldo: 5000,
        invoicesOverdueSaldo: 0,
        expensesAPValor: 15000,
        expensesVencidasValor: 0,
        projetosValorContrato: 0,
        receitasMesValor: 0,
        despesasMesValor: 0,
      });
      // cashPosition = 15000, AP = 15000 → exactly equal → NOT negative
      expect(r.cashflowNegativo).toBe(false);
    });

    it("is true when AP exceeds cash+AR by $1", () => {
      const r = computeCashflow({
        saldoTotal: 10000,
        invoicesARSaldo: 4999,
        invoicesOverdueSaldo: 0,
        expensesAPValor: 15000,
        expensesVencidasValor: 0,
        projetosValorContrato: 0,
        receitasMesValor: 0,
        despesasMesValor: 0,
      });
      // cashPosition = 14999, AP = 15000 → gap = 1
      expect(r.cashflowNegativo).toBe(true);
      expect(r.cashflowGap).toBe(1);
    });

    it("computes the correct gap when AP >> cash+AR", () => {
      const r = computeCashflow({
        saldoTotal: 1000,
        invoicesARSaldo: 0,
        invoicesOverdueSaldo: 0,
        expensesAPValor: 50000,
        expensesVencidasValor: 30000,
        projetosValorContrato: 0,
        receitasMesValor: 0,
        despesasMesValor: 0,
      });
      expect(r.cashflowNegativo).toBe(true);
      expect(r.cashflowGap).toBe(49000);
      expect(r.totalAPVencidas).toBe(30000);
    });
  });

  // ── pipeline ─────────────────────────────────────────────────────────────
  describe("totalPipeline", () => {
    it("reflects active project contract values", () => {
      const r = computeCashflow({
        saldoTotal: 0,
        invoicesARSaldo: 0,
        invoicesOverdueSaldo: 0,
        expensesAPValor: 0,
        expensesVencidasValor: 0,
        projetosValorContrato: 125000,
        receitasMesValor: 0,
        despesasMesValor: 0,
      });
      expect(r.totalPipeline).toBe(125000);
    });

    it("is 0 when no active projects", () => {
      const r = computeCashflow({
        saldoTotal: 5000,
        invoicesARSaldo: 0,
        invoicesOverdueSaldo: 0,
        expensesAPValor: 0,
        expensesVencidasValor: 0,
        projetosValorContrato: 0,
        receitasMesValor: 0,
        despesasMesValor: 0,
      });
      expect(r.totalPipeline).toBe(0);
    });
  });

  // ── resultadoMes ──────────────────────────────────────────────────────────
  describe("resultadoMes", () => {
    it("is positive when receitas > despesas", () => {
      const r = computeCashflow({
        saldoTotal: 0,
        invoicesARSaldo: 0,
        invoicesOverdueSaldo: 0,
        expensesAPValor: 0,
        expensesVencidasValor: 0,
        projetosValorContrato: 0,
        receitasMesValor: 10000,
        despesasMesValor: 7000,
      });
      expect(r.resultadoMes).toBe(3000);
    });

    it("is negative when despesas > receitas", () => {
      const r = computeCashflow({
        saldoTotal: 0,
        invoicesARSaldo: 0,
        invoicesOverdueSaldo: 0,
        expensesAPValor: 0,
        expensesVencidasValor: 0,
        projetosValorContrato: 0,
        receitasMesValor: 5000,
        despesasMesValor: 8000,
      });
      expect(r.resultadoMes).toBe(-3000);
    });

    it("is zero when break-even", () => {
      const r = computeCashflow({
        saldoTotal: 0,
        invoicesARSaldo: 0,
        invoicesOverdueSaldo: 0,
        expensesAPValor: 0,
        expensesVencidasValor: 0,
        projetosValorContrato: 0,
        receitasMesValor: 12000,
        despesasMesValor: 12000,
      });
      expect(r.resultadoMes).toBe(0);
    });
  });

  // ── realistic scenario ────────────────────────────────────────────────────
  describe("realistic GladPros scenario", () => {
    it("construction company with mixed state — should flag cashflow risk", () => {
      // Scenario:
      // - Bank balance: $8,000
      // - A/R in-flight: $15,000 (invoices sent)
      // - A/R overdue: $4,200 (client hasn't paid)
      // - A/P total: $30,000 (materials, subs, bills)
      // - A/P vencidas: $8,500 (already past due)
      // - Pipeline: $95,000 (3 active projects)
      const r = computeCashflow({
        saldoTotal: 8000,
        invoicesARSaldo: 15000,
        invoicesOverdueSaldo: 4200,
        expensesAPValor: 30000,
        expensesVencidasValor: 8500,
        projetosValorContrato: 95000,
        receitasMesValor: 22000,
        despesasMesValor: 18000,
      });

      expect(r.totalAR).toBe(19200);                 // 15000 + 4200
      expect(r.cashPosition).toBe(27200);             // 8000 + 19200
      expect(r.cashflowNegativo).toBe(true);          // 27200 < 30000
      expect(r.cashflowGap).toBe(2800);               // 30000 - 27200
      expect(r.totalAPVencidas).toBe(8500);
      expect(r.totalPipeline).toBe(95000);
      expect(r.resultadoMes).toBe(4000);              // 22000 - 18000
    });

    it("healthy company — no cashflow alert", () => {
      // Comfortable cash position
      const r = computeCashflow({
        saldoTotal: 50000,
        invoicesARSaldo: 20000,
        invoicesOverdueSaldo: 0,
        expensesAPValor: 18000,
        expensesVencidasValor: 0,
        projetosValorContrato: 180000,
        receitasMesValor: 35000,
        despesasMesValor: 22000,
      });

      expect(r.cashPosition).toBe(70000);
      expect(r.cashflowNegativo).toBe(false);
      expect(r.cashflowGap).toBe(-52000); // negative gap = surplus
      expect(r.resultadoMes).toBe(13000);
    });
  });
});
