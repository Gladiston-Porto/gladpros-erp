/**
 * Unit Tests - Invoice Calculations
 * 
 * Testa os cálculos de totais, descontos, taxas e saldos
 */

import { describe, it, expect } from '@jest/globals';

interface InvoiceItem {
  quantidade: number;
  precoUnitario: number;
  desconto: number;
  taxavel: boolean;
}

/**
 * Calcula o subtotal de um item
 */
function calculateItemSubtotal(item: InvoiceItem): number {
  return item.quantidade * item.precoUnitario - item.desconto;
}

/**
 * Calcula o subtotal total da invoice
 */
function calculateSubtotal(itens: InvoiceItem[]): number {
  return itens.reduce((sum, item) => sum + calculateItemSubtotal(item), 0);
}

/**
 * Calcula o desconto total
 */
function calculateDiscount(
  subtotal: number,
  descontoValor: number,
  descontoPercentual: number
): number {
  if (descontoPercentual > 0) {
    return subtotal * (descontoPercentual / 100);
  }
  return descontoValor;
}

/**
 * Calcula o valor taxável (apenas itens marcados como taxáveis)
 */
function calculateTaxableAmount(itens: InvoiceItem[]): number {
  return itens
    .filter((item) => item.taxavel)
    .reduce((sum, item) => sum + calculateItemSubtotal(item), 0);
}

/**
 * Calcula o valor da taxa
 */
function calculateTaxAmount(
  taxableAmount: number,
  discount: number,
  taxRate: number
): number {
  const taxableAfterDiscount = Math.max(0, taxableAmount - discount);
  return taxableAfterDiscount * taxRate;
}

/**
 * Calcula o total da invoice
 */
function calculateTotal(
  subtotal: number,
  discount: number,
  taxAmount: number
): number {
  return subtotal - discount + taxAmount;
}

/**
 * Calcula o saldo restante
 */
function calculateBalance(valorTotal: number, valorPago: number): number {
  return Math.max(0, valorTotal - valorPago);
}

