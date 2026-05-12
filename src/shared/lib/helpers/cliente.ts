import { Cliente } from '@prisma/client'
import { Cliente_tipo as TipoCliente } from '@prisma/client'
import { encryptDoc, decryptDoc, docHashHex, last4 } from '@/shared/lib/crypto'
import { prisma } from '@/lib/prisma'
import { AuditService } from '@/shared/lib/audit'
import type { ClienteCreateInput, ClienteUpdateInput } from '@/shared/lib/validations/cliente'

// Helper for cleaning strings - Preserves undefined (for partial updates), converts empty/spaces to null
const normalizeOptional = (v?: string | null) => {
  if (v === undefined) return undefined
  if (v === null) return null
  if (typeof v !== 'string') return v
  const t = v.trim()
  return t.length ? t : null
}

// Special helper for UpperCase fields (State)
const normalizeUpper = (v?: string | null) => {
  const norm = normalizeOptional(v)
  if (norm === undefined) return undefined
  if (norm === null) return null
  return norm.toUpperCase()
}

// Special helper for Email (LowerCase)
const normalizeEmail = (v?: string | null) => {
  const norm = normalizeOptional(v)
  if (norm === undefined) return undefined
  if (norm === null) return null
  return norm.toLowerCase()
}

// Special helper for Digits Only
const normalizeDigits = (v?: string | null) => {
  const norm = normalizeOptional(v)
  if (norm === undefined) return undefined
  if (norm === null) return null
  return norm.replace(/\D/g, '')
}

/**
 * Mascara documento para exibição (SECURITY: Apenas últimos 4 dígitos)
 * PF: ***-**-1234
 * PJ: **-***1234
 */
export function maskDocumento(documento: string, tipo: TipoCliente): string {
  if (!documento) return ''
  const onlyDigits = documento.replace(/\D/g, '')

  // Always extract last 4 digits regardless of input length
  const final4 = onlyDigits.length >= 4 ? onlyDigits.slice(-4) : onlyDigits

  if (tipo === 'PF') {
    // US Format (SSN style): ***-**-1234
    return `***-**-${final4.padStart(4, '0')}`
  }
  // US Format (EIN style): **-***1234
  return `**-***${final4.padStart(4, '0')}`
}

/**
 * Descriptografa documento E APLICA MÁSCARA DE SEGURANÇA.
 * NUNCA RETORNA O DOCUMENTO COMPLETO, apenas valida a descriptografia e retorna mascarado.
 */
/**
 * Descriptografa documento E APLICA MÁSCARA DE SEGURANÇA.
 * NUNCA RETORNA O DOCUMENTO COMPLETO, apenas valida a descriptografia e retorna mascarado.
 * @deprecated Use maskDocumento(docLast4) directly. This function is async and expensive.
 */
export async function decryptDocumento(encryptedDoc: string, tipo: TipoCliente): Promise<string> {
  // Defensive: don't attempt decryption if empty or clearly too short to contain iv+tag+data
  if (!encryptedDoc || typeof encryptedDoc !== 'string') return Promise.resolve('')
  if (encryptedDoc.length < 40) return Promise.resolve('')

  try {
    const decrypted = await decryptDoc(encryptedDoc)
    // SECURITY CRITICAL: Apply mask immediately. Do not return raw decrypted value.
    return maskDocumento(decrypted, tipo)
   
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return ''
  }
}

/**
 * Extrai últimos 4 dígitos do documento
 */
export function getDocLast4(documento: string): string {
  return last4(documento)
}

/**
 * Gera hash simples do documento para indexação
 */
export function hashDocumento(documento: string): string {
  return docHashHex(documento)
}

/**
 * Formatar telefone para exibição (US Standard: (XXX) XXX-XXXX)
 */
export function formatTelefone(telefone: string): string {
  if (!telefone) return ''

  const digits = telefone.replace(/\D/g, '') // Remove non-digits

  // US Standard: 10 digits
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }

  // Fallback if not 10 digits (e.g. extension or legacy)
  return telefone
}

/**
 * Formatar CEP para exibição
 */
export function formatZipcode(zipcode: string): string {
  if (!zipcode) return ''

  const digits = zipcode.replace(/\D/g, '')
  // US ZIP+4: 9 digits
  if (digits.length === 9) {
    return `${digits.slice(0, 5)}-${digits.slice(5)}`
  }
  // US ZIP: 5 digits
  if (digits.length === 5) {
    return digits
  }
  return zipcode
}

/**
 * Obter nome completo ou razão social baseado no tipo
 */
