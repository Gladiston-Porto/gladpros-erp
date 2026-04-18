/**
 * Invoice PDF Generation Service
 * Uses pdf-lib for real PDF generation (same pattern as proposta-pdf.ts)
 */

interface InvoiceItem {
  descricao: string;
  quantidade: number | { toNumber(): number };
  unidade: string;
  precoUnitario: number | { toNumber(): number };
  desconto: number | { toNumber(): number };
  subtotal: number | { toNumber(): number };
}

interface InvoicePayment {
  valor: number | { toNumber(): number };
  dataPagamento: Date;
  metodoPagamento: string;
  referencia?: string | null;
}

interface InvoiceData {
  numeroInvoice: string;
  dataEmissao: Date;
  dataVencimento: Date;
  subtotal: number | { toNumber(): number };
  descontoValor: number | { toNumber(): number };
  taxRate: number | { toNumber(): number };
  taxAmount: number | { toNumber(): number };
  valorTotal: number | { toNumber(): number };
  valorPago: number | { toNumber(): number };
  saldo: number | { toNumber(): number };
  status: string;
  notas?: string | null;
  termos?: string | null;
  cliente: {
    nomeCompleto?: string | null;
    nomeFantasia?: string | null;
    nomeChave: string;
    email: string;
    telefone: string;
    addressStreet?: string | null;
    addressCity?: string | null;
    addressState?: string | null;
    addressZip?: string | null;
  };
  projeto?: {
    nome: string;
  } | null;
  itens: InvoiceItem[];
  pagamentos: InvoicePayment[];
}

function toNum(val: number | { toNumber(): number } | null | undefined): number {
  if (val == null) return 0;
  if (typeof val === 'number') return val;
  return val.toNumber();
}

