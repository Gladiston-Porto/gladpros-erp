/**
 * ReportExportService
 * Generates Excel (exceljs) and PDF (pdf-lib) files for fiscal reports.
 * Used by Phase 5 API routes to stream downloadable files.
 */

import ExcelJS from "exceljs"
import { PDFDocument, StandardFonts, rgb } from "pdf-lib"
import type { ScheduleCReport } from "./scheduleCExportService"

// ── Brand colors ─────────────────────────────────────────────────────────────

const BRAND_BLUE = { r: 0, g: 0.596, b: 0.855 } // #0098DA
const HEADER_BG = "FF0098DA"
const HEADER_FONT = "FFFFFFFF"
const ALT_ROW_BG = "FFF0F8FF"

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtUSD(val: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val)
}

function styleHeaderRow(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_BG } }
    cell.font = { bold: true, color: { argb: HEADER_FONT }, size: 11 }
    cell.alignment = { horizontal: "center", vertical: "middle" }
    cell.border = {
      bottom: { style: "thin", color: { argb: "FF333333" } },
    }
  })
}

function styleCurrencyCol(ws: ExcelJS.Worksheet, colIndex: number) {
  ws.getColumn(colIndex).numFmt = '$#,##0.00'
}

// ── Excel: Schedule C ────────────────────────────────────────────────────────