export function getClienteDisplayName(cliente: Cliente): string {
  if (cliente.tipo === 'PF') {
    return cliente.nomeCompleto || 'Nome não informado'
  } else {
    return cliente.nomeFantasia || cliente.razaoSocial || 'Razão social não informada'
  }
}

/**
 * Preparar dados do cliente para criptografia
 */
export async function encryptClienteData(
  documento: string
): Promise<{
  documentoEnc: string
  docLast4: string
  docHash: string
}> {
  const documentoEnc = await encryptDoc(documento)
  const docLast4 = getDocLast4(documento)
  const docHash = hashDocumento(documento)

  return {
    documentoEnc,
    docLast4,
    docHash
  }
}

/**
 * Sanitizar entrada do usuário (Type-Safe & Strict)
 * PRESERVA 'undefined' para permitir updates parciais sem apagar dados.
 */
export function sanitizeClienteInput(data: ClienteCreateInput | ClienteUpdateInput) {
  // Use 'any' cast only for safe property access if dynamic check needed, but prefer structured access
  // Since we accept Create or Update input, we check explicitly

  const tipo = (data as ClienteCreateInput).tipo // Update might not have tipo, but it's optional in output destructure

  return {
    ...data,
    tipo,
    // Normalize strings: trim, empty -> null, undefined -> undefined
    nomeCompleto: normalizeOptional(data.nomeCompleto),
    razaoSocial: normalizeOptional(data.razaoSocial),
    nomeFantasia: normalizeOptional(data.nomeFantasia),
    email: normalizeEmail(data.email),

    // Telefone: digits only
    telefone: normalizeDigits(data.telefone),

    // Documentos (remove non-digits, normalize)
    ssn: normalizeDigits(data.ssn),
    itin: normalizeDigits(data.itin),
    ein: normalizeDigits(data.ein),

    // Address fields standardized
    addressStreet: normalizeOptional(data.addressStreet),
    addressUnit: normalizeOptional(data.addressUnit),
    addressCity: normalizeOptional(data.addressCity),
    addressState: normalizeUpper(data.addressState),
    addressZip: normalizeOptional(data.addressZip),
    addressCounty: normalizeOptional(data.addressCounty),

    // Legacy fields cleanup (Check presence, not truthiness, to allow clearing with empty string)
    endereco: 'endereco' in data ? normalizeOptional(data.endereco) : undefined,
    apartamentoUnidade: 'apartamentoUnidade' in data ? normalizeOptional(data.apartamentoUnidade) : undefined,
    observacoes: normalizeOptional(data.observacoes)
  }
}

/**
 * Validar se documento já existe
 */
export async function checkDocumentoExists(documento?: string | null, excludeId?: number): Promise<boolean> {
  if (!documento) return false
  const docHash = hashDocumento(documento)

  const existing = await prisma.cliente.findFirst({
    where: {
      docHash,
      id: excludeId ? { not: excludeId } : undefined
    },
    select: { id: true }
  })

  return !!existing
}

/**
 * Validar se email já existe
 */
export async function checkEmailExists(email: string, excludeId?: number): Promise<boolean> {
  const existing = await prisma.cliente.findFirst({
    where: {
      email: email.toLowerCase(),
      id: excludeId ? { not: excludeId } : undefined
    },
    select: { id: true }
  })

  return !!existing
}

/**
 * Registrar mudanças para auditoria
 */
export async function logClienteAudit(
  clienteId: number,
  acao: string,
  diff: Record<string, unknown>,
  userId: number
) {
  return AuditService.logAction(userId, 'Cliente', clienteId, acao, diff)
}

/**
 * Calcular diff entre estados do cliente
 */
export function calculateClienteDiff(oldData: Record<string, unknown>, newData: Record<string, unknown>) {
  const diff: Record<string, { old: unknown; new: unknown }> = {}
  const sensitiveFields = new Set([
    'email',
    'telefone',
    'endereco',
    'addressStreet',
    'addressUnit',
    'addressCity',
    'addressState',
    'addressZip',
    'addressCounty',
    'observacoes',
  ])

  const fields = [
    'tipo', 'nomeCompleto', 'razaoSocial', 'nomeFantasia', 'email',
    'telefone', 'endereco',
    'addressStreet', 'addressUnit', 'addressCity', 'addressState', 'addressZip', 'addressCounty',
    'observacoes', 'status'
  ]

  for (const field of fields) {
    const oldVal = oldData[field]
    const newVal = newData[field]

    if (oldVal !== newVal) {
      // Basic strict check
      // For undefined/null mismatch, treat as potential diff
      if (oldVal || newVal) {
        diff[field] = sensitiveFields.has(field)
          ? { old: '[REDACTED]', new: '[REDACTED]' }
          : { old: oldVal, new: newVal }
      }
    }
  }

  // Para documento, não logamos o valor real, apenas que mudou
  if (oldData.docHash !== newData.docHash) {
    diff.documento = { old: '[DOCUMENTO]', new: '[DOCUMENTO ALTERADO]' }
  }

  return diff
}

