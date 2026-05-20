import { memo, useMemo } from "react";
import { Badge } from "@gladpros/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@gladpros/ui/card";

import { CheckCircle, AlertCircle, XCircle } from "lucide-react";

interface SystemStatusProps {
  database: 'online' | 'offline' | 'warning';
  api: 'online' | 'offline' | 'warning';
}

// Componente memoizado para status do sistema
export const SystemStatus = memo(function SystemStatus({
  database,
  api,
}: SystemStatusProps) {
  // Memoizar funções de renderização para evitar recriação
  const getStatusIcon = useMemo(() => {
    const StatusIconComponent = (status: 'online' | 'offline' | 'warning') => {
      switch (status) {
        case 'online':
          return <CheckCircle className="h-4 w-4 text-green-600" />;
        case 'warning':
          return <AlertCircle className="h-4 w-4 text-yellow-600" />;
        case 'offline':
          return <XCircle className="h-4 w-4 text-destructive" />;
        default:
          return null;
      }
    };
    StatusIconComponent.displayName = 'StatusIconComponent';
    return StatusIconComponent;
  }, []);

  const getStatusBadge = useMemo(() => {
    const StatusBadgeComponent = (status: 'online' | 'offline' | 'warning') => {
      switch (status) {
        case 'online':
          return <Badge variant="success">Online</Badge>;
        case 'warning':
          return <Badge variant="warning">Aviso</Badge>;
        case 'offline':
          return <Badge variant="destructive">Offline</Badge>;
        default:
          return <Badge variant="outline">Desconhecido</Badge>;
      }
    };
    StatusBadgeComponent.displayName = 'StatusBadgeComponent';
    return StatusBadgeComponent;
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Status do Sistema</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {getStatusIcon(database)}
              <span>Database</span>
            </div>
            {getStatusBadge(database)}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {getStatusIcon(api)}
              <span>API</span>
            </div>
            {getStatusBadge(api)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

SystemStatus.displayName = 'SystemStatus';
