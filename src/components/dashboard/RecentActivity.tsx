import { memo, useMemo } from "react";
import { Badge } from "@gladpros/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@gladpros/ui/card";


interface Activity {
  id: string;
  type: 'nova_proposta' | 'aprovacao' | 'cancelamento' | 'novo_cliente';
  description: string;
  timestamp: string;
  user?: string;
}

interface RecentActivityProps {
  activities: Activity[];
}

// Componente memoizado para evitar re-renders desnecessários
const RecentActivityComponent = ({ activities }: RecentActivityProps) => {
  // Memoizar o mapeamento de tipos de atividade para evitar recriação
  const getActivityBadge = useMemo(() => {
    const badgeFunction = (type: Activity['type']) => {
      switch (type) {
        case 'nova_proposta':
          return <Badge variant="outline">Nova Proposta</Badge>;
        case 'aprovacao':
          return <Badge variant="success">Aprovação</Badge>;
        case 'cancelamento':
          return <Badge variant="destructive">Cancelamento</Badge>;
        case 'novo_cliente':
          return <Badge variant="info">Novo Cliente</Badge>;
        default:
          return <Badge variant="outline">Atividade</Badge>;
      }
    };
    badgeFunction.displayName = 'getActivityBadge';
    return badgeFunction;
  }, []);

  // Memoizar atividades ordenadas (mais recentes primeiro)
  const sortedActivities = useMemo(() => {
    return [...activities].sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [activities]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Atividades Recentes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sortedActivities.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma atividade recente</p>
          ) : (
            sortedActivities.slice(0, 5).map((activity) => (
              <div key={activity.id} className="flex items-center space-x-4">
                {getActivityBadge(activity.type)}
                <span className="flex-1">{activity.description}</span>
                <span className="text-sm text-muted-foreground">
                  {new Intl.DateTimeFormat('en-US', {
                    timeZone: 'America/Chicago',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  }).format(new Date(activity.timestamp))}
                </span>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export const RecentActivity = memo(RecentActivityComponent);
RecentActivity.displayName = 'RecentActivity';