export async function generateScheduleCExcel(report: ScheduleCReport): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = "GladPros ERP"
  wb.created = new Date()

  // ── Sheet 1: Summary ────────────────────────────────────────────────────

  const ws1 = wb.addWorksheet("Summary")
  ws1.columns = [
    { header: "Line", key: "line", width: 12 },
    { header: "Description", key: "desc", width: 40 },
    { header: "Amount", key: "amount", width: 18 },
  ]
  styleHeaderRow(ws1.getRow(1))
  styleCurrencyCol(ws1, 3)

  // Income section
  ws1.addRow({ line: "", desc: "INCOME", amount: null })
  ws1.getRow(ws1.rowCount).font = { bold: true, size: 11 }
  ws1.addRow({ line: "Line 1", desc: "Gross Receipts", amount: report.income.line1_grossReceipts })
  ws1.addRow({ line: "Line 4", desc: "Cost of Goods Sold", amount: report.income.line4_cogs })
  ws1.addRow({ line: "Line 7", desc: "Gross Income", amount: report.income.line7_grossIncome })
  ws1.getRow(ws1.rowCount).font = { bold: true }

  ws1.addRow({})

  // Expenses section
  ws1.addRow({ line: "", desc: "EXPENSES", amount: null })
  ws1.getRow(ws1.rowCount).font = { bold: true, size: 11 }

  for (const line of report.expenses) {
    if (line.lineNumber === "COGS") continue
    ws1.addRow({ line: line.lineNumber, desc: line.lineName, amount: line.total })
  }

  ws1.addRow({})
  ws1.addRow({ line: "Line 28", desc: "Total Expenses", amount: report.line28_totalExpenses })
  ws1.getRow(ws1.rowCount).font = { bold: true }
  ws1.addRow({ line: "Line 31", desc: "Net Profit (or Loss)", amount: report.line31_netProfit })
  ws1.getRow(ws1.rowCount).font = { bold: true, color: { argb: report.line31_netProfit >= 0 ? "FF008000" : "FFCC0000" } }

  // ── Sheet 2: Income Detail ──────────────────────────────────────────────

  const ws2 = wb.addWorksheet("Income Detail")
  ws2.columns = [
    { header: "Metric", key: "metric", width: 30 },
    { header: "Amount", key: "amount", width: 18 },
  ]
  styleHeaderRow(ws2.getRow(1))
  styleCurrencyCol(ws2, 2)

  ws2.addRow({ metric: "Gross Receipts (Line 1)", amount: report.income.line1_grossReceipts })
  ws2.addRow({ metric: "Cost of Goods Sold (Line 4)", amount: report.income.line4_cogs })
  ws2.addRow({ metric: "Gross Income (Line 7)", amount: report.income.line7_grossIncome })

  // ── Sheet 3: Expense Detail ─────────────────────────────────────────────

  const ws3 = wb.addWorksheet("Expense Detail")
  ws3.columns = [
    { header: "Schedule C Line", key: "line", width: 16 },
    { header: "Category", key: "category", width: 30 },
    { header: "Date", key: "date", width: 14 },
    { header: "Description", key: "desc", width: 35 },
    { header: "Vendor", key: "vendor", width: 25 },
    { header: "Amount", key: "amount", width: 14 },
    { header: "Deductible", key: "deductible", width: 14 },
  ]
  styleHeaderRow(ws3.getRow(1))
  styleCurrencyCol(ws3, 6)
  styleCurrencyCol(ws3, 7)

  let rowIdx = 1
  for (const line of report.expenses) {
    for (const item of line.items) {
      rowIdx++
      ws3.addRow({
        line: line.lineNumber,
        category: item.categoria,
        date: item.data,
        desc: item.descricao,
        vendor: item.fornecedor || "—",
        amount: item.valor,
        deductible: item.deductibleAmount,
      })
      if (rowIdx % 2 === 0) {
        ws3.getRow(ws3.rowCount).eachCell((cell) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ALT_ROW_BG } }
        })
      }
    }
  }

  // ── Sheet 4: Owner Compensation ─────────────────────────────────────────

  const ws4 = wb.addWorksheet("Owner Compensation")
  ws4.columns = [
    { header: "Type", key: "type", width: 25 },
    { header: "Amount", key: "amount", width: 18 },
  ]
  styleHeaderRow(ws4.getRow(1))
  styleCurrencyCol(ws4, 2)

  ws4.addRow({ type: "Owner Draws", amount: report.ownerCompensation.totalDraws })
  ws4.addRow({ type: "Salary (S-Corp)", amount: report.ownerCompensation.totalSalary })
  ws4.addRow({ type: "Distributions (S-Corp)", amount: report.ownerCompensation.totalDistributions })
  ws4.addRow({})
  ws4.addRow({ type: "Total Compensation", amount: report.ownerCompensation.totalCompensation })
  ws4.getRow(ws4.rowCount).font = { bold: true }

  ws4.addRow({})
  ws4.addRow({ type: "NOTE:", amount: null })
  ws4.getRow(ws4.rowCount).getCell(1).font = { bold: true, italic: true }
  ws4.addRow({
    type: report.regime === "LLC_DEFAULT"
      ? "LLC: Owner draws are NOT deductible business expenses."
      : "S-Corp: Salary is a deductible expense (Line 26). Distributions are not.",
    amount: null,
  })

  // ── Sheet 5: Quarterly Taxes ────────────────────────────────────────────

  const ws5 = wb.addWorksheet("Quarterly Taxes")
  ws5.columns = [
    { header: "Quarter", key: "quarter", width: 14 },
    { header: "Estimated", key: "estimated", width: 16 },
    { header: "Paid", key: "paid", width: 16 },
    { header: "Remaining", key: "remaining", width: 16 },
    { header: "Status", key: "status", width: 14 },
  ]
  styleHeaderRow(ws5.getRow(1))
  styleCurrencyCol(ws5, 2)
  styleCurrencyCol(ws5, 3)
  styleCurrencyCol(ws5, 4)

  for (const qp of report.quarterlyPayments) {
    ws5.addRow({
      quarter: qp.quarter,
      estimated: qp.estimatedAmount,
      paid: qp.paidAmount,
      remaining: Math.max(0, qp.estimatedAmount - qp.paidAmount),
      status: qp.status,
    })
  }

  ws5.addRow({})
  ws5.addRow({
    quarter: "TOTAL",
    estimated: report.estimatedTax.totalEstimatedTax,
    paid: report.quarterlyPayments.reduce((s, q) => s + q.paidAmount, 0),
    remaining: null,
    status: "",
  })
  ws5.getRow(ws5.rowCount).font = { bold: true }

  // ── Generate Buffer ─────────────────────────────────────────────────────

  const arrayBuffer = await wb.xlsx.writeBuffer()
  return Buffer.from(arrayBuffer)
}

// ── PDF: Schedule C ──────────────────────────────────────────────────────────

