/**
 * Unit Tests: ClienteForm Component
 *
 * Tests the ClienteForm React component covering:
 * - PF/PJ type toggling and conditional field rendering
 * - Validation rules (required fields, formats, phone, email, ZIP, SSN, ITIN, EIN)
 * - Submit payload normalization (email lowercase, phone digits only, null cleanup)
 * - Error clearing on field change
 * - Cancel handler
 * - Loading/disabled state
 * - ZIP Auto-fill (handleZipBlur)
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { ClienteForm } from '@/components/clientes/ClienteForm'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Fill form fields from a key→value map */
async function fillField(testId: string, value: string) {
  const el = screen.getByTestId(testId)
  fireEvent.change(el, { target: { value } })
}

/** Switch the form to PJ type */
function switchToPJ() {
  fireEvent.click(screen.getByRole('button', { name: /empresa/i }))
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ClienteForm', () => {
  const onSubmit = jest.fn().mockResolvedValue(undefined)
  const onCancel = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ── Rendering ──────────────────────────────────────────────────────────────

  describe('Initial Rendering', () => {
    it('renders PF fields by default', () => {
      render(<ClienteForm onSubmit={onSubmit} onCancel={onCancel} />)

      expect(screen.getByTestId('cliente-form-nome-completo')).toBeInTheDocument()
      expect(screen.getByTestId('cliente-form-email')).toBeInTheDocument()
      expect(screen.getByTestId('cliente-form-telefone')).toBeInTheDocument()
    })

    it('does not render PJ-only fields when tipo is PF', () => {
      render(<ClienteForm onSubmit={onSubmit} onCancel={onCancel} />)

      expect(screen.queryByTestId('cliente-form-nome-fantasia')).not.toBeInTheDocument()
      expect(screen.queryByTestId('cliente-form-razao-social')).not.toBeInTheDocument()
      expect(screen.queryByTestId('cliente-form-ein')).not.toBeInTheDocument()
    })

    it('shows SSN input by default (PF tipoDocumentoPF = SSN)', () => {
      render(<ClienteForm onSubmit={onSubmit} onCancel={onCancel} />)

      expect(screen.getByTestId('cliente-form-ssn')).toBeInTheDocument()
      expect(screen.queryByTestId('cliente-form-itin')).not.toBeInTheDocument()
    })

    it('pre-fills fields when cliente prop provided', () => {
      render(
        <ClienteForm
          cliente={{ tipo: 'PF', nomeCompleto: 'Maria Santos', email: 'maria@test.com' }}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      )

      expect(screen.getByTestId('cliente-form-nome-completo')).toHaveValue('Maria Santos')
      expect(screen.getByTestId('cliente-form-email')).toHaveValue('maria@test.com')
    })
  })

  // ── Type Toggling ──────────────────────────────────────────────────────────

  describe('PF ↔ PJ Toggle', () => {
    it('shows PJ fields after clicking Empresa button', () => {
      render(<ClienteForm onSubmit={onSubmit} onCancel={onCancel} />)

      switchToPJ()

      expect(screen.getByTestId('cliente-form-nome-fantasia')).toBeInTheDocument()
      expect(screen.getByTestId('cliente-form-razao-social')).toBeInTheDocument()
      expect(screen.getByTestId('cliente-form-ein')).toBeInTheDocument()
    })

    it('hides PF-only fields after switching to PJ', () => {
      render(<ClienteForm onSubmit={onSubmit} onCancel={onCancel} />)

      switchToPJ()

      expect(screen.queryByTestId('cliente-form-nome-completo')).not.toBeInTheDocument()
      expect(screen.queryByTestId('cliente-form-ssn')).not.toBeInTheDocument()
      expect(screen.queryByTestId('cliente-form-itin')).not.toBeInTheDocument()
    })

    it('restores PF fields after toggling back from PJ', () => {
      render(<ClienteForm onSubmit={onSubmit} onCancel={onCancel} />)

      switchToPJ()
      fireEvent.click(screen.getByRole('button', { name: /pessoa física/i }))

      expect(screen.getByTestId('cliente-form-nome-completo')).toBeInTheDocument()
      expect(screen.queryByTestId('cliente-form-nome-fantasia')).not.toBeInTheDocument()
    })

    it('switches between SSN and ITIN inputs', () => {
      render(<ClienteForm onSubmit={onSubmit} onCancel={onCancel} />)

      // Default SSN
      expect(screen.getByTestId('cliente-form-ssn')).toBeInTheDocument()

      // Switch to ITIN
      fireEvent.click(screen.getByRole('button', { name: 'ITIN' }))
      expect(screen.queryByTestId('cliente-form-ssn')).not.toBeInTheDocument()
      expect(screen.getByTestId('cliente-form-itin')).toBeInTheDocument()
    })
  })

  // ── PF Validation ──────────────────────────────────────────────────────────

  describe('PF Validation', () => {
    it('shows required field errors on empty submit', async () => {
      render(<ClienteForm onSubmit={onSubmit} onCancel={onCancel} />)

      fireEvent.submit(screen.getByRole('button', { name: /salvar/i }).closest('form')!)

      await waitFor(() => {
        expect(screen.getByText('Nome completo é obrigatório')).toBeInTheDocument()
        expect(screen.getByText('E-mail é obrigatório')).toBeInTheDocument()
        expect(screen.getByText('Telefone é obrigatório')).toBeInTheDocument()
        expect(screen.getByText('Logradouro é obrigatório')).toBeInTheDocument()
        expect(screen.getByText('Cidade é obrigatória')).toBeInTheDocument()
        expect(screen.getByText('ZIP Code é obrigatório')).toBeInTheDocument()
      })

      expect(onSubmit).not.toHaveBeenCalled()
    })

    it('shows invalid email error', async () => {
      render(<ClienteForm onSubmit={onSubmit} onCancel={onCancel} />)

      await fillField('cliente-form-email', 'not-an-email')
      fireEvent.submit(screen.getByRole('button', { name: /salvar/i }).closest('form')!)

      await waitFor(() => {
        expect(screen.getByText('E-mail inválido')).toBeInTheDocument()
      })
    })

    it('shows error for phone with wrong digit count', async () => {
      render(<ClienteForm onSubmit={onSubmit} onCancel={onCancel} />)

      await fillField('cliente-form-telefone', '123456789') // 9 digits only
      fireEvent.submit(screen.getByRole('button', { name: /salvar/i }).closest('form')!)

      await waitFor(() => {
        expect(screen.getByText(/Telefone deve ter 10 dígitos/)).toBeInTheDocument()
      })
    })

    it('shows error for invalid ZIP format', async () => {
      render(<ClienteForm onSubmit={onSubmit} onCancel={onCancel} />)

      await fillField('cliente-form-address-zip', '1234') // too short
      fireEvent.submit(screen.getByRole('button', { name: /salvar/i }).closest('form')!)

      await waitFor(() => {
        expect(screen.getByText(/ZIP inválido/)).toBeInTheDocument()
      })
    })

    it('shows error for invalid SSN format', async () => {
      render(<ClienteForm onSubmit={onSubmit} onCancel={onCancel} />)

      await fillField('cliente-form-ssn', '123-45-678X') // contains letter
      fireEvent.submit(screen.getByRole('button', { name: /salvar/i }).closest('form')!)

      await waitFor(() => {
        expect(screen.getByText('SSN inválido')).toBeInTheDocument()
      })
    })

    it('accepts valid SSN in XXX-XX-XXXX format', async () => {
      render(<ClienteForm onSubmit={onSubmit} onCancel={onCancel} />)

      await fillField('cliente-form-nome-completo', 'Test User')
      await fillField('cliente-form-email', 'test@example.com')
      await fillField('cliente-form-telefone', '4693346918')
      await fillField('cliente-form-ssn', '123-45-6789')
      await fillField('cliente-form-address-street', '123 Main St')
      await fillField('cliente-form-address-city', 'Dallas')
      await fillField('cliente-form-address-zip', '75201')

      fireEvent.submit(screen.getByRole('button', { name: /salvar/i }).closest('form')!)

      await waitFor(() => {
        expect(screen.queryByText('SSN inválido')).not.toBeInTheDocument()
      })
    })

    it('shows error for invalid ITIN format', async () => {
      render(<ClienteForm onSubmit={onSubmit} onCancel={onCancel} />)

      // Switch to ITIN
      fireEvent.click(screen.getByRole('button', { name: 'ITIN' }))
      await fillField('cliente-form-itin', '123-45-6789') // ITIN must start with 9

      fireEvent.submit(screen.getByRole('button', { name: /salvar/i }).closest('form')!)

      await waitFor(() => {
        expect(screen.getByText('ITIN inválido')).toBeInTheDocument()
      })
    })
  })

  // ── PJ Validation ──────────────────────────────────────────────────────────

  describe('PJ Validation', () => {
    it('shows required field errors for PJ on empty submit', async () => {
      render(<ClienteForm onSubmit={onSubmit} onCancel={onCancel} />)

      switchToPJ()
      fireEvent.submit(screen.getByRole('button', { name: /salvar/i }).closest('form')!)

      await waitFor(() => {
        expect(screen.getByText('Nome da Empresa é obrigatório')).toBeInTheDocument()
        expect(screen.getByText('E-mail é obrigatório')).toBeInTheDocument()
      })

      expect(onSubmit).not.toHaveBeenCalled()
    })

    it('shows error for invalid EIN format', async () => {
      render(<ClienteForm onSubmit={onSubmit} onCancel={onCancel} />)

      switchToPJ()
      await fillField('cliente-form-ein', '1234') // invalid format

      fireEvent.submit(screen.getByRole('button', { name: /salvar/i }).closest('form')!)

      await waitFor(() => {
        expect(screen.getByText('EIN inválido')).toBeInTheDocument()
      })
    })

    it('accepts valid EIN in XX-XXXXXXX format', async () => {
      render(<ClienteForm onSubmit={onSubmit} onCancel={onCancel} />)

      switchToPJ()
      await fillField('cliente-form-nome-fantasia', 'Tech Co')
      await fillField('cliente-form-ein', '12-3456789')
      await fillField('cliente-form-email', 'tech@example.com')
      await fillField('cliente-form-telefone', '4693346918')
      await fillField('cliente-form-address-street', '456 Commerce')
      await fillField('cliente-form-address-city', 'Dallas')
      await fillField('cliente-form-address-zip', '75201')

      fireEvent.submit(screen.getByRole('button', { name: /salvar/i }).closest('form')!)

      await waitFor(() => {
        expect(screen.queryByText('EIN inválido')).not.toBeInTheDocument()
      })
    })
  })

  // ── Submission & Normalization ─────────────────────────────────────────────

  describe('Submission Normalization', () => {
    it('normalizes email to lowercase on PF submit', async () => {
      render(<ClienteForm onSubmit={onSubmit} onCancel={onCancel} />)

      await fillField('cliente-form-nome-completo', 'João da Silva')
      await fillField('cliente-form-email', 'JOAO@EXAMPLE.COM')
      await fillField('cliente-form-telefone', '4693346918')
      await fillField('cliente-form-address-street', '123 Main St')
      await fillField('cliente-form-address-city', 'Dallas')
      await fillField('cliente-form-address-zip', '75201')

      fireEvent.submit(screen.getByRole('button', { name: /salvar/i }).closest('form')!)

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({ email: 'joao@example.com' })
        )
      })
    })

    it('strips non-digits from phone on submit', async () => {
      render(<ClienteForm onSubmit={onSubmit} onCancel={onCancel} />)

      await fillField('cliente-form-nome-completo', 'Test User')
      await fillField('cliente-form-email', 'test@example.com')
      await fillField('cliente-form-telefone', '(469) 334-6918')
      await fillField('cliente-form-address-street', '123 Main St')
      await fillField('cliente-form-address-city', 'Dallas')
      await fillField('cliente-form-address-zip', '75201')

      fireEvent.submit(screen.getByRole('button', { name: /salvar/i }).closest('form')!)

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({ telefone: '4693346918' })
        )
      })
    })

    it('nullifies PJ fields when tipo=PF on submit', async () => {
      render(<ClienteForm onSubmit={onSubmit} onCancel={onCancel} />)

      await fillField('cliente-form-nome-completo', 'João da Silva')
      await fillField('cliente-form-email', 'joao@example.com')
      await fillField('cliente-form-telefone', '4693346918')
      await fillField('cliente-form-address-street', '123 Main St')
      await fillField('cliente-form-address-city', 'Dallas')
      await fillField('cliente-form-address-zip', '75201')

      fireEvent.submit(screen.getByRole('button', { name: /salvar/i }).closest('form')!)

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            tipo: 'PF',
            ein: null,
            nomeFantasia: null,
            razaoSocial: null,
          })
        )
      })
    })

    it('nullifies PF fields when tipo=PJ on submit', async () => {
      render(<ClienteForm onSubmit={onSubmit} onCancel={onCancel} />)

      switchToPJ()
      await fillField('cliente-form-nome-fantasia', 'Tech Co')
      await fillField('cliente-form-email', 'tech@example.com')
      await fillField('cliente-form-telefone', '4693346918')
      await fillField('cliente-form-address-street', '456 Commerce')
      await fillField('cliente-form-address-city', 'Dallas')
      await fillField('cliente-form-address-zip', '75201')

      fireEvent.submit(screen.getByRole('button', { name: /salvar/i }).closest('form')!)

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            tipo: 'PJ',
            ssn: null,
            itin: null,
            nomeCompleto: null,
            tipoDocumentoPF: null,
          })
        )
      })
    })

    it('passes addressState from select on submit', async () => {
      render(<ClienteForm onSubmit={onSubmit} onCancel={onCancel} />)

      await fillField('cliente-form-nome-completo', 'Test')
      await fillField('cliente-form-email', 'test@example.com')
      await fillField('cliente-form-telefone', '4693346918')
      await fillField('cliente-form-address-street', '123 Main')
      await fillField('cliente-form-address-city', 'Dallas')
      // addressState is a <select> — set via fireEvent.change with an uppercase option value
      fireEvent.change(screen.getByTestId('cliente-form-address-state'), { target: { value: 'CA' } })
      await fillField('cliente-form-address-zip', '90210')

      fireEvent.submit(screen.getByRole('button', { name: /salvar/i }).closest('form')!)

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({ addressState: 'CA' })
        )
      })
    })
  })

  // ── Error UX ───────────────────────────────────────────────────────────────

  describe('Error UX', () => {
    it('clears field error when user types in that field', async () => {
      render(<ClienteForm onSubmit={onSubmit} onCancel={onCancel} />)

      // Trigger validation errors
      fireEvent.submit(screen.getByRole('button', { name: /salvar/i }).closest('form')!)

      await waitFor(() => {
        expect(screen.getByText('E-mail é obrigatório')).toBeInTheDocument()
      })

      // Type something in the email field
      await fillField('cliente-form-email', 'a')

      await waitFor(() => {
        expect(screen.queryByText('E-mail é obrigatório')).not.toBeInTheDocument()
      })
    })
  })

  // ── ZIP Auto-fill ──────────────────────────────────────────────────────────

  describe('ZIP Auto-fill (handleZipBlur)', () => {
    const zipField = () => screen.getByTestId('cliente-form-address-zip')
    const cityField = () => screen.getByTestId('cliente-form-address-city')

    let originalFetch: typeof global.fetch

    beforeEach(() => {
      originalFetch = global.fetch
    })

    afterEach(() => {
      global.fetch = originalFetch
    })

    it('auto-preenche cidade e estado quando ZIP é válido e cidade está vazia', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { city: 'Dallas', state: 'TX' }, success: true }),
      })

      render(<ClienteForm onSubmit={onSubmit} onCancel={onCancel} />)

      // Flush state update from change before blur (garante formData.addressZip = '75201')
      await act(async () => {
        fireEvent.change(zipField(), { target: { value: '75201' } })
      })

      // Trigger blur e aguarda fetch + setState
      await act(async () => {
        fireEvent.blur(zipField())
        await new Promise((r) => setTimeout(r, 50))
      })

      expect(cityField()).toHaveValue('Dallas')
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/clientes/zip-lookup?zip=75201',
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      )
    })

    it('não sobrescreve cidade se já estiver preenchida', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { city: 'Dallas', state: 'TX' }, success: true }),
      })

      render(<ClienteForm onSubmit={onSubmit} onCancel={onCancel} />)

      await act(async () => {
        fireEvent.change(cityField(), { target: { value: 'Plano' } })
        fireEvent.change(zipField(), { target: { value: '75075' } })
      })

      await act(async () => {
        fireEvent.blur(zipField())
        await new Promise((r) => setTimeout(r, 50))
      })

      expect(cityField()).toHaveValue('Plano')
    })

    it('não chama fetch quando ZIP tem menos de 5 dígitos', async () => {
      global.fetch = jest.fn()

      render(<ClienteForm onSubmit={onSubmit} onCancel={onCancel} />)

      await act(async () => {
        fireEvent.change(zipField(), { target: { value: '1234' } })
      })

      await act(async () => {
        fireEvent.blur(zipField())
        await new Promise((r) => setTimeout(r, 50))
      })

      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('exibe mensagem de ZIP não reconhecido quando ZIP retorna sem dados', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: null, success: true }),
      })

      render(<ClienteForm onSubmit={onSubmit} onCancel={onCancel} />)

      await act(async () => {
        fireEvent.change(zipField(), { target: { value: '00000' } })
      })

      await act(async () => {
        fireEvent.blur(zipField())
        await new Promise((r) => setTimeout(r, 50))
      })

      expect(screen.getByText(/ZIP não reconhecido/i)).toBeInTheDocument()
    })

    it('ignora erro de rede sem quebrar o formulário', async () => {
      global.fetch = jest.fn().mockRejectedValueOnce(new Error('Network error'))

      render(<ClienteForm onSubmit={onSubmit} onCancel={onCancel} />)

      await act(async () => {
        fireEvent.change(zipField(), { target: { value: '75201' } })
      })

      await act(async () => {
        fireEvent.blur(zipField())
        await new Promise((r) => setTimeout(r, 50))
      })

      expect(cityField()).toBeInTheDocument()
      expect(cityField()).toHaveValue('')
    })
  })

  // ── Cancel & Loading ───────────────────────────────────────────────────────

  describe('Cancel and Loading', () => {
    it('calls onCancel when cancel button is clicked', () => {
      render(<ClienteForm onSubmit={onSubmit} onCancel={onCancel} />)

      fireEvent.click(screen.getByRole('button', { name: /cancelar/i }))

      expect(onCancel).toHaveBeenCalledTimes(1)
    })

    it('submit button shows loading state when loading=true', () => {
      render(<ClienteForm onSubmit={onSubmit} onCancel={onCancel} loading={true} />)

      const submitBtn = screen.getByRole('button', { name: /salvando/i })
      expect(submitBtn).toBeDisabled()
    })

    it('submit button is enabled by default', () => {
      render(<ClienteForm onSubmit={onSubmit} onCancel={onCancel} />)

      const submitBtn = screen.getByRole('button', { name: /salvar/i })
      expect(submitBtn).not.toBeDisabled()
    })
  })
})
