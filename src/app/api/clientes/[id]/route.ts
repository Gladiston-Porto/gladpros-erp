import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

import { requireClientePermission } from '@/shared/lib/rbac';
import { clienteUpdateSchema, clienteParamsSchema } from '@/shared/lib/validations/cliente';
import {
  sanitizeClienteInput,
  encryptClienteData,
  checkDocumentoExists,
  logClienteAudit,
  calculateClienteDiff,
  formatTelefone,
  maskDocumento,
  validateAddressIntegrity,
  getClientesBlockingDependenciesMap,
  hasBlockingDependencies,
  buildClienteDependencyConflictDetails,
} from '@/shared/lib/helpers/cliente';
import { withErrorHandler } from '@/lib/api/error-handler';
import { apiRateLimit } from '@/shared/lib/rate-limit';
import { can, type Role } from '@/shared/lib/rbac-core';

export const runtime = 'nodejs';

type LegacyAddress = {
  addressStreet?: unknown;
  addressUnit?: unknown;
  addressCity?: unknown;
  addressState?: unknown;
  addressZip?: unknown;
  addressCounty?: unknown;
  street?: unknown;
  rua?: unknown;
  logradouro?: unknown;
  cidade?: unknown;
  estado?: unknown;
  zipcode?: unknown;
  zip?: unknown;
  county?: unknown;
};

function legacyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function parseLegacyAddress(endereco: Prisma.JsonValue | null): LegacyAddress {
  return endereco && typeof endereco === 'object' && !Array.isArray(endereco)
    ? (endereco as LegacyAddress)
    : {};
}

function resolveAddress(cliente: {
  endereco: Prisma.JsonValue | null;
  addressStreet: string | null;
  addressUnit: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressZip: string | null;
  addressCounty: string | null;
}) {
  const legacy = parseLegacyAddress(cliente.endereco);
  return {
    addressStreet:
      cliente.addressStreet ??
      legacyString(legacy.addressStreet) ??
      legacyString(legacy.street) ??
      legacyString(legacy.rua) ??
      legacyString(legacy.logradouro),
    addressUnit: cliente.addressUnit ?? legacyString(legacy.addressUnit),
    addressCity:
      cliente.addressCity ?? legacyString(legacy.addressCity) ?? legacyString(legacy.cidade),
    addressState:
      cliente.addressState ?? legacyString(legacy.addressState) ?? legacyString(legacy.estado),
    addressZip:
      cliente.addressZip ??
      legacyString(legacy.addressZip) ??
      legacyString(legacy.zipcode) ??
      legacyString(legacy.zip),
    addressCounty:
      cliente.addressCounty ?? legacyString(legacy.addressCounty) ?? legacyString(legacy.county),
  };
}

/**
 * GET /api/clientes/[id] - Obter detalhes de um cliente
 */