export async function generateScheduleCPdf(report: ScheduleCReport): Promise<Buffer> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold)
  const fontSize = 10
  const lineHeight = 16
  const margin = 50

  let page = doc.addPage([612, 792]) // US Letter
  let y = 742

  const drawText = (text: string, x: number, opts?: { bold?: boolean; size?: number; color?: { r: number; g: number; b: number } }) => {
    const f = opts?.bold ? fontBold : font
    const s = opts?.size ?? fontSize
    const c = opts?.color ? rgb(opts.color.r, opts.color.g, opts.color.b) : rgb(0, 0, 0)
    page.drawText(text, { x, y, font: f, size: s, color: c })
  }

  const drawLine = () => {
    page.drawLine({ start: { x: margin, y: y + 4 }, end: { x: 562, y: y + 4 }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) })
  }

  const nextLine = (lines = 1) => {
    y -= lineHeight * lines
    if (y < 60) {
      // Add footer before new page
      page.drawText("DRAFT — For CPA review only", {
        x: margin, y: 30, font, size: 8, color: rgb(0.5, 0.5, 0.5),
      })
      page.drawText(`Page ${doc.getPageCount()}`, {
        x: 520, y: 30, font, size: 8, color: rgb(0.5, 0.5, 0.5),
      })
      page = doc.addPage([612, 792])
      y = 742
    }
  }

  // ── Header ──────────────────────────────────────────────────────────────

  page.drawRectangle({ x: 0, y: 752, width: 612, height: 40, color: rgb(BRAND_BLUE.r, BRAND_BLUE.g, BRAND_BLUE.b) })
  page.drawText("GladPros — Schedule C Report", { x: margin, y: 762, font: fontBold, size: 14, color: rgb(1, 1, 1) })
  page.drawText(`Tax Year ${report.taxYear}`, { x: 440, y: 762, font, size: 11, color: rgb(1, 1, 1) })

  y = 730

  drawText(`Company: ${report.empresaName}`, margin, { size: 9 })
  nextLine()
  drawText(`Owner: ${report.ownerName}`, margin, { size: 9 })
  drawText(`Regime: ${report.regime === "LLC_DEFAULT" ? "LLC (Single-Member)" : "S-Corporation"}`, 300, { size: 9 })
  nextLine()
  drawText(`Generated: ${new Date(report.generatedAt).toLocaleDateString("en-US", { timeZone: "America/Chicago" })}`, margin, { size: 9 })
  nextLine(2)

  // ── Income Section ──────────────────────────────────────────────────────

  drawText("INCOME", margin, { bold: true, size: 12, color: BRAND_BLUE })
  nextLine()
  drawLine()
  nextLine()

  drawText("Line 1 — Gross Receipts", margin)
  drawText(fmtUSD(report.income.line1_grossReceipts), 460, { bold: true })
  nextLine()

  drawText("Line 4 — Cost of Goods Sold", margin)
  drawText(fmtUSD(report.income.line4_cogs), 460)
  nextLine()

  drawText("Line 7 — Gross Income", margin, { bold: true })
  drawText(fmtUSD(report.income.line7_grossIncome), 460, { bold: true })
  nextLine(2)

  // ── Expenses Section ────────────────────────────────────────────────────

  drawText("EXPENSES", margin, { bold: true, size: 12, color: BRAND_BLUE })
  nextLine()
  drawLine()
  nextLine()

  for (const line of report.expenses) {
    if (line.lineNumber === "COGS") continue
    drawText(`${line.lineNumber} — ${line.lineName}`, margin)
    drawText(fmtUSD(line.total), 460)
    nextLine()
  }

  nextLine()
  drawLine()
  nextLine()
  drawText("Line 28 — Total Expenses", margin, { bold: true })
  drawText(fmtUSD(report.line28_totalExpenses), 460, { bold: true })
  nextLine(2)

  // ── Net Profit ──────────────────────────────────────────────────────────

  drawText("NET PROFIT", margin, { bold: true, size: 12, color: BRAND_BLUE })
  nextLine()
  drawLine()
  nextLine()
  const profitColor = report.line31_netProfit >= 0 ? { r: 0, g: 0.5, b: 0 } : { r: 0.8, g: 0, b: 0 }
  drawText("Line 31 — Net Profit (or Loss)", margin, { bold: true })
  drawText(fmtUSD(report.line31_netProfit), 460, { bold: true, color: profitColor })
  nextLine(2)

  // ── Tax Summary ─────────────────────────────────────────────────────────

  drawText("TAX ESTIMATE", margin, { bold: true, size: 12, color: BRAND_BLUE })
  nextLine()
  drawLine()
  nextLine()

  drawText("Self-Employment Tax (15.3%)", margin)
  drawText(fmtUSD(report.estimatedTax.selfEmploymentTax), 460)
  nextLine()
  drawText("Estimated Income Tax", margin)
  drawText(fmtUSD(report.estimatedTax.estimatedIncomeTax), 460)
  nextLine()
  drawText("Total Estimated Tax", margin, { bold: true })
  drawText(fmtUSD(report.estimatedTax.totalEstimatedTax), 460, { bold: true })
  nextLine(2)

  // ── Owner Compensation ──────────────────────────────────────────────────

  drawText("OWNER COMPENSATION", margin, { bold: true, size: 12, color: BRAND_BLUE })
  nextLine()
  drawLine()
  nextLine()

  drawText("Owner Draws", margin)
  drawText(fmtUSD(report.ownerCompensation.totalDraws), 460)
  nextLine()
  drawText("Salary (S-Corp)", margin)
  drawText(fmtUSD(report.ownerCompensation.totalSalary), 460)
  nextLine()
  drawText("Distributions", margin)
  drawText(fmtUSD(report.ownerCompensation.totalDistributions), 460)
  nextLine()
  drawText("Total", margin, { bold: true })
  drawText(fmtUSD(report.ownerCompensation.totalCompensation), 460, { bold: true })
  nextLine(2)

  // ── Quarterly Payments ──────────────────────────────────────────────────

  drawText("QUARTERLY ESTIMATED TAX PAYMENTS", margin, { bold: true, size: 12, color: BRAND_BLUE })
  nextLine()
  drawLine()
  nextLine()

  // Table header
  drawText("Quarter", margin, { bold: true, size: 9 })
  drawText("Estimated", 200, { bold: true, size: 9 })
  drawText("Paid", 320, { bold: true, size: 9 })
  drawText("Status", 440, { bold: true, size: 9 })
  nextLine()

  for (const qp of report.quarterlyPayments) {
    drawText(qp.quarter, margin, { size: 9 })
    drawText(fmtUSD(qp.estimatedAmount), 200, { size: 9 })
    drawText(fmtUSD(qp.paidAmount), 320, { size: 9 })
    drawText(qp.status, 440, { size: 9 })
    nextLine()
  }

  // ── Footer ──────────────────────────────────────────────────────────────

  page.drawText("DRAFT — For CPA review only", {
    x: margin, y: 30, font, size: 8, color: rgb(0.5, 0.5, 0.5),
  })
  page.drawText(`Page ${doc.getPageCount()}`, {
    x: 520, y: 30, font, size: 8, color: rgb(0.5, 0.5, 0.5),
  })

  const pdfBytes = await doc.save()
  return Buffer.from(pdfBytes)
}