/**
 * Valida integridade do endereço (Regra: All or Nothing)
 * Verifica se, caso algum campo principal esteja presente, todos os obrigatórios também estejam.
 */
export function validateAddressIntegrity(
  data: {
    addressStreet?: string | null,
    addressCity?: string | null,
    addressState?: string | null,
    addressZip?: string | null
  }
): { valid: boolean; message?: string } {
  // Verificar se há algum valor preenchido (não nulo, não vazio) e não apenas espaços
  const has = (v?: string | null) => !!(v && v.trim().length > 0)

  const hasStreet = has(data.addressStreet)
  const hasCity = has(data.addressCity)
  const hasState = has(data.addressState)
  const hasZip = has(data.addressZip)

  const hasAny = hasStreet || hasCity || hasState || hasZip
  const hasAll = hasStreet && hasCity && hasState && hasZip

  if (hasAny && !hasAll) {
    const missing: string[] = []
    if (!hasStreet) missing.push('Logradouro')
    if (!hasCity) missing.push('Cidade')
    if (!hasState) missing.push('Estado')
    if (!hasZip) missing.push('CEP')

    return {
      valid: false,
      message: `Endereço incompleto. Para cadastrar o endereço, preencha todos os campos obrigatórios. Faltando: ${missing.join(', ')}.`
    }
  }

  return { valid: true }
}

const ACTIVE_SERVICE_ORDER_STATUSES = ['COMPLETED', 'CANCELED', 'CLOSED', 'WRITE_OFF'] as const
const INACTIVE_PROJETO_STATUSES = ['concluido', 'arquivado', 'cancelado'] as const
const INACTIVE_INVOICE_STATUSES = ['PAID', 'CANCELLED'] as const

export type ClienteBlockingDependencies = {
  activeServiceOrders: number
  activeProjetos: number
  activeInvoices: number
}

export function hasBlockingDependencies(counts: ClienteBlockingDependencies): boolean {
  return counts.activeServiceOrders > 0 || counts.activeProjetos > 0 || counts.activeInvoices > 0
}

export function buildClienteDependencyConflictDetails(counts: ClienteBlockingDependencies) {
  return {
    activeServiceOrders: counts.activeServiceOrders,
    activeProjetos: counts.activeProjetos,
    activeInvoices: counts.activeInvoices,
  }
}

export async function getClientesBlockingDependenciesMap(clienteIds: number[]) {
  const uniqueIds = [...new Set(clienteIds.filter((id) => Number.isInteger(id) && id > 0))]
  const dependencyMap = new Map<number, ClienteBlockingDependencies>(
    uniqueIds.map((id) => [
      id,
      {
        activeServiceOrders: 0,
        activeProjetos: 0,
        activeInvoices: 0,
      },
    ])
  )

  if (uniqueIds.length === 0) {
    return dependencyMap
  }

  const [serviceOrders, projetos, invoices] = await Promise.all([
    prisma.serviceOrder.groupBy({
      by: ['clienteId'],
      where: {
        clienteId: { in: uniqueIds },
        status: { notIn: [...ACTIVE_SERVICE_ORDER_STATUSES] },
      },
      _count: { clienteId: true },
    }),
    prisma.projeto.groupBy({
      by: ['clienteId'],
      where: {
        clienteId: { in: uniqueIds },
        status: { notIn: [...INACTIVE_PROJETO_STATUSES] },
      },
      _count: { clienteId: true },
    }),
    prisma.invoice.groupBy({
      by: ['clienteId'],
      where: {
        clienteId: { in: uniqueIds },
        status: { notIn: [...INACTIVE_INVOICE_STATUSES] },
      },
      _count: { clienteId: true },
    }),
  ])

  for (const row of serviceOrders) {
    const current = dependencyMap.get(row.clienteId)
    if (current) {
      current.activeServiceOrders = row._count.clienteId
    }
  }

  for (const row of projetos) {
    const current = dependencyMap.get(row.clienteId)
    if (current) {
      current.activeProjetos = row._count.clienteId
    }
  }

  for (const row of invoices) {
    const current = dependencyMap.get(row.clienteId)
    if (current) {
      current.activeInvoices = row._count.clienteId
    }
  }

  return dependencyMap
}
