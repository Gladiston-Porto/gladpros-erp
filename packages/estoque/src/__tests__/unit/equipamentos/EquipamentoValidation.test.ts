import { describe, it, expect } from 'vitest';

// Interface para Equipamento
interface Equipamento {
  id?: number;
  nome: string;
  tipo: 'BETONEIRA' | 'ANDAIME' | 'COMPRESSOR' | 'GERADOR' | 'SERRA' | 'FURADEIRA' | 'OUTRO';
  modelo?: string;
  fabricante?: string;
  numeroSerie?: string;
  dataAquisicao: Date;
  valorCompra: number;
  valorDiaria?: number;
  status: 'DISPONIVEL' | 'EM_USO' | 'MANUTENCAO' | 'INATIVO';
  localizacao?: string;
  ultimaRevisao?: Date;
  proximaRevisao?: Date;
  observacoes?: string;
}

// Função de validação inline para TDD
function validateEquipamento(equipamento: Partial<Equipamento>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Campos obrigatórios
  if (!equipamento.nome || equipamento.nome.trim() === '') {
    errors.push('Nome é obrigatório');
  }
  if (!equipamento.tipo) {
    errors.push('Tipo é obrigatório');
  }
  if (!equipamento.dataAquisicao) {
    errors.push('Data de aquisição é obrigatória');
  }
  if (equipamento.valorCompra === undefined || equipamento.valorCompra === null) {
    errors.push('Valor de compra é obrigatório');
  }
  if (!equipamento.status) {
    errors.push('Status é obrigatório');
  }

  // Validações numéricas (negativo antes de zero para ordem consistente)
  if (equipamento.valorCompra !== undefined) {
    if (equipamento.valorCompra < 0) {
      errors.push('Valor de compra não pode ser negativo');
    } else if (equipamento.valorCompra === 0) {
      errors.push('Valor de compra deve ser maior que zero');
    }
  }
  if (equipamento.valorDiaria !== undefined && equipamento.valorDiaria < 0) {
    errors.push('Valor da diária não pode ser negativo');
  }

  // Validações de datas
  if (equipamento.dataAquisicao && equipamento.dataAquisicao > new Date()) {
    errors.push('Data de aquisição não pode ser futura');
  }
  if (equipamento.ultimaRevisao && equipamento.proximaRevisao) {
    if (equipamento.proximaRevisao <= equipamento.ultimaRevisao) {
      errors.push('Próxima revisão deve ser posterior à última revisão');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

describe('EquipamentoValidation', () => {
  describe('Campos obrigatórios', () => {
    it('deve validar equipamento completo', () => {
      const equipamento: Equipamento = {
        nome: 'Betoneira Industrial',
        tipo: 'BETONEIRA',
        dataAquisicao: new Date('2024-01-15'),
        valorCompra: 3500.00,
        status: 'DISPONIVEL'
      };

      const result = validateEquipamento(equipamento);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('deve exigir nome', () => {
      const equipamento = {
        tipo: 'ANDAIME' as const,
        dataAquisicao: new Date('2024-01-15'),
        valorCompra: 1200.00,
        status: 'DISPONIVEL' as const
      };

      const result = validateEquipamento(equipamento);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Nome é obrigatório');
    });

    it('deve exigir tipo', () => {
      const equipamento = {
        nome: 'Andaime Tubular',
        dataAquisicao: new Date('2024-01-15'),
        valorCompra: 1200.00,
        status: 'DISPONIVEL' as const
      };

      const result = validateEquipamento(equipamento);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Tipo é obrigatório');
    });

    it('deve exigir data de aquisição', () => {
      const equipamento = {
        nome: 'Compressor',
        tipo: 'COMPRESSOR' as const,
        valorCompra: 2500.00,
        status: 'DISPONIVEL' as const
      };

      const result = validateEquipamento(equipamento);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Data de aquisição é obrigatória');
    });

    it('deve exigir valor de compra', () => {
      const equipamento = {
        nome: 'Gerador',
        tipo: 'GERADOR' as const,
        dataAquisicao: new Date('2024-01-15'),
        status: 'DISPONIVEL' as const
      };

      const result = validateEquipamento(equipamento);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Valor de compra é obrigatório');
    });

    it('deve exigir status', () => {
      const equipamento = {
        nome: 'Serra Circular',
        tipo: 'SERRA' as const,
        dataAquisicao: new Date('2024-01-15'),
        valorCompra: 850.00
      };

      const result = validateEquipamento(equipamento);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Status é obrigatório');
    });
  });

  describe('Validações numéricas', () => {
    it('deve rejeitar valor de compra negativo', () => {
      const equipamento = {
        nome: 'Furadeira',
        tipo: 'FURADEIRA' as const,
        dataAquisicao: new Date('2024-01-15'),
        valorCompra: -500.00,
        status: 'DISPONIVEL' as const
      };

      const result = validateEquipamento(equipamento);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Valor de compra não pode ser negativo');
    });

    it('deve rejeitar valor de compra zero', () => {
      const equipamento = {
        nome: 'Equipamento Teste',
        tipo: 'OUTRO' as const,
        dataAquisicao: new Date('2024-01-15'),
        valorCompra: 0,
        status: 'DISPONIVEL' as const
      };

      const result = validateEquipamento(equipamento);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Valor de compra deve ser maior que zero');
    });

    it('deve rejeitar valor de diária negativo', () => {
      const equipamento = {
        nome: 'Betoneira',
        tipo: 'BETONEIRA' as const,
        dataAquisicao: new Date('2024-01-15'),
        valorCompra: 3500.00,
        valorDiaria: -150.00,
        status: 'DISPONIVEL' as const
      };

      const result = validateEquipamento(equipamento);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Valor da diária não pode ser negativo');
    });

    it('deve aceitar valor de diária zero (equipamento não alugável)', () => {
      const equipamento = {
        nome: 'Betoneira Própria',
        tipo: 'BETONEIRA' as const,
        dataAquisicao: new Date('2024-01-15'),
        valorCompra: 3500.00,
        valorDiaria: 0,
        status: 'DISPONIVEL' as const
      };

      const result = validateEquipamento(equipamento);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Validações de datas', () => {
    it('deve rejeitar data de aquisição futura', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      const equipamento = {
        nome: 'Compressor',
        tipo: 'COMPRESSOR' as const,
        dataAquisicao: futureDate,
        valorCompra: 2500.00,
        status: 'DISPONIVEL' as const
      };

      const result = validateEquipamento(equipamento);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Data de aquisição não pode ser futura');
    });

    it('deve rejeitar próxima revisão anterior ou igual à última revisão', () => {
      const equipamento = {
        nome: 'Gerador',
        tipo: 'GERADOR' as const,
        dataAquisicao: new Date('2024-01-15'),
        valorCompra: 5000.00,
        status: 'DISPONIVEL' as const,
        ultimaRevisao: new Date('2024-10-01'),
        proximaRevisao: new Date('2024-09-01')
      };

      const result = validateEquipamento(equipamento);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Próxima revisão deve ser posterior à última revisão');
    });

    it('deve aceitar próxima revisão posterior à última revisão', () => {
      const equipamento = {
        nome: 'Gerador',
        tipo: 'GERADOR' as const,
        dataAquisicao: new Date('2024-01-15'),
        valorCompra: 5000.00,
        status: 'DISPONIVEL' as const,
        ultimaRevisao: new Date('2024-10-01'),
        proximaRevisao: new Date('2025-04-01')
      };

      const result = validateEquipamento(equipamento);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Múltiplos erros', () => {
    it('deve detectar múltiplos erros simultaneamente', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      const equipamento = {
        nome: '',
        dataAquisicao: futureDate,
        valorCompra: -1000.00,
        valorDiaria: -50.00
      };

      const result = validateEquipamento(equipamento);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(6);
      expect(result.errors).toContain('Nome é obrigatório');
      expect(result.errors).toContain('Tipo é obrigatório');
      expect(result.errors).toContain('Status é obrigatório');
      expect(result.errors).toContain('Valor de compra não pode ser negativo');
      expect(result.errors).toContain('Valor da diária não pode ser negativo');
      expect(result.errors).toContain('Data de aquisição não pode ser futura');
    });
  });
});
