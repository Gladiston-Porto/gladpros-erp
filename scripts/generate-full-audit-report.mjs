/**
 * Script para gerar PDF do Relatorio de Auditoria Completa — GladPros ERP
 * Uso: node scripts/generate-full-audit-report.mjs
 */
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { writeFileSync } from "fs";

const ML = 50; // margin left
const MR = 50;
const PW = 595.28; // A4
const PH = 841.89;
const CW = PW - ML - MR;

async function main() {
  const pdf = await PDFDocument.create();
  const fR = await pdf.embedFont(StandardFonts.Helvetica);
  const fB = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fI = await pdf.embedFont(StandardFonts.HelveticaOblique);

  const BLK = rgb(0, 0, 0);
  const RED = rgb(0.8, 0.1, 0.1);
  const GRN = rgb(0.1, 0.55, 0.1);
  const ORG = rgb(0.85, 0.55, 0);
  const GRY = rgb(0.4, 0.4, 0.4);
  const BLU = rgb(0.15, 0.3, 0.6);
  const LG = rgb(0.92, 0.92, 0.92);
  const WHT = rgb(1, 1, 1);
  const DRED = rgb(0.6, 0, 0);

  let pg = pdf.addPage([PW, PH]);
  let y = PH - 50;

  function ck(n = 60) { if (y < n) { pg = pdf.addPage([PW, PH]); y = PH - 50; } }

  function txt(text, { x = ML, size = 10, font = fR, color = BLK, maxW = CW } = {}) {
    const words = text.split(" ");
    let line = "";
    const lines = [];
    for (const w of words) {
      const t = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(t, size) > maxW && line) { lines.push(line); line = w; }
      else line = t;
    }
    if (line) lines.push(line);
    for (const l of lines) { ck(size + 6); pg.drawText(l, { x, y, size, font, color }); y -= size + 4; }
  }

  function title(text, size = 16) { ck(size + 30); y -= 12; pg.drawText(text, { x: ML, y, size, font: fB, color: BLU }); y -= size + 8; }
  function sub(text, size = 12) { ck(size + 20); y -= 6; pg.drawText(text, { x: ML, y, size, font: fB, color: BLK }); y -= size + 5; }
  function ssub(text, size = 10) { ck(size + 14); y -= 4; pg.drawText(text, { x: ML, y, size, font: fB, color: GRY }); y -= size + 3; }
  function sep() { ck(10); pg.drawLine({ start: { x: ML, y }, end: { x: PW - MR, y }, thickness: 0.5, color: GRY }); y -= 8; }

  function bullet(text, { color = BLK, indent = 0 } = {}) {
    const xP = ML + 10 + indent;
    ck(14);
    pg.drawText("-", { x: xP - 10, y, size: 9, font: fR, color });
    const words = text.split(" ");
    let line = "";
    const lines = [];
    const mW = CW - 20 - indent;
    for (const w of words) {
      const t = line ? `${line} ${w}` : w;
      if (fR.widthOfTextAtSize(t, 8) > mW && line) { lines.push(line); line = w; }
      else line = t;
    }
    if (line) lines.push(line);
    for (let i = 0; i < lines.length; i++) { ck(12); pg.drawText(lines[i], { x: xP, y, size: 8, font: fR, color }); y -= 11; }
  }

  function row(cols, widths, { font: rf = fR, size = 7.5, bgColor = null, colors = null } = {}) {
    ck(16);
    const rH = 14;
    if (bgColor) pg.drawRectangle({ x: ML, y: y - 3, width: CW, height: rH, color: bgColor });
    let xO = ML + 3;
    for (let i = 0; i < cols.length; i++) {
      const c = colors?.[i] || BLK;
      let d = String(cols[i] || "");
      const mW = widths[i] - 6;
      while (rf.widthOfTextAtSize(d, size) > mW && d.length > 3) d = d.slice(0, -4) + "...";
      pg.drawText(d, { x: xO, y, size, font: rf, color: c });
      xO += widths[i];
    }
    y -= rH;
  }

  function header(cols, widths) { row(cols, widths, { font: fB, bgColor: BLU, colors: cols.map(() => WHT) }); }
  function newPage() { pg = pdf.addPage([PW, PH]); y = PH - 50; }

  // ======================== COVER ========================
  y = PH - 140;
  pg.drawText("RELATORIO DE AUDITORIA COMPLETA", { x: ML, y, size: 22, font: fB, color: BLU });
  y -= 32;
  pg.drawText("GladPros ERP Construction", { x: ML, y, size: 16, font: fR, color: BLK });
  y -= 22;
  pg.drawText("Varredura de Integridade, Logica, Seguranca e Testes", { x: ML, y, size: 12, font: fI, color: GRY });
  y -= 30;
  sep();
  txt("Data: 16 de marco de 2026", { size: 10, color: GRY });
  txt("Branch: chore/root-cleanup-archive (PR #23)", { size: 10, color: GRY });
  txt("Repositorio: Gladiston-Porto/gladpros-refatorado", { size: 10, color: GRY });
  y -= 20;
  txt("Escopo: 7 auditorias cobrindo 111 models, 208 API routes, ~95 paginas,", { size: 10 });
  txt("23 barrel files, 90 arquivos de teste, 2 packages externos.", { size: 10 });

  y -= 25;
  sub("Resumo Executivo", 14);
  sep();
  const sumW = [200, CW - 200];
  header(["Aspecto", "Situacao"], sumW);
  const sumData = [
    ["Models Prisma (111 total)", "53 ACTIVE, 22 PARTIAL, 30 ORPHANS, 6 SCHEMA-ONLY"],
    ["API Routes (208 total)", "~145 reais, 14 mock, ~15 sem auth"],
    ["Phantom Imports", "11 exports apontando para arquivos inexistentes"],
    ["new PrismaClient() inline", "11 arquivos (deviam usar singleton)"],
    ["Packages auth-core / proposals-core", "CODIGO MORTO (zero imports)"],
    ["TODOs em producao", "26+ ocorrencias"],
    ["Funcoes stub/nao-implementadas", "27+ (20 so no auth-core)"],
    ["Componentes mortos", "~27 arquivos"],
    ["Deps npm nao utilizadas", "8 pacotes"],
    ["Testes que testam codigo real", "~45 de ~90 (50%)"],
    ["Rotas API com testes", "~10% (4 de 38+ familias)"],
    ["Portal (F6)", "100% implementado, testado e seguro"],
    ["F1-F4 (Compliance/Costing/CO/Lifecycle)", "Apenas schema, 0% logica"],
  ];
  for (let i = 0; i < sumData.length; i++) {
    const c1 = i >= 10 && i <= 11 ? GRN : (i < 10 ? RED : ORG);
    row(sumData[i], sumW, { colors: [BLK, c1], bgColor: i % 2 === 0 ? LG : null });
  }

  // ======================== AUDIT 1 ========================
  newPage();
  title("AUDITORIA 1 -- Integridade do Backend");
  sep();

  sub("1A. Phantom Imports (11 encontrados)");
  const phW = [180, 180, CW - 360];
  header(["Barrel File", "Export Fantasma", "Problema"], phW);
  const phantoms = [
    ["services/index.ts", "ProjectPermitInspectionService", "Arquivo NAO EXISTE"],
    ["services/index.ts", "ProjectPunchListService", "Arquivo NAO EXISTE"],
    ["services/index.ts", "CloseoutTemplateService", "Arquivo NAO EXISTE"],
    ["services/index.ts", "ChecklistTemplateService", "Arquivo NAO EXISTE"],
    ["services/index.ts", "ChecklistApplyService", "Arquivo NAO EXISTE"],
    ["services/index.ts", "WarrantyTicketService", "Arquivo NAO EXISTE"],
    ["services/index.ts", "WarrantyAnalyticsService", "Arquivo NAO EXISTE"],
    ["services/index.ts", "ClientFeedbackService", "Arquivo NAO EXISTE"],
    ["gateways/index.ts", "PrismaFinanceGateway", "require() falha em runtime"],
    ["gateways/index.ts", "PrismaInventoryGateway", "require() falha em runtime"],
    ["gateways/index.ts", "PrismaTriageGateway", "require() falha em runtime"],
  ];
  for (let i = 0; i < phantoms.length; i++) row(phantoms[i], phW, { colors: [BLK, RED, RED], bgColor: i % 2 === 0 ? LG : null });

  y -= 10;
  sub("1B. Models Prisma vs Uso Real (111 models)");
  const modW = [50, 50, CW - 100];
  header(["Classif.", "Qtd", "Exemplos"], modW);
  row(["ACTIVE", "53", "Projeto, Cliente, Invoice, Worker, Assignment, Expense..."], modW, { colors: [GRN, GRN, GRY] });
  row(["PARTIAL", "22", "CodigoMFA, PasswordResetToken, InvoiceItem, CompraItem..."], modW, { colors: [ORG, ORG, GRY], bgColor: LG });
  row(["ORPHAN", "30", "VendorTaxProfile, SubcontractAgreement, PurchaseOrder, ProjectPermit..."], modW, { colors: [RED, RED, GRY] });
  row(["SCHEMA-ONLY", "6", "Estimation, EstimationOption, Movimentacao..."], modW, { colors: [GRY, GRY, GRY], bgColor: LG });

  y -= 8;
  txt("Models ORPHAN completos (30): AnexoProposta, PricebookCategory, HistoricoSenha, ProjetoLegacy, PropostaEtapa, PropostaMaterial, RefreshToken, InvoiceReminder, DadosFinanceiros, VendorTaxProfile, VendorInsurance, VendorLicense, EmployerBurdenRate, SubcontractAgreement, SubcontractMilestone, SubcontractMilestoneGate, LienWaiver, BudgetAlert, PurchaseOrder, PurchaseOrderItem, ChangeOrderItem, ProjectPermit, ProjectInspection, ProjectPunchItem, WarrantyTicket, ProjectClientFeedback, ChecklistTemplate, ChecklistTemplateItem, ProjectChecklistItem, ServiceOrderChecklistItem", { size: 7, color: RED });

  y -= 10;
  sub("1C. Arquitetura das API Routes");
  header(["Abordagem", "Qtd", "Percentual"], modW);
  row(["Service Layer (DDD)", "~25", "~12%"], modW, { colors: [GRN, GRN, GRN] });
  row(["Prisma Inline", "~145", "~70%"], modW, { colors: [ORG, ORG, ORG], bgColor: LG });
  row(["Mock/Placeholder", "~14", "~7%"], modW, { colors: [RED, RED, RED] });

  // ======================== AUDIT 2 ========================
  newPage();
  title("AUDITORIA 2 -- Backend para Frontend");
  sep();

  sub("Paginas do Frontend por Status");
  const pgW = [60, CW - 60];
  header(["Status", "Detalhes"], pgW);
  row(["Funcional", "~82 paginas: Projetos, Estoque, Portal, Auth, Workers, Invoices, Clientes"], pgW, { colors: [GRN, BLK] });
  row(["Stub/Mock", "8 paginas: propostas/lista, financeiro v1 (despesas, contas), usuarios/novo, usuarios/[id], rh dashboard"], pgW, { colors: [RED, BLK], bgColor: LG });

  y -= 8;
  sub("Padroes de Data Fetching");
  header(["Padrao", "Qtd"], pgW);
  row(["Prisma direto SSR (Server Components)", "~25 paginas"], pgW);
  row(["fetch() -> /api/ (Client Components)", "~30 paginas"], pgW, { bgColor: LG });
  row(["API Client centralizado", "~15 paginas"], pgW);
  row(["Server resolvers (Portal)", "6 paginas"], pgW, { bgColor: LG });
  row(["Mock/Stub data", "~5 paginas"], pgW);

  y -= 8;
  txt("POSITIVO: Todas as APIs chamadas pelo frontend existem. Nenhuma chamada orfao.", { size: 9, color: GRN });
  y -= 4;
  txt("PROBLEMA: Duplicacao /financeiro/* vs /dashboard/financeiro/* -- duas versoes coexistindo.", { size: 9, color: RED });

  // ======================== AUDIT 3 ========================
  y -= 10;
  title("AUDITORIA 3 -- Logica de Negocio");
  sep();

  sub("TODOs Criticos em Producao (26+)");
  const tdW = [160, CW - 160];
  header(["Arquivo", "Problema"], tdW);
  const todos = [
    ["proposta-email.ts", "Token publico NUNCA SALVO no banco"],
    ["proposta-pdf.ts", "Mascaramento RBAC e placeholder; Puppeteer comentado"],
    ["proposta-rbac.ts", "RBAC e stub puro ('TODO: Integrar')"],
    ["key-rotation.ts", "Re-encriptacao retorna 0 (no-op)"],
    ["calculations.ts", "despesasExtras SEMPRE ZERO"],
    ["invoices/[id]/pdf", "Retorna JSON, nao PDF ('To be implemented')"],
    ["invoices/[id]/send", "Envio de email simulado"],
    ["3 arquivos materials", "DEFAULT_LOCATION_ID = 1 hardcoded"],
    ["auth-middleware.ts", "Permissoes hardcoded ['read', 'write']"],
    ["propostas/route.ts GET", "Retorna array mock com 1 proposta ficticia"],
  ];
  for (let i = 0; i < todos.length; i++) row(todos[i], tdW, { colors: [BLK, RED], bgColor: i % 2 === 0 ? LG : null });

  y -= 8;
  sub("auth-core: 20 metodos STUB");
  txt("AuthService (6), SessionService (8), PasswordService (3), JWTService (4) -- todos fazem throw new Error('needs to be implemented'). Package inteiro e codigo morto.", { size: 8, color: RED });

  y -= 8;
  sub("Campos Calculados -- Status Real");
  header(["Campo", "Status"], tdW);
  row(["custoReal", "MANUAL: depende de input do usuario, nao agrega despesas"], tdW, { colors: [BLK, ORG] });
  row(["margemPrevista / margemReal", "VOLATIL: calculado in-memory, nunca persistido"], tdW, { colors: [BLK, ORG], bgColor: LG });
  row(["despesasExtras", "SEMPRE ZERO: hardcoded como 0 // TODO"], tdW, { colors: [BLK, RED] });
  row(["custoMaoObra", "IMPRECISO: estimado como custoReal - custoMateriais"], tdW, { colors: [BLK, ORG], bgColor: LG });
  row(["committedCost, projectedCost, actualBurden", "NAO EXISTEM no codigo"], tdW, { colors: [BLK, RED] });

  // ======================== AUDIT 4 ========================
  newPage();
  title("AUDITORIA 4 -- Comunicacao entre Modulos");
  sep();

  sub("Instancias PrismaClient (CRITICO)");
  txt("O projeto tem 1 singleton correto em shared/lib/prisma.ts + 2 re-exports validos.", { size: 9 });
  txt("POREM: 11 arquivos criam 'new PrismaClient()' inline, potencialmente esgotando o pool:", { size: 9, color: RED });
  y -= 4;
  const inlineFiles = [
    "financeiro/despesas/route.ts", "financeiro/despesas/categorias/route.ts",
    "financeiro/despesas/[id]/route.ts", "financeiro/despesas/[id]/aprovar/route.ts",
    "financeiro/despesas/[id]/rejeitar/route.ts", "financeiro/despesas/[id]/pagar/route.ts",
    "analytics/route.ts", "technicians/route.ts", "clients/route.ts",
    "tax-resolver.service.ts", "seed-invoice.ts",
  ];
  for (const f of inlineFiles) bullet(f, { color: RED });

  y -= 8;
  sub("Packages Externos -- CODIGO MORTO");
  header(["Package", "Status"], pgW);
  row(["@gladpros/auth-core", "NAO listado no package.json, ZERO imports em src/"], pgW, { colors: [BLK, RED] });
  row(["@gladpros/proposals-core", "NAO listado no package.json, ZERO imports em src/"], pgW, { colors: [BLK, RED], bgColor: LG });

  y -= 8;
  sub("Anti-patterns");
  bullet("shared/ importa de src/services/ (inversao de dependencia)");
  bullet("src/services/ importa de packages/ via caminho relativo (bypassa boundary)");
  bullet("3 caminhos diferentes para importar o mesmo Prisma singleton");

  // ======================== AUDIT 5 ========================
  y -= 10;
  title("AUDITORIA 5 -- Autenticacao e Seguranca");
  sep();

  sub("Vulnerabilidades Criticas");
  const secW = [25, 280, CW - 305];
  header(["#", "Vulnerabilidade", "Severidade"], secW);
  const vulns = [
    ["1", "Middleware NAO valida assinatura JWT (so verifica existencia cookie)", "CRITICA"],
    ["2", "~15 rotas com dados reais e ZERO auth no handler", "CRITICA"],
    ["3", "Path traversal em /api/uploads/[...path]", "CRITICA"],
    ["4", "Notificacoes confia em header x-user-id (manipulavel)", "ALTA"],
    ["5", "CSP com unsafe-inline e unsafe-eval", "ALTA"],
    ["6", "Permissoes hardcoded no middleware (['read','write'])", "ALTA"],
    ["7", "RBAC nao cobre workforce, service-orders, invoices, rh", "MEDIA"],
    ["8", "Rate limiting em memoria (nao persiste entre restarts)", "MEDIA"],
  ];
  for (let i = 0; i < vulns.length; i++) {
    const sev = vulns[i][2];
    const sc = sev === "CRITICA" ? DRED : sev === "ALTA" ? RED : ORG;
    row(vulns[i], secW, { colors: [BLK, BLK, sc], bgColor: i % 2 === 0 ? LG : null });
  }

  y -= 8;
  sub("Rotas SEM Auth (com dados reais)");
  const noAuthRoutes = [
    "/api/service-orders (CRUD completo)",
    "/api/dashboard/executive (dados consolidados financeiros)",
    "/api/analytics (dados reais do banco)",
    "/api/rh/dashboard e /api/rh/funcionarios (dados RH)",
    "/api/financeiro/dashboard e /api/financeiro/despesas",
    "/api/technicians, /api/uploads/[...path]",
  ];
  for (const r of noAuthRoutes) bullet(r, { color: RED });

  // ======================== AUDIT 6 ========================
  newPage();
  title("AUDITORIA 6 -- Codigo Morto");
  sep();

  sub("Servicos Mortos");
  bullet("estimation.service.ts -- nenhuma importacao em src/");
  bullet("tax-resolver.service.ts -- nenhuma importacao em src/");

  y -= 6;
  sub("Dependencias npm NAO Utilizadas (8 pacotes)");
  const deadDeps = ["redis", "winston", "express-rate-limit", "helmet", "cors", "next-pwa", "critters", "react-is"];
  for (const d of deadDeps) bullet(d, { color: ORG });

  y -= 6;
  sub("Rotas API 100% Mock (14 rotas)");
  const mockRoutes = [
    "reports/ (7 rotas -- todos dados fake)",
    "webhooks/route.ts e webhooks/test/route.ts",
    "whatsapp/templates e whatsapp/send",
    "monitoring/metrics",
    "notifications/ws",
    "propostas (GET -- array mock hardcoded)",
  ];
  for (const r of mockRoutes) bullet(r, { color: RED });

  y -= 6;
  sub("Componentes Mortos (~27 arquivos)");
  txt("Inclui modulo RH inteiro (8 componentes nunca integrados em paginas), alem de: TestGradient, ModulePages, ClienteList, ClienteDetailsModal, AvatarUpload, PageHeader, Header, DashboardStats, DashboardCharts (versao antiga), ReportBuilder, code-splitting-guide, lazy-components, etc.", { size: 8, color: GRY });

  // ======================== AUDIT 7 ========================
  y -= 10;
  title("AUDITORIA 7 -- Testes");
  sep();

  sub("Inventario de Testes (90 arquivos)");
  const tstW = [200, CW - 200];
  header(["Categoria", "Quantidade"], tstW);
  const tstData = [
    ["Testes unitarios reais (testam codigo existente)", "~45"],
    ["Testes self-contained (logica inline, sem modulo real)", "~20"],
    ["Testes integracao API mock", "5"],
    ["Testes integracao DB real", "6"],
    ["Testes E2E Playwright", "12"],
    ["Packages (vitest)", "10"],
    ["Scripts manuais", "~25"],
  ];
  for (let i = 0; i < tstData.length; i++) row(tstData[i], tstW, { bgColor: i % 2 === 0 ? LG : null });

  y -= 8;
  sub("Cobertura por Dominio");
  header(["Dominio", "Cobertura"], tstW);
  row(["domains/projects/services/", "100% (13 de 13 services)"], tstW, { colors: [BLK, GRN] });
  row(["domains/portal/", "70% (7 de 10)"], tstW, { colors: [BLK, GRN], bgColor: LG });
  row(["shared/services/", "0% (0 de 3)"], tstW, { colors: [BLK, RED] });
  row(["API Routes", "~10% (4 de 38+ familias)"], tstW, { colors: [BLK, RED], bgColor: LG });

  y -= 8;
  sub("Problemas Graves nos Testes");
  bullet("~20 testes 'self-contained' definem funcoes inline e testam -- ilusao de cobertura", { color: RED });
  bullet("~90% das rotas API sem testes (financeiro, RH, estoque, workforce inteiros)", { color: RED });
  bullet("Testes de JWT mockam completamente o modulo -- testam o mock, nao o codigo", { color: ORG });
  bullet("Testes de stress simulam carga com contadores em memoria -- sem valor real", { color: ORG });

  // ======================== FINAL ========================
  newPage();
  title("DIAGNOSTICO FINAL POR MODULO");
  sep();

  const diagW = [120, 55, CW - 175];
  header(["Modulo", "Saude", "Observacao"], diagW);
  const diag = [
    ["Portal Cliente (F6)", "Excelente", "100% implementado, testado, seguro", GRN],
    ["Projetos (domain DDD)", "Bom", "Services completos, testados, arquitetura solida", GRN],
    ["Estoque", "Funcional", "Prisma inline mas CRUD completo, paginas SSR", GRN],
    ["Clientes", "Funcional", "CRUD completo com validacao", GRN],
    ["Auth/Login", "Lacunas", "JWT funciona mas middleware fragil, RBAC parcial", ORG],
    ["Financeiro", "Parcial", "v2 funcional, v1 mock, PrismaClient inline", ORG],
    ["RH", "Parcial", "API funcional mas sem auth, componentes mortos", ORG],
    ["Workforce/Workers", "Funcional", "CRUD completo, service layer parcial", GRN],
    ["Service Orders", "INSEGURO", "CRUD completo, ZERO autenticacao", RED],
    ["Invoices", "Parcial", "CRUD existe, PDF nao implementado, envio simulado", ORG],
    ["Propostas", "Parcial", "GET mock, PDF e email pendentes, RBAC stub", ORG],
    ["Reports/Documents/Aprovacoes", "Mock Total", "100% dados fake, sem funcionalidade real", RED],
    ["WhatsApp/Webhooks", "Mock Total", "Sem integracao real", RED],
    ["F1-F4 (Compliance/Costing)", "Schema Only", "30 models orphans, 0 services, 0 routes", RED],
  ];
  for (let i = 0; i < diag.length; i++) {
    row([diag[i][0], diag[i][1], diag[i][2]], diagW, { colors: [BLK, diag[i][3], GRY], bgColor: i % 2 === 0 ? LG : null });
  }

  y -= 20;
  sub("Conclusao");
  y -= 4;
  txt("O sistema GladPros tem uma base solida em algumas areas (Projetos DDD, Portal F6, Estoque), mas apresenta discrepancias significativas entre o que foi reportado e o que realmente existe:", { size: 9 });
  y -= 4;
  bullet("30 models no Prisma que nenhum codigo usa (orphans)");
  bullet("11 phantom imports em barrel files apontando para arquivos inexistentes");
  bullet("11 arquivos criando instancias PrismaClient separadas");
  bullet("~15 rotas API com dados reais acessiveis sem autenticacao");
  bullet("20 metodos no auth-core que so fazem throw 'not implemented'");
  bullet("14 rotas API retornando dados 100% mock/fake");
  bullet("~50% dos testes nao testam codigo real do sistema");
  bullet("Campos financeiros calculados nunca sao persistidos ou calculados automaticamente");
  y -= 8;
  txt("Recomendacao: priorizar correcoes de seguranca (auth nas rotas), remover codigo morto, consolidar instancias PrismaClient, e implementar a logica de negocio para os models que ja existem.", { size: 9, font: fB });

  // ======================== FOOTERS ========================
  const pages = pdf.getPages();
  for (let i = 0; i < pages.length; i++) {
    pages[i].drawText(`Auditoria Completa -- GladPros ERP -- Pagina ${i + 1} de ${pages.length}`, { x: ML, y: 25, size: 7, font: fI, color: GRY });
    pages[i].drawText("16/03/2026 -- Gerado automaticamente", { x: PW - MR - 150, y: 25, size: 7, font: fI, color: GRY });
  }

  const bytes = await pdf.save();
  const outPath = "docs/AUDITORIA-COMPLETA-GLADPROS.pdf";
  writeFileSync(outPath, bytes);
  console.log(`PDF gerado: ${outPath}`);
  console.log(`Tamanho: ${(bytes.length / 1024).toFixed(1)} KB`);
  console.log(`Paginas: ${pages.length}`);
}

main().catch(console.error);
