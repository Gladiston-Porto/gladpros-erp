// src/app/api/clientes/[id]/toggle-status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireClientePermission } from '@/shared/lib/rbac';
import { clienteParamsSchema } from '@/shared/lib/validations/cliente';
import {
  buildClienteDependencyConflictDetails,
  getClientesBlockingDependenciesMap,
  hasBlockingDependencies,
  logClienteAudit,
} from '@/shared/lib/helpers/cliente';
import { withErrorHandler } from '@/lib/api/error-handler';

export const PUT = withErrorHandler(
  async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
    // Verificar permissão de atualização
    const user = await requireClientePermission(request, 'canUpdate');

    const params = await context.params;
    const { id } = clienteParamsSchema.parse(params);

    // Verificar se o cliente existe (scoped por empresa)
    const existingCliente = await prisma.cliente.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        nomeCompleto: true,
        nomeFantasia: true,
        razaoSocial: true,
        tipo: true,
      },
    });

    if (!existingCliente) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Cliente não encontrado', success: false },
        { status: 404 },
      );
    }

    // Toggle status
    const newStatus = existingCliente.status === 'ATIVO' ? 'INATIVO' : 'ATIVO';

    if (newStatus === 'INATIVO') {
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
    }

    // Atualizar cliente (scoped por empresa)
    await prisma.cliente.update({
      where: { id },
      data: {
        status: newStatus,
        ativo: newStatus === 'ATIVO',
        atualizadoEm: new Date(),
      },
    });

    // Auditoria
    await logClienteAudit(
      id,
      'UPDATE',
      { status: { old: existingCliente.status, new: newStatus } },
      Number(user.id),
    );

    // Obter nome para resposta
    const nomeCliente =
      existingCliente.tipo === 'PF'
        ? existingCliente.nomeCompleto
        : existingCliente.nomeFantasia || existingCliente.razaoSocial;

    return NextResponse.json({
      data: {
        message: `Cliente "${nomeCliente}" ${newStatus === 'ATIVO' ? 'ativado' : 'desativado'} com sucesso`,
        status: newStatus,
      },
      success: true,
    });
  },
);
