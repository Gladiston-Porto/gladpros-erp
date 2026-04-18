/**
 * Tests for PasswordService
 * Covers: validation, hashing, verification, provisional password generation, strength meter
 */
import { PasswordService } from '@/shared/lib/password';

describe('PasswordService', () => {
  describe('validatePassword', () => {
    it('should reject passwords shorter than 9 characters', () => {
      const result = PasswordService.validatePassword('Ab1!xyz');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Senha deve ter no mínimo 9 caracteres');
    });

    it('should reject passwords without uppercase', () => {
      const result = PasswordService.validatePassword('abcdefgh1!');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('maiúscula'))).toBe(true);
    });

    it('should reject passwords without numbers', () => {
      const result = PasswordService.validatePassword('Abcdefgh!@');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('número'))).toBe(true);
    });

    it('should reject passwords without special characters', () => {
      const result = PasswordService.validatePassword('Abcdefgh12');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('símbolo'))).toBe(true);
    });

    it('should accept valid passwords meeting all criteria', () => {
      const result = PasswordService.validatePassword('MyStr0ng!Pass');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return multiple errors for very weak passwords', () => {
      const result = PasswordService.validatePassword('ab');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('hashPassword and verifyPassword', () => {
    it('should hash a password and verify it correctly', async () => {
      const password = 'TestPassword1!';
      const hash = await PasswordService.hashPassword(password);
      
      expect(hash).not.toBe(password);
      expect(hash.startsWith('$2')).toBe(true); // bcrypt prefix
      
      const isValid = await PasswordService.verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject wrong password verification', async () => {
      const hash = await PasswordService.hashPassword('Correct1!Pass');
      const isValid = await PasswordService.verifyPassword('Wrong1!Pass', hash);
      expect(isValid).toBe(false);
    });

    it('should produce different hashes for the same password (salt)', async () => {
      const password = 'Same1!Password';
      const hash1 = await PasswordService.hashPassword(password);
      const hash2 = await PasswordService.hashPassword(password);
      expect(hash1).not.toBe(hash2);
      // But both should verify
      expect(await PasswordService.verifyPassword(password, hash1)).toBe(true);
      expect(await PasswordService.verifyPassword(password, hash2)).toBe(true);
    });
  });

  describe('generateProvisionalPassword', () => {
    it('should generate password that passes validation', () => {
      // Run multiple times to account for randomness
      for (let i = 0; i < 20; i++) {
        const password = PasswordService.generateProvisionalPassword();
        const result = PasswordService.validatePassword(password);
        expect(result.valid).toBe(true);
      }
    });

    it('should generate passwords of at least 9 characters', () => {
      for (let i = 0; i < 10; i++) {
        const password = PasswordService.generateProvisionalPassword();
        expect(password.length).toBeGreaterThanOrEqual(9);
      }
    });

    it('should generate different passwords each time', () => {
      const passwords = new Set<string>();
      for (let i = 0; i < 20; i++) {
        passwords.add(PasswordService.generateProvisionalPassword());
      }
      // At least 15 unique out of 20 (extremely unlikely to have collisions)
      expect(passwords.size).toBeGreaterThanOrEqual(15);
    });
  });

  describe('getPasswordStrength', () => {
    it('should rate empty/very short password as very weak', () => {
      const result = PasswordService.getPasswordStrength('ab');
      expect(result.score).toBeLessThan(30);
      expect(result.label).toBe('Muito fraca');
    });

    it('should rate a strong password highly', () => {
      const result = PasswordService.getPasswordStrength('MyStr0ng!Password123');
      expect(result.score).toBeGreaterThanOrEqual(90);
      expect(result.label).toBe('Muito forte');
    });

    it('should return criteria met list', () => {
      const result = PasswordService.getPasswordStrength('MyStr0ng!');
      expect(result.criteriaMet).toContain('Mínimo 9 caracteres');
      expect(result.criteriaMet).toContain('Letra maiúscula');
      expect(result.criteriaMet).toContain('Número');
      expect(result.criteriaMet).toContain('Símbolo especial');
    });

    it('should give bonus for long passwords (12+)', () => {
      const short = PasswordService.getPasswordStrength('Abc1!defg');
      const long = PasswordService.getPasswordStrength('Abc1!defghijklm');
      expect(long.score).toBeGreaterThan(short.score);
    });
  });
});
