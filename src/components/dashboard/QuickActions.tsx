import { memo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@gladpros/ui/card";
import { Plus, Users, FileText, Settings, ArrowRight } from "lucide-react";

interface QuickActionsProps {
  onNewProposal?: () => void;
  onNewClient?:   () => void;
  onViewReports?: () => void;
  onSettings?:    () => void;
}

// Classes Tailwind estáticas por ação — necessário para purge correto
const ACTIONS = [
  {
    key: "proposal", label: "Nova Proposta", icon: Plus,
    iconClass: "bg-[#0098DA]",
    cb: "onNewProposal" as const,
  },
  {
    key: "client", label: "Novo Cliente", icon: Users,
    iconClass: "bg-[#FF8C00]",
    cb: "onNewClient" as const,
  },
  {
    key: "reports", label: "Relatórios", icon: FileText,
    iconClass: "bg-emerald-500",
    cb: "onViewReports" as const,
  },
  {
    key: "settings", label: "Configurações", icon: Settings,
    iconClass: "bg-violet-600",
    cb: "onSettings" as const,
  },
];

export const QuickActions = memo(function QuickActions(props: QuickActionsProps) {
  const cbs = {
    onNewProposal: useCallback(() => props.onNewProposal?.(), [props.onNewProposal]),
    onNewClient:   useCallback(() => props.onNewClient?.(),   [props.onNewClient]),
    onViewReports: useCallback(() => props.onViewReports?.(), [props.onViewReports]),
    onSettings:    useCallback(() => props.onSettings?.(),    [props.onSettings]),
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Ações Rápidas</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2">
        {ACTIONS.map(action => {
          const Icon = action.icon;
          return (
            <button
              key={action.key}
              type="button"
              onClick={cbs[action.cb]}
              className="group flex items-center gap-2.5 rounded-2xl border border-border bg-card px-3 py-2.5 text-left transition-all hover:bg-muted/50 hover:shadow-card"
            >
              <div className={`grid shrink-0 size-7 place-content-center rounded-md text-white [&_svg]:size-3.5 ${action.iconClass}`}>
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