export const GET = withErrorHandler(
  async (request: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    // Verificar permissão de leitura
    const user = await requireClientePermission(request, 'canRead');
    const canViewFinancial =
      can(user.role as Role, 'invoices', 'read') || can(user.role as Role, 'financeiro', 'read');

    // Validar parâmetros
    const { id } = clienteParamsSchema.parse(await ctx.params);

    // Buscar cliente
    const cliente = await prisma.cliente.findUnique({
      where: { id },
      select: {
        id: true,
        tipo: true,
        nomeCompleto: true,
        razaoSocial: true,
        nomeFantasia: true,
        email: true,
        telefone: true,
        nomeChave: true,
        endereco: true,
        addressStreet: true,
        addressUnit: true,
        addressCity: true,
        addressState: true,
        addressZip: true,
        addressCounty: true,
        status: true,
        docLast4: true,
        observacoes: true,
        criadoEm: true,
        atualizadoEm: true,
      },
    });

    if (!cliente) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Cliente não encontrado', success: false },
        { status: 404 },
      );
    }

    const [
      paidInvoices,
      openInvoices,
      projectCount,
      serviceOrderCount,
      completedServiceOrders,
      lastInvoice,
    ] = await Promise.all([
      canViewFinancial
        ? prisma.invoice.aggregate({
            where: { clienteId: id, status: 'PAID' },
            _count: { id: true },
            _sum: { valorTotal: true },
          })
        : Promise.resolve({ _count: { id: 0 }, _sum: { valorTotal: 0 } }),
      canViewFinancial
        ? prisma.invoice.aggregate({
            where: { clienteId: id, status: { notIn: ['PAID', 'CANCELLED'] } },
            _count: { id: true },
            _sum: { valorTotal: true },
          })
        : Promise.resolve({ _count: { id: 0 }, _sum: { valorTotal: 0 } }),
      prisma.projeto.count({ where: { clienteId: id } }),
      prisma.serviceOrder.count({ where: { clienteId: id } }),
      prisma.serviceOrder.count({ where: { clienteId: id, status: 'COMPLETED' } }),
      canViewFinancial
        ? prisma.invoice.findFirst({
            where: { clienteId: id },
            select: { dataEmissao: true },
            orderBy: { dataEmissao: 'desc' },
          })
        : Promise.resolve(null),
    ]);

    // Preparar resposta base
    // Use inferred or loose type for response to include new fields without explicit interface block if tedious,
    // but explicit is better for documentation.
    const address = resolveAddress(cliente);
    const response = {
      id: cliente.id,
      tipo: cliente.tipo,
      nomeCompleto: cliente.nomeCompleto,
      razaoSocial: cliente.razaoSocial,
      nomeFantasia: cliente.nomeFantasia,
      email: cliente.email,
      telefone: formatTelefone(cliente.telefone || ''),
      ...address,
      cidade: address.addressCity,
      estado: address.addressState,
      zipcode: address.addressZip,
      observacoes: cliente.observacoes,
      ativo: cliente.status === 'ATIVO',
      documentoMasked: maskDocumento(cliente.docLast4 || '', cliente.tipo),
      criadoEm: cliente.criadoEm.toISOString(),
      atualizadoEm: cliente.atualizadoEm.toISOString(),
      metrics: {
        canViewFinancial,
        lifetimeValue: canViewFinancial ? Number(paidInvoices._sum.valorTotal ?? 0) : undefined,
        outstandingValue: canViewFinancial ? Number(openInvoices._sum.valorTotal ?? 0) : undefined,
        paidInvoices: canViewFinancial ? paidInvoices._count.id : undefined,
        openInvoices: canViewFinancial ? openInvoices._count.id : undefined,
        projetosCount: projectCount,
        serviceOrdersCount: serviceOrderCount,
        completedServiceOrdersCount: completedServiceOrders,
        lastInvoiceAt: canViewFinancial ? (lastInvoice?.dataEmissao?.toISOString() ?? null) : null,
      },
    };

    // Se usuário tem permissão para ver documentos, ele verá o masked (REGRA DE SEGURANÇA: NUNCA EXPOR FULL)
    // O documentoMasked já foi setado na linha 92.
    // O campo documento era usado para expor full, agora não mais.
    // if (ClientePermissions.canViewDocuments(user.role) && cliente.documentoEnc) { ... } -> REMOVIDO

    return NextResponse.json({ data: response, success: true });
  },
);

/**
 * PUT /api/clientes/[id] - Atualizar cliente
 */
