import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { Usuario_nivel } from '@prisma/client';
import { requireServerUser } from '@/shared/lib/requireServerUser';
import { can, type Role } from '@/shared/lib/rbac-core';
import { redirect } from 'next/navigation';

/* ── Role & Status mappings ── */
const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  GERENTE: 'Manager',
  USUARIO: 'User',
  FINANCEIRO: 'Finance',
  ESTOQUE: 'Inventory',
  CLIENTE: 'Client',
};

const ROLE_PILL: Record<string, { bg: string; text: string }> = {
  ADMIN:      { bg: '#fef2f2', text: '#dc2626' },
  GERENTE:    { bg: '#fff7ed', text: '#c2410c' },
  USUARIO:    { bg: '#eff6ff', text: '#1d4ed8' },
  FINANCEIRO: { bg: '#ecfdf5', text: '#047857' },
  ESTOQUE:    { bg: '#f5f3ff', text: '#6d28d9' },
  CLIENTE:    { bg: '#f3f4f6', text: '#6b7280' },
};

const STATUS_LABELS: Record<string, string> = {
  ATIVO: 'Active',
  INATIVO: 'Inactive',
};

const STATUS_PILL: Record<string, { bg: string; text: string }> = {
  ATIVO:   { bg: '#ecfdf5', text: '#047857' },
  INATIVO: { bg: '#fef2f2', text: '#dc2626' },
};

/* ── Helpers ── */
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

interface SearchParams {
  role?: string;
  status?: string;
  search?: string;
  ids?: string; // comma-separated IDs for bulk export
}

