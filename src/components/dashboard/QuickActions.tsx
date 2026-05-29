import { memo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@gladpros/ui/card';
import { Plus, Users, FileText, Settings, ArrowRight } from 'lucide-react';
import { can, type Role } from '@/shared/lib/rbac-core';

interface QuickActionsProps {
  onNewProposal?: () => void;
  onNewClient?: () => void;
  onViewReports?: () => void;
  onSettings?: () => void;
  userRole?: string;
}

// Classes Tailwind estáticas por ação — necessário para purge correto
const ACTIONS = [
  {
    key: 'proposal',
    label: 'Nova Proposta',
    icon: Plus,
    iconClass: 'bg-brand-primary',
    cb: 'onNewProposal' as const,
    module: 'propostas' as const,
    action: 'create' as const,
  },
  {
    key: 'client',
    label: 'Novo Cliente',
    icon: Users,
    iconClass: 'bg-brand-secondary',
    cb: 'onNewClient' as const,
    module: 'clientes' as const,
    action: 'create' as const,
  },
  {
    key: 'reports',
    label: 'Relatórios',
    icon: FileText,
    iconClass: 'bg-emerald-500',
    cb: 'onViewReports' as const,
    module: 'reports' as const,
    action: 'read' as const,
  },
  {
    key: 'settings',
    label: 'Configurações',
    icon: Settings,
    iconClass: 'bg-violet-600',
    cb: 'onSettings' as const,
    module: 'configuracoes' as const,
    action: 'read' as const,
  },
] as const;

export const QuickActions = memo(function QuickActions(props: QuickActionsProps) {
  const { userRole, ...rest } = props;
  const cbs = {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    onNewProposal: useCallback(() => rest.onNewProposal?.(), [rest.onNewProposal]),

    // eslint-disable-next-line react-hooks/exhaustive-deps
    onNewClient: useCallback(() => rest.onNewClient?.(), [rest.onNewClient]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    onViewReports: useCallback(() => rest.onViewReports?.(), [rest.onViewReports]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    onSettings: useCallback(() => rest.onSettings?.(), [rest.onSettings]),
  };

  const visibleActions = userRole
    ? ACTIONS.filter((action) => can(userRole as Role, action.module, action.action))
    : [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Ações Rápidas</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2">
        {visibleActions.length === 0 && (
          <p className="col-span-2 text-sm text-muted-foreground" aria-live="polite">
            {userRole
              ? 'Nenhuma ação disponível para este perfil.'
              : 'Carregando ações disponíveis...'}
          </p>
        )}
        {visibleActions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.key}
              type="button"
              aria-label={action.label}
              onClick={cbs[action.cb]}
              className="group flex min-h-12 items-center gap-2.5 rounded-2xl border border-border bg-card px-3 py-3 text-left transition-all hover:bg-muted/50 hover:shadow-card"
            >
              <div
                className={`grid shrink-0 size-7 place-content-center rounded-md text-white [&_svg]:size-3.5 ${action.iconClass}`}
              >
                <Icon />
              </div>
              <span className="flex-1 text-xs font-medium text-foreground">{action.label}</span>
              <ArrowRight className="size-3 text-muted-foreground opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5" />
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
});
