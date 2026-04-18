'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { Button } from "@gladpros/ui/button"
import { Card, CardContent } from "@gladpros/ui/card";

import { X, Bell, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { useAccessibility } from '@/hooks/useAccessibility';

interface Alert {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  read?: boolean;
}

export function AlertSystem() {
  const { isConnected, on, off } = useWebSocket();
  const { announce } = useAccessibility();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [showPanel, setShowPanel] = useState(false);

  // Listen for real-time alerts
  useEffect(() => {
    if (!isConnected) return;

    const handleNewAlert = (...args: Record<string, unknown>[]) => {
      const alertData = args[0] as Omit<Alert, 'id' | 'timestamp' | 'read'>;
      
      if (!alertData || typeof alertData !== 'object') return;
      if (!alertData.title || !alertData.message || !alertData.type) return;

      const newAlert: Alert = {
        ...alertData,
        id: `alert-${Date.now()}-${Math.random()}`,
        timestamp: new Date(),
        read: false,
      };

      setAlerts(prev => [newAlert, ...prev]);

      // Announce to screen readers
      announce(`${alertData.title}: ${alertData.message}`);

      // Auto-show panel for important alerts
      if (alertData.type === 'error' || alertData.type === 'warning') {
        setShowPanel(true);
      }
    };

    on('alert', handleNewAlert);
    on('notification', handleNewAlert);

    return () => {
      off('alert', handleNewAlert);
      off('notification', handleNewAlert);
    };
  }, [isConnected, on, off, announce]);

  const markAsRead = useCallback((alertId: string) => {
    setAlerts(prev =>
      prev.map(alert =>
        alert.id === alertId ? { ...alert, read: true } : alert
      )
    );
  }, []);

  const removeAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  }, []);

  const clearAllAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  const unreadCount = alerts.filter(alert => !alert.read).length;

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  return (
    <>
      {/* Alert Button */}
      <Button
        variant="outline"
        size="sm"
        className="fixed top-4 right-4 z-40"
        onClick={() => setShowPanel(!showPanel)}
        aria-label={`Alertas ${unreadCount > 0 ? `(${unreadCount} não lidos)` : ''}`}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </Button>

      {/* Alert Panel */}
      {showPanel && (
        <Card className="fixed top-16 right-4 z-40 w-80 max-h-96 overflow-y-auto">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Alertas</h3>
              <div className="flex space-x-2">
                {alerts.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllAlerts}
                    aria-label="Limpar todos os alertas"
                  >
                    Limpar
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPanel(false)}
                  aria-label="Fechar painel de alertas"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum alerta
              </p>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-lg border ${
                      alert.read ? 'bg-muted/50' : 'bg-background'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      {getAlertIcon(alert.type)}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium">{alert.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {alert.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {alert.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAlert(alert.id)}
                        aria-label="Remover alerta"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    {!alert.read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 text-xs"
                        onClick={() => markAsRead(alert.id)}
                      >
                        Marcar como lido
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}
