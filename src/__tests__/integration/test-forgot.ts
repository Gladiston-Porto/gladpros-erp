import { forgotPasswordSchema } from '@/shared/lib/validation'

describe('Forgot password schema', () => {
  it('aceita formato de email válido', () => {
    const payload = { email: 'USUARIO@GLADPROS.COM' }

    const parsed = forgotPasswordSchema.parse(payload)

    expect(parsed.email).toBe('usuario@gladpros.com')
  })

  it('rejeita email vazio', () => {
    const result = forgotPasswordSchema.safeParse({ email: '' })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('Email inválido')
    }
  })
})
