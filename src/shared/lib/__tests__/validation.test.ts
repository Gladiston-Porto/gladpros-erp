/**
 * Tests for Validation schemas (auth-related)
 * Covers: loginSchema, forgotPasswordSchema, resetPasswordApiSchema, 
 *         firstAccessSetupApiSchema, unlockSchema, mfaResendSchema, userStatusSchema
 */
import {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordApiSchema,
  firstAccessSetupApiSchema,
  unlockSchema,
  mfaResendSchema,
  userStatusSchema,
} from '@/shared/lib/validation';

describe('Validation Schemas', () => {
  describe('loginSchema', () => {
    it('should accept valid email and password', () => {
      const result = loginSchema.safeParse({
        email: 'user@gladpros.com',
        password: 'MyPassword123!',
      });
      expect(result.success).toBe(true);
    });

    it('should reject missing email', () => {
      const result = loginSchema.safeParse({ password: 'test' });
      expect(result.success).toBe(false);
    });

    it('should reject invalid email format', () => {
      const result = loginSchema.safeParse({
        email: 'not-an-email',
        password: 'test',
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing password', () => {
      const result = loginSchema.safeParse({
        email: 'user@gladpros.com',
      });
      expect(result.success).toBe(false);
    });

    it('should trim and lowercase email', () => {
      const result = loginSchema.safeParse({
        email: '  User@GladPros.COM  ',
        password: 'test',
      });
      if (result.success) {
        expect(result.data.email).toBe('user@gladpros.com');
      }
    });
  });

  describe('forgotPasswordSchema', () => {
    it('should accept valid email', () => {
      const result = forgotPasswordSchema.safeParse({
        email: 'user@gladpros.com',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const result = forgotPasswordSchema.safeParse({ email: 'bad' });
      expect(result.success).toBe(false);
    });
  });

  describe('resetPasswordApiSchema', () => {
    it('should accept valid token and password', () => {
      const result = resetPasswordApiSchema.safeParse({
        token: 'abc123def456',
        senha: 'NewPassword1!',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty token', () => {
      const result = resetPasswordApiSchema.safeParse({
        token: '',
        senha: 'NewPassword1!',
      });
      expect(result.success).toBe(false);
    });

    it('should reject short password', () => {
      const result = resetPasswordApiSchema.safeParse({
        token: 'validtoken',
        senha: 'ab',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('firstAccessSetupApiSchema', () => {
    it('should accept valid setup data', () => {
      const result = firstAccessSetupApiSchema.safeParse({
        userId: 1,
        newPassword: 'StrongPass1!',
        pin: '1234',
        securityQuestion: 'Qual o nome do seu pet?',
        securityAnswer: 'Rex',
      });
      expect(result.success).toBe(true);
    });

    it('should reject non-numeric PIN', () => {
      const result = firstAccessSetupApiSchema.safeParse({
        userId: 1,
        newPassword: 'StrongPass1!',
        pin: 'abcd',
        securityQuestion: 'test?',
        securityAnswer: 'answer',
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing userId', () => {
      const result = firstAccessSetupApiSchema.safeParse({
        newPassword: 'StrongPass1!',
        pin: '1234',
        securityQuestion: 'test?',
        securityAnswer: 'answer',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('unlockSchema', () => {
    it('should accept PIN unlock', () => {
      const result = unlockSchema.safeParse({
        method: 'pin',
        userId: 1,
        pin: '1234',
      });
      expect(result.success).toBe(true);
    });

    it('should accept security question unlock', () => {
      const result = unlockSchema.safeParse({
        method: 'security',
        userId: 1,
        answer: 'my answer',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid method', () => {
      const result = unlockSchema.safeParse({
        method: 'invalid',
        userId: 1,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('mfaResendSchema', () => {
    it('should accept valid userId', () => {
      const result = mfaResendSchema.safeParse({ userId: 1 });
      expect(result.success).toBe(true);
    });

    it('should reject negative userId', () => {
      const result = mfaResendSchema.safeParse({ userId: -1 });
      expect(result.success).toBe(false);
    });
  });

  describe('userStatusSchema', () => {
    it('should accept valid email', () => {
      const result = userStatusSchema.safeParse({
        email: 'user@gladpros.com',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty email', () => {
      const result = userStatusSchema.safeParse({ email: '' });
      expect(result.success).toBe(false);
    });
  });
});
