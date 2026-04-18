import { NextRequest, NextResponse } from 'next/server';
import { requireUser, can, type Role } from '@/shared/lib/rbac';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/api/error-handler';
import { createInvoiceOverdueSteps } from '@/server/playbooks/invoice-overdue';

// ── POST /api/invoices/overdue ────────────────────────────────────────────────
// Executa o playbook de invoice vencida para todas as invoices past-due
// Pode ser chamado por job agendado ou manualmente por ADMIN/GERENTE/FINANCEIRO

export const POST = withErrorHandler(async (req: NextRequest) => {
  const user = await requireUser(req);
  if (!can(user.role as Role, 'invoices', 'update')) {
    return NextResponse.json(
      { error: 'Forbidden', message: 'Sem permissão', success: false },
      { status: 403 },
    );
  }

  // Busca todas as invoices não-pagas/canceladas/overdue com vencimento no passado
  const candidatas = await prisma.invoice.findMany({
    where: {
      status: { notIn: ['PAID', 'CANCELLED', 'OVERDUE'] },
      dataVencimento: { lt: new Date() },
    },
    select: { id: true },
  });

  const resultados: Array<{
    invoiceId: number;
    ok: boolean;
    steps: Array<{ step: string; ok: boolean; detail?: string }>;
  }> = [];

  for (const invoice of candidatas) {
    const ctx = { invoiceId: invoice.id, correlationId: crypto.randomUUID() };
    const steps = createInvoiceOverdueSteps(ctx);
    const stepResults: Array<{ step: string; ok: boolean; detail?: string }> = [];
    let ok = true;

    for (const step of steps) {
      try {
        await step.run(ctx);
        stepResults.push({ step: step.name, ok: true });
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        stepResults.push({ step: step.name, ok: false, detail });
        ok = false;
        break; // interrompe o playbook desta invoice em caso de erro
      }
    }

    resultados.push({ invoiceId: invoice.id, ok, steps: stepResults });
  }

  const processadas = resultados.filter((r) => r.ok).length;
  const falhas = resultados.filter((r) => !r.ok).length;

  return NextResponse.json({
    data: {
      total: candidatas.length,
      processadas,
      falhas,
      resultados,
    },
    success: true,
  });
});