function formatCurrency(val: number): string {
  return `$ ${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function wrapText(text: string, maxLength: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + word).length > maxLength) {
      if (currentLine) {
        lines.push(currentLine.trim());
        currentLine = word;
      } else {
        lines.push(word);
        currentLine = '';
      }
    } else {
      currentLine += (currentLine ? ' ' : '') + word;
    }
  }

  if (currentLine) {
    lines.push(currentLine.trim());
  }

  return lines;
}

/**
 * Generate a real PDF for an invoice using pdf-lib
 */
export async function generateInvoicePDF(invoice: InvoiceData): Promise<Buffer> {
  const { PDFDocument, rgb } = await import('pdf-lib');

  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([612, 792]); // US Letter
  const { width, height } = page.getSize();

  const margin = 50;
  const rightMargin = width - margin;
  let y = height - margin;

  const colorPrimary = rgb(0, 0.596, 0.855); // #0098DA
  const colorDark = rgb(0.15, 0.15, 0.15);
  const colorGray = rgb(0.4, 0.4, 0.4);
  const colorLightGray = rgb(0.85, 0.85, 0.85);

  // Helper to check if we need a new page
  function checkNewPage(needed: number) {
    if (y < margin + needed) {
      page = pdfDoc.addPage([612, 792]);
      y = height - margin;
    }
  }

  // ── HEADER ──
  page.drawText('GLADPROS', {
    x: margin,
    y,
    size: 24,
    color: colorPrimary,
  });

  page.drawText('INVOICE', {
    x: rightMargin - 120,
    y,
    size: 22,
    color: colorDark,
  });

  y -= 25;

  // Invoice metadata (right-aligned)
  page.drawText(`Invoice #: ${invoice.numeroInvoice}`, {
    x: rightMargin - 200,
    y,
    size: 10,
    color: colorGray,
  });
  y -= 14;
  page.drawText(`Date: ${formatDate(invoice.dataEmissao)}`, {
    x: rightMargin - 200,
    y,
    size: 10,
    color: colorGray,
  });
  y -= 14;
  page.drawText(`Due: ${formatDate(invoice.dataVencimento)}`, {
    x: rightMargin - 200,
    y,
    size: 10,
    color: colorGray,
  });
  y -= 14;
  page.drawText(`Status: ${invoice.status}`, {
    x: rightMargin - 200,
    y,
    size: 10,
    color: colorGray,
  });

  // Reset y for left side content (Bill To)
  y -= 20;

  // ── Horizontal line ──
  page.drawLine({
    start: { x: margin, y },
    end: { x: rightMargin, y },
    thickness: 1,
    color: colorLightGray,
  });
  y -= 25;

  // ── BILL TO ──
  page.drawText('BILL TO', {
    x: margin,
    y,
    size: 11,
    color: colorPrimary,
  });

  if (invoice.projeto) {
    page.drawText('PROJECT', {
      x: 300,
      y,
      size: 11,
      color: colorPrimary,
    });
  }

  y -= 16;

  const clientName = invoice.cliente.nomeFantasia || invoice.cliente.nomeCompleto || invoice.cliente.nomeChave;
  page.drawText(clientName, {
    x: margin,
    y,
    size: 10,
    color: colorDark,
  });

  if (invoice.projeto) {
    page.drawText(invoice.projeto.nome, {
      x: 300,
      y,
      size: 10,
      color: colorDark,
    });
  }

  y -= 14;

  page.drawText(invoice.cliente.email, {
    x: margin,
    y,
    size: 9,
    color: colorGray,
  });
  y -= 12;

  page.drawText(invoice.cliente.telefone, {
    x: margin,
    y,
    size: 9,
    color: colorGray,
  });
  y -= 12;

  // Address
  if (invoice.cliente.addressStreet) {
    const addr = [
      invoice.cliente.addressStreet,
      [invoice.cliente.addressCity, invoice.cliente.addressState, invoice.cliente.addressZip]
        .filter(Boolean)
        .join(', '),
    ]
      .filter(Boolean)
      .join(', ');
    page.drawText(addr, {
      x: margin,
      y,
      size: 9,
      color: colorGray,
    });
    y -= 12;
  }

  y -= 15;

  // ── LINE ITEMS TABLE ──

  // Table header
  const colX = {
    desc: margin,
    qty: 310,
    unit: 360,
    price: 420,
    subtotal: rightMargin - 60,
  };

  page.drawRectangle({
    x: margin,
    y: y - 2,
    width: rightMargin - margin,
    height: 18,
    color: rgb(0.95, 0.95, 0.95),
  });

  page.drawText('Description', { x: colX.desc + 4, y: y + 2, size: 9, color: colorDark });
  page.drawText('Qty', { x: colX.qty, y: y + 2, size: 9, color: colorDark });
  page.drawText('Unit', { x: colX.unit, y: y + 2, size: 9, color: colorDark });
  page.drawText('Price', { x: colX.price, y: y + 2, size: 9, color: colorDark });
  page.drawText('Amount', { x: colX.subtotal, y: y + 2, size: 9, color: colorDark });

  y -= 22;

  // Table rows
  for (const item of invoice.itens) {
    checkNewPage(30);

    const descLines = wrapText(item.descricao, 45);
    const qty = toNum(item.quantidade);
    const price = toNum(item.precoUnitario);
    const sub = toNum(item.subtotal);

    page.drawText(descLines[0] || '', { x: colX.desc + 4, y, size: 9, color: colorDark });
    page.drawText(qty.toString(), { x: colX.qty, y, size: 9, color: colorDark });
    page.drawText(item.unidade, { x: colX.unit, y, size: 9, color: colorDark });
    page.drawText(formatCurrency(price), { x: colX.price, y, size: 9, color: colorDark });
    page.drawText(formatCurrency(sub), { x: colX.subtotal, y, size: 9, color: colorDark });
    y -= 14;

    // Additional description lines
    for (let i = 1; i < descLines.length; i++) {
      page.drawText(descLines[i], { x: colX.desc + 4, y, size: 8, color: colorGray });
      y -= 12;
    }

    // Light separator line
    page.drawLine({
      start: { x: margin, y: y + 4 },
      end: { x: rightMargin, y: y + 4 },
      thickness: 0.5,
      color: rgb(0.9, 0.9, 0.9),
    });

    y -= 4;
  }

  y -= 10;

  // ── TOTALS ──
  const totalsX = 400;
  const totalsValX = rightMargin - 60;

  checkNewPage(100);

  page.drawLine({
    start: { x: totalsX - 10, y: y + 5 },
    end: { x: rightMargin, y: y + 5 },
    thickness: 1,
    color: colorLightGray,
  });

  y -= 5;

  page.drawText('Subtotal:', { x: totalsX, y, size: 10, color: colorGray });
  page.drawText(formatCurrency(toNum(invoice.subtotal)), {
    x: totalsValX,
    y,
    size: 10,
    color: colorDark,
  });
  y -= 16;

  const discount = toNum(invoice.descontoValor);
  if (discount > 0) {
    page.drawText('Discount:', { x: totalsX, y, size: 10, color: colorGray });
    page.drawText(`-${formatCurrency(discount)}`, {
      x: totalsValX,
      y,
      size: 10,
      color: rgb(0.8, 0, 0),
    });
    y -= 16;
  }

  const taxRate = toNum(invoice.taxRate);
  page.drawText(`Tax (${(taxRate * 100).toFixed(2)}%):`, { x: totalsX, y, size: 10, color: colorGray });
  page.drawText(formatCurrency(toNum(invoice.taxAmount)), {
    x: totalsValX,
    y,
    size: 10,
    color: colorDark,
  });
  y -= 20;

  // Grand total with highlight
  page.drawRectangle({
    x: totalsX - 10,
    y: y - 4,
    width: rightMargin - totalsX + 10,
    height: 22,
    color: colorPrimary,
  });

  page.drawText('TOTAL:', {
    x: totalsX,
    y,
    size: 12,
    color: rgb(1, 1, 1),
  });
  page.drawText(formatCurrency(toNum(invoice.valorTotal)), {
    x: totalsValX,
    y,
    size: 12,
    color: rgb(1, 1, 1),
  });
  y -= 30;

  // Amount paid / Balance
  const paid = toNum(invoice.valorPago);
  if (paid > 0) {
    page.drawText('Amount Paid:', { x: totalsX, y, size: 10, color: colorGray });
    page.drawText(formatCurrency(paid), {
      x: totalsValX,
      y,
      size: 10,
      color: rgb(0, 0.5, 0),
    });
    y -= 16;

    page.drawText('Balance Due:', { x: totalsX, y, size: 11, color: colorDark });
    page.drawText(formatCurrency(toNum(invoice.saldo)), {
      x: totalsValX,
      y,
      size: 11,
      color: colorDark,
    });
    y -= 20;
  }

  // ── PAYMENTS HISTORY ──
  if (invoice.pagamentos.length > 0) {
    checkNewPage(60);
    y -= 10;

    page.drawText('PAYMENT HISTORY', {
      x: margin,
      y,
      size: 11,
      color: colorPrimary,
    });
    y -= 18;

    for (const pmt of invoice.pagamentos) {
      checkNewPage(20);
      const pmtLine = `${formatDate(pmt.dataPagamento)} — ${pmt.metodoPagamento} — ${formatCurrency(toNum(pmt.valor))}${pmt.referencia ? ` (Ref: ${pmt.referencia})` : ''}`;
      page.drawText(pmtLine, {
        x: margin,
        y,
        size: 9,
        color: colorGray,
      });
      y -= 14;
    }
  }

  // ── NOTES / TERMS ──
  if (invoice.notas) {
    checkNewPage(50);
    y -= 15;
    page.drawText('NOTES', { x: margin, y, size: 11, color: colorPrimary });
    y -= 16;

    const noteLines = wrapText(invoice.notas, 90);
    for (const line of noteLines) {
      checkNewPage(15);
      page.drawText(line, { x: margin, y, size: 9, color: colorGray });
      y -= 12;
    }
  }

  if (invoice.termos) {
    checkNewPage(50);
    y -= 15;
    page.drawText('TERMS & CONDITIONS', { x: margin, y, size: 11, color: colorPrimary });
    y -= 16;

    const termLines = wrapText(invoice.termos, 90);
    for (const line of termLines) {
      checkNewPage(15);
      page.drawText(line, { x: margin, y, size: 9, color: colorGray });
      y -= 12;
    }
  }

  // ── FOOTER ──
  page.drawText('Thank you for your business!', {
    x: margin,
    y: margin - 10,
    size: 9,
    color: colorGray,
  });

  page.drawText('Generated by GladPros', {
    x: rightMargin - 130,
    y: margin - 10,
    size: 8,
    color: colorLightGray,
  });

  // Serialize PDF
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
