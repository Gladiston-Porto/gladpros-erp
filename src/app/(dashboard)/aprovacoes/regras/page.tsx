'use client';

import { useEffect, useState } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Settings,
  DollarSign,
  Building,
  Zap,
  CheckCircle,
  UserCheck,
  ArrowUpCircle,
} from 'lucide-react';
import { Badge } from '@gladpros/ui/badge'
import { Button } from '@gladpros/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@gladpros/ui/card'
import { ModulePageHeader } from '@gladpros/ui/module-page-header';

interface ApprovalRule {
  id: string;
  name: string;
  description?: string;
  type: 'budget' | 'department' | 'priority';
  condition: {
    field: string;
    operator: string;
    value: string | number;
  };
  action: {
    type: 'auto_approve' | 'assign_approver' | 'escalate';
    approverRole?: string;
    escalateTo?: string;
  };
  active: boolean;
  priority: number;
}

const ACTION_CONFIG = {
  auto_approve:    { label: 'Auto-aprovar',    icon: <CheckCircle className="h-4 w-4" />,    color: 'bg-emerald-100 text-emerald-700' },
  assign_approver: { label: 'Atribuir aprovador', icon: <UserCheck className="h-4 w-4" />,  color: 'bg-blue-100 text-blue-700' },
  escalate:        { label: 'Escalar',         icon: <ArrowUpCircle className="h-4 w-4" />, color: 'bg-amber-100 text-amber-700' },
};

const TYPE_CONFIG = {
  budget:     { label: 'Valor',        icon: <DollarSign className="h-4 w-4" /> },
  department: { label: 'Departamento', icon: <Building className="h-4 w-4" /> },
  priority:   { label: 'Prioridade',   icon: <Zap className="h-4 w-4" /> },
};

const OPERATOR_LABELS: Record<string, string> = {
  lte: '≤',
  lt:  '<',
  gte: '≥',
  gt:  '>',
  eq:  '=',
  contains: 'contém',
};

