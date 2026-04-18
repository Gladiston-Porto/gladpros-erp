import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';
import {
  buildClienteDependencyConflictDetails,
  getClientesBlockingDependenciesMap,
  hasBlockingDependencies,
} from '@/shared/lib/helpers/cliente';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/clients/[id] - Get client details
export const GET = withErrorHandler(async (request: NextRequest, { params }: RouteParams) => {
  const user = await requireUser(request);
  if (!can(user.role as Role, 'clientes', 'read')) {
    return NextResponse.json({ error: 'Forbidden', message: 'Sem permissão', success: false }, { status: 403 });
  }
  const { id } = await params;
  const clienteId = parseInt(id);

  if (isNaN(clienteId)) {
    return NextResponse.json({ error: 'Validation failed', message: 'ID inválido', success: false }, { status: 400 });
  }

  const cliente = await prisma.cliente.findUnique({
    where: { id: clienteId },
    select: {
      id: true,
      tipo: true,
      nomeCompleto: true,
      razaoSocial: true,
      nomeFantasia: true,
      email: true,
      telefone: true,
      status: true,
      ativo: true,
      addressStreet: true,
      addressUnit: true,
      addressCity: true,
      addressState: true,
      addressZip: true,
      addressCounty: true,
      observacoes: true,
      criadoEm: true,
      atualizadoEm: true,
      Proposta: {
        where: { deletedAt: null },
        select: { id: true, numeroProposta: true, titulo: true, status: true, valorEstimado: true, criadoEm: true },
        orderBy: { criadoEm: 'desc' },
        take: 20
      },
      ServiceOrders: {
        select: { id: true, ticketNumber: true, title: true, status: true, scheduledDate: true, total: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 20
      },
      invoices: {
        select: { id: true, numeroInvoice: true, status: true, valorTotal: true, criadoEm: true },
        orderBy: { criadoEm: 'desc' },
        take: 10
      },
      _count: {
        select: { Proposta: true, ServiceOrders: true, invoices: true }
      }
    }
  });

  if (!cliente) {
    return NextResponse.json({ error: 'Not Found', message: 'Cliente não encontrado', success: false }, { status: 404 });
  }

  return NextResponse.json(cliente);
});

// PATCH /api/clients/[id] - Update client
export const PATCH = withErrorHandler(async (request: NextRequest, { params }: RouteParams) => {
  const user = await requireUser(request);
  if (!can(user.role as Role, 'clientes', 'update')) {
    return NextResponse.json({ error: 'Forbidden', message: 'Sem permissão', success: false }, { status: 403 });
  }
  const { id } = await params;
  const clienteId = parseInt(id);

  if (isNaN(clienteId)) {
    return NextResponse.json({ error: 'Validation failed', message: 'ID inválido', success: false }, { status: 400 });
  }

  const existing = await prisma.cliente.findUnique({ where: { id: clienteId } });
  if (!existing) {
    return NextResponse.json({ error: 'Not Found', message: 'Cliente não encontrado', success: false }, { status: 404 });
  }

  const body = await request.json();

  // Allowed fields for update
  const allowedFields = [
    'nomeCompleto', 'razaoSocial', 'nomeFantasia', 'email', 'telefone',
    'tipo', 'addressStreet', 'addressUnit', 'addressCity', 'addressState',
    'addressZip', 'addressCounty', 'ssn', 'itin', 'ein',
    'tipoDocumentoPF', 'observacoes', 'ativo', 'status'
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = { atualizadoEm: new Date() };
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      data[field] = body[field];
    }
  }

  // Validate SSN format if provided (XXX-XX-XXXX or 9 digits)
  if (data.ssn && !/^\d{3}-?\d{2}-?\d{4}$/.test(data.ssn)) {
    return NextResponse.json({ error: 'SSN inválido. Formato: XXX-XX-XXXX' }, { status: 400 });
  }

  // Validate EIN format if provided (XX-XXXXXXX or 9 digits)
  if (data.ein && !/^\d{2}-?\d{7}$/.test(data.ein)) {
    return NextResponse.json({ error: 'EIN inválido. Formato: XX-XXXXXXX' }, { status: 400 });
  }

  // Validate ITIN format if provided (9XX-XX-XXXX)
  if (data.itin && !/^9\d{2}-?\d{2}-?\d{4}$/.test(data.itin)) {
    return NextResponse.json({ error: 'ITIN inválido. Formato: 9XX-XX-XXXX' }, { status: 400 });
  }

  // Update nomeChave for search
  if (data.nomeCompleto || data.nomeFantasia || data.razaoSocial) {
    data.nomeChave = (data.nomeFantasia || data.nomeCompleto || data.razaoSocial || existing.nomeChave || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  // Check email uniqueness if changing
  if (data.email && data.email !== existing.email) {
    const emailExists = await prisma.cliente.findFirst({ where: { email: data.email, id: { not: clienteId } } });
    if (emailExists) {
      return NextResponse.json({ error: 'Conflict', message: 'Email já está em uso por outro cliente', success: false }, { status: 409 });
    }
  }

  const requestedStatus = data.status === 'ATIVO' || data.ativo === true
    ? 'ATIVO'
    : data.status === 'INATIVO' || data.ativo === false
      ? 'INATIVO'
      : undefined;

  if (requestedStatus === 'INATIVO') {
    const dependencyMap = await getClientesBlockingDependenciesMap([clienteId]);
    const dependencyCounts = dependencyMap.get(clienteId) ?? {
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
        { status: 409 }
      );
    }
  }

  if (requestedStatus) {
    data.status = requestedStatus;
    data.ativo = requestedStatus === 'ATIVO';
  }

  const updated = await prisma.cliente.update({
    where: { id: clienteId },
    data
  });

  return NextResponse.json(updated);
});

// DELETE /api/clients/[id] - Soft delete client (set ativo=false)
export const DELETE = withErrorHandler(async (request: NextRequest, { params }: RouteParams) => {
  const user = await requireUser(request);
  if (!can(user.role as Role, 'clientes', 'delete')) {
    return NextResponse.json({ error: 'Forbidden', message: 'Sem permissão', success: false }, { status: 403 });
  }
  const { id } = await params;
  const clienteId = parseInt(id);

  if (isNaN(clienteId)) {
    return NextResponse.json({ error: 'Validation failed', message: 'ID inválido', success: false }, { status: 400 });
  }

  const existing = await prisma.cliente.findUnique({ where: { id: clienteId } });
  if (!existing) {
    return NextResponse.json({ error: 'Not Found', message: 'Cliente não encontrado', success: false }, { status: 404 });
  }

  const dependencyMap = await getClientesBlockingDependenciesMap([clienteId]);
  const dependencyCounts = dependencyMap.get(clienteId) ?? {
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
      { status: 409 }
    );
  }

  await prisma.cliente.update({
    where: { id: clienteId },
    data: { ativo: false, status: 'INATIVO', atualizadoEm: new Date() }
  });

  return NextResponse.json({ message: 'Cliente desativado com sucesso' });
});
