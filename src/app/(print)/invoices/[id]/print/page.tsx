import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireServerUser } from '@/shared/lib/requireServerUser';
import { can, type Role } from '@/shared/lib/rbac-core';

/* ── Status mappings ── */
const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  SENT: 'Sent',
  VIEWED: 'Viewed',
  PARTIAL_PAID: 'Partial',
  PAID: 'Paid',
  OVERDUE: 'Overdue',
  CANCELLED: 'Cancelled',
};

const STATUS_CSS: Record<string, { bg: string; text: string; border: string }> = {
  DRAFT:        { bg: 'var(--draft-bg)',   text: 'var(--draft-text)',   border: 'rgba(245,158,11,.22)' },
  SENT:         { bg: '#eff6ff',           text: '#1d4ed8',            border: 'rgba(59,130,246,.22)' },
  VIEWED:       { bg: '#f5f3ff',           text: '#6d28d9',            border: 'rgba(139,92,246,.22)' },
  PARTIAL_PAID: { bg: '#fff7ed',           text: '#c2410c',            border: 'rgba(245,158,11,.22)' },
  PAID:         { bg: 'var(--success-bg)', text: 'var(--success-text)', border: 'rgba(4,120,87,.22)' },
  OVERDUE:      { bg: '#fef2f2',           text: '#dc2626',            border: 'rgba(220,38,38,.22)' },
  CANCELLED:    { bg: '#f9fafb',           text: '#9ca3af',            border: 'rgba(156,163,175,.22)' },
};

/* ── Helpers ── */
function toNum(val: { toNumber(): number } | number | null | undefined): number {
  if (val == null) return 0;
  if (typeof val === 'number') return val;
  return val.toNumber();
}

function fmt(val: { toNumber(): number } | number | null | undefined): string {
  const n = val == null ? 0 : typeof val === 'number' ? val : val.toNumber();
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function fmtDate(date: Date | null | undefined): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
}

function escHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ── Page ── */
export default async function InvoicePrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const invoiceId = parseInt(id, 10);
  if (isNaN(invoiceId)) notFound();

  const user = await requireServerUser();
  const role = user.role as Role;
  if (!can(role, 'invoices', 'read') || !['ADMIN', 'GERENTE', 'FINANCEIRO'].includes(role)) {
    notFound();
  }

  const [invoice, empresa] = await Promise.all([
    prisma.invoice.findFirst({
      where: { id: invoiceId, empresaId: user.empresaId },
      include: {
        itens: { orderBy: { ordem: 'asc' } },
        pagamentos: { where: { estornadoEm: null }, orderBy: { dataPagamento: 'asc' } },
        cliente: {
          select: {
            nomeCompleto: true,
            nomeFantasia: true,
            nomeChave: true,
            email: true,
            telefone: true,
            addressStreet: true,
            addressUnit: true,
            addressCity: true,
            addressState: true,
            addressZip: true,
          },
        },
        projeto: { select: { titulo: true, numeroProjeto: true } },
        ServiceOrder: {
          select: {
            ticketNumber: true,
            description: true,
            serviceAddressLine1: true,
            serviceAddressLine2: true,
            serviceCity: true,
            serviceState: true,
            serviceZip: true,
          },
        },
      },
    }),
    prisma.empresa.findFirst({ where: { id: user.empresaId, ativo: true } }),
  ]);

  if (!invoice) notFound();

  /* ── Data mapping ── */
  const companyName = empresa?.nome ?? 'GladPros Services LLC';
  const companyEmail = empresa?.email ?? 'financial@gladpros.com';
  const companyAddress = [
    empresa?.addressStreet,
    [empresa?.addressCity, empresa?.addressState, empresa?.addressZip].filter(Boolean).join(', '),
  ].filter(Boolean).join(', ') || '17671 Addison Rd, Dallas, TX 75287';

  const clientName =
    invoice.cliente.nomeFantasia ||
    invoice.cliente.nomeCompleto ||
    invoice.cliente.nomeChave;

  const clientAddr = [
    invoice.cliente.addressStreet,
    invoice.cliente.addressUnit,
    [invoice.cliente.addressCity, invoice.cliente.addressState, invoice.cliente.addressZip]
      .filter(Boolean)
      .join(', '),
  ]
    .filter(Boolean)
    .join(', ');

  const reference =
    invoice.ServiceOrder?.ticketNumber ??
    invoice.projeto?.numeroProjeto ??
    '—';

  const serviceAddress = invoice.ServiceOrder
    ? [
        invoice.ServiceOrder.serviceAddressLine1,
        invoice.ServiceOrder.serviceAddressLine2,
        [invoice.ServiceOrder.serviceCity, invoice.ServiceOrder.serviceState, invoice.ServiceOrder.serviceZip]
          .filter(Boolean)
          .join(', '),
      ].filter(Boolean).join(', ')
    : null;

  const subtotal = toNum(invoice.subtotal);
  const discount = toNum(invoice.descontoValor);
  const taxAmount = toNum(invoice.taxAmount);
  const taxRate = toNum(invoice.taxRate);
  const valorTotal = toNum(invoice.valorTotal);
  const valorPago = toNum(invoice.valorPago);
  const saldo = toNum(invoice.saldo);

  const statusLabel = STATUS_LABELS[invoice.status] ?? invoice.status;
  const statusStyle = STATUS_CSS[invoice.status] ?? STATUS_CSS.DRAFT;

  /* ── HTML chunks ── */
  const itemRows = invoice.itens
    .map((item) => {
      const qty = toNum(item.quantidade);
      const price = toNum(item.precoUnitario);
      const sub = toNum(item.subtotal);
      return `
        <tr>
          <td data-label="Description">
            <div class="desc-title">${escHtml(item.descricao)}</div>
          </td>
          <td data-label="Qty">${qty} ${escHtml(item.unidade ?? 'UN')}</td>
          <td data-label="Unit Price" class="ta-right">${fmt(price)}</td>
          <td data-label="Amount" class="ta-right">${fmt(sub)}</td>
        </tr>`;
    })
    .join('');

  const paymentRows = invoice.pagamentos
    .map(
      (p) => `
        <tr>
          <td>${fmtDate(p.dataPagamento)}</td>
          <td>${escHtml(p.metodoPagamento ?? 'OTHER')}</td>
          <td>${escHtml(p.referencia ?? '—')}</td>
          <td class="ta-right">${fmt(p.valor)}</td>
        </tr>`,
    )
    .join('');

  const notesContent = invoice.notas
    ? escHtml(invoice.notas)
    : 'Thank you for your business! Generated by GladPros.';

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: INVOICE_STYLES }} />

      <main className="page">
        <div className="top-bar" />

        <div className="wrap">
          {/* ── HEADER ── */}
          <section className="header">
            <div className="brand">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/invoice-logo.png" alt="GladPros" />

              <div className="brand-card">
                <div>
                  <div className="eyebrow">From</div>
                  <div className="company-name">{companyName}</div>
                  <div className="muted">
                    {companyAddress}<br />
                    {companyEmail}<br />
                    Electrical • Plumbing • Remodeling
                  </div>
                </div>

                <div>
                  <div className="eyebrow">Invoice summary</div>
                  <div className="muted">
                    {invoice.projeto
                      ? <>Project: {invoice.projeto.titulo}<br /></>
                      : null}
                    {invoice.ServiceOrder ? (
                      <>
                        Service Order: {invoice.ServiceOrder.ticketNumber}
                        {serviceAddress && <><br />{serviceAddress}</>}
                      </>
                    ) : null}
                    {!invoice.projeto && !invoice.ServiceOrder && (
                      <>Professional invoice generated by {companyName}.</>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <aside className="invoice-box">
              <div className="invoice-title">
                <h1>INVOICE</h1>
                <div
                  className="status"
                  style={{
                    background: statusStyle.bg,
                    color: statusStyle.text,
                    borderColor: statusStyle.border,
                  }}
                >
                  {statusLabel}
                </div>
              </div>

              <div className="meta-grid">
                <div className="meta-item">
                  <span>Invoice #</span>
                  <strong>{invoice.numeroInvoice}</strong>
                </div>
                <div className="meta-item">
                  <span>Date</span>
                  <strong>{fmtDate(invoice.dataEmissao)}</strong>
                </div>
                <div className="meta-item">
                  <span>Due date</span>
                  <strong>{fmtDate(invoice.dataVencimento)}</strong>
                </div>
                <div className="meta-item">
                  <span>Reference</span>
                  <strong>{reference}</strong>
                </div>
              </div>
            </aside>
          </section>

          {/* ── SECTION GRID: Bill To + Highlights ── */}
          <section className="section-grid">
            <div className="card">
              <div className="eyebrow">Bill to</div>
              <div className="client-name">{clientName}</div>
              <div className="muted">
                {invoice.cliente.email && <>{invoice.cliente.email}<br /></>}
                {invoice.cliente.telefone && <>{invoice.cliente.telefone}<br /></>}
                {clientAddr && <>{clientAddr}</>}
              </div>
            </div>

            <div className="card">
              <div className="eyebrow">Highlights</div>
              <div className="muted">
                {invoice.ServiceOrder?.description && (
                  <>{invoice.ServiceOrder.description}<br /><br /></>
                )}
                {invoice.projeto && (
                  <>Project: {invoice.projeto.titulo}<br /></>
                )}
                Items: {invoice.itens.length}
                {' · '}
                Due: {fmtDate(invoice.dataVencimento)}
                {valorPago > 0.005 && (
                  <>
                    <br />
                    Paid: {fmt(valorPago)} · Balance: {fmt(saldo)}
                  </>
                )}
              </div>
            </div>
          </section>

          {/* ── LINE ITEMS TABLE ── */}
          <section className="table-card">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '52%' }}>Description</th>
                  <th style={{ width: '12%' }}>Qty</th>
                  <th style={{ width: '18%' }}>Unit Price</th>
                  <th style={{ width: '18%' }}>Amount</th>
                </tr>
              </thead>
              <tbody dangerouslySetInnerHTML={{ __html: itemRows }} />
            </table>
          </section>

          {/* ── BOTTOM: Notes + Payment Summary ── */}
          <section className="bottom">
            <div className="card notes">
              <div className="eyebrow">Notes</div>
              <div
                className="notes-box"
                dangerouslySetInnerHTML={{
                  __html: notesContent.replace(/\n/g, '<br />'),
                }}
              />
            </div>

            <div className="card summary">
              <div className="eyebrow">Payment summary</div>

              <div className="summary-row">
                <span>Subtotal</span>
                <span>{fmt(subtotal)}</span>
              </div>

              {discount > 0.005 && (
                <div className="summary-row discount-row">
                  <span>Discount</span>
                  <span>-{fmt(discount)}</span>
                </div>
              )}

              <div className="summary-row">
                <span>Tax ({(taxRate * 100).toFixed(2)}%)</span>
                <span>{fmt(taxAmount)}</span>
              </div>

              <div className="summary-row total">
                <span>Total</span>
                <span>{fmt(valorTotal)}</span>
              </div>

              {valorPago > 0.005 && (
                <>
                  <div className="summary-row">
                    <span>Amount Paid</span>
                    <span className="paid-amount">{fmt(valorPago)}</span>
                  </div>
                  <div className="summary-row balance-row">
                    <span>Balance Due</span>
                    <span>{fmt(saldo)}</span>
                  </div>
                </>
              )}
            </div>
          </section>

          {/* ── PAYMENT HISTORY ── */}
          {invoice.pagamentos.length > 0 && (
            <section className="payments-section">
              <div className="card">
                <div className="eyebrow">Payment History</div>
                <table className="payments-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Method</th>
                      <th>Reference</th>
                      <th className="ta-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody dangerouslySetInnerHTML={{ __html: paymentRows }} />
                </table>
              </div>
            </section>
          )}

          {/* ── TERMS ── */}
          {invoice.termos && (
            <section className="terms-section">
              <div className="card">
                <div className="eyebrow">Terms &amp; Conditions</div>
                <div className="notes-box">{invoice.termos}</div>
              </div>
            </section>
          )}

          {/* ── FOOTER ── */}
          <footer className="footer">
            <div>
              <strong>{companyName}</strong> — Professional invoice for digital delivery, printing and PDF export.
            </div>
            <div>Generated by GladPros · gladpros.com</div>
          </footer>
        </div>
      </main>

      {/* ── PRINT BUTTON (screen only) ── */}
      <div className="print-note">
        <button type="button" className="print-note-btn">
          Print / Save as PDF
        </button>
        <script
          dangerouslySetInnerHTML={{
            __html: `document.querySelector('.print-note-btn').addEventListener('click',()=>window.print())`,
          }}
        />
      </div>
    </>
  );
}