// ── Excel: P&L Report ────────────────────────────────────────────────────────

export interface PnLData {
  empresaName: string
  taxYear: number
  period: "annual" | "quarterly" | "monthly"
  generatedAt: string
  sections: Array<{
    label: string
    rows: Array<{ description: string; amounts: number[] }>
    subtotal: number[]
  }>
  columnHeaders: string[]
  netProfit: number[]
}

export async function generatePnLExcel(data: PnLData): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = "GladPros ERP"
  wb.created = new Date()

  const ws = wb.addWorksheet("P&L Statement")

  // Title row
  ws.mergeCells(1, 1, 1, data.columnHeaders.length + 1)
  const titleCell = ws.getCell("A1")
  titleCell.value = `${data.empresaName} — Profit & Loss (${data.taxYear})`
  titleCell.font = { bold: true, size: 14 }
  titleCell.alignment = { horizontal: "center" }

  ws.addRow([]) // blank

  // Column headers
  const headers = ["", ...data.columnHeaders]
  const headerRow = ws.addRow(headers)
  styleHeaderRow(headerRow)

  // Set column widths
  ws.getColumn(1).width = 35
  for (let i = 2; i <= headers.length; i++) {
    ws.getColumn(i).width = 16
    ws.getColumn(i).numFmt = '$#,##0.00'
  }

  for (const section of data.sections) {
    // Section label
    const sectionRow = ws.addRow([section.label])
    sectionRow.font = { bold: true, size: 11 }
    sectionRow.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8F4FD" } }

    // Data rows
    for (const row of section.rows) {
      ws.addRow([`  ${row.description}`, ...row.amounts])
    }

    // Subtotal
    const subRow = ws.addRow([`Total ${section.label}`, ...section.subtotal])
    subRow.font = { bold: true }
    subRow.eachCell((cell) => {
      cell.border = { top: { style: "thin" } }
    })

    ws.addRow([]) // blank
  }

  // Net profit row
  const netRow = ws.addRow(["Net Profit (Loss)", ...data.netProfit])
  netRow.font = { bold: true, size: 11 }
  netRow.eachCell((cell, colNumber) => {
    cell.border = { top: { style: "double" }, bottom: { style: "double" } }
    if (colNumber > 1) {
      const val = cell.value as number
      cell.font = {
        bold: true,
        size: 11,
        color: { argb: val >= 0 ? "FF008000" : "FFCC0000" },
      }
    }
  })

  const arrayBuffer = await wb.xlsx.writeBuffer()
  return Buffer.from(arrayBuffer)
}

