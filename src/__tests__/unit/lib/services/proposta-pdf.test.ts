import { PropostaPDFService } from '../../../../shared/lib/services/proposta-pdf'

// Mock do pdf-lib
jest.mock('pdf-lib', () => ({
  PDFDocument: {
    create: jest.fn().mockResolvedValue({
      addPage: jest.fn().mockReturnValue({
        drawText: jest.fn(),
        getSize: jest.fn().mockReturnValue({ width: 600, height: 800 }),
      }),
      save: jest.fn().mockResolvedValue(Buffer.from('mock-pdf')),
    }),
  },
  rgb: jest.fn().mockReturnValue([0, 0, 0]),
  StandardFonts: {
    Helvetica: 'Helvetica',
    HelveticaBold: 'HelveticaBold',
  },
}))

describe('PropostaPDFService', () => {
  const mockProposta = {
    id: 1,
    numeroProposta: 'PROP-001',
    clienteId: 1,
    dataCriacao: new Date(),
    status: 'RASCUNHO' as const,
    titulo: 'Proposta Teste',
    descricao: 'Descrição da proposta',
    valorTotal: 1000,
    contatoNome: 'Cliente Teste',
    contatoEmail: 'cliente@teste.com',
    contatoTelefone: '(11) 99999-9999',
    localExecucaoEndereco: 'Rua Teste, 123',
    descricaoEscopo: 'Escopo detalhado do trabalho',
    tipoServico: 'CONSULTORIA',
    permite: 'SIM' as const,
    moeda: 'USD',
    etapas: [],
    materiais: [],
    anexos: [],
    criadoEm: new Date(),
    atualizadoEm: new Date(),
  }

  // mockOptions is not used in tests
  // const mockOptions = {
  //   template: 'client' as const,
  //   includeValues: true,
  //   includeEtapas: true,
  //   includeMateriais: true,
  //   includeAnexos: false,
  //   watermark: '',
  //   header: {
  //     empresa: 'GladPros',
  //     contato: 'contato@gladpros.com'
  //   }
  // }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('validateForPDF', () => {
    it('should validate correct proposal', () => {
      const result = PropostaPDFService.validateForPDF(mockProposta)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject proposal without numeroProposta', () => {
      const invalidProposta = { ...mockProposta, numeroProposta: '' }
      const result = PropostaPDFService.validateForPDF(invalidProposta)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Número da proposta é obrigatório')
    })

    it('should reject proposal without contatoNome', () => {
      const invalidProposta = { ...mockProposta, contatoNome: '' }
      const result = PropostaPDFService.validateForPDF(invalidProposta)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Nome do contato é obrigatório')
    })

    it('should reject proposal without descricaoEscopo', () => {
      const invalidProposta = { ...mockProposta, descricaoEscopo: '' }
      const result = PropostaPDFService.validateForPDF(invalidProposta)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Descrição do escopo é obrigatória')
    })
  })
})
