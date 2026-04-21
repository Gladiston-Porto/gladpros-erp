/* eslint-disable @typescript-eslint/no-require-imports */
import { POST } from '../../../app/api/propostas/[id]/assinatura/route'
import { NextRequest } from 'next/server'

jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn().mockImplementation((data, options) => ({
      status: options?.status || 200,
      json: jest.fn().mockResolvedValue(data),
      headers: new Map(),
    })),
  },
}))

jest.mock('../../../lib/prisma', () => ({
  prisma: {
    proposta: { findUnique: jest.fn(), update: jest.fn() },
  },
}))

jest.mock('../../../lib/api/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}))

const validBody = {
  assinaturaTipo: 'DIGITAL_NOME',
  assinaturaNome: 'João da Silva',
  consentimento: true,
  termosAceitos: true,
}

const propostaEnviada = {
  id: 1,
  numeroProposta: 'PROP-001',
  status: 'ENVIADA',
  assinadaEm: null,
}

function makeReq(body = validBody): NextRequest {
  return {
    url: 'http://localhost/api/propostas/1/assinatura',
    json: jest.fn().mockResolvedValue(body),
    headers: {
      get: jest.fn().mockReturnValue('127.0.0.1'),
    },
  } as unknown as NextRequest
}

const makeParams = (id = '1') => ({ params: Promise.resolve({ id }) })

describe('POST /api/propostas/[id]/assinatura', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    require('../../../lib/prisma').prisma.proposta.findUnique.mockResolvedValue(propostaEnviada)
    require('../../../lib/prisma').prisma.proposta.update.mockResolvedValue({
      ...propostaEnviada,
      status: 'ASSINADA',
      assinadaEm: new Date(),
      assinaturaTipo: 'NOME_CHECKBOX',
      assinaturaCliente: 'João da Silva',
      Cliente: { nomeCompleto: 'Cliente', email: 'c@test.com' },
    })
  })

  it('retorna 400 quando consentimento está ausente', async () => {
    const res = await POST(makeReq({ ...validBody, consentimento: false }), makeParams())
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.success).toBe(false)
  })

  it('retorna 400 quando termos não aceitos', async () => {
    const res = await POST(makeReq({ ...validBody, termosAceitos: false }), makeParams())
    expect(res.status).toBe(400)
  })

  it('retorna 404 quando proposta não encontrada', async () => {
    require('../../../lib/prisma').prisma.proposta.findUnique.mockResolvedValue(null)
    const res = await POST(makeReq(), makeParams())
    expect(res.status).toBe(404)
  })

  it('[P2-004] retorna 400 quando proposta não está em status ENVIADA (RASCUNHO)', async () => {
    require('../../../lib/prisma').prisma.proposta.findUnique.mockResolvedValue({
      ...propostaEnviada, status: 'RASCUNHO'
    })
    const res = await POST(makeReq(), makeParams())
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.success).toBe(false)
    expect(data.error).toContain('enviadas')
  })

  it('[P2-004] retorna 400 quando proposta CANCELADA tenta ser assinada', async () => {
    require('../../../lib/prisma').prisma.proposta.findUnique.mockResolvedValue({
      ...propostaEnviada, status: 'CANCELADA'
    })
    const res = await POST(makeReq(), makeParams())
    expect(res.status).toBe(400)
  })

  it('retorna 400 quando proposta já está assinada', async () => {
    require('../../../lib/prisma').prisma.proposta.findUnique.mockResolvedValue({
      ...propostaEnviada, assinadaEm: new Date()
    })
    const res = await POST(makeReq(), makeParams())
    expect(res.status).toBe(400)
  })

  it('retorna 200 com assinatura processada com sucesso', async () => {
    const res = await POST(makeReq(), makeParams())
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(require('../../../lib/prisma').prisma.proposta.update).toHaveBeenCalled()
  })

  it('[P1-010] não usa console.log — usa logger.info para auditoria', async () => {
    await POST(makeReq(), makeParams())
    expect(require('../../../lib/api/logger').logger.info).toHaveBeenCalled()
  })
})
