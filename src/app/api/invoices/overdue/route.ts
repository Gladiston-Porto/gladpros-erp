import { NextRequest, NextResponse } from 'next/server';
import { requireUser, can, type Role } from '@/shared/lib/rbac';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/api/error-handler';
import { createInvoiceOverdueSteps } from '@/server/playbooks/invoice-overdue';

// ── POST /api/invoices/overdue ────────────────────────────────────────────────
// Executa o playbook de invoice vencida para todas as invoices past-due.
// Pode ser chamado por job agendado ou manualmente por ADMIN/GERENTE/FINANCEIRO.

const BATCH_SIZE = 5;

async function processInvoice(invoice: { id: number }): Promise<{
  invoiceId: number;
  ok: boolean;
  steps: Array<{ step: string; ok: boolean; detail?: string }>;
}> {
  const ctx = { invoiceId: invoice.id, correlationId: crypto.randomUUID() };
  const steps = createInvoiceOverdueSteps(ctx);
  const stepResults: Array<{ step: string; ok: boolean; detail?: string }> = [];
  let ok = true;

  // Steps within one invoice must be sequential (each may depend on the previous)
  for (const step of steps) {
    try {
      await step.run(ctx);
      stepResults.push({ step: step.name, ok: true });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      stepResults.push({ step: step.name, ok: false, detail });
      ok = false;
      break;
    }
  }

  return { invoiceId: invoice.id, ok, steps: stepResults };
}

export const POST = withErrorHandler(async (req: NextRequest) => {
  const user = await requireUser(req);
  if (!can(user.role as Role, 'invoices', 'update')) {
    return NextResponse.json(
      { error: 'Forbidden', message: 'Sem permissão', success: false },
      { status: 403 },
    );
  }

  const candidatas = await prisma.invoice.findMany({
    where: {
      empresaId: user.empresaId,
      status: { notIn: ['PAID', 'CANCELLED', 'OVERDUE'] },
      dataVencimento: { lt: new Date() },
    },
    take: 200,
    select: { id: true },
  });

  const resultados: Array<{
    invoiceId: number;
    ok: boolean;
    steps: Array<{ step: string; ok: boolean; detail?: string }>;
  }> = [];

  // Process invoices in parallel batches to avoid N+1 sequential latency
  for (let i = 0; i < candidatas.length; i += BATCH_SIZE) {
    const batch = candidatas.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(batch.map(processInvoice));
    resultados.push(...batchResults);
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
