import { NextRequest, NextResponse } from 'next/server'
import { ProjectService } from '@/domains/projects/services/ProjectService'
import { getProjectListScopeForUser, requireProjectPermission } from '@/shared/lib/rbac-projects'
import { withErrorHandler } from '@/lib/api/error-handler';

export const runtime = "nodejs"

/**
 * GET /api/projetos/dashboard - Obter métricas agregadas de projetos
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
    const user = await requireProjectPermission(request, 'canViewDashboard')
    const scope = await getProjectListScopeForUser(user)

    const service = new ProjectService()
    const dashboard = await service.obterDashboard(scope)

    return NextResponse.json({ data: dashboard, success: true })
  });
