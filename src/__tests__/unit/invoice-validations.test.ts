/**
 * Unit Tests - Invoice Validations
 * 
 * Testa os schemas Zod de validação de invoices
 */

import { describe, it, expect } from '@jest/globals';
import { z } from 'zod';

// Schema de validação para criar Invoice (copiado da API)
const createInvoiceSchema = z.object({
  clienteId: z.number().int().positive(),
  projetoId: z.number().int().positive().optional(),
  dataVencimento: z.string().datetime(),
  notas: z.string().optional(),
  termos: z.string().optional(),
  itens: z.array(
    z.object({
      tipo: z.enum(['SERVICE', 'MATERIAL', 'EQUIPMENT', 'OTHER']),
      descricao: z.string().min(1).max(500),
      quantidade: z.number().positive(),
      unidade: z.string().min(1).max(50),
      precoUnitario: z.number().positive(),
      desconto: z.number().min(0).default(0),
      taxavel: z.boolean().default(true),
      propostaEtapaId: z.number().int().positive().optional(),
      materialId: z.number().int().positive().optional(),
      ordem: z.number().int().min(0).default(0),
    })
  ).min(1),
  taxRateId: z.number().int().positive().optional(),
  descontoValor: z.number().min(0).default(0),
  descontoPercentual: z.number().min(0).max(100).default(0),
});

// Schema para atualizar Invoice
const updateInvoiceSchema = z.object({
  dataVencimento: z.string().datetime().optional(),
  notas: z.string().optional(),
  termos: z.string().optional(),
  status: z.enum(['DRAFT', 'SENT', 'VIEWED', 'PARTIAL_PAID', 'PAID', 'OVERDUE', 'CANCELLED']).optional(),
});

// Schema para criar pagamento
const createPaymentSchema = z.object({
  valor: z.number().positive(),
  dataPagamento: z.string().datetime(),
  metodoPagamento: z.enum(['BANK_TRANSFER', 'CHECK', 'CARD', 'CASH', 'STRIPE', 'SQUARE', 'OTHER']),
  bankAccountId: z.number().int().positive().optional(),
  referencia: z.string().max(100).optional(),
  notas: z.string().optional(),
  gatewayId: z.string().max(100).optional(),
  gatewayTransactionId: z.string().max(255).optional(),
});

