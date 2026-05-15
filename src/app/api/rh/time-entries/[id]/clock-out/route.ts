// src/app/api/rh/time-entries/[id]/clock-out/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/shared/lib/rbac";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api/error-handler";

export const runtime = "nodejs";

const REGULAR_MINUTES_PER_DAY = 480; // 8 horas = limite sem overtime (FLSA)

const ClockOutSchema = z.object({
  // Distribuição de atividades do turno (opcional — pode ajustar as atividades)
  activities: z
    .array(
      z.object({
        activityType: z.enum([
          "PROJECT_MANAGEMENT",
          "FIELD_WORK",
          "ADMINISTRATIVE",
          "FINANCIAL",
          "INVENTORY",
          "MEETING",
          "TRAINING",
          "TRAVEL",
          "SUPERVISION",
          "OTHER",
        ]),
        durationMinutes: z.number().int().min(1),
        projetoId: z.number().int().positive().optional(),
        serviceOrderId: z.number().int().positive().optional(),
        description: z.string().max(500).optional(),
      })
    )
    .optional(),
  notes: z.string().optional(),
});

/**
 * POST /api/rh/time-entries/[id]/clock-out
 *
 * Encerra o turno, calcula total de minutos e horas extras.
 * Regra FLSA Texas: horas acima de 8h/dia = overtime (1.5x).
 */
export const POST = withErrorHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireUser(req);
    const { id } = await params;
    const entryId = Number(id);

    if (isNaN(entryId) || entryId <= 0) {
      return NextResponse.json({ error: "Bad request", message: "ID inválido", success: false }, { status: 400 });
    }

    const body = ClockOutSchema.safeParse(await req.json().catch(() => ({})));
    if (!body.success) {
      return NextResponse.json(
        { error: "Validation failed", message: body.error.issues[0]?.message ?? "Dados inválidos", success: false },
        { status: 400 }
      );
    }

    // Buscar o TimeEntry
    const entry = await prisma.timeEntry.findUnique({
      where: { id: entryId },
      include: {
        activities: true,
        worker: { select: { id: true, usuarioId: true, name: true, compensationModel: true, defaultHourlyRate: true } },
      },
    });

    if (!entry) {
      return NextResponse.json({ error: "Not found", message: "Registro de ponto não encontrado", success: false }, { status: 404 });
    }

    if (entry.status !== "OPEN") {
      return NextResponse.json(
        { error: "Conflict", message: `Turno já encerrado (status: ${entry.status})`, success: false },
        { status: 409 }
      );
    }

    // Verificar permissão
    const isAdminOrGerente = user.role === "ADMIN" || user.role === "GERENTE";
    if (!isAdminOrGerente && entry.worker.usuarioId !== Number(user.id)) {
      return NextResponse.json(
        { error: "Forbidden", message: "Você só pode encerrar seu próprio turno", success: false },
        { status: 403 }
      );
    }

    const agora = new Date();
    const totalMinutes = Math.round((agora.getTime() - entry.clockIn.getTime()) / 60000);
    const regularMinutes = Math.min(totalMinutes, REGULAR_MINUTES_PER_DAY);
    const overtimeMinutes = Math.max(0, totalMinutes - REGULAR_MINUTES_PER_DAY);

    // Se foram informadas atividades, substituir as existentes
    const actividadesAtualizadas = body.data.activities;

    await prisma.$transaction(async (tx) => {
      // Atualizar o TimeEntry principal
      await tx.timeEntry.update({
        where: { id: entryId },
        data: {
          clockOut: agora,
          totalMinutes,
          regularMinutes,
          overtimeMinutes,
          status: "SUBMITTED",
          notes: body.data.notes !== undefined ? body.data.notes : entry.notes,
        },
      });

      if (actividadesAtualizadas && actividadesAtualizadas.length > 0) {
        // Validar que a soma das durações não ultrapasse o total
        const somaAtividades = actividadesAtualizadas.reduce((acc, a) => acc + a.durationMinutes, 0);
        if (somaAtividades > totalMinutes + 15) {
          // 15 min de tolerância
          throw new Error(`Soma das atividades (${somaAtividades}min) excede o total do turno (${totalMinutes}min)`);
        }

        // Remover atividades anteriores e recriar com durações corretas
        await tx.timeEntryActivity.deleteMany({ where: { timeEntryId: entryId } });
        await tx.timeEntryActivity.createMany({
          data: actividadesAtualizadas.map((a) => ({
            timeEntryId: entryId,
            activityType: a.activityType,
            durationMinutes: a.durationMinutes,
            projetoId: a.projetoId ?? null,
            serviceOrderId: a.serviceOrderId ?? null,
            description: a.description ?? null,
          })),
        });
      } else {
        // Atualizar a atividade inicial com o total de minutos do turno
        const primeiraAtividade = entry.activities[0];
        if (primeiraAtividade) {
          await tx.timeEntryActivity.update({
            where: { id: primeiraAtividade.id },
            data: { durationMinutes: totalMinutes },
          });
        }
      }
    });

    // Retornar o entry atualizado
    const updated = await prisma.timeEntry.findUnique({
      where: { id: entryId },
      include: {
        activities: true,
        worker: { select: { id: true, name: true, compensationModel: true, defaultHourlyRate: true } },
      },
    });

    return NextResponse.json(
      {
        data: {
          ...updated,
          summary: {
            totalMinutes,
            regularMinutes,
            overtimeMinutes,
            totalHours: (totalMinutes / 60).toFixed(2),
            overtimeHours: (overtimeMinutes / 60).toFixed(2),
          },
        },
        success: true,
      },
      { status: 200 }
    );
  }
);