export default function RegrasAprovacaoPage() {
  const [rules, setRules] = useState<ApprovalRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<ApprovalRule | null>(null);

  // Form state
  const [form, setForm] = useState({
    name: '',
    description: '',
    type: 'budget' as ApprovalRule['type'],
    conditionField: 'valor',
    conditionOperator: 'lte',
    conditionValue: '',
    actionType: 'auto_approve' as ApprovalRule['action']['type'],
    approverRole: '',
    escalateTo: '',
    active: true,
    priority: 1,
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadRules();
  }, []);

  async function loadRules() {
    setLoading(true);
    try {
      const res = await fetch('/api/aprovacoes/rules');
      if (!res.ok) throw new Error('Erro ao carregar regras');
      const data = await res.json();
      setRules(data.rules ?? data.data ?? []);
    } catch {
      setRules([]);
    } finally {
      setLoading(false);
    }
  }

  function openNewForm() {
    setEditingRule(null);
    setForm({ name: '', description: '', type: 'budget', conditionField: 'valor', conditionOperator: 'lte', conditionValue: '', actionType: 'auto_approve', approverRole: '', escalateTo: '', active: true, priority: 1 });
    setShowForm(true);
  }

  function openEditForm(rule: ApprovalRule) {
    setEditingRule(rule);
    setForm({
      name: rule.name,
      description: rule.description ?? '',
      type: rule.type,
      conditionField: rule.condition.field,
      conditionOperator: rule.condition.operator,
      conditionValue: String(rule.condition.value),
      actionType: rule.action.type,
      approverRole: rule.action.approverRole ?? '',
      escalateTo: rule.action.escalateTo ?? '',
      active: rule.active,
      priority: rule.priority,
    });
    setShowForm(true);
  }

  async function saveRule() {
    if (!form.name || !form.conditionValue) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        type: form.type,
        condition: { field: form.conditionField, operator: form.conditionOperator, value: form.conditionValue },
        action: { type: form.actionType, approverRole: form.approverRole || undefined, escalateTo: form.escalateTo || undefined },
        active: form.active,
        priority: form.priority,
      };
      const url = editingRule ? `/api/aprovacoes/rules/${editingRule.id}` : '/api/aprovacoes/rules';
      const method = editingRule ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error('Falha ao salvar regra');
      await loadRules();
      setShowForm(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  async function deleteRule(id: string) {
    if (!confirm('Excluir esta regra?')) return;
    try {
      await fetch(`/api/aprovacoes/rules/${id}`, { method: 'DELETE' });
      setRules((prev) => prev.filter((r) => r.id !== id));
    } catch {
      alert('Erro ao excluir regra');
    }
  }

  async function toggleActive(rule: ApprovalRule) {
    try {
      const res = await fetch(`/api/aprovacoes/rules/${rule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !rule.active }),
      });
      if (res.ok) {
        setRules((prev) => prev.map((r) => r.id === rule.id ? { ...r, active: !r.active } : r));
      }
    } catch {}
  }

  return (
    <div className="space-y-6">
      <ModulePageHeader
        title="Regras de Aprovação"
        description="Configure condições automáticas para aprovar, atribuir ou escalar solicitações"
        icon={<Settings />}
        accentColor="#0098DA"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Aprovações', href: '/aprovacoes' },
          { label: 'Regras' },
        ]}
        actions={
          <Button type="button" onClick={openNewForm}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Regra
          </Button>
        }
      />

      {/* Painel informativo */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex items-center gap-3 mb-3">
            <Settings className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-semibold text-sm">Como funcionam as regras</p>
              <p className="text-sm text-muted-foreground">Regras são avaliadas em ordem de prioridade ao criar uma aprovação</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {Object.entries(ACTION_CONFIG).map(([key, cfg]) => (
              <div key={key} className="flex items-center gap-2 rounded-lg bg-muted p-2.5">
                <span className="text-muted-foreground">{cfg.icon}</span>
                <span className="text-sm font-medium">{cfg.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Form */}
      {showForm && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{editingRule ? 'Editar Regra' : 'Nova Regra'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Nome da regra *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Auto-aprovar despesas pequenas" className="w-full rounded-lg border border-border bg-background p-2.5 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Prioridade</label>
                <input type="number" min={1} max={100} value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })} className="w-full rounded-lg border border-border bg-background p-2.5 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Descrição</label>
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descreva quando esta regra se aplica" className="w-full rounded-lg border border-border bg-background p-2.5 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </div>

            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Condição</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Tipo</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as ApprovalRule['type'] })} className="w-full rounded-lg border border-border bg-background p-2.5 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <option value="budget">Valor ($)</option>
                  <option value="department">Departamento</option>
                  <option value="priority">Prioridade</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Operador</label>
                <select value={form.conditionOperator} onChange={(e) => setForm({ ...form, conditionOperator: e.target.value })} className="w-full rounded-lg border border-border bg-background p-2.5 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {form.type === 'budget' ? (
                    <>
                      <option value="lte">≤ (menor ou igual)</option>
                      <option value="lt">{'< (menor que)'}</option>
                      <option value="gte">≥ (maior ou igual)</option>
                      <option value="gt">{'> (maior que)'}</option>
                    </>
                  ) : (
                    <option value="eq">= (igual a)</option>
                  )}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Valor *</label>
                <input value={form.conditionValue} onChange={(e) => setForm({ ...form, conditionValue: e.target.value })} placeholder={form.type === 'budget' ? '1000' : 'Ex: TI, alta'} className="w-full rounded-lg border border-border bg-background p-2.5 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              </div>
            </div>

            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ação</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Ação a executar</label>
                <select value={form.actionType} onChange={(e) => setForm({ ...form, actionType: e.target.value as ApprovalRule['action']['type'] })} className="w-full rounded-lg border border-border bg-background p-2.5 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <option value="auto_approve">Auto-aprovar</option>
                  <option value="assign_approver">Atribuir aprovador</option>
                  <option value="escalate">Escalar para superior</option>
                </select>
              </div>
              {form.actionType === 'assign_approver' && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Papel do aprovador</label>
                  <input value={form.approverRole} onChange={(e) => setForm({ ...form, approverRole: e.target.value })} placeholder="Ex: GERENTE, FINANCEIRO" className="w-full rounded-lg border border-border bg-background p-2.5 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                </div>
              )}
              {form.actionType === 'escalate' && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Escalar para</label>
                  <input value={form.escalateTo} onChange={(e) => setForm({ ...form, escalateTo: e.target.value })} placeholder="Ex: ADMIN, DIRETOR" className="w-full rounded-lg border border-border bg-background p-2.5 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="active" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="rounded" />
              <label htmlFor="active" className="text-sm text-muted-foreground">Regra ativa</label>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" onClick={saveRule} disabled={saving || !form.name || !form.conditionValue}>
                {saving ? 'Salvando...' : editingRule ? 'Salvar alterações' : 'Criar regra'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de regras */}
      {loading ? (
        <div className="flex min-h-[200px] items-center justify-center">
          <Settings className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : rules.length === 0 ? (
        <Card>
          <CardContent className="flex min-h-[200px] flex-col items-center justify-center gap-3">
            <Settings className="h-12 w-12 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Nenhuma regra configurada</p>
            <Button type="button" variant="outline" size="sm" onClick={openNewForm}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Criar primeira regra
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {[...rules].sort((a, b) => a.priority - b.priority).map((rule) => {
            const typeCfg = TYPE_CONFIG[rule.type] ?? TYPE_CONFIG.budget;
            const actionCfg = ACTION_CONFIG[rule.action.type] ?? ACTION_CONFIG.auto_approve;
            return (
              <Card key={rule.id} className={`transition-opacity ${rule.active ? '' : 'opacity-60'}`}>
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <span className="text-xs font-bold">{rule.priority}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">{rule.name}</p>
                      {!rule.active && <Badge variant="secondary" className="text-xs">Inativa</Badge>}
                    </div>
                    {rule.description && <p className="text-xs text-muted-foreground">{rule.description}</p>}
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">{typeCfg.icon}{typeCfg.label}</span>
                      <span className="text-border">|</span>
                      <span>Se {rule.condition.field} {OPERATOR_LABELS[rule.condition.operator] ?? rule.condition.operator} {rule.condition.value}</span>
                      <span className="text-border">→</span>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${actionCfg.color}`}>
                        {actionCfg.icon}{actionCfg.label}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button type="button" onClick={() => toggleActive(rule)} title={rule.active ? 'Desativar' : 'Ativar'} className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                      <Zap className={`h-4 w-4 ${rule.active ? 'text-amber-500' : ''}`} />
                    </button>
                    <button type="button" onClick={() => openEditForm(rule)} title="Editar" className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => deleteRule(rule.id)} title="Excluir" className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
