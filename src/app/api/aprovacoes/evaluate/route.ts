import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler } from '@/lib/api/error-handler';

// Mock approval rules (same as in rules/route.ts)
const mockApprovalRules = [
  {
    id: '1',
    name: 'Aprovação Automática - Valores Baixos',
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

// Evaluate conditions
function evaluateCondition(condition: unknown, approvalData: unknown): boolean {
  const cond = condition as { field?: string; operator?: string; value?: unknown };
  const data = approvalData as Record<string, unknown>;
  
  const { field, operator, value } = cond;
  if (!field || !operator) return false;
  
  const fieldValue = data[field];

  switch (operator) {
    case 'equals':
      return fieldValue === value;
    case 'not_equals':
      return fieldValue !== value;
    case 'greater_than':
      return Number(fieldValue) > Number(value);
    case 'less_than':
      return Number(fieldValue) < Number(value);
    case 'greater_than_or_equal':
      return Number(fieldValue) >= Number(value);
    case 'less_than_or_equal':
      return Number(fieldValue) <= Number(value);
    case 'contains':
      return String(fieldValue).toLowerCase().includes(String(value).toLowerCase());
    default:
      return false;
  }
}

// Evaluate all conditions for a rule
function evaluateRule(rule: unknown, approvalData: unknown): boolean {
  const ruleData = rule as { conditions?: unknown[] };
  if (!ruleData.conditions) return false;
  
  return ruleData.conditions.every((condition: unknown) =>
    evaluateCondition(condition, approvalData)
  );
}

export const POST = withErrorHandler(async (request: NextRequest) => {
    const approvalData = await request.json();

    if (!approvalData) {
      return NextResponse.json({ error: 'Approval data required' }, { status: 400 });
    }

    const applicableRules = mockApprovalRules
      .filter(rule => rule.active)
      .filter(rule => evaluateRule(rule, approvalData))
      .sort((a, b) => a.priority - b.priority);

    const actions = applicableRules.flatMap(rule => rule.actions);

    // Determine final action based on rules
    let finalAction = null;
    const assignedApprovers = [];

    for (const action of actions) {
      if (action.type === 'auto_approve') {
        finalAction = 'auto_approve';
        break; // Auto-approve takes precedence
      } else if (action.type === 'assign_approver') {
        assignedApprovers.push({
          nome: action.approver,
          cargo: (action as { role?: string }).role || 'Aprovador',
          status: 'pendente'
        });
      } else if (action.type === 'escalate') {
        assignedApprovers.push({
          nome: action.approver,
          cargo: (action as { role?: string }).role || 'Aprovador Sênior',
          status: 'pendente'
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        applicableRules: applicableRules.map(rule => ({
          id: rule.id,
          name: rule.name,
          priority: rule.priority
        })),
        actions: actions,
        finalAction: finalAction,
        assignedApprovers: assignedApprovers,
        evaluation: {
          totalRules: mockApprovalRules.length,
          applicableRules: applicableRules.length,
          hasAutoApproval: finalAction === 'auto_approve'
        }
      }
    });
  });
