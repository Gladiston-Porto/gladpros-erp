import { NextRequest, NextResponse } from 'next/server';
import { requireUser, can, type Role } from '@/shared/lib/rbac';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/api/error-handler';
import { Decimal } from '@prisma/client/runtime/library';

export const POST = withErrorHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireUser(req);
    if (!can(user.role as Role, 'invoices', 'create')) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Sem permissão para criar invoices', success: false },
        { status: 403 },
      );
    }

    const { id } = await params;
    const propostaId = parseInt(id);
    if (isNaN(propostaId)) {
      return NextResponse.json(
        { error: 'Not Found', message: 'ID de proposta inválido', success: false },
        { status: 404 },
      );
    }

    // Buscar proposta com etapas e materiais (escopo por empresaId para evitar acesso cross-tenant)
    const proposta = await prisma.proposta.findFirst({
      where: { id: propostaId, empresaId: user.empresaId, deletedAt: null },
      include: {
        PropostaEtapa: true,
        PropostaMaterial: true,
        Cliente: { select: { id: true, nomeCompleto: true, nomeFantasia: true } },
      },
    });

    if (!proposta) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Proposta não encontrada', success: false },
        { status: 404 },
      );
    }

    if (proposta.status !== 'APROVADA') {
      return NextResponse.json(
        {
          error: 'Conflict',
          message: `Proposta deve estar com status APROVADA para gerar invoice. Status atual: ${proposta.status}`,
          success: false,
        },
        { status: 409 },
      );
    }

    // Verificar se já existe invoice para esta proposta (evitar duplicatas)
    const existing = await prisma.invoice.findFirst({
      where: { propostaId },
      select: { id: true, numeroInvoice: true },
    });

    if (existing) {
      return NextResponse.json(
        {
          error: 'Conflict',
          message: `Já existe uma invoice para esta proposta: ${existing.numeroInvoice}`,
          invoiceId: existing.id,
          success: false,
        },
        { status: 409 },
      );
    }

    // Montar itens a partir das etapas e materiais
    type InvoiceItemInput = {
      tipo: 'SERVICE' | 'MATERIAL' | 'EQUIPMENT' | 'OTHER';
      descricao: string;
      quantidade: number;
      unidade: string;
      precoUnitario: number;
      desconto: number;
      subtotal: number;
      taxavel: boolean;
      propostaEtapaId?: number;
      materialId?: number;
      ordem: number;
    };

    const itens: InvoiceItemInput[] = [];

    if (proposta.PropostaEtapa.length > 0) {
      proposta.PropostaEtapa.forEach((etapa, idx) => {
        const qty = Number(etapa.quantidade ?? 1);
        const price = Number(etapa.custoMaoObraEstimado ?? 0);
        itens.push({
          tipo: 'SERVICE',
          descricao: `${etapa.servico}${etapa.descricao ? ': ' + etapa.descricao.slice(0, 200) : ''}`,
          quantidade: qty,
          unidade: etapa.unidade ?? 'hr',
          precoUnitario: price,
          desconto: 0,
          subtotal: qty * price,
          taxavel: true,
          propostaEtapaId: etapa.id,
          ordem: etapa.ordem ?? idx,
        });
      });
    }

    if (proposta.PropostaMaterial.length > 0) {
      proposta.PropostaMaterial.forEach((mat, idx) => {
        const qty = Number(mat.quantidade ?? 1);
        const price = Number(mat.precoUnitario ?? 0);
        itens.push({
          tipo: 'MATERIAL',
          descricao: mat.nome,
          quantidade: qty,
          unidade: mat.unidade ?? 'unit',
          precoUnitario: price,
          desconto: 0,
          subtotal: qty * price,
          taxavel: true,
          ordem: proposta.PropostaEtapa.length + idx,
        });
      });
    }

    // Se não há etapas nem materiais, criar item único a partir do valor estimado
    if (itens.length === 0) {
      const totalVal = Number(proposta.valorEstimado ?? 0);
      itens.push({
        tipo: 'SERVICE',
        descricao: proposta.titulo,
        quantidade: 1,
        unidade: 'job',
        precoUnitario: totalVal,
        desconto: 0,
        subtotal: totalVal,
        taxavel: true,
        ordem: 0,
      });
    }

    const subtotal = itens.reduce((sum, i) => sum + i.subtotal, 0);
    const taxRate = 0.0825; // Texas default
    const taxAmount = subtotal * taxRate;
    const valorTotal = subtotal + taxAmount;

    // Data de vencimento: 30 dias a partir de hoje
    const dataVencimento = new Date();
    dataVencimento.setDate(dataVencimento.getDate() + 30);

    const hoje = new Date();
    const dataStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' })
      .format(hoje)
      .replace(/-/g, '');

    const invoice = await prisma.$transaction(async (tx) => {
      const count = await tx.invoice.count({
        where: { numeroInvoice: { startsWith: `INV-${dataStr}` } },
      });
      const numeroInvoice = `INV-${dataStr}-${String(count + 1).padStart(4, '0')}`;

      const created = await tx.invoice.create({
        data: {
          numeroInvoice,
          clienteId: proposta.clienteId,
          propostaId,
          dataVencimento,
          subtotal: new Decimal(subtotal),
          descontoValor: new Decimal(0),
          descontoPercentual: new Decimal(0),
          taxRate: new Decimal(taxRate),
          taxAmount: new Decimal(taxAmount),
          valorTotal: new Decimal(valorTotal),
          valorPago: new Decimal(0),
          saldo: new Decimal(valorTotal),
          status: 'DRAFT',
          notas: `Invoice gerada a partir da proposta ${proposta.numeroProposta}`,
          criadoPor: Number(user.id),
          empresaId: user.empresaId,
          itens: { create: itens },
        },
        select: { id: true, numeroInvoice: true, valorTotal: true, status: true },
      });

      await tx.auditLog.create({
        data: {
          id: crypto.randomUUID(),
          userId: Number(user.id),
          entidade: 'Invoice',
          entidadeId: String(created.id),
          acao: 'CREATE',
          diff: JSON.stringify({
            origem: 'gerar_invoice_proposta',
            propostaId,
            numeroProposta: proposta.numeroProposta,
            numeroInvoice,
            valorTotal,
          }),
        },
      });

      return created;
    });

    return NextResponse.json(
      {
        data: {
          invoiceId: invoice.id,
          numeroInvoice: invoice.numeroInvoice,
          valorTotal: invoice.valorTotal,
        },
        success: true,
      },
      { status: 201 },
    );
  },
);
