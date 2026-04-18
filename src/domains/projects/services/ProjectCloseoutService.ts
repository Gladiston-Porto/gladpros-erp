import { prisma } from "@/lib/prisma";
import { CloseoutStatus } from "@prisma/client";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { ProjectMaterialMetricsService } from "./ProjectMaterialMetricsService";

export type CloseoutGateState = "PASS" | "FAIL" | "SKIPPED";

export type CloseoutGateKey =
  | "permits_inspections"
  | "punch_list"
  | "change_orders"
  | "materials"
  | "timesheets"
  | "subcontractors"
  | "invoices"
  | "lien_waivers";

export type CloseoutGateResult = {
  key: CloseoutGateKey;
  label: string;
  required: boolean;
  state: CloseoutGateState;
  reason: string | null;
  blockingCount: number;
  blockingItems: unknown[];
};

type CloseoutOverallStatus =
  | typeof CloseoutStatus.PENDING_ITEMS
  | typeof CloseoutStatus.READY;

export type ProjectCloseoutSnapshot = {
  closeout: any;
  overallStatus: CloseoutOverallStatus;
  gates: CloseoutGateResult[];
};

export type ProjectCloseoutGenerateResult = {
  closeout: any;
  documentUrl: string | null;
  overallStatus: CloseoutOverallStatus;
  gates: CloseoutGateResult[];
  idempotent: boolean;
  template: {
    id: number;
    name: string;
    serviceType: string;
    version: number;
  } | null;
};

export type ProjectCloseoutDeliveryResult = {
  closeout: any;
  idempotent: boolean;
};

export type ProjectCloseoutAcceptInput = {
  clientSignatureUrl?: string | null;
  clientSatisfactionRating?: number | null;
  notes?: string | null;
};

type CloseoutTemplateSectionKind =
  | "TEXT"
  | "TABLE"
  | "GATE_SUMMARY"
  | "PERMITS_INSPECTIONS"
  | "PUNCH_LIST"
  | "CHANGE_ORDERS"
  | "CUSTOM_JSON";

type CloseoutTemplateSection = {
  sortOrder: number;
  title: string;
  kind: CloseoutTemplateSectionKind;
  contentJson: unknown;
  isRequired: boolean;
};

type CloseoutTemplateResolved = {
  id: number;
  name: string;
  serviceType: string;
  version: number;
  sections: CloseoutTemplateSection[];
};

export class ProjectCloseoutServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400,
    public details?: unknown
  ) {
    super(message);
    this.name = "ProjectCloseoutServiceError";
  }
}

const MAX_BLOCKING_ITEMS = 10;
const MAX_PDF_LINE_CHARS = 95;

export class ProjectCloseoutService {
  private prisma = prisma;
  private materialMetricsService = new ProjectMaterialMetricsService();

