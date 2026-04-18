/**
 * AlertaCard Component
 * Card para exibir alerta na listagem
 */

'use client';

import Link from 'next/link';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import {
  AlertTriangle,
  XCircle,
  Clock,
  Calendar,
  Wrench,
  TrendingDown,
  Package,
  CheckCircle2,
} from 'lucide-react';
import { formatDate } from '@gladpros/estoque/lib/utils/formatters';

type AlertaCardProps = {
  alerta: any;
  onResolverClick?: (id: bigint) => void;
};

const TIPO_CONFIG = {
  ESTOQUE_MINIMO: { icon: TrendingDown, label: 'Estoque MÃ­nimo', color: 'text-orange-600' },
  ESTOQUE_ZERO: { icon: XCircle, label: 'Estoque Zero', color: 'text-red-600' },
  VALIDADE_PROXIMA: { icon: Clock, label: 'Validade PrÃ³xima', color: 'text-yellow-600' },
  VALIDADE_VENCIDA: { icon: Calendar, label: 'Validade Vencida', color: 'text-red-600' },
  CALIBRACAO_PROXIMA: { icon: Wrench, label: 'CalibraÃ§Ã£o PrÃ³xima', color: 'text-yellow-600' },
  CALIBRACAO_VENCIDA: { icon: Wrench, label: 'CalibraÃ§Ã£o Vencida', color: 'text-red-600' },
  MANUTENCAO_PROXIMA: { icon: Wrench, label: 'ManutenÃ§Ã£o PrÃ³xima', color: 'text-yellow-600' },
  MANUTENCAO_VENCIDA: { icon: Wrench, label: 'ManutenÃ§Ã£o Vencida', color: 'text-red-600' },
  EQUIPAMENTO_NAO_DEVOLVIDO: { icon: AlertTriangle, label: 'NÃ£o Devolvido', color: 'text-red-600' },
  EQUIPAMENTO_DANIFICADO: { icon: XCircle, label: 'Equipamento Danificado', color: 'text-red-600' },
};

const PRIORIDADE_CONFIG = {
  BAIXA: { variant: 'outline' as const, label: 'Baixa' },
  MEDIA: { variant: 'secondary' as const, label: 'MÃ©dia' },
  ALTA: { variant: 'default' as const, label: 'Alta' },
  CRITICA: { variant: 'destructive' as const, label: 'CrÃ­tica' },
};

export function AlertaCard({ alerta, onResolverClick }: AlertaCardProps) {
  const config = TIPO_CONFIG[alerta.tipo as keyof typeof TIPO_CONFIG];
  const prioridadeConfig = PRIORIDADE_CONFIG[alerta.prioridade as keyof typeof PRIORIDADE_CONFIG];
  const Icon = config.icon;

  const isResolvido = !!alerta.dataResolvido;

  return (
    <Card className={`transition-all hover:shadow-md ${isResolvido ? 'opacity-60' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className={`rounded-lg ${isResolvido ? 'bg-gray-50' : 'bg-red-50'} p-2`}>
              <Icon className={`h-5 w-5 ${isResolvido ? 'text-gray-500' : config.color}`} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-sm">{alerta.titulo}</h3>
              <p className="text-xs text-muted-foreground">{config.label}</p>
            </div>
          </div>
          <Badge variant={prioridadeConfig.variant}>
            {prioridadeConfig.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 text-sm">
        <p className="text-muted-foreground">{alerta.mensagem}</p>

        {alerta.material && (
          <div>
            <span className="text-xs text-muted-foreground">Material:</span>
            <p className="font-medium text-sm">{alerta.material.nome}</p>
          </div>
        )}

        {alerta.equipamento && (
          <div>
            <span className="text-xs text-muted-foreground">Equipamento:</span>
            <p className="font-medium text-sm">{alerta.equipamento.nome}</p>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-xs text-muted-foreground">
            {formatDate(alerta.dataAlerta)}
          </span>

          {isResolvido ? (
            <div className="flex items-center gap-1 text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-xs">Resolvido</span>
            </div>
          ) : (
            <div className="flex gap-2">
              {onResolverClick && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.preventDefault();
                    onResolverClick(alerta.id);
                  }}
                >
                  Resolver
                </Button>
              )}
              <Link href={`/estoque/alertas/${alerta.id}`}>
                <Button size="sm" variant="ghost">
                  Ver
                </Button>
              </Link>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

