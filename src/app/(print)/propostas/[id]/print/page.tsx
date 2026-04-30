import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireServerUser } from '@/shared/lib/requireServerUser';
import { can, type Role } from '@/shared/lib/rbac-core';

/* ── Status mappings ── */
const STATUS_CSS: Record<string, { bg: string; text: string; border: string; label: string }> = {
  RASCUNHO:  { bg: '#fff7ed', text: '#c2410c', border: 'rgba(194,65,12,.22)',  label: 'Draft' },
  ENVIADA:   { bg: '#eff6ff', text: '#1d4ed8', border: 'rgba(29,78,216,.22)',  label: 'Sent' },
  APROVADA:  { bg: '#ecfdf5', text: '#047857', border: 'rgba(4,120,87,.22)',   label: 'Approved' },
  ASSINADA:  { bg: '#f0fdf4', text: '#15803d', border: 'rgba(21,128,61,.22)',  label: 'Signed' },
  CANCELADA: { bg: '#f9fafb', text: '#9ca3af', border: 'rgba(156,163,175,.22)',label: 'Cancelled' },
};

/* ── Helpers ── */
function escHtml(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function toNum(v: { toNumber(): number } | number | null | undefined): number {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  return v.toNumber();
}

function fmt(v: { toNumber(): number } | number | null | undefined): string {
  const n = toNum(v);
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function fmtDate(d: Date | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    timeZone: 'America/Chicago',
  });
}