  private splitText(text: string, maxChars: number = MAX_PDF_LINE_CHARS): string[] {
    const normalized = String(text ?? "").trim();

    if (!normalized) {
      return ["-"];
    }

    if (normalized.length <= maxChars) {
      return [normalized];
    }

    const words = normalized.split(/\s+/);
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
      const candidate = currentLine ? `${currentLine} ${word}` : word;

      if (candidate.length > maxChars) {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          lines.push(word.slice(0, maxChars));
          currentLine = word.slice(maxChars);
        }
      } else {
        currentLine = candidate;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  private formatDate(value: Date | string | null | undefined): string {
    if (!value) {
      return "-";
    }

    const date = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return date.toISOString().slice(0, 10);
  }

  private formatDateTime(value: Date | string | null | undefined): string {
    if (!value) {
      return "-";
    }

    const date = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return date.toISOString();
  }

  private getDefaultTemplateSections(): CloseoutTemplateSection[] {
    return [
      { sortOrder: 1, title: "Resumo de Gates", kind: "GATE_SUMMARY", contentJson: null, isRequired: true },
      { sortOrder: 2, title: "Permits/Inspections", kind: "PERMITS_INSPECTIONS", contentJson: null, isRequired: true },
      { sortOrder: 3, title: "Punch List", kind: "PUNCH_LIST", contentJson: null, isRequired: true },
      { sortOrder: 4, title: "Change Orders", kind: "CHANGE_ORDERS", contentJson: null, isRequired: true },
    ];
  }

  private normalizeTemplateSections(rawSections: unknown[]): CloseoutTemplateSection[] {
    return (Array.isArray(rawSections) ? rawSections : [])
      .map((section: any, index: number) => ({
        sortOrder: Number(section?.sortOrder ?? index + 1),
        title: String(section?.title ?? "Section").trim() || "Section",
        kind: String(section?.kind ?? "TEXT").trim().toUpperCase() as CloseoutTemplateSectionKind,
        contentJson: section?.contentJson ?? null,
        isRequired: Boolean(section?.isRequired ?? true),
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  private buildTemplateSnapshot(template: CloseoutTemplateResolved | null) {
    if (!template) {
      return null;
    }

    return {
      id: template.id,
      name: template.name,
      serviceType: template.serviceType,
      version: template.version,
      sections: template.sections.map((section) => ({
        sortOrder: section.sortOrder,
        title: section.title,
        kind: section.kind,
        contentJson: section.contentJson ?? null,
        isRequired: section.isRequired,
      })),
    };
  }

  private async resolveCloseoutTemplate(project: any, explicitTemplateId?: number): Promise<CloseoutTemplateResolved> {
    if (explicitTemplateId !== undefined) {
      const template = await (this.prisma as any).closeoutTemplate.findFirst({
        where: { id: explicitTemplateId, isActive: true },
        include: { sections: { orderBy: { sortOrder: "asc" } } },
      });

      if (!template) {
        throw new ProjectCloseoutServiceError(
          "Template de closeout não encontrado",
          "CLOSEOUT_TEMPLATE_NOT_FOUND",
          404,
          { templateId: explicitTemplateId }
        );
      }

      return {
        id: template.id,
        name: template.name,
        serviceType: template.serviceType,
        version: template.version,
        sections: this.normalizeTemplateSections(template.sections),
      };
    }

    const serviceType = String(project?.Proposta?.tipoServico ?? "").trim();
    const candidates = await (this.prisma as any).closeoutTemplate.findMany({
      where: {
        isActive: true,
        serviceType: {
          in: serviceType ? [serviceType, "GENERAL"] : ["GENERAL"],
        },
      },
      include: {
        sections: {
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: [{ serviceType: "asc" }, { id: "asc" }],
    });

    const exact = serviceType ? candidates.filter((template: any) => template.serviceType === serviceType) : [];

    if (exact.length > 1) {
      throw new ProjectCloseoutServiceError(
        "Mais de um template ativo para o tipo de serviço",
        "CLOSEOUT_TEMPLATE_AMBIGUOUS",
        409,
        {
          serviceType,
          templateIds: exact.map((template: any) => template.id),
        }
      );
    }

    const selected =
      exact[0] ??
      (() => {
        const fallback = candidates.filter((template: any) => template.serviceType === "GENERAL");
        if (fallback.length > 1) {
          throw new ProjectCloseoutServiceError(
            "Mais de um template GENERAL ativo",
            "CLOSEOUT_TEMPLATE_AMBIGUOUS",
            409,
            { serviceType: "GENERAL", templateIds: fallback.map((template: any) => template.id) }
          );
        }
        return fallback[0] ?? null;
      })();

    if (!selected) {
      return {
        id: 0,
        name: "Default Closeout Template",
        serviceType: serviceType || "GENERAL",
        version: 1,
        sections: this.getDefaultTemplateSections(),
      };
    }

    return {
      id: selected.id,
      name: selected.name,
      serviceType: selected.serviceType,
      version: selected.version,
      sections: this.normalizeTemplateSections(selected.sections),
    };
  }

  private async buildCloseoutPdfBuffer(input: {
    project: any;
    gates: CloseoutGateResult[];
    overallStatus: CloseoutOverallStatus;
    generatedAt: Date;
    generatedByName: string;
    template: CloseoutTemplateResolved;
  }): Promise<Buffer> {
    const { project, gates, overallStatus, generatedAt, generatedByName, template } = input;

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const margin = 42;
    const lineHeight = 14;
    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;

    const ensureSpace = (lines: number = 1) => {
      if (y - lineHeight * lines < margin) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
      }
    };

    const drawLine = (
      text: string,
      options?: { bold?: boolean; size?: number; color?: { r: number; g: number; b: number } }
    ) => {
      ensureSpace(1);
      page.drawText(text, {
        x: margin,
        y,
        size: options?.size ?? 10,
        font: options?.bold ? boldFont : font,
        color: options?.color ? rgb(options.color.r, options.color.g, options.color.b) : rgb(0.1, 0.1, 0.1),
      });
      y -= lineHeight;
    };

    const drawParagraph = (text: string, prefix = "") => {
      for (const line of this.splitText(text)) {
        drawLine(`${prefix}${line}`);
      }
    };

    const sectionTitle = (title: string) => {
      y -= 6;
      drawLine(title, { bold: true, size: 12, color: { r: 0.12, g: 0.27, b: 0.58 } });
    };

    const clienteNome =
      project?.Cliente?.nomeFantasia ??
      project?.Cliente?.razaoSocial ??
      project?.Cliente?.nomeCompleto ??
      "-";

    sectionTitle("Closeout Package");
    drawLine(`Projeto: ${project?.numeroProjeto ?? "-"} - ${project?.titulo ?? "-"}`, { bold: true });
    drawLine(`Cliente: ${clienteNome}`);
    drawLine(`Endereco do projeto: ${project?.endereco ?? project?.localidade ?? "-"}`);
    drawLine(`Data inicio prevista: ${this.formatDate(project?.dataInicioPrevista)}`);
    drawLine(`Data conclusao prevista: ${this.formatDate(project?.dataConclusaoPrevista)}`);
    drawLine(`Gerado em: ${this.formatDateTime(generatedAt)}`);
    drawLine(`Gerado por: ${generatedByName}`);
    drawLine(`Overall status: ${overallStatus}`);
    drawLine(`Template: ${template.name} (serviceType=${template.serviceType}, version=${template.version})`);

    const permits = Array.isArray(project?.projectPermits) ? project.projectPermits : [];
    const inspections = Array.isArray(project?.projectInspections) ? project.projectInspections : [];
    const punchItems = Array.isArray(project?.projectPunchItems) ? project.projectPunchItems : [];
    const changeOrders = Array.isArray(project?.changeOrders) ? project.changeOrders : [];

    for (const section of template.sections) {
      sectionTitle(section.title);

      if (section.kind === "GATE_SUMMARY") {
        for (const gate of gates) {
          drawLine(
            `- ${gate.label}: ${gate.state}${gate.reason ? ` (${gate.reason})` : ""}${
              gate.blockingCount > 0 ? ` [blocking=${gate.blockingCount}]` : ""
            }`
          );
        }
        continue;
      }

      if (section.kind === "PERMITS_INSPECTIONS") {
        drawLine(`Permits total: ${permits.length}`);
        for (const permit of permits) {
          drawLine(
            `- Permit #${permit?.permitNumber ?? permit?.id ?? "-"}: ${permit?.permitType ?? "-"} / ${permit?.status ?? "-"}`
          );
        }

        drawLine(`Inspections total: ${inspections.length}`);
        for (const inspection of inspections) {
          drawLine(`- Inspection #${inspection?.id ?? "-"}: ${inspection?.inspectionType ?? "-"} / ${inspection?.status ?? "-"}`);
        }
        continue;
      }

      if (section.kind === "PUNCH_LIST") {
        const pendingPunch = punchItems.filter((item: any) => ["OPEN", "IN_PROGRESS"].includes(String(item?.status)));
        drawLine(`Punch items total: ${punchItems.length}`);
        drawLine(`Pendentes (OPEN/IN_PROGRESS): ${pendingPunch.length}`);
        for (const item of pendingPunch.slice(0, 20)) {
          drawParagraph(
            `- #${item?.id ?? "-"} [${item?.priority ?? "-"}] ${item?.status ?? "-"} ${item?.description ?? "-"}`
          );
        }
        continue;
      }

      if (section.kind === "CHANGE_ORDERS") {
        const byStatus = changeOrders.reduce(
          (acc: Record<string, number>, co: any) => {
            const key = String(co?.status ?? "UNKNOWN");
            acc[key] = (acc[key] ?? 0) + 1;
            return acc;
          },
          {}
        );

        drawLine(`Change orders total: ${changeOrders.length}`);
        for (const [status, count] of Object.entries(byStatus)) {
          drawLine(`- ${status}: ${count}`);
        }

        const pendingChangeOrders = changeOrders.filter((co: any) => ["DRAFT", "SENT"].includes(String(co?.status)));
        if (pendingChangeOrders.length > 0) {
          drawLine("DRAFT/SENT pendentes:", { bold: true });
          for (const co of pendingChangeOrders.slice(0, 20)) {
            drawParagraph(`- #${co?.id ?? "-"} ${co?.status ?? "-"} ${co?.description ?? "-"}`);
          }
        }
        continue;
      }

      if (section.kind === "TEXT") {
        const content =
          typeof section.contentJson === "string"
            ? section.contentJson
            : typeof (section.contentJson as any)?.text === "string"
            ? (section.contentJson as any).text
            : "-";
        drawParagraph(String(content));
        continue;
      }

      if (section.kind === "TABLE") {
        const rows = Array.isArray((section.contentJson as any)?.rows)
          ? (section.contentJson as any).rows
          : [];
        if (rows.length === 0) {
          drawLine("- Tabela sem linhas");
        } else {
          for (const row of rows.slice(0, 30)) {
            drawLine(`- ${Array.isArray(row) ? row.join(" | ") : String(row)}`);
          }
        }
        continue;
      }

      if (section.kind === "CUSTOM_JSON") {
        drawParagraph(JSON.stringify(section.contentJson ?? {}, null, 2));
      }
    }

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }

  private async persistCloseoutPdf(projectId: number, generatedAt: Date, pdfBuffer: Buffer): Promise<string> {
    const safeStamp = generatedAt.toISOString().replace(/[.:]/g, "-");
    const relativePathParts = ["closeouts", `project-${projectId}`, `closeout-${safeStamp}.pdf`];
    const targetDir = join(process.cwd(), "uploads", "closeouts", `project-${projectId}`);
    const targetPath = join(process.cwd(), "uploads", ...relativePathParts);

    await mkdir(targetDir, { recursive: true });
    await writeFile(targetPath, pdfBuffer);

    return `/api/uploads/${relativePathParts.join("/")}`;
  }

  private async getProjectContext(projectId: number) {
    const project = await this.prisma.projeto.findUnique({
      where: { id: projectId },
      include: {
        Cliente: {
          select: {
            id: true,
            nomeCompleto: true,
            razaoSocial: true,
            nomeFantasia: true,
            email: true,
            telefone: true,
          },
        },
        Proposta: {
          select: {
            permite: true,
            tipoServico: true,
          },
        },
        projectPermits: {
          select: {
            id: true,
            permitNumber: true,
            permitType: true,
            jurisdiction: true,
            status: true,
          },
        },
        projectInspections: {
          select: {
            id: true,
            permitId: true,
            inspectionType: true,
            status: true,
            scheduledFor: true,
          },
        },
        projectPunchItems: {
          select: {
            id: true,
            status: true,
            priority: true,
            description: true,
            dueDate: true,
            assignedToWorkerId: true,
          },
        },
        changeOrders: {
          select: {
            id: true,
            status: true,
            type: true,
            description: true,
            createdAt: true,
          },
        },
        projectCloseout: {
          include: {
            generatedByUser: {
              select: {
                id: true,
                nomeCompleto: true,
                email: true,
              },
            },
            deliveredByUser: {
              select: {
                id: true,
                nomeCompleto: true,
                email: true,
              },
            },
            template: {
              include: {
                sections: {
                  orderBy: {
                    sortOrder: "asc",
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!project) {
      throw new ProjectCloseoutServiceError(
        "Projeto não encontrado",
        "PROJECT_NOT_FOUND",
        404
      );
    }

    return project;
  }

  private async ensureCloseoutRecord(projectId: number) {
    return this.prisma.projectCloseout.upsert({
      where: { projectId },
      update: {},
      create: {
        projectId,
        status: CloseoutStatus.PENDING_ITEMS,
      },
      include: {
        generatedByUser: {
          select: {
            id: true,
            nomeCompleto: true,
            email: true,
          },
        },
        deliveredByUser: {
          select: {
            id: true,
            nomeCompleto: true,
            email: true,
          },
        },
      },
    });
  }

  private buildSkippedGate(key: CloseoutGateKey, label: string): CloseoutGateResult {
    return {
      key,
      label,
      required: false,
      state: "SKIPPED",
      reason: "SKIPPED_NOT_IMPLEMENTED",
      blockingCount: 0,
      blockingItems: [],
    };
  }

  private async buildMaterialsGate(
    projectId: number,
    options?: { recompute?: boolean }
  ): Promise<CloseoutGateResult> {
    if (options?.recompute ?? true) {
      await this.materialMetricsService.recomputeProject(projectId, {
        dryRun: false,
        includeWarnings: false,
      });
    }

    const blockers = await this.materialMetricsService.getCloseoutBlockers(projectId, {
      take: MAX_BLOCKING_ITEMS,
    });

    if (blockers.counts.totalBlocking === 0) {
      return {
        key: "materials",
        label: "Materiais",
        required: true,
        state: "PASS",
        reason: "NO_MATERIAL_PENDING_CLOSEOUT",
        blockingCount: 0,
        blockingItems: [],
      };
    }

    return {
      key: "materials",
      label: "Materiais",
      required: true,
      state: "FAIL",
      reason: "MATERIALS_PENDING_CLOSEOUT",
      blockingCount: blockers.counts.totalBlocking,
      blockingItems: blockers.blocking.map((item) => ({
        id: item.id,
        flowStatus: item.flowStatus,
        leftoverQty: item.leftoverQty.toFixed(4),
        plannedQty: item.plannedQty.toFixed(4),
        issuedQty: item.issuedQty.toFixed(4),
        consumedQty: item.consumedQty.toFixed(4),
        returnedQty: item.returnedQty.toFixed(4),
        wasteQty: item.wasteQty.toFixed(4),
        damagedQty: item.damagedQty.toFixed(4),
        lostQty: item.lostQty.toFixed(4),
        counts: blockers.counts,
        totalsPendingQty: blockers.totalsPendingQty.toFixed(4),
      })),
    };
  }

  private async computeGatesFromProject(project: any, options?: { recomputeMaterials?: boolean }): Promise<{
    overallStatus: CloseoutOverallStatus;
    gates: CloseoutGateResult[];
  }> {
    const gates: CloseoutGateResult[] = [];

    const requiresPermit =
      Boolean(project?.requiresPermit) || project?.Proposta?.permite === "SIM";

    const permits = Array.isArray(project?.projectPermits) ? project.projectPermits : [];
    const blockingPermits = permits
      .filter((permit: any) => permit.status !== "APPROVED")
      .map((permit: any) => ({
        id: permit.id,
        permitNumber: permit.permitNumber,
        permitType: permit.permitType,
        jurisdiction: permit.jurisdiction,
        status: permit.status,
      }));

    if (!requiresPermit) {
      gates.push({
        key: "permits_inspections",
        label: "Permits/Inspections",
        required: true,
        state: "PASS",
        reason: "PERMIT_NOT_REQUIRED",
        blockingCount: 0,
        blockingItems: [],
      });
    } else if (permits.length === 0) {
      gates.push({
        key: "permits_inspections",
        label: "Permits/Inspections",
        required: true,
        state: "FAIL",
        reason: "NO_PERMITS",
        blockingCount: 0,
        blockingItems: [],
      });
    } else if (blockingPermits.length > 0) {
      gates.push({
        key: "permits_inspections",
        label: "Permits/Inspections",
        required: true,
        state: "FAIL",
        reason: "PENDING_OR_NON_APPROVED_PERMITS",
        blockingCount: blockingPermits.length,
        blockingItems: blockingPermits.slice(0, MAX_BLOCKING_ITEMS),
      });
    } else {
      const inspections = Array.isArray(project?.projectInspections)
        ? project.projectInspections
        : [];

      const hasRequiredFlags = inspections.some(
        (inspection: any) =>
          typeof inspection?.isRequired === "boolean" ||
          typeof inspection?.requiredForCloseout === "boolean"
      );

      const requiredInspections = hasRequiredFlags
        ? inspections.filter((inspection: any) =>
            Boolean(inspection?.requiredForCloseout ?? inspection?.isRequired ?? false)
          )
        : inspections.filter((inspection: any) => inspection?.permitId != null);

      const failedOrReinspect = requiredInspections
        .filter((inspection: any) => ["FAILED", "REINSPECT"].includes(String(inspection.status)))
        .map((inspection: any) => ({
          id: inspection.id,
          inspectionType: inspection.inspectionType,
          status: inspection.status,
          scheduledFor: inspection.scheduledFor,
        }));

      const pendingInspections = requiredInspections
        .filter((inspection: any) => ["REQUESTED", "SCHEDULED"].includes(String(inspection.status)))
        .map((inspection: any) => ({
          id: inspection.id,
          inspectionType: inspection.inspectionType,
          status: inspection.status,
          scheduledFor: inspection.scheduledFor,
        }));

      if (failedOrReinspect.length > 0) {
        gates.push({
          key: "permits_inspections",
          label: "Permits/Inspections",
          required: true,
          state: "FAIL",
          reason: "FAILED_OR_REINSPECT",
          blockingCount: failedOrReinspect.length,
          blockingItems: failedOrReinspect.slice(0, MAX_BLOCKING_ITEMS),
        });
      } else if (pendingInspections.length > 0) {
        gates.push({
          key: "permits_inspections",
          label: "Permits/Inspections",
          required: true,
          state: "FAIL",
          reason: "PENDING_INSPECTIONS",
          blockingCount: pendingInspections.length,
          blockingItems: pendingInspections.slice(0, MAX_BLOCKING_ITEMS),
        });
      } else {
        gates.push({
          key: "permits_inspections",
          label: "Permits/Inspections",
          required: true,
          state: "PASS",
          reason: requiredInspections.length > 0 ? "ALL_REQUIRED_INSPECTIONS_PASSED" : "NO_REQUIRED_INSPECTIONS",
          blockingCount: 0,
          blockingItems: [],
        });
      }
    }

    const punchItems = Array.isArray(project?.projectPunchItems) ? project.projectPunchItems : [];
    const blockingPunchItems = punchItems.filter((item: any) =>
      ["OPEN", "IN_PROGRESS"].includes(String(item.status))
    );

    if (blockingPunchItems.length > 0) {
      const priorityOrder: Record<string, number> = {
        CRITICAL: 0,
        HIGH: 1,
        MEDIUM: 2,
        LOW: 3,
      };

      const sortedBlocking = [...blockingPunchItems]
        .sort((a: any, b: any) => {
          const pa = priorityOrder[String(a.priority)] ?? 99;
          const pb = priorityOrder[String(b.priority)] ?? 99;

          if (pa !== pb) {
            return pa - pb;
          }

          return Number(a.id) - Number(b.id);
        })
        .slice(0, MAX_BLOCKING_ITEMS)
        .map((item: any) => ({
          id: item.id,
          status: item.status,
          priority: item.priority,
          description: item.description,
          dueDate: item.dueDate,
          assignedToWorkerId: item.assignedToWorkerId,
        }));

      gates.push({
        key: "punch_list",
        label: "Punch List",
        required: true,
        state: "FAIL",
        reason: "OPEN_OR_IN_PROGRESS_PUNCH_ITEMS",
        blockingCount: blockingPunchItems.length,
        blockingItems: sortedBlocking,
      });
    } else {
      gates.push({
        key: "punch_list",
        label: "Punch List",
        required: true,
        state: "PASS",
        reason: "ALL_ITEMS_RESOLVED_OR_VERIFIED",
        blockingCount: 0,
        blockingItems: [],
      });
    }

    const changeOrders = Array.isArray(project?.changeOrders) ? project.changeOrders : [];
    const blockingChangeOrders = changeOrders
      .filter((changeOrder: any) => ["DRAFT", "SENT"].includes(String(changeOrder.status)))
      .map((changeOrder: any) => ({
        id: changeOrder.id,
        status: changeOrder.status,
        type: changeOrder.type,
        description: changeOrder.description,
        createdAt: changeOrder.createdAt,
      }));

    if (blockingChangeOrders.length > 0) {
      gates.push({
        key: "change_orders",
        label: "Change Orders",
        required: true,
        state: "FAIL",
        reason: "PENDING_CHANGE_ORDERS",
        blockingCount: blockingChangeOrders.length,
        blockingItems: blockingChangeOrders.slice(0, MAX_BLOCKING_ITEMS),
      });
    } else {
      gates.push({
        key: "change_orders",
        label: "Change Orders",
        required: true,
        state: "PASS",
        reason: "NO_PENDING_CHANGE_ORDERS",
        blockingCount: 0,
        blockingItems: [],
      });
    }

    gates.push(
      await this.buildMaterialsGate(project.id, {
        recompute: options?.recomputeMaterials ?? true,
      })
    );
    gates.push(this.buildSkippedGate("timesheets", "Timesheets"));
    gates.push(this.buildSkippedGate("subcontractors", "Subcontractors"));
    gates.push(this.buildSkippedGate("invoices", "Invoices"));
    gates.push(this.buildSkippedGate("lien_waivers", "Lien Waivers"));

    const hasBlockingRequiredGate = gates.some((gate) => gate.required && gate.state === "FAIL");
    const overallStatus = hasBlockingRequiredGate
      ? CloseoutStatus.PENDING_ITEMS
      : CloseoutStatus.READY;

    return {
      overallStatus,
      gates,
    };
  }

  async getCloseout(projectId: number, options?: { recompute?: boolean }): Promise<ProjectCloseoutSnapshot> {
    const recompute = options?.recompute ?? true;

    if (recompute) {
      return this.recomputeAndSyncStatus(projectId);
    }

    const project = await this.getProjectContext(projectId);
    const closeout = project.projectCloseout ?? (await this.ensureCloseoutRecord(projectId));
    const { overallStatus, gates } = await this.computeGatesFromProject(project, {
      recomputeMaterials: false,
    });

    return {
      closeout,
      overallStatus,
      gates,
    };
  }

  async recomputeAndSyncStatus(projectId: number): Promise<ProjectCloseoutSnapshot> {
    const project = await this.getProjectContext(projectId);
    const { overallStatus, gates } = await this.computeGatesFromProject(project, {
      recomputeMaterials: true,
    });

    const closeout = await this.prisma.projectCloseout.upsert({
      where: { projectId },
      update: {
        status: overallStatus,
      },
      create: {
        projectId,
        status: overallStatus,
      },
      include: {
        generatedByUser: {
          select: {
            id: true,
            nomeCompleto: true,
            email: true,
          },
        },
        deliveredByUser: {
          select: {
            id: true,
            nomeCompleto: true,
            email: true,
          },
        },
      },
    });

    return {
      closeout,
      overallStatus,
      gates,
    };
  }

  async generateCloseout(
    projectId: number,
    actingUser: { id: number; nomeCompleto?: string | null; email?: string | null },
    options?: { force?: boolean; templateId?: number }
  ): Promise<ProjectCloseoutGenerateResult> {
    const force = options?.force ?? false;
    const templateId = options?.templateId;

    if (typeof force !== "boolean") {
      throw new ProjectCloseoutServiceError(
        "Payload inválido",
        "CLOSEOUT_GENERATE_PAYLOAD_INVALID",
        422,
        { field: "force", expected: "boolean" }
      );
    }

    if (
      templateId !== undefined &&
      (!Number.isInteger(templateId) || templateId <= 0)
    ) {
      throw new ProjectCloseoutServiceError(
        "Payload inválido",
        "CLOSEOUT_GENERATE_PAYLOAD_INVALID",
        422,
        { field: "templateId", expected: "positive integer" }
      );
    }

    if (!actingUser || !Number.isFinite(Number(actingUser.id))) {
      throw new ProjectCloseoutServiceError(
        "Usuário inválido para geração",
        "CLOSEOUT_GENERATE_ACTOR_INVALID",
        422
      );
    }

    const project = await this.getProjectContext(projectId);
    const { overallStatus, gates } = await this.computeGatesFromProject(project, {
      recomputeMaterials: true,
    });

    const failingGates = gates.filter((gate) => gate.required && gate.state === "FAIL");
    if (overallStatus !== CloseoutStatus.READY) {
      throw new ProjectCloseoutServiceError(
        "Closeout não está pronto para geração",
        "CLOSEOUT_NOT_READY",
        409,
        {
          overallStatus,
          failingGates,
        }
      );
    }

    const existingCloseout = project.projectCloseout;
    const alreadyGeneratedStatuses = new Set<CloseoutStatus>([
      CloseoutStatus.GENERATED,
      CloseoutStatus.DELIVERED,
      CloseoutStatus.ACCEPTED,
    ]);

    if (
      !force &&
      existingCloseout &&
      alreadyGeneratedStatuses.has(existingCloseout.status as CloseoutStatus) &&
      (templateId === undefined || Number(existingCloseout.templateId) === Number(templateId)) &&
      existingCloseout.documentUrl
    ) {
      const existingTemplateSnapshot =
        existingCloseout.templateSnapshot ??
        (existingCloseout.template
          ? {
              id: existingCloseout.template.id,
              name: existingCloseout.template.name,
              serviceType: existingCloseout.template.serviceType,
              version: existingCloseout.template.version,
              sections: Array.isArray(existingCloseout.template.sections)
                ? existingCloseout.template.sections
                : [],
            }
          : null);

      const parsedTemplate =
        existingTemplateSnapshot &&
        typeof existingTemplateSnapshot === "object" &&
        !Array.isArray(existingTemplateSnapshot) &&
        "id" in existingTemplateSnapshot &&
        "name" in existingTemplateSnapshot &&
        "serviceType" in existingTemplateSnapshot
          ? {
              id: Number((existingTemplateSnapshot as any).id),
              name: String((existingTemplateSnapshot as any).name),
              serviceType: String((existingTemplateSnapshot as any).serviceType),
              version: Number((existingTemplateSnapshot as any).version ?? 1),
            }
          : null;

      return {
        closeout: existingCloseout,
        documentUrl: existingCloseout.documentUrl,
        overallStatus,
        gates,
        idempotent: true,
        template: parsedTemplate,
      };
    }

    const resolvedTemplate = await this.resolveCloseoutTemplate(project, templateId);
    const templateSnapshot = this.buildTemplateSnapshot(resolvedTemplate);

    const generatedAt = new Date();
    const generatedByName =
      actingUser.nomeCompleto?.trim() || actingUser.email?.trim() || `Usuário ${actingUser.id}`;

    const pdfBuffer = await this.buildCloseoutPdfBuffer({
      project,
      gates,
      overallStatus,
      generatedAt,
      generatedByName,
      template: resolvedTemplate,
    });

    const documentUrl = await this.persistCloseoutPdf(projectId, generatedAt, pdfBuffer);

    const closeout = await this.prisma.$transaction(async (tx: any) => {
      return tx.projectCloseout.upsert({
        where: { projectId },
        update: {
          status: CloseoutStatus.GENERATED,
          generatedAt,
          generatedBy: Number(actingUser.id),
          documentUrl,
          templateId: resolvedTemplate.id > 0 ? resolvedTemplate.id : null,
          templateSnapshot,
        },
        create: {
          projectId,
          status: CloseoutStatus.GENERATED,
          generatedAt,
          generatedBy: Number(actingUser.id),
          documentUrl,
          templateId: resolvedTemplate.id > 0 ? resolvedTemplate.id : null,
          templateSnapshot,
        },
        include: {
          generatedByUser: {
            select: {
              id: true,
              nomeCompleto: true,
              email: true,
            },
          },
          template: {
            include: {
              sections: {
                orderBy: {
                  sortOrder: "asc",
                },
              },
            },
          },
        },
      });
    });

    return {
      closeout,
      documentUrl,
      overallStatus,
      gates,
      idempotent: false,
      template: {
        id: resolvedTemplate.id,
        name: resolvedTemplate.name,
        serviceType: resolvedTemplate.serviceType,
        version: resolvedTemplate.version,
      },
    };
  }

  async deliverCloseout(
    projectId: number,
    actingUser: { id: number }
  ): Promise<ProjectCloseoutDeliveryResult> {
    if (!actingUser || !Number.isFinite(Number(actingUser.id))) {
      throw new ProjectCloseoutServiceError(
        "Usuário inválido para entrega",
        "CLOSEOUT_DELIVER_ACTOR_INVALID",
        422
      );
    }

    const closeout = await this.prisma.projectCloseout.findUnique({
      where: { projectId },
      include: {
        generatedByUser: {
          select: {
            id: true,
            nomeCompleto: true,
            email: true,
          },
        },
        deliveredByUser: {
          select: {
            id: true,
            nomeCompleto: true,
            email: true,
          },
        },
      },
    });

    if (!closeout || !closeout.documentUrl || closeout.status === CloseoutStatus.PENDING_ITEMS || closeout.status === CloseoutStatus.READY) {
      throw new ProjectCloseoutServiceError(
        "Closeout ainda não foi gerado",
        "CLOSEOUT_NOT_GENERATED",
        409,
        {
          projectId,
          status: closeout?.status ?? null,
        }
      );
    }

    if (closeout.status === CloseoutStatus.DELIVERED || closeout.status === CloseoutStatus.ACCEPTED) {
      return {
        closeout,
        idempotent: true,
      };
    }

    const deliveredAt = new Date();
    const updated = await this.prisma.projectCloseout.update({
      where: { projectId },
      data: {
        status: CloseoutStatus.DELIVERED,
        deliveredAt,
        deliveredBy: Number(actingUser.id),
      },
      include: {
        generatedByUser: {
          select: {
            id: true,
            nomeCompleto: true,
            email: true,
          },
        },
        deliveredByUser: {
          select: {
            id: true,
            nomeCompleto: true,
            email: true,
          },
        },
      },
    });

    return {
      closeout: updated,
      idempotent: false,
    };
  }

  async acceptCloseout(
    projectId: number,
    input?: ProjectCloseoutAcceptInput
  ): Promise<ProjectCloseoutDeliveryResult> {
    const payload = input ?? {};

    if (
      payload.clientSatisfactionRating !== undefined &&
      payload.clientSatisfactionRating !== null &&
      (!Number.isInteger(payload.clientSatisfactionRating) ||
        payload.clientSatisfactionRating < 1 ||
        payload.clientSatisfactionRating > 5)
    ) {
      throw new ProjectCloseoutServiceError(
        "Payload inválido",
        "CLOSEOUT_ACCEPT_PAYLOAD_INVALID",
        422,
        { field: "clientSatisfactionRating", expected: "integer between 1 and 5" }
      );
    }

    const closeout = await this.prisma.projectCloseout.findUnique({
      where: { projectId },
      include: {
        generatedByUser: {
          select: {
            id: true,
            nomeCompleto: true,
            email: true,
          },
        },
        deliveredByUser: {
          select: {
            id: true,
            nomeCompleto: true,
            email: true,
          },
        },
      },
    });

    if (!closeout || closeout.status === CloseoutStatus.PENDING_ITEMS || closeout.status === CloseoutStatus.READY || closeout.status === CloseoutStatus.GENERATED) {
      throw new ProjectCloseoutServiceError(
        "Closeout ainda não foi entregue",
        "CLOSEOUT_NOT_DELIVERED",
        409,
        {
          projectId,
          status: closeout?.status ?? null,
        }
      );
    }

    if (closeout.status === CloseoutStatus.ACCEPTED) {
      return {
        closeout,
        idempotent: true,
      };
    }

    const acceptedAt = new Date();
    const updated = await this.prisma.projectCloseout.update({
      where: { projectId },
      data: {
        status: CloseoutStatus.ACCEPTED,
        clientAcceptedAt: acceptedAt,
        ...(payload.clientSignatureUrl !== undefined ? { clientSignatureUrl: payload.clientSignatureUrl } : {}),
        ...(payload.clientSatisfactionRating !== undefined
          ? { clientSatisfactionRating: payload.clientSatisfactionRating }
          : {}),
        ...(payload.notes !== undefined ? { notes: payload.notes } : {}),
      },
      include: {
        generatedByUser: {
          select: {
            id: true,
            nomeCompleto: true,
            email: true,
          },
        },
        deliveredByUser: {
          select: {
            id: true,
            nomeCompleto: true,
            email: true,
          },
        },
      },
    });

    return {
      closeout: updated,
      idempotent: false,
    };
  }
}