export default async function UserReportPrintPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const authUser = await requireServerUser();
  if (!can(authUser.role as Role, 'usuarios', 'read')) {
    redirect('/login');
  }

  const filters = await searchParams;

  const specificIds = filters.ids
    ? filters.ids.split(',').map(Number).filter((n) => !isNaN(n) && n > 0)
    : null;

  const where: Prisma.UsuarioWhereInput = specificIds
    ? { id: { in: specificIds } }
    : {
        ...(filters.role ? { nivel: filters.role as Usuario_nivel } : {}),
        ...(filters.status ? { status: filters.status as 'ATIVO' | 'INATIVO' } : {}),
        ...(filters.search
          ? {
              OR: [
                { nomeCompleto: { contains: filters.search } },
                { email: { contains: filters.search } },
              ],
            }
          : {}),
      };

  const [usuarios, empresa] = await Promise.all([
    prisma.usuario.findMany({
      where,
      select: {
        id: true,
        nomeCompleto: true,
        email: true,
        nivel: true,
        status: true,
        telefone: true,
        cidade: true,
        estado: true,
        ultimoLoginEm: true,
        criadoEm: true,
      },
      orderBy: { nomeCompleto: 'asc' },
    }),
    prisma.empresa.findFirst({ where: { ativo: true } }),
  ]);

  const countTotal = usuarios.length;
  const countActive = usuarios.filter((u) => u.status === 'ATIVO').length;
  const countInactive = usuarios.filter((u) => u.status === 'INATIVO').length;

  const roleCounts: Record<string, number> = {};
  for (const u of usuarios) {
    roleCounts[u.nivel] = (roleCounts[u.nivel] || 0) + 1;
  }
  const topRole = Object.entries(roleCounts).sort((a, b) => b[1] - a[1])[0];

  const activeFilters: string[] = [];
  if (filters.role) activeFilters.push(`Role: ${ROLE_LABELS[filters.role] ?? filters.role}`);
  if (filters.status) activeFilters.push(`Status: ${STATUS_LABELS[filters.status] ?? filters.status}`);
  if (filters.search) activeFilters.push(`Search: "${filters.search}"`);

  const companyName = empresa?.nome ?? 'GladPros Services LLC';
  const companyAddress = [
    empresa?.addressStreet,
    [empresa?.addressCity, empresa?.addressState, empresa?.addressZip].filter(Boolean).join(', '),
  ].filter(Boolean).join(', ') || '17671 Addison Rd, Dallas, TX 75287';
  const companyEmail = empresa?.email ?? 'financial@gladpros.com';

  const generatedDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  });

  const reportId = `RPT-USR-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

  const tableRows = usuarios
    .map((u) => {
      const name = u.nomeCompleto || u.email;
      const st = STATUS_PILL[u.status] ?? STATUS_PILL.ATIVO;
      const rp = ROLE_PILL[u.nivel] ?? ROLE_PILL.USUARIO;
      const location = [u.cidade, u.estado].filter(Boolean).join(', ') || '—';

      return `
        <tr>
          <td data-label="Name">${escHtml(name)}</td>
          <td data-label="Email">${escHtml(u.email)}</td>
          <td data-label="Role">
            <span class="status-pill" style="background:${rp.bg};color:${rp.text}">${ROLE_LABELS[u.nivel] ?? u.nivel}</span>
          </td>
          <td data-label="Phone">${escHtml(u.telefone ?? '—')}</td>
          <td data-label="Location">${escHtml(location)}</td>
          <td data-label="Last Login">${fmtDate(u.ultimoLoginEm)}</td>
          <td data-label="Created">${fmtDate(u.criadoEm)}</td>
          <td data-label="Status">
            <span class="status-pill" style="background:${st.bg};color:${st.text}">${STATUS_LABELS[u.status] ?? u.status}</span>
          </td>
        </tr>`;
    })
    .join('');

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: REPORT_STYLES }} />

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
                  <div className="eyebrow">Report info</div>
                  <div className="muted">
                    User report generated on {generatedDate}.<br />
                    Complete listing of all system users and their access levels.
                  </div>
                </div>
              </div>
            </div>

            <aside className="report-box">
              <div className="report-title">
                <h1>REPORT</h1>
                <div className="report-subtitle">User Report</div>
              </div>

              <div className="meta-grid">
                <div className="meta-item">
                  <span>Report #</span>
                  <strong>{reportId}</strong>
                </div>
                <div className="meta-item">
                  <span>Generated</span>
                  <strong>{generatedDate}</strong>
                </div>
                <div className="meta-item">
                  <span>Total Records</span>
                  <strong>{countTotal} users</strong>
                </div>
                <div className="meta-item">
                  <span>Active / Inactive</span>
                  <strong>{countActive} / {countInactive}</strong>
                </div>
              </div>
            </aside>
          </section>

          {/* ── FILTER CHIPS ── */}
          {activeFilters.length > 0 && (
            <section className="filter-bar">
              <span className="filter-label">Active filters:</span>
              {activeFilters.map((f, i) => (
                <span key={i} className="filter-chip">{f}</span>
              ))}
            </section>
          )}

          {/* ── STAT CARDS ── */}
          <section className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon blue-icon">#</div>
              <div>
                <div className="stat-label">Total Users</div>
                <div className="stat-value blue">{countTotal}</div>
                <div className="stat-sub">registered</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon green-icon">✓</div>
              <div>
                <div className="stat-label">Active</div>
                <div className="stat-value green">{countActive}</div>
                <div className="stat-sub">{countTotal > 0 ? Math.round((countActive / countTotal) * 100) : 0}% of total</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon red-icon">✗</div>
              <div>
                <div className="stat-label">Inactive</div>
                <div className="stat-value red">{countInactive}</div>
                <div className="stat-sub">{countTotal > 0 ? Math.round((countInactive / countTotal) * 100) : 0}% of total</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon amber-icon">★</div>
              <div>
                <div className="stat-label">Top Role</div>
                <div className="stat-value amber">{topRole ? `${ROLE_LABELS[topRole[0]] ?? topRole[0]}` : '—'}</div>
                <div className="stat-sub">{topRole ? `${topRole[1]} users` : 'no data'}</div>
              </div>
            </div>
          </section>

          {/* ── TABLE ── */}
          <section className="table-card">
            <div className="table-toolbar">
              <div>
                <div className="table-title">User Details</div>
                <div className="table-desc">Complete listing of {countTotal} users</div>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Phone</th>
                  <th>Location</th>
                  <th>Last Login</th>
                  <th>Created</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody dangerouslySetInnerHTML={{ __html: tableRows }} />
              {usuarios.length === 0 && (
                <tbody>
                  <tr>
                    <td colSpan={8} className="empty-row">
                      No users found for the selected filters.
                    </td>
                  </tr>
                </tbody>
              )}
            </table>

            {/* ── TOTALS ROW ── */}
            <div className="table-totals">
              <span className="totals-label">Summary ({countTotal})</span>
              <span>Active: <strong className="green">{countActive}</strong></span>
              <span>Inactive: <strong className="red">{countInactive}</strong></span>
              {Object.entries(roleCounts).sort((a, b) => b[1] - a[1]).map(([role, count]) => (
                <span key={role}>{ROLE_LABELS[role] ?? role}: <strong>{count}</strong></span>
              ))}
            </div>
          </section>

          {/* ── OBSERVATIONS ── */}
          <section className="obs-card">
            <div className="eyebrow">Observations</div>
            <div className="obs-box">
              This report was automatically generated by the GladPros system. User data reflects the current
              database state at the time of generation. For up-to-date information, generate a new report.
            </div>
          </section>

          {/* ── FOOTER ── */}
          <footer className="footer">
            <div>
              <strong>{companyName}</strong> — Confidential user report
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

/* ── CSS ── */
const REPORT_STYLES = `
  :root {
    --gp-blue-dark: #3E4095;
    --gp-blue: #0098DA;
    --gp-orange: #F58634;
    --gp-red: #ED3237;
    --ink: #1f2937;
    --muted: #6b7280;
    --line: #e5e7eb;
    --paper: #ffffff;
    --soft: #f8fafc;
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
    opacity: .04;
    pointer-events: none;
  }

  .top-bar {
    height: 6px;
    background: linear-gradient(90deg, var(--gp-blue-dark), var(--gp-blue) 42%, var(--gp-orange) 76%, var(--gp-red));
  }

  .wrap {
    padding: 18px 24px 14px;
    position: relative;
    z-index: 1;
  }

  .header {
    display: grid;
    grid-template-columns: 1.2fr .8fr;
    gap: 14px;
    align-items: start;
    margin-bottom: 12px;
  }

  .brand {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .brand img {
    width: min(100%, 200px);
    height: auto;
    display: block;
  }

  .brand-card {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    background: linear-gradient(180deg, #fff, #fbfdff);
    border: 1px solid var(--line);
    border-radius: 12px;
    padding: 8px 12px;
  }

  .eyebrow {
    font-size: 8px;
    letter-spacing: .18em;
    font-weight: 700;
    color: var(--muted);
    text-transform: uppercase;
    margin-bottom: 3px;
  }

  .company-name {
    font-size: 12px;
    font-weight: 800;
    margin-bottom: 2px;
  }

  .muted {
    color: var(--muted);
    line-height: 1.4;
    font-size: 9.5px;
  }

  .report-box {
    background: linear-gradient(145deg, #ffffff, #f8fbff);
    border: 1px solid var(--line);
    border-radius: 14px;
    padding: 12px;
  }

  .report-title {
    display: flex;
    align-items: baseline;
    gap: 10px;
    margin-bottom: 8px;
  }

  .report-title h1 {
    font-size: 22px;
    line-height: 1;
    margin: 0;
    letter-spacing: -.03em;
    color: var(--gp-blue-dark);
  }

  .report-subtitle {
    font-size: 11px;
    font-weight: 600;
    color: var(--gp-blue);
  }

  .meta-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 6px;
  }

  .meta-item {
    background: var(--soft);
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 6px 8px;
  }

  .meta-item span {
    display: block;
    color: var(--muted);
    font-size: 8px;
    text-transform: uppercase;
    letter-spacing: .08em;
    font-weight: 700;
    margin-bottom: 1px;
  }

  .meta-item strong {
    font-size: 10px;
    line-height: 1.3;
  }

  .filter-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    align-items: center;
    padding: 5px 10px;
    background: #f0f9ff;
    border: 1px solid rgba(0,152,218,.15);
    border-radius: 8px;
    margin-bottom: 10px;
    font-size: 9px;
  }

  .filter-label {
    font-weight: 700;
    color: var(--gp-blue);
  }

  .filter-chip {
    background: var(--gp-blue);
    color: #fff;
    border-radius: 999px;
    padding: 2px 8px;
    font-size: 8px;
    font-weight: 600;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin-bottom: 10px;
  }

  .stat-card {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border-radius: 10px;
    border: 1px solid var(--line);
    background: #fff;
  }

  .stat-icon {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 900;
    flex-shrink: 0;
  }

  .blue-icon   { background: rgba(0,152,218,.1); color: var(--gp-blue); }
  .green-icon  { background: rgba(4,120,87,.1);   color: #047857; }
  .red-icon    { background: rgba(220,38,38,.1);  color: #dc2626; }
  .amber-icon  { background: rgba(217,119,6,.1);  color: #d97706; }

  .stat-label {
    font-size: 8px;
    font-weight: 700;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: .04em;
    margin-bottom: 1px;
  }

  .stat-value {
    font-size: 13px;
    font-weight: 800;
    line-height: 1.2;
  }

  .stat-sub {
    font-size: 8px;
    color: var(--muted);
  }

  .blue   { color: var(--gp-blue); }
  .green  { color: #047857; }
  .red    { color: #dc2626; }
  .amber  { color: #d97706; }

  .table-card {
    border: 1px solid var(--line);
    border-radius: 12px;
    overflow: hidden;
    background: #fff;
    margin-bottom: 10px;
  }

  .table-toolbar {
    padding: 8px 12px;
    border-bottom: 1px solid var(--line);
    background: linear-gradient(180deg, #fff, #fbfdff);
  }

  .table-title {
    font-size: 11px;
    font-weight: 800;
  }

  .table-desc {
    font-size: 8.5px;
    color: var(--muted);
    margin-top: 1px;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  thead th {
    text-align: left;
    font-size: 7.5px;
    text-transform: uppercase;
    letter-spacing: .1em;
    color: #475569;
    background: linear-gradient(90deg, rgba(62,64,149,.06), rgba(0,152,218,.06), rgba(245,134,52,.06));
    padding: 6px 8px;
    border-bottom: 1px solid var(--line);
    white-space: nowrap;
  }

  tbody td {
    padding: 5px 8px;
    border-bottom: 1px solid var(--line);
    vertical-align: middle;
    font-size: 9px;
  }

  tbody tr:last-child td {
    border-bottom: none;
  }

  tbody tr:nth-child(even) {
    background: #fafbfc;
  }

  .status-pill {
    display: inline-block;
    padding: 2px 7px;
    border-radius: 999px;
    font-size: 7.5px;
    font-weight: 700;
    white-space: nowrap;
    letter-spacing: .04em;
    text-transform: uppercase;
  }

  .empty-row {
    text-align: center;
    color: var(--muted);
    padding: 24px;
    font-style: italic;
    font-size: 10px;
  }

  .table-totals {
    display: flex;
    gap: 16px;
    align-items: center;
    padding: 7px 12px;
    background: var(--soft);
    border-top: 1px solid var(--line);
    font-size: 9px;
    color: var(--muted);
    flex-wrap: wrap;
  }

  .totals-label {
    font-weight: 800;
    color: var(--ink);
  }

  .table-totals strong {
    color: var(--ink);
  }

  .obs-card {
    background: #fff;
    border: 1px solid var(--line);
    border-radius: 12px;
    padding: 10px 12px;
    margin-bottom: 10px;
  }

  .obs-box {
    margin-top: 4px;
    background: linear-gradient(180deg, #ffffff, #fbfdff);
    border: 1px dashed #cbd5e1;
    border-radius: 10px;
    padding: 6px 10px;
    line-height: 1.5;
    color: #334155;
    font-size: 9px;
  }

  .footer {
    margin-top: 8px;
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: center;
    color: var(--muted);
    font-size: 8.5px;
    border-top: 1px solid var(--line);
    padding-top: 8px;
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
    tbody tr:nth-child(even) {
      background: #fafbfc !important;
    }
    thead th {
      background: linear-gradient(90deg, rgba(62,64,149,.06), rgba(0,152,218,.06), rgba(245,134,52,.06)) !important;
    }
    @page {
      size: A4 portrait;
      margin: 0;
    }
  }
`;