describe('Invoice Validation Schemas', () => {
  describe('createInvoiceSchema', () => {
    it('deve aceitar dados válidos', () => {
      const validData = {
        clienteId: 1,
        projetoId: 1,
        dataVencimento: new Date().toISOString(),
        notas: 'Test notes',
        termos: 'Test terms',
        itens: [
          {
            tipo: 'SERVICE' as const,
            descricao: 'Labor work',
            quantidade: 10,
            unidade: 'hour',
            precoUnitario: 100,
            desconto: 0,
            taxavel: true,
            ordem: 0,
          },
        ],
        descontoValor: 0,
        descontoPercentual: 0,
      };

      const result = createInvoiceSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar clienteId inválido', () => {
      const invalidData = {
        clienteId: -1, // Negativo
        dataVencimento: new Date().toISOString(),
        itens: [
          {
            tipo: 'SERVICE' as const,
            descricao: 'Labor work',
            quantidade: 10,
            unidade: 'hour',
            precoUnitario: 100,
            desconto: 0,
            taxavel: true,
            ordem: 0,
          },
        ],
      };

      const result = createInvoiceSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('deve rejeitar data de vencimento inválida', () => {
      const invalidData = {
        clienteId: 1,
        dataVencimento: '2025-13-45', // Data inválida
        itens: [
          {
            tipo: 'SERVICE' as const,
            descricao: 'Labor work',
            quantidade: 10,
            unidade: 'hour',
            precoUnitario: 100,
            desconto: 0,
            taxavel: true,
            ordem: 0,
          },
        ],
      };

      const result = createInvoiceSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('deve rejeitar itens vazios', () => {
      const invalidData = {
        clienteId: 1,
        dataVencimento: new Date().toISOString(),
        itens: [], // Array vazio
      };

      const result = createInvoiceSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('deve rejeitar item com descrição muito longa', () => {
      const invalidData = {
        clienteId: 1,
        dataVencimento: new Date().toISOString(),
        itens: [
          {
            tipo: 'SERVICE' as const,
            descricao: 'A'.repeat(501), // Mais de 500 caracteres
            quantidade: 10,
            unidade: 'hour',
            precoUnitario: 100,
            desconto: 0,
            taxavel: true,
            ordem: 0,
          },
        ],
      };

      const result = createInvoiceSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('deve rejeitar quantidade negativa', () => {
      const invalidData = {
        clienteId: 1,
        dataVencimento: new Date().toISOString(),
        itens: [
          {
            tipo: 'SERVICE' as const,
            descricao: 'Labor work',
            quantidade: -5, // Negativo
            unidade: 'hour',
            precoUnitario: 100,
            desconto: 0,
            taxavel: true,
            ordem: 0,
          },
        ],
      };

      const result = createInvoiceSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('deve rejeitar desconto percentual maior que 100', () => {
      const invalidData = {
        clienteId: 1,
        dataVencimento: new Date().toISOString(),
        itens: [
          {
            tipo: 'SERVICE' as const,
            descricao: 'Labor work',
            quantidade: 10,
            unidade: 'hour',
            precoUnitario: 100,
            desconto: 0,
            taxavel: true,
            ordem: 0,
          },
        ],
        descontoPercentual: 150, // Maior que 100
      };

      const result = createInvoiceSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('deve aceitar múltiplos itens', () => {
      const validData = {
        clienteId: 1,
        dataVencimento: new Date().toISOString(),
        itens: [
          {
            tipo: 'SERVICE' as const,
            descricao: 'Labor work',
            quantidade: 10,
            unidade: 'hour',
            precoUnitario: 100,
            desconto: 0,
            taxavel: true,
            ordem: 0,
          },
          {
            tipo: 'MATERIAL' as const,
            descricao: 'Wood planks',
            quantidade: 50,
            unidade: 'unit',
            precoUnitario: 20,
            desconto: 50,
            taxavel: true,
            ordem: 1,
          },
        ],
      };

      const result = createInvoiceSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('updateInvoiceSchema', () => {
    it('deve aceitar status válido', () => {
      const validData = {
        status: 'SENT' as const,
      };

      const result = updateInvoiceSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar status inválido', () => {
      const invalidData = {
        status: 'INVALID_STATUS',
      };

      const result = updateInvoiceSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('deve aceitar atualização parcial', () => {
      const validData = {
        notas: 'Updated notes',
      };

      const result = updateInvoiceSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('deve aceitar objeto vazio', () => {
      const validData = {};

      const result = updateInvoiceSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('createPaymentSchema', () => {
    it('deve aceitar pagamento válido', () => {
      const validData = {
        valor: 500.50,
        dataPagamento: new Date().toISOString(),
        metodoPagamento: 'BANK_TRANSFER' as const,
        referencia: 'TRX-12345',
        notas: 'Payment received',
      };

      const result = createPaymentSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar valor negativo', () => {
      const invalidData = {
        valor: -100,
        dataPagamento: new Date().toISOString(),
        metodoPagamento: 'BANK_TRANSFER' as const,
      };

      const result = createPaymentSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('deve rejeitar valor zero', () => {
      const invalidData = {
        valor: 0,
        dataPagamento: new Date().toISOString(),
        metodoPagamento: 'BANK_TRANSFER' as const,
      };

      const result = createPaymentSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('deve rejeitar método de pagamento inválido', () => {
      const invalidData = {
        valor: 500,
        dataPagamento: new Date().toISOString(),
        metodoPagamento: 'INVALID_METHOD',
      };

      const result = createPaymentSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('deve rejeitar referência muito longa', () => {
      const invalidData = {
        valor: 500,
        dataPagamento: new Date().toISOString(),
        metodoPagamento: 'BANK_TRANSFER' as const,
        referencia: 'A'.repeat(101), // Mais de 100 caracteres
      };

      const result = createPaymentSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('deve aceitar todos os métodos de pagamento válidos', () => {
      const methods = ['BANK_TRANSFER', 'CHECK', 'CARD', 'CASH', 'STRIPE', 'SQUARE', 'OTHER'] as const;

      methods.forEach((method) => {
        const validData = {
          valor: 500,
          dataPagamento: new Date().toISOString(),
          metodoPagamento: method,
        };

        const result = createPaymentSchema.safeParse(validData);
        expect(result.success).toBe(true);
      });
    });
  });
});
