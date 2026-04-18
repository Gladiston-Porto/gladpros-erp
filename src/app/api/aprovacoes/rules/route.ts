import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler } from '@/lib/api/error-handler';

// Mock approval rules data
const mockApprovalRules = [
  {
    id: '1',
    name: 'Aprovação Automática - Valores Baixos',
    description: 'Solicitações até $ 1.000 são aprovadas automaticamente',
    conditions: [
      {
        field: 'valor',
        operator: 'less_than_or_equal',
        value: 1000,
        type: 'budget'
      }
    ],
    actions: [
      {
        type: 'auto_approve',
        approver: 'system'
      }
    ],
    active: true,
    priority: 1
  },
  {
    id: '2',
    name: 'Aprovação por Cargo - TI',
    description: 'Solicitações de TI são aprovadas pelo gerente de TI',
    conditions: [
      {
        field: 'departamento',
        operator: 'equals',
        value: 'TI',
        type: 'department'
      }
    ],
    actions: [
      {
        type: 'assign_approver',
        approver: 'gerente_ti',
        role: 'Gerente de TI'
      }
    ],
    active: true,
    priority: 2
  },
  {
    id: '3',
    name: 'Escalonamento - Alto Valor',
    description: 'Valores acima de $ 50.000 precisam de aprovação executiva',
    conditions: [
      {
        field: 'valor',
        operator: 'greater_than',
        value: 50000,
        type: 'budget'
      }
    ],
    actions: [
      {
        type: 'escalate',
        approver: 'diretor_executivo',
        role: 'Diretor Executivo'
      }
    ],
    active: true,
    priority: 3
  }
];

export const GET = withErrorHandler(async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    let filteredRules = mockApprovalRules;

    if (type) {
      filteredRules = mockApprovalRules.filter(rule =>
        rule.conditions.some(condition => condition.type === type)
      );
    }

    return NextResponse.json({
      success: true,
      data: filteredRules
    });
  });

export const POST = withErrorHandler(async (request: NextRequest) => {
    const body = await request.json();
    const { name, description, conditions, actions, active = true } = body;

    if (!name || !conditions || !actions) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const newRule = {
      id: Date.now().toString(),
      name,
      description,
      conditions,
      actions,
      active,
      priority: mockApprovalRules.length + 1
    };

    mockApprovalRules.push(newRule);

    return NextResponse.json({
      success: true,
      data: newRule
    });
  });

export const PUT = withErrorHandler(async (request: NextRequest) => {
    const body = await request.json();
    const { id, ...updates } = body;

    const ruleIndex = mockApprovalRules.findIndex(rule => rule.id === id);

    if (ruleIndex === -1) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    mockApprovalRules[ruleIndex] = { ...mockApprovalRules[ruleIndex], ...updates };

    return NextResponse.json({
      success: true,
      data: mockApprovalRules[ruleIndex]
    });
  });
