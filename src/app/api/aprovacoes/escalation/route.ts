import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';

// Mock escalation rules
const escalationRules = [
  {
    id: '1',
    name: 'Escalonamento Padrão',
    description: 'Escalonamento automático após 3 dias sem ação',
    triggerAfterHours: 72, // 3 days
    escalateTo: 'supervisor',
    role: 'Supervisor',
    active: true
  },
  {
    id: '2',
    name: 'Escalonamento Executivo',
    description: 'Escalonamento para diretor após 7 dias',
    triggerAfterHours: 168, // 7 days
    escalateTo: 'director',
    role: 'Diretor',
    active: true
  },
  {
    id: '3',
    name: 'Escalonamento Urgente',
    description: 'Escalonamento imediato para itens de alta prioridade',
    triggerAfterHours: 24, // 1 day
    escalateTo: 'manager',
    role: 'Gerente',
    priority: 'alta',
    active: true
  }
];

export const GET = withErrorHandler(async (request: NextRequest) => {
    const user = await requireUser(request);
    if (!can(user.role as Role, 'aprovacoes', 'read')) {
      return NextResponse.json({ error: 'Forbidden', message: 'Sem permissão', success: false }, { status: 403 });
    }
    return NextResponse.json({
      success: true,
      data: escalationRules
    });
  });

export const POST = withErrorHandler(async (request: NextRequest) => {
    const user = await requireUser(request);
    if (!can(user.role as Role, 'aprovacoes', 'write')) {
      return NextResponse.json({ error: 'Forbidden', message: 'Sem permissão', success: false }, { status: 403 });
    }
    const body = await request.json();
    const { approvalId, currentApprovers, createdAt, priority } = body;

    if (!approvalId || !currentApprovers || !createdAt) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const createdDate = new Date(createdAt);
    const now = new Date();
    const hoursElapsed = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60);

    // Find applicable escalation rules
    const applicableRules = escalationRules
      .filter(rule => rule.active)
      .filter(rule => {
        if (rule.priority && rule.priority !== priority) return false;
        return hoursElapsed >= rule.triggerAfterHours;
      })
      .sort((a, b) => a.triggerAfterHours - b.triggerAfterHours);

    if (applicableRules.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          shouldEscalate: false,
          message: 'No escalation needed at this time'
        }
      });
    }

    const escalationRule = applicableRules[0]; // Use the first applicable rule

    // Check if escalation target is already an approver
    const alreadyAssigned = currentApprovers.some((approver: unknown) => {
      const data = approver as { nome?: string };
      return data.nome === escalationRule.escalateTo;
    });

    if (alreadyAssigned) {
      return NextResponse.json({
        success: true,
        data: {
          shouldEscalate: false,
          message: 'Escalation target already assigned'
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        shouldEscalate: true,
        escalationRule: {
          id: escalationRule.id,
          name: escalationRule.name,
          escalateTo: escalationRule.escalateTo,
          role: escalationRule.role,
          hoursElapsed: Math.round(hoursElapsed),
          triggerHours: escalationRule.triggerAfterHours
        },
        newApprover: {
          nome: escalationRule.escalateTo,
          cargo: escalationRule.role,
          status: 'pendente'
        }
      }
    });
  });
