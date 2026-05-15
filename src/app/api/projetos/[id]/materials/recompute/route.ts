import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireProjectAccess, requireProjectPermission } from "@/shared/lib/rbac-projects";
import { can, type Role } from "@/shared/lib/rbac-core";
import { ProjectMaterialMetricsService } from "@/domains/projects/services/ProjectMaterialMetricsService";
import { withErrorHandler } from '@/lib/api/error-handler';

export const runtime = "nodejs";

const bodySchema = z.object({
  dryRun: z.boolean().optional(),
  since: z.string().datetime({ offset: true }).optional(),
  cursor: z.number().int().positive().optional(),
  chunkSize: z.number().int().min(500).max(20000).optional(),
  includeDiagnostics: z.boolean().optional(),
  maxDiagnosticsMaterials: z.number().int().min(1).max(1000).optional(),
  maxWarnings: z.number().int().min(1).max(1000).optional(),
});

const querySchema = z.object({
  dryRun: z
    .enum(["1", "0", "true", "false", "yes", "no"])
    .transform((value) => value === "1" || value === "true" || value === "yes")
    .optional(),
  since: z.string().datetime({ offset: true }).optional(),
  cursor: z.coerce.number().int().positive().optional(),
  chunkSize: z.coerce.number().int().min(500).max(20000).optional(),
  includeDiagnostics: z
    .enum(["1", "0", "true", "false", "yes", "no"])
    .transform((value) => value === "1" || value === "true" || value === "yes")
    .optional(),
  maxDiagnosticsMaterials: z.coerce.number().int().min(1).max(1000).optional(),
  maxWarnings: z.coerce.number().int().min(1).max(1000).optional(),
});

function readQuery(request: NextRequest): z.infer<typeof querySchema> {
  const searchParams = request.nextUrl?.searchParams;
  return querySchema.parse({
    dryRun: searchParams?.get("dryRun") ?? undefined,
    since: searchParams?.get("since") ?? undefined,
    cursor: searchParams?.get("cursor") ?? undefined,
    chunkSize: searchParams?.get("chunkSize") ?? undefined,
    includeDiagnostics: searchParams?.get("includeDiagnostics") ?? undefined,
    maxDiagnosticsMaterials: searchParams?.get("maxDiagnosticsMaterials") ?? undefined,
    maxWarnings: searchParams?.get("maxWarnings") ?? undefined,
  });
}

function mergeOptions(
  body: z.infer<typeof bodySchema>,
  query: z.infer<typeof querySchema>
): z.infer<typeof bodySchema> {
  return {
    dryRun: body.dryRun ?? query.dryRun,
    since: body.since ?? query.since,
    cursor: body.cursor ?? query.cursor,
    chunkSize: body.chunkSize ?? query.chunkSize,
    includeDiagnostics: query.includeDiagnostics ?? body.includeDiagnostics,
    maxDiagnosticsMaterials: body.maxDiagnosticsMaterials ?? query.maxDiagnosticsMaterials,
    maxWarnings: body.maxWarnings ?? query.maxWarnings,
  };
}

function normalizeIncludeDiagnostics(value: boolean | undefined): boolean {
  if (value === undefined) {
    return false;
  }

  return value;
}

export const POST = withErrorHandler(async (request: NextRequest,
  context: { params: Promise<{ id: string }> }) => {
    const user = await requireProjectPermission(request, "canViewFinancials");

    const { id } = await context.params;
    const projectId = Number(id);

    if (!Number.isFinite(projectId)) {
      return NextResponse.json(
        {
          error: "INVALID_PROJECT_ID",
          message: "Projeto inválido.",
          details: { id },
        },
        { status: 422 }
      );
    }
    await requireProjectAccess(user, projectId, "canViewFinancials");

    const body = bodySchema.parse(await request.json().catch(() => ({})));
    const query = readQuery(request);
    const merged = mergeOptions(body, query);
    if (merged.dryRun !== true && !can(user.role as Role, "financeiro", "update")) {
      return NextResponse.json(
        { error: "Forbidden", message: "Sem permissão para persistir recálculo", success: false },
        { status: 403 }
      );
    }

    const includeDiagnostics = normalizeIncludeDiagnostics(merged.includeDiagnostics);

    const service = new ProjectMaterialMetricsService();
    const result = await service.recomputeProject(projectId, {
      dryRun: merged.dryRun,
      since: merged.since,
      cursor: merged.cursor,
      chunkSize: merged.chunkSize,
      includeWarnings: true,
      includeDiagnostics,
      maxDiagnosticsMaterials: merged.maxDiagnosticsMaterials,
      maxWarnings: merged.maxWarnings,
    });

    return NextResponse.json({ data: result, success: true }, { status: 200 });
  });