export async function generatePnLPdf(data: PnLData): Promise<Buffer> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold)
  const margin = 50
  const lineHeight = 15

  let page = doc.addPage([612, 792])
  let y = 742

  const addFooter = () => {
    page.drawText("DRAFT — For CPA review only", { x: margin, y: 30, font, size: 8, color: rgb(0.5, 0.5, 0.5) })
    page.drawText(`Page ${doc.getPageCount()}`, { x: 520, y: 30, font, size: 8, color: rgb(0.5, 0.5, 0.5) })
  }

  const ensureSpace = (needed = 1) => {
    if (y < 60 + needed * lineHeight) {
      addFooter()
      page = doc.addPage([612, 792])
      y = 742
    }
  }

  // Header bar
  page.drawRectangle({ x: 0, y: 752, width: 612, height: 40, color: rgb(BRAND_BLUE.r, BRAND_BLUE.g, BRAND_BLUE.b) })
  page.drawText(`${data.empresaName} — Profit & Loss`, { x: margin, y: 762, font: fontBold, size: 14, color: rgb(1, 1, 1) })
  page.drawText(`${data.taxYear} (${data.period})`, { x: 420, y: 762, font, size: 11, color: rgb(1, 1, 1) })

  y = 720

  for (const section of data.sections) {
    ensureSpace(3)
    page.drawText(section.label, { x: margin, y, font: fontBold, size: 11, color: rgb(BRAND_BLUE.r, BRAND_BLUE.g, BRAND_BLUE.b) })
    y -= lineHeight

    for (const row of section.rows) {
      ensureSpace()
      page.drawText(`  ${row.description}`, { x: margin, y, font, size: 9 })
      page.drawText(fmtUSD(row.amounts[0] ?? 0), { x: 460, y, font, size: 9 })
      y -= lineHeight
    }

    ensureSpace()
    page.drawLine({ start: { x: margin, y: y + 8 }, end: { x: 562, y: y + 8 }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) })
    page.drawText(`Total ${section.label}`, { x: margin, y, font: fontBold, size: 10 })
    page.drawText(fmtUSD(section.subtotal[0] ?? 0), { x: 460, y, font: fontBold, size: 10 })
    y -= lineHeight * 2
  }

  ensureSpace(2)
  page.drawLine({ start: { x: margin, y: y + 8 }, end: { x: 562, y: y + 8 }, thickness: 1, color: rgb(0, 0, 0) })
  const np = data.netProfit[0] ?? 0
  page.drawText("Net Profit (Loss)", { x: margin, y, font: fontBold, size: 12 })
  page.drawText(fmtUSD(np), {
    x: 460, y, font: fontBold, size: 12,
    color: np >= 0 ? rgb(0, 0.5, 0) : rgb(0.8, 0, 0),
  })

  addFooter()

  const pdfBytes = await doc.save()
  return Buffer.from(pdfBytes)
}

// ── Excel: 1099 Summary ──────────────────────────────────────────────────────

export interface Contractor1099Row {
  name: string
  classification: string
  totalPaid: number
  needs1099: boolean
}