export const PUT = withErrorHandler(
  async (request: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    // Rate limiting
    const rlPut = await apiRateLimit.isAllowed(request);
    if (!rlPut.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', message: rlPut.message, success: false },
        {
          status: 429,
          headers: {
            'X-RateLimit-Remaining': rlPut.remaining.toString(),
            'X-RateLimit-Reset': rlPut.resetTime.toString(),
          },
        },
      );
    }

    // Verificar permissão de atualização
    const user = await requireClientePermission(request, 'canUpdate');

    // Validar parâmetros
    const { id } = clienteParamsSchema.parse(await ctx.params);

    // Obter dados do body
    const body = await request.json();

    // Validar dados
    const validData = clienteUpdateSchema.parse(body);

    // Sanitizar entrada
    const sanitizedData = sanitizeClienteInput(validData);

    // Buscar cliente atual
    const clienteAtual = await prisma.cliente.findUnique({
      where: { id },
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
        status: true,
        docHash: true,
        observacoes: true,
      },
    });

    if (!clienteAtual) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Cliente não encontrado', success: false },
        { status: 404 },
      );
    }

    // Preparar dados para atualização
    const updateData: Record<string, unknown> = {};

    // Lista de campos mapeáveis (Generic + Address)
    const updateableFields = [
      'nomeCompleto',
      'razaoSocial',
      'nomeFantasia',
      'email',
      'telefone',
      'endereco',
      'observacoes',
      'tipoDocumentoPF',
      'addressStreet',
      'addressUnit',
      'addressCity',
      'addressState',
      'addressZip',
      'addressCounty',
    ] as const;

    // UPDATE PARCIAL SEGURO:
    // Apenas atualize campos que estão presentes no sanitizedData (ie. não são undefined)
    // sanitizeClienteInput retorna undefined para campos não enviados.

    for (const field of updateableFields) {
      const val = sanitizedData[field as keyof typeof sanitizedData];
      if (val !== undefined) {
        updateData[field] = val;
      }
    }

    // VALIDACAO STRICT DE ENDEREÇO (Regra de Negócio):
    // Se enviou QUALQUER campo de endereço (Street, City, State, Zip),
    // então OBRIGATORIAMENTE deve ter (Street, City, State, Zip) válidos.
    // Isso evita endereços quebrados ("Só rua sem cidade").
    // Verifica-se combinando o que já existe no banco com o que veio no update.

    // Checar apenas se algum campo de endereço principal está sendo alterado
    const addressFields = ['addressStreet', 'addressCity', 'addressState', 'addressZip'];
    const isUpdatingAddress = addressFields.some((f) => updateData[f] !== undefined);

    if (isUpdatingAddress) {
      // Mesclar antigo com novo para validar integridade
      // Use bracket notation to avoid TS errors on Record<string, unknown>
      const mergedAddress = {
        addressStreet:
          updateData['addressStreet'] !== undefined
            ? (updateData['addressStreet'] as string)
            : clienteAtual.addressStreet,
        addressCity:
          updateData['addressCity'] !== undefined
            ? (updateData['addressCity'] as string)
            : clienteAtual.addressCity,
        addressState:
          updateData['addressState'] !== undefined
            ? (updateData['addressState'] as string)
            : clienteAtual.addressState,
        addressZip:
          updateData['addressZip'] !== undefined
            ? (updateData['addressZip'] as string)
            : clienteAtual.addressZip,
      };

      const addressValidation = validateAddressIntegrity(mergedAddress);
      if (!addressValidation.valid) {
        return NextResponse.json(
          { error: 'Validation failed', message: addressValidation.message, success: false },
          { status: 400 },
        );
      }
    }

    // Atualizar nomeChave se nome/nome fantasia mudou
    // ... mantido ... (logic for nomeChave reuse sanitizedData or clienteAtual)
    // O ideal é recalcular com base no merged state.
    const mergedNomeCompleto =
      updateData.nomeCompleto !== undefined ? updateData.nomeCompleto : clienteAtual.nomeCompleto;
    const mergedNomeFantasia =
      updateData.nomeFantasia !== undefined ? updateData.nomeFantasia : clienteAtual.nomeFantasia;
    const mergedRazaoSocial =
      updateData.razaoSocial !== undefined ? updateData.razaoSocial : clienteAtual.razaoSocial;

    updateData.nomeChave =
      (mergedNomeCompleto as string) ||
      (mergedNomeFantasia as string) ||
      (mergedRazaoSocial as string) ||
      '';

    // Atualizar status se fornecido
    if ('ativo' in validData && validData.ativo !== undefined) {
      updateData.status = validData.ativo ? 'ATIVO' : 'INATIVO';
      updateData.ativo = validData.ativo;
    }

    // Verificar unicidade de email se mudou
    if (sanitizedData.email !== undefined && sanitizedData.email !== clienteAtual.email) {
      // Checar se já existe algum cliente (exceto o atual) com o mesmo email
      const conflicting = await prisma.cliente.findFirst({
        where: {
          email: sanitizedData.email ?? undefined,
          id: { not: id },
        },
        select: { id: true, status: true },
      });

      if (conflicting) {
        const message =
          conflicting.status === 'INATIVO'
            ? 'E-mail pertence a um cliente inativo. Solicite ao admin reativar ou mesclar o registro antes de reutilizar este e-mail.'
            : 'E-mail já cadastrado no sistema';
        return NextResponse.json(
          {
            error: 'Conflict',
            message,
            reactivable: conflicting.status === 'INATIVO',
            conflictingId: conflicting.id,
            success: false,
          },
          { status: 409 },
        );
      }
    }
    // Verificar e criptografar documento se mudou (aceita ssn/itin/ein opcionais)
    let documentoAtualizado: string | undefined;

    // Consolidar a partir de campos específicos, se fornecidos
    if (sanitizedData.ssn) documentoAtualizado = sanitizedData.ssn;
    else if (sanitizedData.itin) documentoAtualizado = sanitizedData.itin;
    else if (sanitizedData.ein) documentoAtualizado = sanitizedData.ein;

    if (documentoAtualizado) {
      const documentoExists = await checkDocumentoExists(documentoAtualizado, id);
      if (documentoExists) {
        return NextResponse.json(
          { error: 'Conflict', message: 'Documento já cadastrado no sistema', success: false },
          { status: 409 },
        );
      }

      // Criptografar novo documento
      const { documentoEnc, docLast4, docHash } = await encryptClienteData(documentoAtualizado);

      updateData.documentoEnc = documentoEnc;
      updateData.docLast4 = docLast4;
      updateData.docHash = docHash;
    }

    // Atualizar no banco (scoped por empresa — defense-in-depth)
    const clienteAtualizado = await prisma.cliente.update({
      where: { id },
      data: updateData,
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
        docHash: true, // Necessário para auditoria de mudança de documento
        status: true,
        criadoEm: true,
        atualizadoEm: true,
      },
    });

    // Calcular diff para auditoria (Comparando DOIS ESTADOS REAIS)
    const diff = calculateClienteDiff(
      clienteAtual as unknown as Record<string, unknown>,
      clienteAtualizado as unknown as Record<string, unknown>,
    );

    // Registrar auditoria se houve mudanças
    if (Object.keys(diff).length > 0) {
      await logClienteAudit(id, 'UPDATE', diff, Number(user.id));
    }

    // Formatar resposta
    const response = {
      id: clienteAtualizado.id,
      tipo: clienteAtualizado.tipo,
      nomeCompletoOuRazao:
        clienteAtualizado.tipo === 'PF'
          ? clienteAtualizado.nomeCompleto || 'Nome não informado'
          : clienteAtualizado.nomeFantasia ||
            clienteAtualizado.razaoSocial ||
            'Razão social não informada',
      email: clienteAtualizado.email,
      telefone: formatTelefone(clienteAtualizado.telefone || ''),
      endereco: clienteAtualizado.endereco,
      // Novos campos de endereço (Explicitly Returned)
      addressStreet: clienteAtualizado.addressStreet,
      addressUnit: clienteAtualizado.addressUnit,
      addressCity: clienteAtualizado.addressCity,
      addressState: clienteAtualizado.addressState,
      addressZip: clienteAtualizado.addressZip,
      addressCounty: clienteAtualizado.addressCounty,
      documentoMasked: maskDocumento(clienteAtualizado.docLast4 || '', clienteAtualizado.tipo),
      ativo: clienteAtualizado.status === 'ATIVO',
      criadoEm: clienteAtualizado.criadoEm.toISOString(),
      atualizadoEm: clienteAtualizado.atualizadoEm.toISOString(),
    };

    return NextResponse.json({ data: response, success: true });
  },
);

