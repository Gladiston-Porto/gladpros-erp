import { NextRequest, NextResponse } from 'next/server'
import { ProjectService } from '@/domains/projects/services/ProjectService'
import { requireProjectPermission } from '@/shared/lib/rbac-projects'
import { withErrorHandler } from '@/lib/api/error-handler';

export const runtime = "nodejs"

/**
 * GET /api/projetos/dashboard - Obter métricas agregadas de projetos
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
    await requireProjectPermission(request, 'canViewDashboard')
    
    const service = new ProjectService()
    const dashboard = await service.obterDashboard()
    
    return NextResponse.json(dashboard)
  });
