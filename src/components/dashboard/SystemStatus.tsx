import { memo, useMemo } from "react";
import { Badge } from "@gladpros/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@gladpros/ui/card";

import { CheckCircle, AlertCircle, XCircle } from "lucide-react";

interface SystemStatusProps {
  database: 'online' | 'offline' | 'warning';
  api: 'online' | 'offline' | 'warning';
  lastBackup: string;
  uptime: string;
}

// Componente memoizado para status do sistema
export const SystemStatus = memo(function SystemStatus({
  database,
  api,
  lastBackup,
  uptime
}: SystemStatusProps) {
  // Memoizar funções de renderização para evitar recriação
  const getStatusIcon = useMemo(() => {
    const StatusIconComponent = (status: 'online' | 'offline' | 'warning') => {
      switch (status) {
        case 'online':
          return <CheckCircle className="h-4 w-4 text-green-500" />;
        case 'warning':
          return <AlertCircle className="h-4 w-4 text-yellow-500" />;
        case 'offline':
          return <XCircle className="h-4 w-4 text-red-500" />;
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
          return <Badge variant="outline" className="bg-green-50 text-green-700">Online</Badge>;
        case 'warning':
          return <Badge variant="outline" className="bg-yellow-50 text-yellow-700">Aviso</Badge>;
        case 'offline':
          return <Badge variant="outline" className="bg-red-50 text-red-700">Offline</Badge>;
        default:
          return <Badge variant="outline">Desconhecido</Badge>;
      }
    };
    StatusBadgeComponent.displayName = 'StatusBadgeComponent';
    return StatusBadgeComponent;
  }, []);

  // Memoizar dados de status para evitar re-renders
  const statusData = useMemo(() => ({
    database,
    api,
    lastBackup,
    uptime
  }), [database, api, lastBackup, uptime]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Status do Sistema</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {getStatusIcon(statusData.database)}
              <span>Database</span>
            </div>
            {getStatusBadge(statusData.database)}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {getStatusIcon(statusData.api)}
              <span>API</span>
            </div>
            {getStatusBadge(statusData.api)}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Último Backup</span>
            <span className="text-sm">{statusData.lastBackup}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Uptime</span>
            <span className="text-sm">{statusData.uptime}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

SystemStatus.displayName = 'SystemStatus';