export async function generate1099Excel(
  contractors: Contractor1099Row[],
  empresaName: string,
  taxYear: number
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = "GladPros ERP"
  const ws = wb.addWorksheet("1099 Summary")

  ws.mergeCells(1, 1, 1, 4)
  const titleCell = ws.getCell("A1")
  titleCell.value = `${empresaName} — 1099-NEC Summary (${taxYear})`
  titleCell.font = { bold: true, size: 13 }
  titleCell.alignment = { horizontal: "center" }

  ws.addRow([])

  const hRow = ws.addRow(["Contractor Name", "Classification", "Total Paid", "1099 Required"])
  styleHeaderRow(hRow)

  ws.getColumn(1).width = 30
  ws.getColumn(2).width = 20
  ws.getColumn(3).width = 16
  ws.getColumn(3).numFmt = '$#,##0.00'
  ws.getColumn(4).width = 16

  for (const c of contractors) {
    ws.addRow([c.name, c.classification, c.totalPaid, c.needs1099 ? "YES" : "No"])
  }

  ws.addRow([])
  const totalRow = ws.addRow(["TOTAL", "", contractors.reduce((s, c) => s + c.totalPaid, 0), ""])
  totalRow.font = { bold: true }

  const arrayBuffer = await wb.xlsx.writeBuffer()
  return Buffer.from(arrayBuffer)
}

// ── Excel: Owner Compensation Summary ────────────────────────────────────────

export interface OwnerCompRow {
  date: string
  type: string
  amount: number
  description: string | null
}

export async function generateOwnerCompExcel(
  rows: OwnerCompRow[],
  empresaName: string,
  taxYear: number,
  regime: string
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = "GladPros ERP"
  const ws = wb.addWorksheet("Owner Compensation")

  ws.mergeCells(1, 1, 1, 4)
  const titleCell = ws.getCell("A1")
  titleCell.value = `${empresaName} — Owner Compensation (${taxYear})`
  titleCell.font = { bold: true, size: 13 }
  ws.addRow([`Regime: ${regime === "LLC_DEFAULT" ? "LLC (Single-Member)" : "S-Corporation"}`])
  ws.addRow([])

  const hRow = ws.addRow(["Date", "Type", "Amount", "Description"])
  styleHeaderRow(hRow)

  ws.getColumn(1).width = 14
  ws.getColumn(2).width = 20
  ws.getColumn(3).width = 16
  ws.getColumn(3).numFmt = '$#,##0.00'
  ws.getColumn(4).width = 40

  for (const r of rows) {
    ws.addRow([r.date, r.type, r.amount, r.description || ""])
  }

  ws.addRow([])
  const totalRow = ws.addRow(["TOTAL", "", rows.reduce((s, r) => s + r.amount, 0), ""])
  totalRow.font = { bold: true }

  const arrayBuffer = await wb.xlsx.writeBuffer()
  return Buffer.from(arrayBuffer)
}

// ── Excel: Quarterly Estimate vs Actual ──────────────────────────────────────

export async function generateQuarterlyComparisonExcel(
  report: ScheduleCReport,
  empresaName: string
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = "GladPros ERP"
  const ws = wb.addWorksheet("Quarterly Comparison")

  ws.mergeCells(1, 1, 1, 5)
  const titleCell = ws.getCell("A1")
  titleCell.value = `${empresaName} — Estimated vs Actual Tax (${report.taxYear})`
  titleCell.font = { bold: true, size: 13 }
  ws.addRow([])

  const hRow = ws.addRow(["Quarter", "Estimated", "Paid", "Difference", "Status"])
  styleHeaderRow(hRow)

  ws.getColumn(1).width = 14
  ws.getColumn(2).width = 16
  ws.getColumn(2).numFmt = '$#,##0.00'
  ws.getColumn(3).width = 16
  ws.getColumn(3).numFmt = '$#,##0.00'
  ws.getColumn(4).width = 16
  ws.getColumn(4).numFmt = '$#,##0.00'
  ws.getColumn(5).width = 14

  let totEst = 0
  let totPaid = 0

  for (const qp of report.quarterlyPayments) {
    const diff = qp.paidAmount - qp.estimatedAmount
    ws.addRow([qp.quarter, qp.estimatedAmount, qp.paidAmount, diff, qp.status])
    totEst += qp.estimatedAmount
    totPaid += qp.paidAmount
  }

  ws.addRow([])
  const totRow = ws.addRow(["TOTAL", totEst, totPaid, totPaid - totEst, ""])
  totRow.font = { bold: true }

  const arrayBuffer = await wb.xlsx.writeBuffer()
  return Buffer.from(arrayBuffer)
}
