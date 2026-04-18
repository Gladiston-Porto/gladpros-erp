import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { requireClientePermission } from '@/shared/lib/rbac'
import { clienteFiltersSchema, clienteCreateSchema } from '@/shared/lib/validations/cliente'
import { apiRateLimit } from '@/shared/lib/rate-limit'
import {
  sanitizeClienteInput,
  encryptClienteData,
  checkDocumentoExists,
  logClienteAudit,
  maskDocumento,
  formatTelefone,
} from '@/shared/lib/helpers/cliente'
import { withErrorHandler } from '@/lib/api/error-handler';
import { withBusinessCache } from '@/shared/lib/cache/business-cache';

export const runtime = "nodejs"

/**
 * GET /api/clientes - Lista clientes com filtros e paginação
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
    // Aplicar rate limiting: 100 requests por minuto por IP
    const rateLimitResult = await apiRateLimit.isAllowed(request)
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded", message: rateLimitResult.message, success: false },
        {
          status: 429,
          headers: {
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.resetTime.toString()
          }
        }
      )
    }

    // Verificar permissão de leitura e obter usuário para field-level security
    const user = await requireClientePermission(request, 'canRead')

    // Obter parâmetros da URL
    const { searchParams } = new URL(request.url)
    const queryParams = Object.fromEntries(searchParams.entries())

    // Validar filtros
    const filters = clienteFiltersSchema.parse(queryParams)

    // Construir where clause
    const where: Record<string, unknown> = {}

    // Filtro por busca (nome, email, documento) - MySQL não suporta mode: insensitive
    if (filters.q && filters.q.trim()) {
      const searchTerm = filters.q.trim()
      where.OR = [
        { nomeCompleto: { contains: searchTerm } },
        { razaoSocial: { contains: searchTerm } },
        { nomeFantasia: { contains: searchTerm } },
        { email: { contains: searchTerm } },
        { docLast4: { contains: searchTerm } }
      ]
    }

    // Filtro por tipo
    if (filters.tipo && filters.tipo !== 'all') {
      where.tipo = filters.tipo
    }

    // Filtro por status (campo do frontend)
    if (filters.ativo !== 'all' && filters.ativo !== undefined) {
      where.status = filters.ativo ? 'ATIVO' : 'INATIVO'
    }

    if (filters.addressCity) {
      where.addressCity = { contains: filters.addressCity.trim() }
    }

    if (filters.addressState) {
      where.addressState = filters.addressState.trim().toUpperCase()
    }

    if (filters.addressCounty) {
      where.addressCounty = { contains: filters.addressCounty.trim() }
    }

    // Calcular offset
    const offset = (filters.page - 1) * filters.pageSize

    // Ordenação dinâmica
    const orderBy: Record<string, string | Record<string, string>>[] = []
    // status first unless explicit sort by status provided
    if (filters.sortKey !== 'status') {
      orderBy.push({ status: 'desc' })
    }
    if (filters.sortKey) {
      const dir = filters.sortDir === 'asc' ? 'asc' : 'desc'
      switch (filters.sortKey) {
        case 'nome':
          // nomeChave já consolidado
          orderBy.push({ nomeChave: dir })
          break
        case 'tipo':
          orderBy.push({ tipo: dir })
          break
        case 'email':
          orderBy.push({ email: dir })
          break
        case 'telefone':
          orderBy.push({ telefone: dir })
          break
        case 'documento':
          orderBy.push({ docLast4: dir })
          break
        case 'cidadeEstado':
          // ordenar por estado depois cidade (usando campos novos)
          orderBy.push({ addressState: dir })
          orderBy.push({ addressCity: dir })
          break
        case 'status':
          orderBy.push({ status: dir })
          break
        case 'criadoEm':
          orderBy.push({ criadoEm: dir })
          break
      }
    } else {
      // fallback padrão anterior
      orderBy.push({ atualizadoEm: 'desc' })
    }

    const cacheTtlSeconds = process.env.NODE_ENV === 'development' ? 5 : 20
    const cacheKey = `clientes:list:${user.id}:${String(user.role)}:${JSON.stringify(filters)}`

    const payload = await withBusinessCache(
      cacheKey,
      async () => {
        const [clientes, total] = await Promise.all([
          prisma.cliente.findMany({
            where,
            select: {
              id: true,
              tipo: true,
              nomeCompleto: true,
              razaoSocial: true,
              nomeFantasia: true,
              email: true,
              telefone: true,
              endereco: true,
              addressStreet: true,
              addressUnit: true,
              addressCity: true,
              addressState: true,
              addressZip: true,
              addressCounty: true,
              docLast4: true,
              status: true,
              criadoEm: true,
              atualizadoEm: true
            },
            orderBy,
            take: filters.pageSize,
            skip: offset
          }),
          prisma.cliente.count({ where })
        ])

        const data = clientes.map(cliente => ({
          id: cliente.id,
          tipo: cliente.tipo,
          nomeCompletoOuRazao: cliente.tipo === 'PF'
            ? (cliente.nomeCompleto || 'Nome não informado')
            : (cliente.nomeFantasia || cliente.razaoSocial || 'Razão social não informada'),
          email: cliente.email,
          telefone: formatTelefone(cliente.telefone || ''),
          endereco: cliente.endereco,
          addressStreet: cliente.addressStreet,
          addressUnit: cliente.addressUnit,
          addressCity: cliente.addressCity,
          addressState: cliente.addressState,
          addressZip: cliente.addressZip,
          addressCounty: cliente.addressCounty,
          documentoMasked: maskDocumento(cliente.docLast4 || '', cliente.tipo),
          ativo: cliente.status === 'ATIVO',
          criadoEm: cliente.criadoEm.toISOString(),
          atualizadoEm: cliente.atualizadoEm.toISOString()
        }))

        return { data, total }
      },
      { ttlSeconds: cacheTtlSeconds }
    )

    const totalPages = Math.ceil(payload.total / filters.pageSize)

    return NextResponse.json({
      data: payload.data,
      pagination: {
        page: filters.page,
        pageSize: filters.pageSize,
        total: payload.total,
        totalPages
      },
      success: true
    })

  });

/**
 * POST /api/clientes - Criar novo cliente
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
    // Rate limiting
    const rlPost = await apiRateLimit.isAllowed(request)
    if (!rlPost.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', message: rlPost.message, success: false },
        { status: 429, headers: { 'X-RateLimit-Remaining': rlPost.remaining.toString(), 'X-RateLimit-Reset': rlPost.resetTime.toString() } }
      )
    }

    // Verificar permissão de criação
    const _user = await requireClientePermission(request, 'canCreate')

    // Obter dados do body
    const body = await request.json()

    // Validar dados
    const validData = clienteCreateSchema.parse(body)

    // Sanitizar entrada
    const sanitizedData = sanitizeClienteInput(validData)

    // Consolidar documento principal (opcional) a partir de ssn/itin/ein
    let documentoPlano: string | null = null
    if (validData.tipo === 'PF') {
      if (sanitizedData.tipoDocumentoPF === 'SSN' && sanitizedData.ssn) documentoPlano = sanitizedData.ssn
      if (sanitizedData.tipoDocumentoPF === 'ITIN' && sanitizedData.itin) documentoPlano = sanitizedData.itin
    } else if (validData.tipo === 'PJ') {
      if (sanitizedData.ein) documentoPlano = sanitizedData.ein
    }

    // Verificar se documento já existe
    if (documentoPlano) {
      const documentoExists = await checkDocumentoExists(documentoPlano)
      if (documentoExists) {
        return NextResponse.json(
          { error: 'Conflict', message: 'Documento já cadastrado no sistema', success: false },
          { status: 409 }
        )
      }
    }

    // Verificar se já existe cliente com mesmo email
    const existingByEmail = await prisma.cliente.findFirst({
      where: { email: sanitizedData.email ?? undefined },
      select: {
        id: true,
        status: true,
        tipo: true
      }
    })

    // C2: POST com e-mail de cliente inativo exige fluxo explícito de reativação
    // Nunca sobrescrever dados automaticamente — evita herança silenciosa de histórico financeiro
    if (existingByEmail && existingByEmail.status === 'INATIVO') {
      return NextResponse.json(
        {
          error: 'Conflict',
          message: 'Já existe um cliente inativo com este e-mail. Use o endpoint de reativação explícita.',
          reactivable: true,
          existingClienteId: existingByEmail.id,
          success: false
        },
        { status: 409 }
      )
    }

    // Se já existir e estiver ATIVO, bloquear
    if (existingByEmail) {
      return NextResponse.json(
        { error: 'Conflict', message: 'E-mail já cadastrado no sistema', success: false },
        { status: 409 }
      )
    }

    // Criptografar documento para novo cliente
    let documentoEnc: string | null = null
    let docLast4: string | null = null
    let docHash: string | null = null
    if (documentoPlano) {
      const enc = await encryptClienteData(documentoPlano)
      documentoEnc = enc.documentoEnc
      docLast4 = enc.docLast4
      docHash = enc.docHash
    }

    // Criar cliente
    const cliente = await prisma.cliente.create({
      data: {
        tipo: validData.tipo,
        nomeCompleto: sanitizedData.nomeCompleto,
        razaoSocial: sanitizedData.razaoSocial,
        nomeFantasia: sanitizedData.nomeFantasia,
        email: sanitizedData.email!,
        telefone: sanitizedData.telefone!,
        nomeChave: validData.tipo === 'PF'
          ? (sanitizedData.nomeCompleto || '')
          : (sanitizedData.nomeFantasia || sanitizedData.razaoSocial || ''),
        tipoDocumentoPF: validData.tipo === 'PF' ? (sanitizedData.tipoDocumentoPF ?? null) : null,
        documentoEnc,
        docLast4: docLast4 || undefined,
        docHash: docHash || undefined,
        endereco: (sanitizedData.endereco ?? undefined) as Prisma.InputJsonValue | undefined,
        // Novos campos de endereço (Strict - Type Safe)
        addressStreet: sanitizedData.addressStreet,
        addressUnit: sanitizedData.addressUnit,
        addressCity: sanitizedData.addressCity,
        addressState: sanitizedData.addressState,
        addressZip: sanitizedData.addressZip,
        addressCounty: sanitizedData.addressCounty,
        observacoes: sanitizedData.observacoes ?? undefined,
        status: 'ATIVO',
        ativo: true,
        atualizadoEm: new Date()
      },
      select: {
        id: true,
        tipo: true,
        nomeCompleto: true,
        razaoSocial: true,
        nomeFantasia: true,
        email: true,
        telefone: true,
        endereco: true,
        addressStreet: true,
        addressUnit: true,
        addressCity: true,
        addressState: true,
        addressZip: true,
        addressCounty: true,
        docLast4: true,
        status: true,
        criadoEm: true,
        atualizadoEm: true
      }
    })

    // Registrar auditoria
    const auditSafePayload = {
      tipo: sanitizedData.tipo,
      nomeCompleto: sanitizedData.nomeCompleto,
      razaoSocial: sanitizedData.razaoSocial,
      nomeFantasia: sanitizedData.nomeFantasia,
      email: sanitizedData.email,
      telefone: sanitizedData.telefone,
      endereco: sanitizedData.endereco,
      addressStreet: sanitizedData.addressStreet,
      addressUnit: sanitizedData.addressUnit,
      addressCity: sanitizedData.addressCity,
      addressState: sanitizedData.addressState,
      addressZip: sanitizedData.addressZip,
      addressCounty: sanitizedData.addressCounty,
      observacoes: sanitizedData.observacoes,
      documento: documentoPlano ? '[DOCUMENTO]' : null,
    }

    await logClienteAudit(
      cliente.id,
      'CREATE',
      auditSafePayload,
      Number(_user.id)
    )

    // Formatar resposta
    const response = {
      id: cliente.id,
      tipo: cliente.tipo,
      nomeCompletoOuRazao: cliente.tipo === 'PF'
        ? (cliente.nomeCompleto || 'Nome não informado')
        : (cliente.nomeFantasia || cliente.razaoSocial || 'Razão social não informada'),
      email: cliente.email,
      telefone: formatTelefone(cliente.telefone || ''),
      endereco: cliente.endereco,
      // Novos campos de endereço (Explicitly Returned)
      addressStreet: cliente.addressStreet,
      addressUnit: cliente.addressUnit,
      addressCity: cliente.addressCity,
      addressState: cliente.addressState,
      addressZip: cliente.addressZip,
      addressCounty: cliente.addressCounty,
      documentoMasked: maskDocumento(cliente.docLast4 || '', cliente.tipo),
      ativo: cliente.status === 'ATIVO',
      criadoEm: cliente.criadoEm.toISOString(),
      atualizadoEm: cliente.atualizadoEm.toISOString()
    }

    return NextResponse.json({ data: response, success: true }, { status: 201 })

  });
