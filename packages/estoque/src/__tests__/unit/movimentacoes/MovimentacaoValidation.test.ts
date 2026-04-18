import { describe, it, expect } from 'vitest';

// Interface para Movimentação
interface Movimentacao {
  id?: number;
  tipo: 'ENTRADA' | 'SAIDA' | 'TRANSFERENCIA' | 'AJUSTE';
  materialId?: number;
  equipamentoId?: number;
  quantidade: number;
  dataMovimentacao: Date;
  origem?: string;
  destino?: string;
  responsavel: string;
  documento?: string;
  valorUnitario?: number;
  observacoes?: string;
  projetoId?: number;
  motivoAjuste?: string;
}

// Função de validação inline para TDD
function validateMovimentacao(mov: Partial<Movimentacao>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Campos obrigatórios
  if (!mov.tipo) {
    errors.push('Tipo é obrigatório');
  }
  if (mov.quantidade === undefined || mov.quantidade === null) {
    errors.push('Quantidade é obrigatória');
  }
  if (!mov.dataMovimentacao) {
    errors.push('Data de movimentação é obrigatória');
  }
  if (!mov.responsavel || mov.responsavel.trim() === '') {
    errors.push('Responsável é obrigatório');
  }

  // Deve ter materialId OU equipamentoId
  if (!mov.materialId && !mov.equipamentoId) {
    errors.push('Material ou Equipamento é obrigatório');
  }

  // Não pode ter ambos
  if (mov.materialId && mov.equipamentoId) {
    errors.push('Não pode ter Material e Equipamento simultaneamente');
  }

  // Validações numéricas
  if (mov.quantidade !== undefined && mov.quantidade <= 0) {
    errors.push('Quantidade deve ser maior que zero');
  }
  if (mov.valorUnitario !== undefined && mov.valorUnitario < 0) {
    errors.push('Valor unitário não pode ser negativo');
  }

  // Validações específicas por tipo
  if (mov.tipo === 'TRANSFERENCIA') {
    if (!mov.origem || mov.origem.trim() === '') {
      errors.push('Origem é obrigatória para transferência');
    }
    if (!mov.destino || mov.destino.trim() === '') {
      errors.push('Destino é obrigatório para transferência');
    }
    if (mov.origem && mov.destino && mov.origem === mov.destino) {
      errors.push('Origem e destino devem ser diferentes');
    }
  }

  if (mov.tipo === 'AJUSTE') {
    if (!mov.motivoAjuste || mov.motivoAjuste.trim() === '') {
      errors.push('Motivo do ajuste é obrigatório');
    }
  }

  if (mov.tipo === 'ENTRADA') {
    if (!mov.origem || mov.origem.trim() === '') {
      errors.push('Origem é obrigatória para entrada');
    }
  }

  if (mov.tipo === 'SAIDA') {
    if (!mov.destino || mov.destino.trim() === '') {
      errors.push('Destino é obrigatório para saída');
    }
  }

  // Data não pode ser futura
  if (mov.dataMovimentacao && mov.dataMovimentacao > new Date()) {
    errors.push('Data de movimentação não pode ser futura');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

describe('MovimentacaoValidation', () => {
  describe('Campos obrigatórios', () => {
    it('deve validar movimentação de entrada completa', () => {
      const movimentacao: Movimentacao = {
        tipo: 'ENTRADA',
        materialId: 1,
        quantidade: 100,
        dataMovimentacao: new Date('2024-10-15'),
        origem: 'Fornecedor ABC',
        responsavel: 'João Silva',
        documento: 'NF-12345'
      };

      const result = validateMovimentacao(movimentacao);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('deve exigir tipo', () => {
      const movimentacao = {
        materialId: 1,
        quantidade: 100,
        dataMovimentacao: new Date('2024-10-15'),
        responsavel: 'João Silva'
      };

      const result = validateMovimentacao(movimentacao);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Tipo é obrigatório');
    });

    it('deve exigir quantidade', () => {
      const movimentacao = {
        tipo: 'ENTRADA' as const,
        materialId: 1,
        dataMovimentacao: new Date('2024-10-15'),
        origem: 'Fornecedor ABC',
        responsavel: 'João Silva'
      };

      const result = validateMovimentacao(movimentacao);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Quantidade é obrigatória');
    });

    it('deve exigir data de movimentação', () => {
      const movimentacao = {
        tipo: 'ENTRADA' as const,
        materialId: 1,
        quantidade: 100,
        origem: 'Fornecedor ABC',
        responsavel: 'João Silva'
      };

      const result = validateMovimentacao(movimentacao);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Data de movimentação é obrigatória');
    });

    it('deve exigir responsável', () => {
      const movimentacao = {
        tipo: 'ENTRADA' as const,
        materialId: 1,
        quantidade: 100,
        dataMovimentacao: new Date('2024-10-15'),
        origem: 'Fornecedor ABC'
      };

      const result = validateMovimentacao(movimentacao);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Responsável é obrigatório');
    });

    it('deve exigir material ou equipamento', () => {
      const movimentacao = {
        tipo: 'ENTRADA' as const,
        quantidade: 100,
        dataMovimentacao: new Date('2024-10-15'),
        origem: 'Fornecedor ABC',
        responsavel: 'João Silva'
      };

      const result = validateMovimentacao(movimentacao);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Material ou Equipamento é obrigatório');
    });

    it('não deve permitir material e equipamento simultaneamente', () => {
      const movimentacao = {
        tipo: 'ENTRADA' as const,
        materialId: 1,
        equipamentoId: 1,
        quantidade: 100,
        dataMovimentacao: new Date('2024-10-15'),
        origem: 'Fornecedor ABC',
        responsavel: 'João Silva'
      };

      const result = validateMovimentacao(movimentacao);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Não pode ter Material e Equipamento simultaneamente');
    });
  });

  describe('Validações numéricas', () => {
    it('deve rejeitar quantidade zero', () => {
      const movimentacao = {
        tipo: 'ENTRADA' as const,
        materialId: 1,
        quantidade: 0,
        dataMovimentacao: new Date('2024-10-15'),
        origem: 'Fornecedor ABC',
        responsavel: 'João Silva'
      };

      const result = validateMovimentacao(movimentacao);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Quantidade deve ser maior que zero');
    });

    it('deve rejeitar quantidade negativa', () => {
      const movimentacao = {
        tipo: 'ENTRADA' as const,
        materialId: 1,
        quantidade: -10,
        dataMovimentacao: new Date('2024-10-15'),
        origem: 'Fornecedor ABC',
        responsavel: 'João Silva'
      };

      const result = validateMovimentacao(movimentacao);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Quantidade deve ser maior que zero');
    });

    it('deve rejeitar valor unitário negativo', () => {
      const movimentacao = {
        tipo: 'ENTRADA' as const,
        materialId: 1,
        quantidade: 100,
        valorUnitario: -5.50,
        dataMovimentacao: new Date('2024-10-15'),
        origem: 'Fornecedor ABC',
        responsavel: 'João Silva'
      };

      const result = validateMovimentacao(movimentacao);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Valor unitário não pode ser negativo');
    });

    it('deve aceitar valor unitário zero', () => {
      const movimentacao = {
        tipo: 'ENTRADA' as const,
        materialId: 1,
        quantidade: 100,
        valorUnitario: 0,
        dataMovimentacao: new Date('2024-10-15'),
        origem: 'Fornecedor ABC',
        responsavel: 'João Silva'
      };

      const result = validateMovimentacao(movimentacao);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Validações de ENTRADA', () => {
    it('deve exigir origem para entrada', () => {
      const movimentacao = {
        tipo: 'ENTRADA' as const,
        materialId: 1,
        quantidade: 100,
        dataMovimentacao: new Date('2024-10-15'),
        responsavel: 'João Silva'
      };

      const result = validateMovimentacao(movimentacao);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Origem é obrigatória para entrada');
    });

    it('deve validar entrada completa com equipamento', () => {
      const movimentacao: Movimentacao = {
        tipo: 'ENTRADA',
        equipamentoId: 5,
        quantidade: 1,
        dataMovimentacao: new Date('2024-10-15'),
        origem: 'Compra Direta',
        responsavel: 'Maria Santos',
        documento: 'NF-54321',
        valorUnitario: 3500.00
      };

      const result = validateMovimentacao(movimentacao);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Validações de SAIDA', () => {
    it('deve exigir destino para saída', () => {
      const movimentacao = {
        tipo: 'SAIDA' as const,
        materialId: 1,
        quantidade: 50,
        dataMovimentacao: new Date('2024-10-15'),
        responsavel: 'João Silva'
      };

      const result = validateMovimentacao(movimentacao);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Destino é obrigatório para saída');
    });

    it('deve validar saída completa', () => {
      const movimentacao: Movimentacao = {
        tipo: 'SAIDA',
        materialId: 1,
        quantidade: 50,
        dataMovimentacao: new Date('2024-10-15'),
        destino: 'Obra Centro - Fase 2',
        responsavel: 'Pedro Oliveira',
        projetoId: 10
      };

      const result = validateMovimentacao(movimentacao);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Validações de TRANSFERENCIA', () => {
    it('deve exigir origem para transferência', () => {
      const movimentacao = {
        tipo: 'TRANSFERENCIA' as const,
        materialId: 1,
        quantidade: 25,
        dataMovimentacao: new Date('2024-10-15'),
        destino: 'Galpão B',
        responsavel: 'Ana Costa'
      };

      const result = validateMovimentacao(movimentacao);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Origem é obrigatória para transferência');
    });

    it('deve exigir destino para transferência', () => {
      const movimentacao = {
        tipo: 'TRANSFERENCIA' as const,
        materialId: 1,
        quantidade: 25,
        dataMovimentacao: new Date('2024-10-15'),
        origem: 'Galpão A',
        responsavel: 'Ana Costa'
      };

      const result = validateMovimentacao(movimentacao);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Destino é obrigatório para transferência');
    });

    it('deve rejeitar origem e destino iguais', () => {
      const movimentacao = {
        tipo: 'TRANSFERENCIA' as const,
        materialId: 1,
        quantidade: 25,
        dataMovimentacao: new Date('2024-10-15'),
        origem: 'Galpão A',
        destino: 'Galpão A',
        responsavel: 'Ana Costa'
      };

      const result = validateMovimentacao(movimentacao);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Origem e destino devem ser diferentes');
    });

    it('deve validar transferência completa', () => {
      const movimentacao: Movimentacao = {
        tipo: 'TRANSFERENCIA',
        materialId: 1,
        quantidade: 25,
        dataMovimentacao: new Date('2024-10-15'),
        origem: 'Galpão A - Setor 1',
        destino: 'Galpão B - Setor 3',
        responsavel: 'Carlos Ferreira'
      };

      const result = validateMovimentacao(movimentacao);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Validações de AJUSTE', () => {
    it('deve exigir motivo do ajuste', () => {
      const movimentacao = {
        tipo: 'AJUSTE' as const,
        materialId: 1,
        quantidade: 5,
        dataMovimentacao: new Date('2024-10-15'),
        responsavel: 'João Silva'
      };

      const result = validateMovimentacao(movimentacao);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Motivo do ajuste é obrigatório');
    });

    it('deve validar ajuste completo', () => {
      const movimentacao: Movimentacao = {
        tipo: 'AJUSTE',
        materialId: 1,
        quantidade: 5,
        dataMovimentacao: new Date('2024-10-15'),
        responsavel: 'Supervisor',
        motivoAjuste: 'Correção de inventário - contagem física'
      };

      const result = validateMovimentacao(movimentacao);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Validações de data', () => {
    it('deve rejeitar data futura', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      const movimentacao = {
        tipo: 'ENTRADA' as const,
        materialId: 1,
        quantidade: 100,
        dataMovimentacao: futureDate,
        origem: 'Fornecedor ABC',
        responsavel: 'João Silva'
      };

      const result = validateMovimentacao(movimentacao);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Data de movimentação não pode ser futura');
    });

    it('deve aceitar data de hoje', () => {
      const movimentacao = {
        tipo: 'ENTRADA' as const,
        materialId: 1,
        quantidade: 100,
        dataMovimentacao: new Date(),
        origem: 'Fornecedor ABC',
        responsavel: 'João Silva'
      };

      const result = validateMovimentacao(movimentacao);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('deve aceitar data passada', () => {
      const movimentacao = {
        tipo: 'ENTRADA' as const,
        materialId: 1,
        quantidade: 100,
        dataMovimentacao: new Date('2024-01-15'),
        origem: 'Fornecedor ABC',
        responsavel: 'João Silva'
      };

      const result = validateMovimentacao(movimentacao);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Múltiplos erros', () => {
    it('deve detectar múltiplos erros simultaneamente', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      const movimentacao = {
        tipo: 'TRANSFERENCIA' as const,
        quantidade: -10,
        dataMovimentacao: futureDate,
        valorUnitario: -5.50,
        origem: '',
        destino: '',
        responsavel: ''
      };

      const result = validateMovimentacao(movimentacao);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(7);
      expect(result.errors).toContain('Quantidade deve ser maior que zero');
      expect(result.errors).toContain('Responsável é obrigatório');
      expect(result.errors).toContain('Material ou Equipamento é obrigatório');
      expect(result.errors).toContain('Valor unitário não pode ser negativo');
      expect(result.errors).toContain('Origem é obrigatória para transferência');
      expect(result.errors).toContain('Destino é obrigatório para transferência');
      expect(result.errors).toContain('Data de movimentação não pode ser futura');
    });
  });
});
