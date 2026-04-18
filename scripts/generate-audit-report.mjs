/**
 * Script para gerar PDF do Relatório de Auditoria -- Plano de Fases Consolidado
 * Uso: node scripts/generate-audit-report.mjs
 */
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { writeFileSync } from "fs";

const MARGIN_LEFT = 50;
const MARGIN_RIGHT = 50;
const PAGE_WIDTH = 595.28; // A4
const PAGE_HEIGHT = 841.89; // A4
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

async function main() {
  const pdf = await PDFDocument.create();
  const fontRegular = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await pdf.embedFont(StandardFonts.HelveticaOblique);

  const COLOR_BLACK = rgb(0, 0, 0);
  const COLOR_RED = rgb(0.8, 0.1, 0.1);
  const COLOR_GREEN = rgb(0.1, 0.55, 0.1);
  const COLOR_ORANGE = rgb(0.85, 0.55, 0);
  const COLOR_GRAY = rgb(0.4, 0.4, 0.4);
  const COLOR_BLUE = rgb(0.15, 0.3, 0.6);
  const COLOR_LIGHT_GRAY = rgb(0.92, 0.92, 0.92);
  const COLOR_WHITE = rgb(1, 1, 1);

  let currentPage = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - 50;

  function checkPage(needed = 60) {
    if (y < needed) {
      currentPage = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - 50;
    }
  }

  function drawText(text, { x = MARGIN_LEFT, size = 10, font = fontRegular, color = COLOR_BLACK, maxWidth = CONTENT_WIDTH } = {}) {
    checkPage(size + 20);
    // Word wrap
    const words = text.split(" ");
    let line = "";
    const lines = [];
    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word;
      const width = font.widthOfTextAtSize(testLine, size);
      if (width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = testLine;
      }
    }
    if (line) lines.push(line);

    for (const l of lines) {
      checkPage(size + 6);
      currentPage.drawText(l, { x, y, size, font, color });
      y -= size + 4;
    }
  }

  function drawTitle(text, size = 18) {
    checkPage(size + 30);
    y -= 10;
    currentPage.drawText(text, { x: MARGIN_LEFT, y, size, font: fontBold, color: COLOR_BLUE });
    y -= size + 8;
  }

  function drawSubtitle(text, size = 14) {
    checkPage(size + 20);
    y -= 8;
    currentPage.drawText(text, { x: MARGIN_LEFT, y, size, font: fontBold, color: COLOR_BLACK });
    y -= size + 6;
  }

  function drawSubSubtitle(text, size = 11) {
    checkPage(size + 16);
    y -= 4;
    currentPage.drawText(text, { x: MARGIN_LEFT, y, size, font: fontBold, color: COLOR_GRAY });
    y -= size + 4;
  }

  function drawSep() {
    checkPage(10);
    currentPage.drawLine({
      start: { x: MARGIN_LEFT, y },
      end: { x: PAGE_WIDTH - MARGIN_RIGHT, y },
      thickness: 0.5,
      color: COLOR_GRAY,
    });
    y -= 8;
  }

  function drawBullet(text, { color = COLOR_BLACK, icon = "•", indent = 0 } = {}) {
    const xPos = MARGIN_LEFT + 10 + indent;
    checkPage(16);
    currentPage.drawText(icon, { x: xPos - 10, y, size: 10, font: fontRegular, color });
    // word wrap for bullet text
    const words = text.split(" ");
    let line = "";
    const lines = [];
    const maxW = CONTENT_WIDTH - 20 - indent;
    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word;
      const width = fontRegular.widthOfTextAtSize(testLine, 9);
      if (width > maxW && line) {
        lines.push(line);
        line = word;
      } else {
        line = testLine;
      }
    }
    if (line) lines.push(line);

    for (let i = 0; i < lines.length; i++) {
      checkPage(14);
      currentPage.drawText(lines[i], { x: xPos, y, size: 9, font: fontRegular, color });
      y -= 13;
    }
  }

  function drawTableRow(cols, widths, { font: rowFont = fontRegular, size = 8, bgColor = null, colors = null } = {}) {
    checkPage(18);
    const rowH = 16;
    if (bgColor) {
      currentPage.drawRectangle({
        x: MARGIN_LEFT,
        y: y - 4,
        width: CONTENT_WIDTH,
        height: rowH,
        color: bgColor,
      });
    }
    let xOff = MARGIN_LEFT + 4;
    for (let i = 0; i < cols.length; i++) {
      const colColor = colors && colors[i] ? colors[i] : COLOR_BLACK;
      const text = String(cols[i] || "");
      // truncate if needed
      let displayText = text;
      const maxW = widths[i] - 8;
      while (rowFont.widthOfTextAtSize(displayText, size) > maxW && displayText.length > 3) {
        displayText = displayText.slice(0, -4) + "...";
      }
      currentPage.drawText(displayText, { x: xOff, y, size, font: rowFont, color: colColor });
      xOff += widths[i];
    }
    y -= rowH;
  }

  // ======================== COVER PAGE ========================
  y = PAGE_HEIGHT - 150;
  currentPage.drawText("RELATÓRIO DE AUDITORIA", {
    x: MARGIN_LEFT, y, size: 24, font: fontBold, color: COLOR_BLUE,
  });
  y -= 35;
  currentPage.drawText("Plano de Fases Consolidado -- GladPros ERP Construction", {
    x: MARGIN_LEFT, y, size: 14, font: fontRegular, color: COLOR_BLACK,
  });
  y -= 25;
  currentPage.drawText("Data: 16 de março de 2026", {
    x: MARGIN_LEFT, y, size: 11, font: fontItalic, color: COLOR_GRAY,
  });
  y -= 18;
  currentPage.drawText("Branch: chore/root-cleanup-archive (PR #23)", {
    x: MARGIN_LEFT, y, size: 11, font: fontItalic, color: COLOR_GRAY,
  });
  y -= 18;
  currentPage.drawText("Repositório: Gladiston-Porto/gladpros-refatorado", {
    x: MARGIN_LEFT, y, size: 11, font: fontItalic, color: COLOR_GRAY,
  });

  y -= 50;
  drawSep();
  y -= 10;
  drawText("Este documento apresenta uma auditoria completa do Plano de Fases Consolidado,", { size: 11 });
  drawText("verificando item a item se o que está marcado como concluído (check verde) no plano", { size: 11 });
  drawText("realmente existe no código-fonte do sistema.", { size: 11 });
  y -= 15;
  drawText("Metodologia: cada item [FEITO] foi verificado buscando os arquivos, funções, models,", { size: 10, color: COLOR_GRAY });
  drawText("enums, migrations, testes e rotas correspondentes no codebase.", { size: 10, color: COLOR_GRAY });

  y -= 30;
  drawSubtitle("Resumo Executivo", 14);
  drawSep();

  const summaryData = [
    ["Aspecto", "Situação"],
    ["Schema Prisma (models/enums)", "~95% correto -- todos os models/enums existem"],
    ["Migrations", "Apenas 6 de ~20 mencionadas existem"],
    ["Services (F1–F4.5)", "~60–70% dos services estão FALTANDO"],
    ["API Routes (F1–F4.5)", "~80% das rotas NÃO existem"],
    ["Portal (F6)", "100% implementado e confirmado"],
    ["Material (F5)", "~80% implementado"],
    ["F7 (Agentes)", "0% -- totalmente pendente"],
  ];
  const summaryW = [200, CONTENT_WIDTH - 200];
  for (let i = 0; i < summaryData.length; i++) {
    const isHeader = i === 0;
    const bg = isHeader ? COLOR_BLUE : (i % 2 === 0 ? COLOR_LIGHT_GRAY : null);
    const colors = isHeader ? [COLOR_WHITE, COLOR_WHITE] : [COLOR_BLACK, i >= 3 && i <= 5 ? COLOR_RED : COLOR_BLACK];
    drawTableRow(summaryData[i], summaryW, {
      font: isHeader ? fontBold : fontRegular,
      bgColor: bg,
      colors,
    });
  }

  // ======================== PART 1 ========================
  currentPage = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  y = PAGE_HEIGHT - 50;

  drawTitle("PARTE 1 -- Itens marcados como FEITO que NAO EXISTEM no codigo");
  drawSep();

  // --- F1 ---
  drawSubtitle("FASE 1 -- Fundação Real");

  drawSubSubtitle("F1.1 -- Gateways Reais + Factory");
  const f1_1_issues = [
    ["1.1.2", "PrismaFinanceGateway (7 métodos)", "Arquivo NÃO EXISTE. Só existe mock-finance.gateway.ts"],
    ["1.1.3", "PrismaInventoryGateway (4 métodos)", "Arquivo NÃO EXISTE. Só existe mock-inventory.gateway.ts"],
    ["1.1.4", "PrismaTriageGateway", "Arquivo NÃO EXISTE. Só existe mock-triage.gateway.ts"],
    ["1.1.5", "Services atualizados p/ GatewayFactory", "PARCIAL -- ProjectService usa, mas InventoryMovement e 2 rotas usam mock direto"],
    ["1.1.6", "USE_MOCK_GATEWAYS em jest.setup.js", "NÃO EXISTE -- factory funciona por fallback NODE_ENV"],
  ];
  const colW3 = [40, 170, CONTENT_WIDTH - 210];
  drawTableRow(["Item", "Descrição no Plano", "Situação Real"], colW3, { font: fontBold, bgColor: COLOR_BLUE, colors: [COLOR_WHITE, COLOR_WHITE, COLOR_WHITE] });
  for (const row of f1_1_issues) {
    drawTableRow(row, colW3, { colors: [COLOR_BLACK, COLOR_BLACK, COLOR_RED] });
  }

  y -= 8;
  drawSubSubtitle("F1.2 -- Expense <-> Projeto/OS");
  const f1_2_issues = [
    ["1.2.6", "Migration 20260208120000", "NÃO EXISTE"],
    ["1.2.7", "Propagação projetoId em 3 code paths", "NÃO IMPLEMENTADA -- rotas não propagam campos"],
    ["1.2.8", "API despesas filtrar projetoId/serviceOrderId", "NÃO IMPLEMENTADA -- GET não aceita filtros"],
    ["1.2.9", "Testes F1.2 job costing", "NÃO EXISTEM"],
  ];
  drawTableRow(["Item", "Descrição no Plano", "Situação Real"], colW3, { font: fontBold, bgColor: COLOR_BLUE, colors: [COLOR_WHITE, COLOR_WHITE, COLOR_WHITE] });
  for (const row of f1_2_issues) {
    drawTableRow(row, colW3, { colors: [COLOR_BLACK, COLOR_BLACK, COLOR_RED] });
  }

  y -= 8;
  drawSubSubtitle("F1.3 -- Compliance Vendor/Sub");
  const f1_3_issues = [
    ["1.3.6", "VendorComplianceService", "Arquivo NÃO EXISTE"],
    ["1.3.7", "Guard isWorkerPayable() em generatePayable()", "NÃO EXISTE -- nenhum guard de compliance"],
    ["1.3.8", "getExpiringComplianceItems() + ALERT_THRESHOLDS", "NÃO EXISTEM"],
    ["1.3.9", "Migration 20260209120000", "NÃO EXISTE"],
    ["1.3.10", "23 testes VendorComplianceService", "NÃO EXISTEM"],
  ];
  drawTableRow(["Item", "Descrição no Plano", "Situação Real"], colW3, { font: fontBold, bgColor: COLOR_BLUE, colors: [COLOR_WHITE, COLOR_WHITE, COLOR_WHITE] });
  for (const row of f1_3_issues) {
    drawTableRow(row, colW3, { colors: [COLOR_BLACK, COLOR_BLACK, COLOR_RED] });
  }

  // --- F2 ---
  y -= 10;
  drawSubtitle("FASE 2 -- Custo Real");

  drawSubSubtitle("F2.1 -- WorkerClassification + Employer Burden");
  const f2_1_issues = [
    ["2.1.4", "burdenCalcService.ts", "Arquivo NÃO EXISTE"],
    ["2.1.5", "check1099Threshold()", "NÃO EXISTE"],
    ["2.1.6", "Migration 20260209130000 + 22 testes", "NENHUM EXISTE"],
  ];
  drawTableRow(["Item", "Descrição no Plano", "Situação Real"], colW3, { font: fontBold, bgColor: COLOR_BLUE, colors: [COLOR_WHITE, COLOR_WHITE, COLOR_WHITE] });
  for (const row of f2_1_issues) {
    drawTableRow(row, colW3, { colors: [COLOR_BLACK, COLOR_BLACK, COLOR_RED] });
  }

  y -= 6;
  drawSubSubtitle("F2.2 -- Subcontract + Milestones + Gates");
  const f2_2_issues = [
    ["2.2.6", "Migration 20260209140000", "NÃO EXISTE"],
  ];
  drawTableRow(["Item", "Descrição no Plano", "Situação Real"], colW3, { font: fontBold, bgColor: COLOR_BLUE, colors: [COLOR_WHITE, COLOR_WHITE, COLOR_WHITE] });
  for (const row of f2_2_issues) {
    drawTableRow(row, colW3, { colors: [COLOR_BLACK, COLOR_BLACK, COLOR_RED] });
  }

  y -= 6;
  drawSubSubtitle("F2.3 -- Lien Waivers + Job Costing");
  const f2_3_issues = [
    ["2.3.2", "hasRequiredLienWaiver()", "NÃO EXISTE"],
    ["2.3.3", "JobCostingService (jobCostingService.ts)", "Arquivo NÃO EXISTE"],
    ["2.3.4", "custoReal auto-calculado", "Campo existe, mas NENHUM service o calcula"],
    ["2.3.5", "determineBudgetSeverity() + alertas", "Enum existe, mas FUNÇÃO NÃO"],
    ["2.3.7", "Migration + 24 testes JobCostingService", "NENHUM EXISTE"],
  ];
  drawTableRow(["Item", "Descrição no Plano", "Situação Real"], colW3, { font: fontBold, bgColor: COLOR_BLUE, colors: [COLOR_WHITE, COLOR_WHITE, COLOR_WHITE] });
  for (const row of f2_3_issues) {
    drawTableRow(row, colW3, { colors: [COLOR_BLACK, COLOR_BLACK, COLOR_RED] });
  }

  // --- F2.5 ---
  y -= 10;
  drawSubtitle("FASE 2.5 -- Purchase Orders");
  const f25_issues = [
    ["2.5.3", "purchaseOrderService.ts", "Arquivo NÃO EXISTE"],
    ["2.5.4", "consumePurchaseOrderCommitment()", "Campos FK existem, FUNÇÃO NÃO"],
    ["2.5.5", "committedCost/projectedCost no JobCostingService", "JobCostingService NÃO EXISTE"],
    ["2.5.6", "Alerta por projectedPercentUsed", "NÃO IMPLEMENTADO"],
    ["2.5.7", "Migration 20260213100000 + 38 testes", "NENHUM EXISTE"],
    ["2.5.8", "tests/integration/purchaseOrders.api.int.test.ts", "Pasta tests/integration/ NÃO EXISTE"],
  ];
  drawTableRow(["Item", "Descrição no Plano", "Situação Real"], colW3, { font: fontBold, bgColor: COLOR_BLUE, colors: [COLOR_WHITE, COLOR_WHITE, COLOR_WHITE] });
  for (const row of f25_issues) {
    drawTableRow(row, colW3, { colors: [COLOR_BLACK, COLOR_BLACK, COLOR_RED] });
  }

  // --- F3 ---
  y -= 10;
  drawSubtitle("FASE 3 -- Change Orders + Baseline");
  const f3_issues = [
    ["3.1.4", "convert-proposal.ts salva baseline", "Arquivo existe, mas NÃO salva budgetBaseline"],
    ["3.2.5-11", "Motor de aplicação CO (applyChangeOrder)", "Nenhum ChangeOrderService existe; API /api/change-orders/ NÃO existe"],
    ["3.2.12", "Migration 20260214233000 (fix enum)", "NÃO EXISTE"],
  ];
  drawTableRow(["Item", "Descrição no Plano", "Situação Real"], colW3, { font: fontBold, bgColor: COLOR_BLUE, colors: [COLOR_WHITE, COLOR_WHITE, COLOR_WHITE] });
  for (const row of f3_issues) {
    drawTableRow(row, colW3, { colors: [COLOR_BLACK, COLOR_BLACK, COLOR_RED] });
  }

  // --- F4 ---
  y -= 10;
  drawSubtitle("FASE 4 -- Ciclo de Vida Completo");

  drawSubSubtitle("F4.1 -- Permits + Inspections");
  const f4_1 = [
    ["F4.1", "ProjectPermitInspectionService", "Exportado no barrel index.ts, ARQUIVO NÃO EXISTE"],
    ["F4.1", "API /api/projetos/[id]/permits e /inspections", "NÃO EXISTEM"],
    ["F4.1", "Migrations 20260215010000, 20260215023000", "NÃO EXISTEM"],
  ];
  drawTableRow(["Item", "Descrição no Plano", "Situação Real"], colW3, { font: fontBold, bgColor: COLOR_BLUE, colors: [COLOR_WHITE, COLOR_WHITE, COLOR_WHITE] });
  for (const row of f4_1) { drawTableRow(row, colW3, { colors: [COLOR_BLACK, COLOR_BLACK, COLOR_RED] }); }

  y -= 6;
  drawSubSubtitle("F4.2 -- Punch List + Checklist");
  const f4_2 = [
    ["F4.2", "ProjectPunchListService", "Exportado no barrel, ARQUIVO NÃO EXISTE"],
    ["F4.2", "ChecklistTemplateService, ChecklistApplyService", "Exportados no barrel, ARQUIVOS NÃO EXISTEM"],
    ["F4.2", "API routes punch/checklist", "NÃO EXISTEM"],
    ["F4.2", "Migrations 040000/050000/060000", "NÃO EXISTEM"],
  ];
  drawTableRow(["Item", "Descrição no Plano", "Situação Real"], colW3, { font: fontBold, bgColor: COLOR_BLUE, colors: [COLOR_WHITE, COLOR_WHITE, COLOR_WHITE] });
  for (const row of f4_2) { drawTableRow(row, colW3, { colors: [COLOR_BLACK, COLOR_BLACK, COLOR_RED] }); }

  y -= 6;
  drawSubSubtitle("F4.3 -- Closeout Package");
  const f4_3 = [
    ["F4.3", "CloseoutTemplateService", "Exportado no barrel, ARQUIVO NÃO EXISTE"],
    ["F4.3", "API /api/projetos/[id]/closeout/*", "NÃO EXISTEM"],
    ["F4.3", "Migrations 070000, 090000", "NÃO EXISTEM"],
  ];
  drawTableRow(["Item", "Descrição no Plano", "Situação Real"], colW3, { font: fontBold, bgColor: COLOR_BLUE, colors: [COLOR_WHITE, COLOR_WHITE, COLOR_WHITE] });
  for (const row of f4_3) { drawTableRow(row, colW3, { colors: [COLOR_BLACK, COLOR_BLACK, COLOR_RED] }); }

  y -= 6;
  drawSubSubtitle("F4.4 -- Warranty Tickets");
  const f4_4 = [
    ["F4.4", "WarrantyTicketService, WarrantyAnalyticsService", "Exportados no barrel, ARQUIVOS NÃO EXISTEM"],
    ["F4.4", "API /warranty-tickets, /analytics/warranty-rework", "NÃO EXISTEM"],
    ["F4.4", "Migrations 100000, 110000", "NÃO EXISTEM"],
  ];
  drawTableRow(["Item", "Descrição no Plano", "Situação Real"], colW3, { font: fontBold, bgColor: COLOR_BLUE, colors: [COLOR_WHITE, COLOR_WHITE, COLOR_WHITE] });
  for (const row of f4_4) { drawTableRow(row, colW3, { colors: [COLOR_BLACK, COLOR_BLACK, COLOR_RED] }); }

  y -= 6;
  drawSubSubtitle("F4.5 -- Post-Project Feedback");
  const f4_5 = [
    ["F4.5", "ClientFeedbackService", "Exportado no barrel, ARQUIVO NÃO EXISTE"],
    ["F4.5", "API /api/projetos/[id]/feedback", "NÃO EXISTE"],
    ["F4.5", "Migration 20260215211422", "NÃO EXISTE"],
  ];
  drawTableRow(["Item", "Descrição no Plano", "Situação Real"], colW3, { font: fontBold, bgColor: COLOR_BLUE, colors: [COLOR_WHITE, COLOR_WHITE, COLOR_WHITE] });
  for (const row of f4_5) { drawTableRow(row, colW3, { colors: [COLOR_BLACK, COLOR_BLACK, COLOR_RED] }); }

  // --- F5 partial ---
  y -= 10;
  drawSubtitle("FASE 5 -- Material Unificado (itens faltantes)");
  const f5_issues = [
    ["F5.1", "Mapper material-flow-status.mapper.ts", "Arquivo NÃO EXISTE"],
    ["F5.1", "Migration 20260215233000", "NÃO EXISTE"],
    ["F5.1", "Backfill script db:backfill:material-flow", "NÃO EXISTE no package.json"],
  ];
  drawTableRow(["Item", "Descrição no Plano", "Situação Real"], colW3, { font: fontBold, bgColor: COLOR_BLUE, colors: [COLOR_WHITE, COLOR_WHITE, COLOR_WHITE] });
  for (const row of f5_issues) { drawTableRow(row, colW3, { colors: [COLOR_BLACK, COLOR_BLACK, COLOR_RED] }); }

  // ======================== PART 2 ========================
  currentPage = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  y = PAGE_HEIGHT - 50;

  drawTitle("PARTE 2 -- O que REALMENTE existe e está confirmado");
  drawSep();

  drawSubtitle("Schema Prisma (~95% completo)");
  drawText("Todos os models, enums e relações mencionados no plano F1–F6 existem no schema.prisma.", { size: 10 });
  drawText("Incluindo: Expense (job link), VendorTaxProfile, VendorInsurance, VendorLicense,", { size: 9, color: COLOR_GRAY });
  drawText("WorkerClassification, EmployerBurdenRate, SubcontractAgreement/Milestone/Gate,", { size: 9, color: COLOR_GRAY });
  drawText("LienWaiver, BudgetAlert, PurchaseOrder/Item, ChangeOrder/Item, ProjectPermit,", { size: 9, color: COLOR_GRAY });
  drawText("ProjectInspection, ProjectPunchItem, ChecklistTemplate, ProjectCloseout,", { size: 9, color: COLOR_GRAY });
  drawText("CloseoutTemplate, WarrantyTicket, ProjectClientFeedback, MaterialFlowStatus, etc.", { size: 9, color: COLOR_GRAY });
  y -= 10;

  drawSubtitle("Services que realmente existem");
  const confirmedServices = [
    ["ProjectService.ts", "CONFIRMADO", "Inclui guards closeout: PERMIT/INSPECTION/PUNCH/MATERIAL"],
    ["ProjectCloseoutService.ts", "CONFIRMADO", "1331 linhas, generate/deliver/accept/gates"],
    ["ProjectMaterialMetricsService.ts", "CONFIRMADO", "Recompute com chunking/incremental"],
    ["PortalTokenService.ts", "CONFIRMADO", "Token hash-only + revogação"],
    ["Portal services (6+ files)", "CONFIRMADO", "ChangeOrder, Invoice, Closeout portal services"],
    ["resolveActualUnitCost.ts", "CONFIRMADO", "Resolver de custo com fallbacks"],
    ["GatewayFactory (index.ts)", "CONFIRMADO", "Lazy imports, env switching"],
    ["ProjectStageService.ts", "CONFIRMADO", ""],
    ["ProjectMaterialService.ts", "CONFIRMADO", ""],
    ["inventory-movement.service.ts", "CONFIRMADO", ""],
  ];
  drawTableRow(["Service", "Status", "Detalhes"], colW3, { font: fontBold, bgColor: COLOR_BLUE, colors: [COLOR_WHITE, COLOR_WHITE, COLOR_WHITE] });
  for (let i = 0; i < confirmedServices.length; i++) {
    drawTableRow(confirmedServices[i], colW3, { colors: [COLOR_BLACK, COLOR_GREEN, COLOR_GRAY], bgColor: i % 2 === 0 ? COLOR_LIGHT_GRAY : null });
  }

  y -= 10;
  drawSubtitle("Migrations que existem (6 de ~20)");
  const migrations = [
    ["20260107033942_init_v2", "Migration inicial gigante"],
    ["20260215235900_add_project_material_metrics_f52a", "F5.2A -- Métricas de material"],
    ["20260222120000_add_ledger_indexes_f53a", "F5.3A -- Índices de ledger"],
    ["20260222133000_add_project_portal_token_fields_f61a", "F6.1A -- Portal token"],
    ["20260222163000_add_change_order_portal_decision_audit_f62a2", "F6.2A.2 -- Auditoria portal CO"],
    ["20260223103000_add_invoice_pdf_metadata_f6_2b3_1", "F6.2B.3.1 -- PDF metadata invoice"],
  ];
  const colW2 = [270, CONTENT_WIDTH - 270];
  drawTableRow(["Migration", "Descrição"], colW2, { font: fontBold, bgColor: COLOR_BLUE, colors: [COLOR_WHITE, COLOR_WHITE] });
  for (let i = 0; i < migrations.length; i++) {
    drawTableRow(migrations[i], colW2, { colors: [COLOR_GREEN, COLOR_GRAY], bgColor: i % 2 === 0 ? COLOR_LIGHT_GRAY : null });
  }

  y -= 10;
  drawSubtitle("Portal (F6) -- 100% implementado");
  const portalFiles = [
    "src/app/portal/[token]/page.tsx -- Portal principal",
    "src/app/portal/[token]/change-orders/page.tsx -- Lista COs",
    "src/app/portal/[token]/change-orders/[id]/page.tsx -- Detalhe CO + DecisionForm",
    "src/app/portal/[token]/invoices/page.tsx -- Lista invoices",
    "src/app/portal/[token]/invoices/[id]/page.tsx -- Detalhe invoice",
    "src/app/portal/[token]/invoices/[id]/pdf/route.ts -- Download PDF invoice",
    "src/app/portal/[token]/closeout/page.tsx -- Closeout status + CTA",
    "src/app/portal/[token]/closeout/pdf/route.ts -- Download closeout PDF",
    "PortalChangeOrderService.ts, PortalChangeOrderDecisionService.ts",
    "PortalInvoiceService.ts, PortalInvoicesPageResolver.ts",
    "PortalInvoicePdfStorageService.ts",
    "PortalCloseoutService.ts, PortalCloseoutStorageService.ts, PortalCloseoutPageResolver.ts",
    "rate-limit.ts, get-client-ip.ts (security)",
  ];
  for (const f of portalFiles) {
    drawBullet(f, { color: COLOR_GREEN, icon: "+" });
  }

  // ======================== PART 3 ========================
  currentPage = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  y = PAGE_HEIGHT - 50;

  drawTitle("PARTE 3 -- O que FALTA fazer (itens [  ] no plano)");
  drawSep();

  drawSubtitle("Itens explicitamente NÃO iniciados");
  const pending = [
    ["F1.1", "1.1.7", "Testes integração gateways reais", "Pausado"],
    ["F5.3", "5.3.3", "Watermark operacional (adiado)", "Pausado"],
    ["F6.2", "6.2.2", "Página Invoices completa (link pagamento)", "Pendente"],
    ["F6.2", "6.2.3", "Página Download Closeout Package", "Pendente"],
    ["F6.2", "6.2.4", "Mensagens/notas empresa - cliente", "Pendente"],
    ["F6.2", "6.2.5", "Email notificação (CO/Invoice)", "Pendente"],
    ["F7.1", "7.1.1-5", "Agente de Takeoff (5 itens)", "Pendente"],
    ["F7.2", "7.2.1-4", "Agente de Variação (4 itens)", "Pendente"],
    ["F7.3", "7.3.1-4", "Agente de Cobrança (4 itens)", "Pendente"],
    ["F7.4", "7.4.1-4", "Agente de Precificação (4 itens)", "Pendente"],
    ["F7.5", "7.5.1-4", "Agente de Schedule Risk (4 itens)", "Pendente"],
  ];
  const colW4 = [40, 55, 250, CONTENT_WIDTH - 345];
  drawTableRow(["Fase", "Item", "Descrição", "Status"], colW4, { font: fontBold, bgColor: COLOR_BLUE, colors: [COLOR_WHITE, COLOR_WHITE, COLOR_WHITE, COLOR_WHITE] });
  for (let i = 0; i < pending.length; i++) {
    const statusColor = pending[i][3] === "Pausado" ? COLOR_ORANGE : COLOR_RED;
    drawTableRow(pending[i], colW4, { colors: [COLOR_BLACK, COLOR_BLACK, COLOR_BLACK, statusColor], bgColor: i % 2 === 0 ? COLOR_LIGHT_GRAY : null });
  }

  y -= 15;
  drawSubtitle("Backlog Extra (E1–E11)");
  const extras = [
    ["E1", "Daily Job Log (fotos, clima, progresso)", "Média"],
    ["E2", "Reconciliação bancária avançada (OFX/CSV)", "Baixa"],
    ["E3", "Prevailing Wage / Certified Payroll", "Baixa"],
    ["E4", "Multi-currency real", "Baixa"],
    ["E5", "Cost Code CSI (classificação padronizada)", "Média"],
    ["E6", "Integração bancária real (Plaid, OFX API)", "Baixa"],
    ["E7", "Vendor rating/score", "Média"],
    ["E8", "RACI matrix completa", "Baixa"],
    ["E9", "Approval engine genérico", "Média"],
    ["E10", "Proposta -> Estimation flow automático", "Média"],
    ["E11", "Padronização física tabelas (snake_case)", "Alta"],
  ];
  const colW3b = [30, 280, CONTENT_WIDTH - 310];
  drawTableRow(["#", "Descrição", "Prioridade"], colW3b, { font: fontBold, bgColor: COLOR_BLUE, colors: [COLOR_WHITE, COLOR_WHITE, COLOR_WHITE] });
  for (let i = 0; i < extras.length; i++) {
    const prioColor = extras[i][2] === "Alta" ? COLOR_RED : extras[i][2] === "Média" ? COLOR_ORANGE : COLOR_GRAY;
    drawTableRow(extras[i], colW3b, { colors: [COLOR_BLACK, COLOR_BLACK, prioColor], bgColor: i % 2 === 0 ? COLOR_LIGHT_GRAY : null });
  }

  // ======================== PART 4 -- ANALYSIS ========================
  currentPage = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  y = PAGE_HEIGHT - 50;

  drawTitle("PARTE 4 -- Análise de Discrepâncias");
  drawSep();

  drawSubtitle("Padrão identificado");
  y -= 5;
  drawText("A auditoria revelou um padrão consistente nas Fases 1 a 4:", { size: 10 });
  y -= 5;
  drawBullet("Os MODELOS de dados (Prisma schema) foram criados de forma abrangente na migration inicial (init_v2), cobrindo praticamente todos os models/enums planejados.");
  drawBullet("A LÓGICA DE NEGÓCIO (services, funções de domínio, regras) SÓ foi implementada para: ProjectCloseoutService (F4.3 parcial), ProjectMaterialMetrics (F5.2/5.3), e todo o Portal (F6).");
  drawBullet("As API ROUTES administrativas (permits, inspections, punch list, checklists, warranty, feedback, change orders CRUD, purchase orders, job costing, compliance) existem APENAS como definição de dados no Prisma.");
  drawBullet("Vários SERVICES estão exportados no barrel file (index.ts) mas os arquivos .ts correspondentes NÃO existem no disco -- são imports fantasma.");
  drawBullet("14 migrations mencionadas no plano NÃO EXISTEM. Apenas 6 migrations foram realmente criadas.");
  drawBullet("Os TESTES mencionados nas notas (22 + 24 + 38 + 23 + etc.) para services inexistentes também não existem.");

  y -= 15;
  drawSubtitle("Camadas por nível de implementação");
  y -= 5;

  const layers = [
    ["Camada", "Implementação", "Nota"],
    ["Schema Prisma (dados)", "~95%", "Quase completo"],
    ["Guards/Bloqueios no ProjectService", "~90%", "PERMIT/INSPECTION/PUNCH/MATERIAL existem"],
    ["Portal Cliente (F6)", "~100%", "Totalmente implementado"],
    ["Material Metrics (F5.2/5.3)", "~80%", "Faltam mapper e backfill"],
    ["Services de domínio (F1-F4)", "~20%", "Apenas CloseoutService completo"],
    ["API Routes admin (F1-F4)", "~5%", "Quase nenhuma existe"],
    ["Migrations dedicadas (F1-F4)", "~10%", "Maioria na init_v2 ou ausente"],
    ["Testes F1-F4", "~15%", "Apenas CloseoutService e Metrics"],
    ["Agentes IA (F7)", "0%", "Nada iniciado"],
  ];
  const layerW = [190, 80, CONTENT_WIDTH - 270];
  for (let i = 0; i < layers.length; i++) {
    const isHeader = i === 0;
    const bg = isHeader ? COLOR_BLUE : (i % 2 === 0 ? COLOR_LIGHT_GRAY : null);
    const pctColor = !isHeader && layers[i][1].startsWith("~9") || layers[i][1] === "~100%" ? COLOR_GREEN :
                     !isHeader && (layers[i][1].startsWith("~8") || layers[i][1].startsWith("~2")) ? COLOR_ORANGE :
                     !isHeader ? COLOR_RED : COLOR_WHITE;
    drawTableRow(layers[i], layerW, {
      font: isHeader ? fontBold : fontRegular,
      bgColor: bg,
      colors: isHeader ? [COLOR_WHITE, COLOR_WHITE, COLOR_WHITE] : [COLOR_BLACK, pctColor, COLOR_GRAY],
    });
  }

  y -= 20;
  drawSubtitle("Conclusão");
  y -= 5;
  drawText("O plano de fases apresenta discrepâncias significativas entre o status documentado", { size: 10 });
  drawText("e o estado real do código, especialmente nas Fases 1 a 4. O schema Prisma está bastante", { size: 10 });
  drawText("completo, servindo como blueprint dos dados. Porém, a lógica de aplicação (services,", { size: 10 });
  drawText("APIs, testes, migrations) precisa ser implementada para que essas fases sejam realmente", { size: 10 });
  drawText("consideradas concluídas. As Fases 5 e 6 estão em melhor estado, com o Portal do Cliente", { size: 10 });
  drawText("sendo a parte mais completa e auditável do sistema.", { size: 10 });

  y -= 20;
  drawText("Recomendação: corrigir o status dos itens no plano para refletir a realidade, e", { size: 10, font: fontBold });
  drawText("priorizar a implementação da lógica de negócio para os models que já existem.", { size: 10, font: fontBold });

  // ======================== FOOTER em todas as páginas ========================
  const pages = pdf.getPages();
  for (let i = 0; i < pages.length; i++) {
    const pg = pages[i];
    pg.drawText(`Relatório de Auditoria -- GladPros ERP -- Página ${i + 1} de ${pages.length}`, {
      x: MARGIN_LEFT,
      y: 25,
      size: 7,
      font: fontItalic,
      color: COLOR_GRAY,
    });
    pg.drawText("16/03/2026 -- Gerado automaticamente", {
      x: PAGE_WIDTH - MARGIN_RIGHT - 150,
      y: 25,
      size: 7,
      font: fontItalic,
      color: COLOR_GRAY,
    });
  }

  // Save
  const pdfBytes = await pdf.save();
  const outputPath = "docs/RELATORIO-AUDITORIA-PLANO-FASES.pdf";
  writeFileSync(outputPath, pdfBytes);
  console.log(`PDF gerado com sucesso: ${outputPath}`);
  console.log(`Tamanho: ${(pdfBytes.length / 1024).toFixed(1)} KB`);
  console.log(`Páginas: ${pages.length}`);
}

main().catch(console.error);