/* ──────────────────────────────────────────────────────────
   CSS — Exact match of the user's original HTML template
   ────────────────────────────────────────────────────────── */
const INVOICE_STYLES = `
  :root {
    --gp-blue-dark: #3E4095;
    --gp-blue: #0098DA;
    --gp-orange: #F58634;
    --gp-red: #ED3237;
    --ink: #1f2937;
    --muted: #6b7280;
    --line: #e5e7eb;
    --paper: #ffffff;
    --bg: #eef2f7;
    --soft: #f8fafc;
    --success-bg: #ecfdf5;
    --success-text: #047857;
    --draft-bg: #fff7ed;
    --draft-text: #c2410c;
    --shadow: 0 18px 50px rgba(15, 23, 42, 0.08);
    --radius: 24px;
  }

  * { box-sizing: border-box; }

  body {
    margin: 0;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    background: #94a3b8;
    color: var(--ink);
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 32px 16px;
    min-height: 100vh;
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }

  .page {
    width: 210mm;
    min-height: 297mm;
    background: var(--paper);
    border-radius: 3px;
    overflow: hidden;
    box-shadow: 0 8px 48px rgba(0,0,0,.30);
    position: relative;
    flex-shrink: 0;
  }

  .page::before {
    content: "";
    position: absolute;
    inset: 0;
    background-image: url("/images/invoice-watermark.png");
    background-repeat: no-repeat;
    background-position: right 24px bottom 40px;
    background-size: 160px;
    opacity: .05;
    pointer-events: none;
  }

  .top-bar {
    height: 6px;
    background: linear-gradient(90deg, var(--gp-blue-dark), var(--gp-blue) 42%, var(--gp-orange) 76%, var(--gp-red));
  }

  .wrap {
    padding: 22px 28px 16px;
    position: relative;
    z-index: 1;
  }

  .header {
    display: grid;
    grid-template-columns: 1.2fr .8fr;
    gap: 16px;
    align-items: start;
    margin-bottom: 14px;
  }

  .brand {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .brand img {
    width: min(100%, 220px);
    height: auto;
    display: block;
  }

  .brand-card {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    background: linear-gradient(180deg, #fff, #fbfdff);
    border: 1px solid var(--line);
    border-radius: 14px;
    padding: 10px 14px;
  }

  .eyebrow {
    font-size: 9px;
    letter-spacing: .18em;
    font-weight: 700;
    color: var(--muted);
    text-transform: uppercase;
    margin-bottom: 4px;
  }

  .company-name {
    font-size: 14px;
    font-weight: 800;
    margin-bottom: 3px;
  }

  .muted {
    color: var(--muted);
    line-height: 1.45;
    font-size: 11px;
  }

  .invoice-box {
    background: linear-gradient(145deg, #ffffff, #f8fbff);
    border: 1px solid var(--line);
    border-radius: 16px;
    padding: 14px;
  }

  .invoice-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 10px;
  }

  .invoice-title h1 {
    font-size: 24px;
    line-height: 1;
    margin: 0;
    letter-spacing: -.03em;
  }

  .status {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 10px;
    border-radius: 999px;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: .08em;
    text-transform: uppercase;
    border: 1px solid;
  }

  .status::before {
    content: "";
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: currentColor;
    opacity: .72;
  }

  .meta-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .meta-item {
    background: var(--soft);
    border: 1px solid var(--line);
    border-radius: 12px;
    padding: 8px 10px;
  }

  .meta-item span {
    display: block;
    color: var(--muted);
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: .08em;
    font-weight: 700;
    margin-bottom: 2px;
  }

  .meta-item strong {
    font-size: 12px;
    line-height: 1.35;
  }

  .section-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 14px;
  }

  .card {
    background: #fff;
    border: 1px solid var(--line);
    border-radius: 14px;
    padding: 12px;
  }

  .client-name {
    font-size: 13px;
    font-weight: 800;
    margin-bottom: 3px;
  }

  .chip-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 6px;
  }

  .chip {
    border-radius: 999px;
    padding: 4px 8px;
    background: #f8fafc;
    border: 1px solid var(--line);
    font-size: 10px;
    font-weight: 700;
    color: #475569;
  }

  .table-card {
    border: 1px solid var(--line);
    border-radius: 14px;
    overflow: hidden;
    background: #fff;
    margin-bottom: 14px;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  thead th {
    text-align: left;
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: .1em;
    color: #475569;
    background: linear-gradient(90deg, rgba(62,64,149,.06), rgba(0,152,218,.06), rgba(245,134,52,.06));
    padding: 8px 12px;
    border-bottom: 1px solid var(--line);
  }

  tbody td {
    padding: 8px 12px;
    border-bottom: 1px solid var(--line);
    vertical-align: top;
    font-size: 11px;
  }

  tbody tr:last-child td {
    border-bottom: none;
  }

  .desc-title {
    font-weight: 700;
    margin-bottom: 2px;
    font-size: 11px;
  }

  .desc-sub {
    color: var(--muted);
    line-height: 1.4;
    font-size: 10px;
  }

  .ta-right {
    text-align: right;
    white-space: nowrap;
  }

  .bottom {
    display: grid;
    grid-template-columns: 1.15fr .85fr;
    gap: 12px;
    align-items: start;
  }

  .notes {
    min-height: 100%;
  }

  .notes-box {
    margin-top: 6px;
    background: linear-gradient(180deg, #ffffff, #fbfdff);
    border: 1px dashed #cbd5e1;
    border-radius: 12px;
    padding: 8px 10px;
    line-height: 1.5;
    color: #334155;
    font-size: 11px;
    white-space: pre-wrap;
  }

  .summary {
    background: linear-gradient(180deg, #ffffff, #f8fbff);
  }

  .summary-row {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 7px 0;
    border-bottom: 1px solid var(--line);
    font-size: 12px;
  }

  .summary-row:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }

  .summary-row.discount-row {
    color: var(--gp-red);
  }

  .summary-row.total {
    margin-top: 4px;
    padding-top: 8px;
    font-size: 18px;
    font-weight: 900;
    color: var(--gp-blue-dark);
  }

  .summary-row.total span:last-child {
    color: var(--gp-red);
  }

  .paid-amount {
    color: var(--success-text);
    font-weight: 600;
  }

  .summary-row.balance-row {
    font-weight: 800;
    font-size: 13px;
    color: var(--gp-blue-dark);
    background: var(--soft);
    border-radius: 8px;
    padding: 8px 10px;
    margin-top: 4px;
  }

  .payments-section {
    margin-top: 14px;
    margin-bottom: 14px;
  }

  .payments-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 10px;
    margin-top: 6px;
  }

  .payments-table th {
    text-align: left;
    padding: 6px 10px;
    background: var(--soft);
    font-size: 9px;
    font-weight: 700;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: .08em;
  }

  .payments-table td {
    padding: 8px 10px;
    border-bottom: 1px solid var(--line);
  }

  .terms-section {
    margin-top: 10px;
    margin-bottom: 10px;
  }

  .footer {
    margin-top: 12px;
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: center;
    color: var(--muted);
    font-size: 10px;
    border-top: 1px solid var(--line);
    padding-top: 10px;
  }

  .footer strong {
    color: var(--ink);
  }

  .print-note {
    position: fixed;
    right: 20px;
    bottom: 20px;
    z-index: 100;
  }

  .print-note-btn {
    background: #111827;
    color: #fff;
    border: none;
    border-radius: 999px;
    padding: 10px 16px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 12px 30px rgba(0,0,0,.18);
  }

  .print-note-btn:hover {
    background: #1f2937;
  }

  @media print {
    body {
      background: white;
      padding: 0;
      display: block;
    }
    .page {
      width: 100%;
      min-height: 0;
      border-radius: 0;
      box-shadow: none;
    }
    .print-note {
      display: none;
    }
    @page {
      size: A4 portrait;
      margin: 0;
    }
  }
`;