/* ── Page ── */
export default async function PropostaPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireServerUser();
  if (!can(user.role as Role, 'propostas', 'read')) {
    redirect('/403');
  }

  const { id } = await params;
  const propostaId = parseInt(id, 10);
  if (isNaN(propostaId)) notFound();

  const proposta = await prisma.proposta.findUnique({
    where: { id: propostaId, deletedAt: null },
    include: {
      Cliente: {
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
      PropostaEtapa: { orderBy: { ordem: 'asc' } },
      PropostaMaterial: { orderBy: { id: 'asc' } },
    },
  });

  if (!proposta) notFound();

  /* ── Data mapping ── */
  const statusStyle = STATUS_CSS[proposta.status] ?? STATUS_CSS.RASCUNHO;

  const clientName =
    proposta.Cliente.nomeFantasia ||
    proposta.Cliente.nomeCompleto ||
    proposta.Cliente.nomeChave ||
    '—';

  const clientAddr = [
    proposta.Cliente.addressStreet,
    proposta.Cliente.addressUnit,
    [proposta.Cliente.addressCity, proposta.Cliente.addressState, proposta.Cliente.addressZip]
      .filter(Boolean)
      .join(', '),
  ]
    .filter(Boolean)
    .join(', ');

  const valorBase = toNum(proposta.precoPropostaCliente) || toNum(proposta.valorEstimado);
  const desconto = toNum(proposta.descontosOfertados);
  const valorLiquido = valorBase > 0 ? valorBase * (1 - desconto / 100) : 0;

  /* ── HTML rows ── */
  const etapaRows = proposta.PropostaEtapa.map((e) => `
    <tr>
      <td data-label="#"><strong>${e.ordem}</strong></td>
      <td data-label="Service / Description">
        <div class="desc-title">${escHtml(e.servico)}</div>
        ${e.descricao ? `<div class="desc-sub">${escHtml(e.descricao)}</div>` : ''}
      </td>
      <td data-label="Qty">${e.quantidade != null ? toNum(e.quantidade) : '—'} ${escHtml(e.unidade ?? '')}</td>
      <td data-label="Est. Hours">${e.duracaoEstimadaHoras != null ? toNum(e.duracaoEstimadaHoras) + 'h' : '—'}</td>
      <td data-label="Labor Cost" class="ta-right">${e.custoMaoObraEstimado != null ? fmt(e.custoMaoObraEstimado) : '—'}</td>
    </tr>`).join('');

  const materialRows = proposta.PropostaMaterial.map((m, i) => `
    <tr>
      <td data-label="Item"><strong>${i + 1}</strong></td>
      <td data-label="Name">
        <div class="desc-title">${escHtml(m.nome)}</div>
        ${m.fornecedorPreferencial ? `<div class="desc-sub">${escHtml(m.fornecedorPreferencial)}</div>` : ''}
      </td>
      <td data-label="Code">${escHtml(m.codigo ?? '—')}</td>
      <td data-label="Qty / Unit">${toNum(m.quantidade)} ${escHtml(m.unidade ?? 'UN')}</td>
      <td data-label="Unit Price" class="ta-right">${m.precoUnitario != null ? fmt(m.precoUnitario) : '—'}</td>
      <td data-label="Total" class="ta-right">${m.totalItem != null ? fmt(m.totalItem) : '—'}</td>
    </tr>`).join('');

  const generatedAt = new Date().toLocaleDateString('en-US', {
    month: '2-digit', day: '2-digit', year: 'numeric',
    timeZone: 'America/Chicago',
  });

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PROPOSTA_STYLES }} />

      <main className="page">
        <div className="top-bar" />

        <div className="wrap">
          {/* ── HEADER ── */}
          <section className="header">
            <div className="brand">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/invoice-logo.png" alt="GladPros" />
            </div>

            <aside className="proposal-box">
              <div className="proposal-title">
                <h1>PROPOSAL</h1>
                <div
                  className="status"
                  style={{
                    background: statusStyle.bg,
                    color: statusStyle.text,
                    borderColor: statusStyle.border,
                  }}
                >
                  {statusStyle.label}
                </div>
              </div>

              <div className="meta-grid">
                <div className="meta-item">
                  <span>Proposal #</span>
                  <strong>{proposta.numeroProposta}</strong>
                </div>
                <div className="meta-item">
                  <span>Created</span>
                  <strong>{fmtDate(proposta.criadoEm)}</strong>
                </div>
                <div className="meta-item">
                  <span>Valid until</span>
                  <strong>{fmtDate(proposta.validadeProposta)}</strong>
                </div>
                <div className="meta-item">
                  <span>Service type</span>
                  <strong>{escHtml(proposta.tipoServico)}</strong>
                </div>
              </div>
            </aside>
          </section>

          {/* ── GRID: Prepared For + Service Location ── */}
          <section className="section-grid">
            <div className="card">
              <div className="eyebrow">Prepared for</div>
              <div className="client-name">{clientName}</div>
              <div className="muted">
                {proposta.Cliente.email && <>{proposta.Cliente.email}<br /></>}
                {proposta.Cliente.telefone && <>{proposta.Cliente.telefone}<br /></>}
                {clientAddr && <>{clientAddr}</>}
              </div>
            </div>

            <div className="card">
              <div className="eyebrow">Service location</div>
              <div className="muted">
                {proposta.localExecucaoEndereco && (
                  <>{escHtml(proposta.localExecucaoEndereco)}<br /></>
                )}
                {proposta.contatoNome && proposta.contatoNome !== 'Não informado' && (
                  <><strong>Contact:</strong> {escHtml(proposta.contatoNome)}<br /></>
                )}
                {proposta.contatoTelefone && (
                  <>{escHtml(proposta.contatoTelefone)}<br /></>
                )}
                {proposta.contatoEmail && proposta.contatoEmail !== 'nao-informado@temp.com' && (
                  <>{escHtml(proposta.contatoEmail)}</>
                )}
              </div>
              {(proposta.endClientName || proposta.endClientPhone) && (
                <div className="muted" style={{ marginTop: '8px' }}>
                  {proposta.endClientName && (
                    <><strong>On-site:</strong> {escHtml(proposta.endClientName)}<br /></>
                  )}
                  {proposta.endClientPhone && <>{escHtml(proposta.endClientPhone)}</>}
                </div>
              )}
            </div>
          </section>

          {/* ── SCOPE OF WORK ── */}
          <section className="scope-section">
            <div className="card">
              <div className="eyebrow">Scope of work</div>
              <h2 className="scope-title">{escHtml(proposta.titulo)}</h2>
              {proposta.prazoExecucaoEstimadoDias && (
                <div className="muted" style={{ marginBottom: '6px' }}>
                  Estimated duration: <strong>{proposta.prazoExecucaoEstimadoDias} day{proposta.prazoExecucaoEstimadoDias !== 1 ? 's' : ''}</strong>
                </div>
              )}
              <div
                className="notes-box"
                dangerouslySetInnerHTML={{
                  __html: escHtml(proposta.descricaoEscopo).replace(/\n/g, '<br />'),
                }}
              />
            </div>
          </section>

          {/* ── ETAPAS ── */}
          {proposta.PropostaEtapa.length > 0 && (
            <section className="table-card" style={{ marginBottom: '14px' }}>
              <div className="table-header-label">Phases &amp; Services</div>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '4%' }}>#</th>
                    <th style={{ width: '46%' }}>Service / Description</th>
                    <th style={{ width: '14%' }}>Qty</th>
                    <th style={{ width: '14%' }}>Est. Hours</th>
                    <th style={{ width: '22%' }}>Labor Cost</th>
                  </tr>
                </thead>
                <tbody dangerouslySetInnerHTML={{ __html: etapaRows }} />
              </table>
            </section>
          )}

          {/* ── MATERIAIS ── */}
          {proposta.PropostaMaterial.length > 0 && (
            <section className="table-card" style={{ marginBottom: '14px' }}>
              <div className="table-header-label">Materials &amp; Supplies</div>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '4%' }}>#</th>
                    <th style={{ width: '32%' }}>Item</th>
                    <th style={{ width: '12%' }}>Code</th>
                    <th style={{ width: '14%' }}>Qty / Unit</th>
                    <th style={{ width: '16%' }}>Unit Price</th>
                    <th style={{ width: '22%' }}>Total</th>
                  </tr>
                </thead>
                <tbody dangerouslySetInnerHTML={{ __html: materialRows }} />
              </table>
            </section>
          )}

          {/* ── FINANCIAL SUMMARY ── */}
          {valorBase > 0 && (
            <section className="bottom">
              <div style={{ flex: 1 }} />
              <div className="card summary">
                <div className="eyebrow">Financial summary</div>

                <div className="summary-row">
                  <span>Estimated value</span>
                  <span>{fmt(valorBase)}</span>
                </div>

                {desconto > 0 && (
                  <div className="summary-row discount-row">
                    <span>Discount ({desconto.toFixed(1)}%)</span>
                    <span>-{fmt(valorBase * desconto / 100)}</span>
                  </div>
                )}

                <div className="summary-row total">
                  <span>Total</span>
                  <span>{fmt(valorLiquido)}</span>
                </div>

                {proposta.formaPagamentoPreferida && (
                  <div className="summary-row" style={{ fontSize: '10px' }}>
                    <span>Payment method</span>
                    <span>{escHtml(proposta.formaPagamentoPreferida)}</span>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ── TERMS & CONDITIONS ── */}
          {proposta.condicoesGerais && (
            <section className="terms-section">
              <div className="card">
                <div className="eyebrow">Terms &amp; Conditions</div>
                <div
                  className="notes-box"
                  dangerouslySetInnerHTML={{
                    __html: escHtml(proposta.condicoesGerais).replace(/\n/g, '<br />'),
                  }}
                />
              </div>
            </section>
          )}

          {/* ── PAYMENT CONDITIONS ── */}
          {proposta.condicoesPagamento && (
            <section className="terms-section">
              <div className="card">
                <div className="eyebrow">Payment conditions</div>
                <div
                  className="notes-box"
                  dangerouslySetInnerHTML={{
                    __html: escHtml(proposta.condicoesPagamento).replace(/\n/g, '<br />'),
                  }}
                />
              </div>
            </section>
          )}

          {/* ── WARRANTY ── */}
          {proposta.garantia && (
            <section className="terms-section">
              <div className="card">
                <div className="eyebrow">Warranty</div>
                <div
                  className="notes-box"
                  dangerouslySetInnerHTML={{
                    __html: escHtml(proposta.garantia).replace(/\n/g, '<br />'),
                  }}
                />
              </div>
            </section>
          )}

          {/* ── EXCLUSIONS ── */}
          {proposta.exclusoes && (
            <section className="terms-section">
              <div className="card">
                <div className="eyebrow">Exclusions</div>
                <div
                  className="notes-box"
                  dangerouslySetInnerHTML={{
                    __html: escHtml(proposta.exclusoes).replace(/\n/g, '<br />'),
                  }}
                />
              </div>
            </section>
          )}

          {/* ── CLIENT NOTES ── */}
          {proposta.observacoesParaCliente && (
            <section className="terms-section">
              <div className="card">
                <div className="eyebrow">Notes for client</div>
                <div
                  className="notes-box"
                  dangerouslySetInnerHTML={{
                    __html: escHtml(proposta.observacoesParaCliente).replace(/\n/g, '<br />'),
                  }}
                />
              </div>
            </section>
          )}

          {/* ── SIGNATURE ── */}
          <section className="signature-section">
            <div className="card">
              <div className="eyebrow">Client signature</div>
              {proposta.assinadaEm ? (
                <div className="signature-content">
                  <div className="muted" style={{ marginBottom: '8px' }}>
                    Signed on <strong>{fmtDate(proposta.assinadaEm)}</strong>
                    {proposta.assinaturaCliente && (
                      <> by <strong>{escHtml(proposta.assinaturaCliente)}</strong></>
                    )}
                    {proposta.assinaturaResponsavel && (
                      <> · Authorized by: <strong>{escHtml(proposta.assinaturaResponsavel)}</strong></>
                    )}
                  </div>
                  {proposta.assinaturaImagem ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={proposta.assinaturaImagem}
                      alt="Client signature"
                      className="signature-img"
                    />
                  ) : (
                    <div className="signature-line" />
                  )}
                </div>
              ) : (
                <div className="signature-empty">
                  <div className="signature-line" />
                  <div className="muted" style={{ textAlign: 'center', marginTop: '6px', fontSize: '10px' }}>
                    Client Signature
                  </div>
                  <div className="muted" style={{ textAlign: 'center', fontSize: '10px' }}>
                    Date: ___________________________
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* ── FOOTER ── */}
          <footer className="footer">
            <div>
              <strong>GladPros Services LLC</strong> — gladpros.com · Electrical · Plumbing · Remodeling
            </div>
            <div>Generated: {generatedAt}</div>
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

/* ── CSS ── */
const PROPOSTA_STYLES = `
  :root {
    --gp-blue-dark: #3E4095;
    --gp-blue: #0098DA;
    --gp-orange: #FF8C00;
    --gp-red: #ED3237;
    --ink: #1f2937;
    --muted: #6b7280;
    --line: #e5e7eb;
    --paper: #ffffff;
    --bg: #eef2f7;
    --soft: #f8fafc;
    --shadow: 0 18px 50px rgba(15,23,42,.08);
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
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    align-items: start;
    margin-bottom: 14px;
  }

  .brand img {
    width: min(100%, 200px);
    height: auto;
    display: block;
  }

  .eyebrow {
    font-size: 9px;
    letter-spacing: .18em;
    font-weight: 700;
    color: var(--muted);
    text-transform: uppercase;
    margin-bottom: 4px;
  }

  .muted {
    color: var(--muted);
    line-height: 1.45;
    font-size: 11px;
  }

  .proposal-box {
    background: linear-gradient(145deg, #ffffff, #f8fbff);
    border: 1px solid var(--line);
    border-radius: 16px;
    padding: 14px;
  }

  .proposal-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 10px;
  }

  .proposal-title h1 {
    font-size: 22px;
    line-height: 1;
    margin: 0;
    letter-spacing: -.03em;
    color: var(--gp-blue-dark);
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

  .scope-section {
    margin-bottom: 14px;
  }

  .scope-title {
    font-size: 15px;
    font-weight: 800;
    margin: 4px 0 8px;
    color: var(--gp-blue-dark);
  }

  .table-card {
    border: 1px solid var(--line);
    border-radius: 14px;
    overflow: hidden;
    background: #fff;
  }

  .table-header-label {
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .18em;
    color: var(--muted);
    padding: 8px 12px 4px;
    background: linear-gradient(90deg, rgba(62,64,149,.04), rgba(0,152,218,.04));
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
    display: flex;
    gap: 12px;
    align-items: start;
    margin-bottom: 14px;
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
    min-width: 220px;
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
    font-size: 16px;
    font-weight: 900;
    color: var(--gp-blue-dark);
  }

  .summary-row.total span:last-child {
    color: var(--gp-blue);
  }

  .terms-section {
    margin-top: 10px;
    margin-bottom: 10px;
  }

  .signature-section {
    margin-top: 14px;
    margin-bottom: 14px;
  }

  .signature-content {
    margin-top: 8px;
  }

  .signature-empty {
    margin-top: 8px;
  }

  .signature-line {
    border-bottom: 2px solid var(--ink);
    margin: 20px 0 4px;
    width: 60%;
  }

  .signature-img {
    max-height: 80px;
    max-width: 280px;
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 4px;
    background: #fff;
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