describe('Invoice Calculations', () => {
  describe('calculateItemSubtotal', () => {
    it('deve calcular subtotal simples sem desconto', () => {
      const item: InvoiceItem = {
        quantidade: 10,
        precoUnitario: 100,
        desconto: 0,
        taxavel: true,
      };

      const result = calculateItemSubtotal(item);
      expect(result).toBe(1000);
    });

    it('deve calcular subtotal com desconto', () => {
      const item: InvoiceItem = {
        quantidade: 10,
        precoUnitario: 100,
        desconto: 50,
        taxavel: true,
      };

      const result = calculateItemSubtotal(item);
      expect(result).toBe(950);
    });

    it('deve calcular subtotal com quantidade decimal', () => {
      const item: InvoiceItem = {
        quantidade: 2.5,
        precoUnitario: 100,
        desconto: 0,
        taxavel: true,
      };

      const result = calculateItemSubtotal(item);
      expect(result).toBe(250);
    });

    it('deve calcular subtotal com preço decimal', () => {
      const item: InvoiceItem = {
        quantidade: 10,
        precoUnitario: 99.99,
        desconto: 0,
        taxavel: true,
      };

      const result = calculateItemSubtotal(item);
      expect(result).toBeCloseTo(999.90, 2);
    });
  });

  describe('calculateSubtotal', () => {
    it('deve calcular subtotal de múltiplos itens', () => {
      const itens: InvoiceItem[] = [
        { quantidade: 10, precoUnitario: 100, desconto: 0, taxavel: true },
        { quantidade: 5, precoUnitario: 20, desconto: 0, taxavel: true },
        { quantidade: 2, precoUnitario: 50, desconto: 10, taxavel: true },
      ];

      const result = calculateSubtotal(itens);
      expect(result).toBe(1190); // 1000 + 100 + 90
    });

    it('deve retornar 0 para array vazio', () => {
      const result = calculateSubtotal([]);
      expect(result).toBe(0);
    });

    it('deve calcular corretamente com itens taxáveis e não taxáveis', () => {
      const itens: InvoiceItem[] = [
        { quantidade: 10, precoUnitario: 100, desconto: 0, taxavel: true },
        { quantidade: 5, precoUnitario: 20, desconto: 0, taxavel: false },
      ];

      const result = calculateSubtotal(itens);
      expect(result).toBe(1100); // 1000 + 100
    });
  });

  describe('calculateDiscount', () => {
    it('deve calcular desconto por valor', () => {
      const result = calculateDiscount(1000, 100, 0);
      expect(result).toBe(100);
    });

    it('deve calcular desconto por percentual', () => {
      const result = calculateDiscount(1000, 0, 10);
      expect(result).toBe(100);
    });

    it('deve priorizar percentual sobre valor', () => {
      const result = calculateDiscount(1000, 50, 10);
      expect(result).toBe(100); // 10% de 1000, ignora os 50
    });

    it('deve retornar 0 quando não há desconto', () => {
      const result = calculateDiscount(1000, 0, 0);
      expect(result).toBe(0);
    });

    it('deve calcular desconto percentual decimal', () => {
      const result = calculateDiscount(1000, 0, 12.5);
      expect(result).toBe(125);
    });
  });

  describe('calculateTaxableAmount', () => {
    it('deve calcular apenas itens taxáveis', () => {
      const itens: InvoiceItem[] = [
        { quantidade: 10, precoUnitario: 100, desconto: 0, taxavel: true },
        { quantidade: 5, precoUnitario: 20, desconto: 0, taxavel: false },
        { quantidade: 2, precoUnitario: 50, desconto: 0, taxavel: true },
      ];

      const result = calculateTaxableAmount(itens);
      expect(result).toBe(1100); // 1000 + 100 (ignora os não taxáveis)
    });

    it('deve retornar 0 quando nenhum item é taxável', () => {
      const itens: InvoiceItem[] = [
        { quantidade: 10, precoUnitario: 100, desconto: 0, taxavel: false },
        { quantidade: 5, precoUnitario: 20, desconto: 0, taxavel: false },
      ];

      const result = calculateTaxableAmount(itens);
      expect(result).toBe(0);
    });

    it('deve incluir descontos nos itens taxáveis', () => {
      const itens: InvoiceItem[] = [
        { quantidade: 10, precoUnitario: 100, desconto: 50, taxavel: true },
        { quantidade: 5, precoUnitario: 20, desconto: 10, taxavel: true },
      ];

      const result = calculateTaxableAmount(itens);
      expect(result).toBe(1040); // (1000-50) + (100-10)
    });
  });

  describe('calculateTaxAmount', () => {
    it('deve calcular taxa de imposto Texas (8.25%)', () => {
      const taxRate = 0.0825;
      const result = calculateTaxAmount(1000, 0, taxRate);
      expect(result).toBe(82.5);
    });

    it('deve aplicar desconto antes de calcular taxa', () => {
      const taxRate = 0.0825;
      const result = calculateTaxAmount(1000, 100, taxRate);
      expect(result).toBe(74.25); // (1000 - 100) * 0.0825
    });

    it('deve retornar 0 quando desconto excede valor taxável', () => {
      const taxRate = 0.0825;
      const result = calculateTaxAmount(1000, 1500, taxRate);
      expect(result).toBe(0);
    });

    it('deve calcular taxa com alíquota diferente', () => {
      const taxRate = 0.10; // 10%
      const result = calculateTaxAmount(1000, 0, taxRate);
      expect(result).toBe(100);
    });

    it('deve retornar 0 quando taxa é 0', () => {
      const result = calculateTaxAmount(1000, 0, 0);
      expect(result).toBe(0);
    });
  });

  describe('calculateTotal', () => {
    it('deve calcular total com subtotal, desconto e taxa', () => {
      const result = calculateTotal(1000, 100, 74.25);
      expect(result).toBe(974.25);
    });

    it('deve calcular total sem desconto', () => {
      const result = calculateTotal(1000, 0, 82.5);
      expect(result).toBe(1082.5);
    });

    it('deve calcular total sem taxa', () => {
      const result = calculateTotal(1000, 100, 0);
      expect(result).toBe(900);
    });

    it('deve calcular total apenas com subtotal', () => {
      const result = calculateTotal(1000, 0, 0);
      expect(result).toBe(1000);
    });
  });

  describe('calculateBalance', () => {
    it('deve calcular saldo restante', () => {
      const result = calculateBalance(1000, 500);
      expect(result).toBe(500);
    });

    it('deve retornar 0 quando totalmente pago', () => {
      const result = calculateBalance(1000, 1000);
      expect(result).toBe(0);
    });

    it('deve retornar 0 quando pagamento excede total', () => {
      const result = calculateBalance(1000, 1500);
      expect(result).toBe(0);
    });

    it('deve retornar total quando não há pagamento', () => {
      const result = calculateBalance(1000, 0);
      expect(result).toBe(1000);
    });
  });

  describe('Full Invoice Calculation Example', () => {
    it('deve calcular invoice completa corretamente', () => {
      // Cenário: Invoice com 3 itens, desconto percentual de 10%, taxa Texas 8.25%
      const itens: InvoiceItem[] = [
        { quantidade: 10, precoUnitario: 100, desconto: 0, taxavel: true }, // $1,000
        { quantidade: 5, precoUnitario: 20, desconto: 10, taxavel: true },  // $90
        { quantidade: 2, precoUnitario: 50, desconto: 0, taxavel: false },  // $100 (não taxável)
      ];

      const subtotal = calculateSubtotal(itens);
      expect(subtotal).toBe(1190);

      const discount = calculateDiscount(subtotal, 0, 10);
      expect(discount).toBe(119); // 10% de 1190

      const taxableAmount = calculateTaxableAmount(itens);
      expect(taxableAmount).toBe(1090); // 1000 + 90 (ignora não taxáveis)

      const taxAmount = calculateTaxAmount(taxableAmount, discount, 0.0825);
      expect(taxAmount).toBeCloseTo(80.1075, 2); // (1090 - 119) * 0.0825

      const total = calculateTotal(subtotal, discount, taxAmount);
      expect(total).toBeCloseTo(1151.1075, 2); // 1190 - 119 + 80.1075

      const balance = calculateBalance(total, 500);
      expect(balance).toBeCloseTo(651.1075, 2); // 1151.1075 - 500
    });

    it('deve calcular invoice com desconto em valor', () => {
      const itens: InvoiceItem[] = [
        { quantidade: 10, precoUnitario: 100, desconto: 0, taxavel: true },
      ];

      const subtotal = calculateSubtotal(itens);
      expect(subtotal).toBe(1000);

      const discount = calculateDiscount(subtotal, 50, 0);
      expect(discount).toBe(50);

      const taxableAmount = calculateTaxableAmount(itens);
      expect(taxableAmount).toBe(1000);

      const taxAmount = calculateTaxAmount(taxableAmount, discount, 0.0825);
      expect(taxAmount).toBe(78.375); // (1000 - 50) * 0.0825

      const total = calculateTotal(subtotal, discount, taxAmount);
      expect(total).toBe(1028.375); // 1000 - 50 + 78.375
    });

    it('deve calcular invoice sem itens taxáveis', () => {
      const itens: InvoiceItem[] = [
        { quantidade: 10, precoUnitario: 100, desconto: 0, taxavel: false },
      ];

      const subtotal = calculateSubtotal(itens);
      expect(subtotal).toBe(1000);

      const discount = calculateDiscount(subtotal, 0, 0);
      expect(discount).toBe(0);

      const taxableAmount = calculateTaxableAmount(itens);
      expect(taxableAmount).toBe(0);

      const taxAmount = calculateTaxAmount(taxableAmount, discount, 0.0825);
      expect(taxAmount).toBe(0);

      const total = calculateTotal(subtotal, discount, taxAmount);
      expect(total).toBe(1000);
    });
  });
});
