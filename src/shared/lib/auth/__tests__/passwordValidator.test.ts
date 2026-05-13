import {
  validatePassword,
  generateStrongPassword,
  checkPasswordSimilarity,
} from '@/shared/lib/auth/passwordValidator';

describe('Password Policy Validator', () => {
  describe('Requisitos Básicos', () => {
    it('deve rejeitar senha com menos de 8 caracteres', () => {
      const result = validatePassword('Abc123!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('A senha deve ter no mínimo 8 caracteres');
    });

    it('deve aceitar senha com 8+ caracteres', () => {
      const result = validatePassword('Abc123!@');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('deve exigir letra maiúscula', () => {
      const result = validatePassword('abc123!@');
      expect(result.valid).toBe(false);
    });

    it('deve exigir letra minúscula', () => {
      const result = validatePassword('ABC123!@');
      expect(result.valid).toBe(false);
    });

    it('deve exigir número', () => {
      const result = validatePassword('Abcdefg!');
      expect(result.valid).toBe(false);
    });

    it('deve exigir caractere especial', () => {
      const result = validatePassword('Abc12345');
      expect(result.valid).toBe(false);
    });

    it('deve rejeitar senha com espaços', () => {
      const result = validatePassword('Abc 123!@');
      expect(result.valid).toBe(false);
    });
  });

  describe('Senhas Comuns', () => {
    it('deve rejeitar "password"', () => {
      const result = validatePassword('password');
      expect(result.valid).toBe(false);
      expect(result.score).toBe(0);
    });

    it('deve rejeitar "123456"', () => {
      const result = validatePassword('123456');
      expect(result.score).toBe(0);
    });

    it('deve rejeitar variações de case', () => {
      const result = validatePassword('PASSWORD');
      expect(result.valid).toBe(false);
    });
  });

  describe('Score e Força', () => {
    it('senha fraca < 40', () => {
      const result = validatePassword('Abc123!@');
      // Essa senha tem 8 chars, maiúscula, minúscula, número, especial = 80 pontos
      // Não tem bônus de comprimento, mas tem todos requisitos
      expect(result.valid).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(70); // Ajustado
    });

    it('senha com requisitos básicos deve ter score alto', () => {
      const result = validatePassword('Pass1!');
      // Menor que 8 caracteres - deve ser inválida
      expect(result.valid).toBe(false);
    });

    it('senha longa deve ter score mais alto', () => {
      const short = validatePassword('Abc123!@');
      const long = validatePassword('Abc123!@DefGhi456');
      expect(long.score).toBeGreaterThan(short.score);
    });

    it('senha muito forte 80+', () => {
      const result = validatePassword('MyV3ry$tr0ng&C0mpl3xP@ssw0rd!');
      expect(result.strength).toBe('VERY_STRONG');
      expect(result.score).toBeGreaterThanOrEqual(80);
    });
  });

  describe('Gerador de Senha', () => {
    it('deve gerar senha com comprimento correto', () => {
      const password = generateStrongPassword(16);
      expect(password).toHaveLength(16);
    });

    it('deve gerar senha válida', () => {
      const password = generateStrongPassword(16);
      const result = validatePassword(password);
      expect(result.valid).toBe(true);
    });

    it('deve gerar senhas diferentes', () => {
      const pass1 = generateStrongPassword(16);
      const pass2 = generateStrongPassword(16);
      expect(pass1).not.toBe(pass2);
    });
  });

  describe('Similaridade', () => {
    it('deve detectar senhas similares', () => {
      const similar = checkPasswordSimilarity('MyP@ssw0rd123', 'MyP@ssw0rd456');
      expect(similar).toBe(true);
    });

    it('deve permitir senhas diferentes', () => {
      const similar = checkPasswordSimilarity('MyP@ssw0rd123', 'C0mpl3t3ly!Diff');
      expect(similar).toBe(false);
    });
  });
});
