import { PasswordService } from '../../../shared/lib/password'

describe('Password Service', () => {
  describe('validatePassword', () => {
    it('should validate a strong password', () => {
      const result = PasswordService.validatePassword('StrongPass123!')

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject password shorter than 9 characters', () => {
      const result = PasswordService.validatePassword('Short1!')

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Senha deve ter no mínimo 9 caracteres')
    })

    it('should reject password without uppercase letter', () => {
      const result = PasswordService.validatePassword('weakpass123!')

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Senha deve conter pelo menos 1 letra maiúscula')
    })

    it('should reject password without number', () => {
      const result = PasswordService.validatePassword('WeakPass!')

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Senha deve conter pelo menos 1 número')
    })

    it('should reject password without special character', () => {
      const result = PasswordService.validatePassword('WeakPass123')

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Senha deve conter pelo menos 1 símbolo especial')
    })

    it('should return multiple errors for invalid password', () => {
      const result = PasswordService.validatePassword('weak')

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Senha deve ter no mínimo 9 caracteres')
      expect(result.errors).toContain('Senha deve conter pelo menos 1 letra maiúscula')
      expect(result.errors).toContain('Senha deve conter pelo menos 1 número')
      expect(result.errors).toContain('Senha deve conter pelo menos 1 símbolo especial')
    })
  })

  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'TestPassword123!'
      const hash = await PasswordService.hashPassword(password)

      expect(typeof hash).toBe('string')
      expect(hash.length).toBeGreaterThan(0)
      expect(hash).not.toBe(password) // Hash should be different from plain password
    })

    it('should produce different hashes for same password', async () => {
      const password = 'TestPassword123!'
      const hash1 = await PasswordService.hashPassword(password)
      const hash2 = await PasswordService.hashPassword(password)

      expect(hash1).not.toBe(hash2) // bcrypt adds random salt, so hashes should be different
    })
  })

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'TestPassword123!'
      const hash = await PasswordService.hashPassword(password)
      const isValid = await PasswordService.verifyPassword(password, hash)

      expect(isValid).toBe(true)
    })

    it('should reject incorrect password', async () => {
      const password = 'TestPassword123!'
      const wrongPassword = 'WrongPassword123!'
      const hash = await PasswordService.hashPassword(password)
      const isValid = await PasswordService.verifyPassword(wrongPassword, hash)

      expect(isValid).toBe(false)
    })
  })

  describe('generateProvisionalPassword', () => {
    it('should generate a password that meets validation criteria', () => {
      const password = PasswordService.generateProvisionalPassword()
      const validation = PasswordService.validatePassword(password)

      expect(validation.valid).toBe(true)
      expect(password.length).toBeGreaterThanOrEqual(9)
    })

    it('should generate different passwords on multiple calls', () => {
      const password1 = PasswordService.generateProvisionalPassword()
      const password2 = PasswordService.generateProvisionalPassword()

      expect(password1).not.toBe(password2)
    })

    it('should contain required character types', () => {
      const password = PasswordService.generateProvisionalPassword()

      expect(/[A-Z]/.test(password)).toBe(true) // At least one uppercase
      expect(/[0-9]/.test(password)).toBe(true) // At least one number
      expect(/[!@#$%&*]/.test(password)).toBe(true) // At least one symbol
    })
  })

  describe('getPasswordStrength', () => {
    it('should return maximum score for very strong password', () => {
      const result = PasswordService.getPasswordStrength('VeryStrongPassword123!@#')

      expect(result.score).toBe(100)
      expect(result.label).toBe('Muito forte')
      expect(result.color).toBe('#22c55e')
      expect(result.criteriaMet).toContain('Mínimo 9 caracteres')
      expect(result.criteriaMet).toContain('Letra maiúscula')
      expect(result.criteriaMet).toContain('Letra minúscula')
      expect(result.criteriaMet).toContain('Número')
      expect(result.criteriaMet).toContain('Símbolo especial')
      expect(result.criteriaMet).toContain('Senha longa (12+ caracteres)')
    })

    it('should return low score for very weak password', () => {
      const result = PasswordService.getPasswordStrength('w')

      expect(result.score).toBe(10) // Only lowercase letter
      expect(result.label).toBe('Muito fraca')
      expect(result.color).toBe('#ef4444')
      expect(result.criteriaMet).toEqual(['Letra minúscula'])
    })

    it('should return moderate score for medium strength password', () => {
      const result = PasswordService.getPasswordStrength('pass1!')

      expect(result.score).toBeGreaterThanOrEqual(50)
      expect(result.score).toBeLessThan(90)
      expect(result.label).toBe('Moderada')
      expect(result.color).toBe('#eab308')
    })
  })
})