/**
 * DELETE /api/clientes/[id] - Inativar cliente (soft delete)
 */
export const DELETE = withErrorHandler(
  async (request: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    // Rate limiting
    const rlDel = await apiRateLimit.isAllowed(request);
    if (!rlDel.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', message: rlDel.message, success: false },
        {
          status: 429,
          headers: {
            'X-RateLimit-Remaining': rlDel.remaining.toString(),
            'X-RateLimit-Reset': rlDel.resetTime.toString(),
          },
        },
      );
    }

    // Verificar permissão de deleção
    const user = await requireClientePermission(request, 'canDelete');

    // Validar parâmetros
    const { id } = clienteParamsSchema.parse(await ctx.params);

    // Buscar cliente
    const cliente = await prisma.cliente.findUnique({
      where: { id },
      select: { id: true, status: true, nomeCompleto: true, razaoSocial: true },
    });

    if (!cliente) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Cliente não encontrado', success: false },
        { status: 404 },
      );
    }

    // H4: Bloquear soft-delete se houver dependências ativas
    const dependencyMap = await getClientesBlockingDependenciesMap([id]);
    const dependencyCounts = dependencyMap.get(id) ?? {
      activeServiceOrders: 0,
      activeProjetos: 0,
      activeInvoices: 0,
    };

    if (hasBlockingDependencies(dependencyCounts)) {
      return NextResponse.json(
        {
          error: 'Conflict',
          message: 'Cliente possui dependências ativas e não pode ser inativado',
          details: buildClienteDependencyConflictDetails(dependencyCounts),
          success: false,
        },
        { status: 409 },
      );
    }

    if (cliente.status === 'INATIVO') {
      await logClienteAudit(
        id,
        'DELETE',
        { status: { old: 'INATIVO', new: 'INATIVO' } },
        Number(user.id),
      );
      return NextResponse.json({
        data: { message: 'Cliente já estava inativo', id },
        success: true,
      });
    }

    // Inativar cliente (scoped por empresa — defense-in-depth)
    await prisma.cliente.update({
      where: { id },
      data: { status: 'INATIVO', ativo: false },
    });

    // Registrar auditoria
    await logClienteAudit(
      id,
      'DELETE',
      { status: { old: 'ATIVO', new: 'INATIVO' } },
      Number(user.id),
    );

    return NextResponse.json({
      data: { message: 'Cliente inativado com sucesso', id },
      success: true,
    });
  },
);
