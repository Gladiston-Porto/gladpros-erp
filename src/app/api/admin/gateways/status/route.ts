import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser } from '@/shared/lib/rbac';
import { getFinanceGateway, getInventoryGateway, getTriageGateway } from '@/domains/projects/gateways';

// GET /api/admin/gateways/status — Health check for all gateways (admin only)
export const GET = withErrorHandler(async (request: NextRequest) => {
  const user = await requireUser(request);

  if (String(user.role).toUpperCase() !== 'ADMIN') {
    return NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 });
  }

  const isMock = process.env.USE_MOCK_GATEWAYS === 'true' || process.env.NODE_ENV === 'test';

  const [financeOk, inventoryOk, triageOk] = await Promise.allSettled([
    getFinanceGateway().verificarConexao(),
    getInventoryGateway().verificarConexao(),
    getTriageGateway().verificarConexao(),
  ]);

  return NextResponse.json({
    mode: isMock ? 'mock' : 'prisma',
    gateways: {
      finance: {
        name: 'Financeiro',
        connected: financeOk.status === 'fulfilled' ? financeOk.value : false,
        error: financeOk.status === 'rejected' ? String(financeOk.reason) : undefined,
      },
      inventory: {
        name: 'Estoque',
        connected: inventoryOk.status === 'fulfilled' ? inventoryOk.value : false,
        error: inventoryOk.status === 'rejected' ? String(inventoryOk.reason) : undefined,
      },
      triage: {
        name: 'Triagem',
        connected: triageOk.status === 'fulfilled' ? triageOk.value : false,
        error: triageOk.status === 'rejected' ? String(triageOk.reason) : undefined,
      },
    },
  });
});
