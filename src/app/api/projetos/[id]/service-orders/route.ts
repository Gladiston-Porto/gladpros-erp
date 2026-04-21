/**
 * GET /api/projetos/[id]/service-orders
 * Retorna as Service Orders vinculadas a um projeto.
 * Requer permissão de leitura no módulo projetos.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireProjectPermission } from '@/shared/lib/rbac-projects';
import { withErrorHandler } from '@/lib/api/error-handler';
import { apiRateLimit } from '@/shared/lib/rate-limit';

export const GET = withErrorHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { allowed, resetTime } = await apiRateLimit.isAllowed(req);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too Many Requests', message: 'Muitas requisições. Tente novamente em instantes.', success: false },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((resetTime - Date.now()) / 1000)) } }
    );
  }

  await requireProjectPermission(req, 'canRead');

  const { id } = await params;
  const projetoId = parseInt(id, 10);

  if (isNaN(projetoId)) {
    return NextResponse.json(
      { error: 'ID inválido', message: 'O ID do projeto deve ser um número válido', success: false },
      { status: 400 }
    );
  }

  const exists = await prisma.projeto.findUnique({
    where: { id: projetoId },
    select: { id: true },
  });

  if (!exists) {
    return NextResponse.json(
      { error: 'Projeto não encontrado', message: 'Nenhum projeto com este ID', success: false },
      { status: 404 }
    );
  }

  const serviceOrders = await prisma.serviceOrder.findMany({
    where: { projetoId },
    select: {
      id: true,
      ticketNumber: true,
      title: true,
      description: true,
      status: true,
      priority: true,
      scheduledDate: true,
      scheduleDateStart: true,
      scheduleDateEnd: true,
      total: true,
      createdAt: true,
      Cliente: {
        select: { id: true, nomeCompleto: true, nomeFantasia: true },
      },
      AssignedWorker: {
        select: { id: true, name: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return NextResponse.json({ data: serviceOrders, success: true });
});
