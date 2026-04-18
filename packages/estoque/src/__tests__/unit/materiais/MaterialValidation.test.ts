// GladPros-Estoque/src/__tests__/unit/materiais/MaterialValidation.test.ts

import { describe, it, expect } from 'vitest';

// Schema de validação Zod (a ser implementado)
interface MaterialData {
  codigo: string;
  nome: string;
  quantidade: number;
  preco: number;
  unidade: string;
  fabricante?: string;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function validateMaterial(data: Partial<MaterialData>): ValidationResult {
  const errors: string[] = [];

  // Código obrigatório
  if (!data.codigo || data.codigo.trim() === '') {
    errors.push('Código é obrigatório');
  }

  // Nome obrigatório
  if (!data.nome || data.nome.trim() === '') {
    errors.push('Nome é obrigatório');
  }

  // Quantidade deve ser positiva
  if (data.quantidade !== undefined && data.quantidade < 0) {
    errors.push('Quantidade deve ser maior ou igual a zero');
  }

  // Preço deve ser positivo
  if (data.preco !== undefined && data.preco < 0) {
    errors.push('Preço deve ser maior ou igual a zero');
  }

  // Unidade obrigatória
  if (!data.unidade || data.unidade.trim() === '') {
    errors.push('Unidade é obrigatória');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

describe('Material Validation', () => {
  describe('Required Fields', () => {
    it('should require codigo', () => {
      const result = validateMaterial({
        nome: 'Parafuso M8',
        quantidade: 100,
        preco: 0.50,
        unidade: 'UN',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Código é obrigatório');
    });

    it('should require nome', () => {
      const result = validateMaterial({
        codigo: 'MAT-001',
        quantidade: 100,
        preco: 0.50,
        unidade: 'UN',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Nome é obrigatório');
    });

    it('should require unidade', () => {
      const result = validateMaterial({
        codigo: 'MAT-001',
        nome: 'Parafuso M8',
        quantidade: 100,
        preco: 0.50,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Unidade é obrigatória');
    });
  });

  describe('Numeric Validations', () => {
    it('should reject negative quantidade', () => {
      const result = validateMaterial({
        codigo: 'MAT-001',
        nome: 'Parafuso M8',
        quantidade: -5,
        preco: 0.50,
        unidade: 'UN',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Quantidade deve ser maior ou igual a zero');
    });

    it('should reject negative preco', () => {
      const result = validateMaterial({
        codigo: 'MAT-001',
        nome: 'Parafuso M8',
        quantidade: 100,
        preco: -0.50,
        unidade: 'UN',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Preço deve ser maior ou igual a zero');
    });

    it('should accept zero quantidade', () => {
      const result = validateMaterial({
        codigo: 'MAT-001',
        nome: 'Parafuso M8',
        quantidade: 0,
        preco: 0.50,
        unidade: 'UN',
      });

      expect(result.valid).toBe(true);
    });

    it('should accept zero preco', () => {
      const result = validateMaterial({
        codigo: 'MAT-001',
        nome: 'Parafuso M8',
        quantidade: 100,
        preco: 0,
        unidade: 'UN',
      });

      expect(result.valid).toBe(true);
    });
  });

  describe('Valid Material', () => {
    it('should validate complete material data', () => {
      const result = validateMaterial({
        codigo: 'MAT-001',
        nome: 'Parafuso M8',
        quantidade: 100,
        preco: 0.50,
        unidade: 'UN',
        fabricante: 'Fabricante A',
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate material without optional fabricante', () => {
      const result = validateMaterial({
        codigo: 'MAT-001',
        nome: 'Parafuso M8',
        quantidade: 100,
        preco: 0.50,
        unidade: 'UN',
      });

      expect(result.valid).toBe(true);
    });
  });

  describe('Multiple Errors', () => {
    it('should return all validation errors', () => {
      const result = validateMaterial({
        quantidade: -5,
        preco: -0.50,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(5); // codigo, nome, unidade, quantidade negativa, preco negativo
      expect(result.errors).toContain('Código é obrigatório');
      expect(result.errors).toContain('Nome é obrigatório');
      expect(result.errors).toContain('Unidade é obrigatória');
      expect(result.errors).toContain('Quantidade deve ser maior ou igual a zero');
      expect(result.errors).toContain('Preço deve ser maior ou igual a zero');
    });
  });
});
