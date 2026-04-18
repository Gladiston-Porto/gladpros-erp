import { loginSchema } from '@/shared/lib/validation'

describe('Login schema', () => {
  it('normaliza email válido e aceita senha preenchida', () => {
    const payload = {
      email: 'ADMIN@GladPros.com',
      password: 'qualquer-coisa',
    }

    const parsed = loginSchema.parse(payload)

    expect(parsed.email).toBe('admin@gladpros.com')
    expect(parsed.password).toBe('qualquer-coisa')
  })

  it('rejeita email inválido', () => {
    const result = loginSchema.safeParse({
      email: 'email-invalido',
      password: '123',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('Email inválido')
    }
  })

  it('exige senha preenchida', () => {
    const result = loginSchema.safeParse({
      email: 'user@gladpros.com',
      password: '',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('Senha é obrigatória')
    }
  })
})
