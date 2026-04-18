// GladPros-Financeiro/src/__tests__/calculations/taxCalculations.test.ts

import { describe, it, expect } from 'vitest';

// Constantes Texas
const TEXAS_STATE_TAX = 0.0625; // 6.25%
const DALLAS_LOCAL_TAX = 0.02;   // 2.00%
const TOTAL_TAX_RATE = 0.0825;   // 8.25%

// Funções a serem implementadas (TDD - Test Driven Development)
function calculateTexasSalesTax(amount: number): number {
  return Math.round(amount * TOTAL_TAX_RATE * 100) / 100;
}

function calculateNetAmount(grossAmount: number, taxInclusive: boolean): number {
  if (taxInclusive) {
    return Math.round((grossAmount / (1 + TOTAL_TAX_RATE)) * 100) / 100;
  }
  return grossAmount;
}

interface TaxBreakdown {
  stateTax: number;
  localTax: number;
  totalTax: number;
  subtotal: number;
  total: number;
}

function calculateTaxBreakdown(amount: number): TaxBreakdown {
  const stateTax = Math.round(amount * TEXAS_STATE_TAX * 100) / 100;
  const localTax = Math.round(amount * DALLAS_LOCAL_TAX * 100) / 100;
  const totalTax = Math.round((stateTax + localTax) * 100) / 100;
  
  return {
    stateTax,
    localTax,
    totalTax,
    subtotal: amount,
    total: Math.round((amount + totalTax) * 100) / 100,
  };
}

describe('Texas Sales Tax Calculations', () => {
  describe('calculateTexasSalesTax', () => {
    it('should calculate correct tax for $100', () => {
      const amount = 100.00;
      const tax = calculateTexasSalesTax(amount);
      
      expect(tax).toBe(8.25);
    });

    it('should calculate correct tax for $1,234.56', () => {
      const amount = 1234.56;
      const tax = calculateTexasSalesTax(amount);
      
      // 1234.56 × 0.0825 = 101.85
      expect(tax).toBeCloseTo(101.85, 2);
    });

    it('should handle zero amount', () => {
      const amount = 0;
      const tax = calculateTexasSalesTax(amount);
      
      expect(tax).toBe(0);
    });

    it('should handle negative amount (refund)', () => {
      const amount = -100.00;
      const tax = calculateTexasSalesTax(amount);
      
      expect(tax).toBe(-8.25);
    });

    it('should round to 2 decimal places', () => {
      const amount = 33.33;
      const tax = calculateTexasSalesTax(amount);
      
      // 33.33 × 0.0825 = 2.749725 → 2.75
      expect(tax).toBe(2.75);
    });
  });

  describe('calculateNetAmount', () => {
    it('should calculate net amount from gross (tax inclusive)', () => {
      const grossAmount = 108.25; // $100 + $8.25 tax
      const netAmount = calculateNetAmount(grossAmount, true);
      
      // grossAmount / (1 + taxRate)
      // 108.25 / 1.0825 = 100.00
      expect(netAmount).toBeCloseTo(100.00, 2);
    });

    it('should return same amount for tax exclusive', () => {
      const amount = 100.00;
      const netAmount = calculateNetAmount(amount, false);
      
      expect(netAmount).toBe(100.00);
    });
  });

  describe('calculateTaxBreakdown', () => {
    it('should breakdown tax into state and local', () => {
      const amount = 100.00;
      const breakdown = calculateTaxBreakdown(amount);
      
      expect(breakdown).toEqual({
        stateTax: 6.25,   // 6.25%
        localTax: 2.00,   // 2.00%
        totalTax: 8.25,   // 8.25%
        subtotal: 100.00,
        total: 108.25,
      });
    });

    it('should handle large amounts', () => {
      const amount = 10000.00;
      const breakdown = calculateTaxBreakdown(amount);
      
      expect(breakdown).toEqual({
        stateTax: 625.00,
        localTax: 200.00,
        totalTax: 825.00,
        subtotal: 10000.00,
        total: 10825.00,
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle very small amounts', () => {
      const amount = 0.01;
      const tax = calculateTexasSalesTax(amount);
      
      // 0.01 × 0.0825 = 0.000825 → 0.00
      expect(tax).toBe(0.00);
    });

    it('should handle amounts that round', () => {
      const amount = 60.61;
      const tax = calculateTexasSalesTax(amount);
      
      // 60.61 × 0.0825 = 5.00
      expect(tax).toBe(5.00);
    });
  });

  describe('GAAP Compliance', () => {
    it('should separate tax from revenue', () => {
      const grossSale = 108.25;
      const netSale = calculateNetAmount(grossSale, true);
      const breakdown = calculateTaxBreakdown(netSale);
      
      // Revenue (Account 4000): $100.00
      // Tax Payable (Account 2100): $8.25
      expect(breakdown.subtotal).toBeCloseTo(100.00, 2);
      expect(breakdown.totalTax).toBeCloseTo(8.25, 2);
    });

    it('should calculate tax liability correctly', () => {
      const sales = [100, 200, 300]; // $600 total
      const totalTax = sales.reduce((sum, sale) => sum + calculateTexasSalesTax(sale), 0);
      
      // Total tax liability: $600 × 8.25% = $49.50
      expect(totalTax).toBeCloseTo(49.50, 2);
    });
  });
});
