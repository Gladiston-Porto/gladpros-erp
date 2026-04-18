/**
 * EquipamentoCard Component
 * Card visual para exibir equipamento na listagem
 */

'use client';

import Link from 'next/link';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import {
  Wrench,
  Zap,
  Ruler,
  Shield,
  Hammer,
  Truck,
  Package,
  MapPin,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import type { Equipamento } from '@gladpros/estoque/lib/types';

type EquipamentoCardProps = {
  equipamento: Equipamento & {
    categoria?: { id: number; nome: string } | null;
    diasParaCalibracao?: number | null;
    diasParaManutencao?: number | null;
  };
};

// Mapa de Ã­cones por tipo
const TIPO_ICONS: Record<string, any> = {
  FERRAMENTA_MANUAL: Wrench,
  FERRAMENTA_ELETRICA: Zap,
  EQUIPAMENTO_MEDICAO: Ruler,
  EQUIPAMENTO_SEGURANCA: Shield,
  ANDAIME: Package,
  ESCADA: Package,
  VEICULO: Truck,
  OUTRO: Package,
};

// Mapa de cores por status
const STATUS_VARIANTS = {
  DISPONIVEL: 'default' as const,
  EM_USO: 'secondary' as const,
  EM_MANUTENCAO: 'outline' as const,
  CALIBRACAO: 'outline' as const,
  PERDIDO: 'destructive' as const,
  DANIFICADO: 'destructive' as const,
  DESCARTADO: 'secondary' as const,
};

const STATUS_LABELS = {
  DISPONIVEL: 'DisponÃ­vel',
  EM_USO: 'Em Uso',
  EM_MANUTENCAO: 'ManutenÃ§Ã£o',
  CALIBRACAO: 'CalibraÃ§Ã£o',
  PERDIDO: 'Perdido',
  DANIFICADO: 'Danificado',
  DESCARTADO: 'Descartado',
};

export function EquipamentoCard({ equipamento }: EquipamentoCardProps) {
  const IconComponent = TIPO_ICONS[equipamento.tipo] || Package;
  const statusVariant = STATUS_VARIANTS[equipamento.status];
  const statusLabel = STATUS_LABELS[equipamento.status];

  // Verificar alertas
  const calibracaoVencida =
    equipamento.requerCalibracao &&
    equipamento.diasParaCalibracao != null &&
    equipamento.diasParaCalibracao < 0;

  const calibracaoProxima =
    equipamento.requerCalibracao &&
    equipamento.diasParaCalibracao != null &&
    equipamento.diasParaCalibracao >= 0 &&
    equipamento.diasParaCalibracao <= 7;

  const manutencaoVencida =
    equipamento.requerManutencaoPeriodica &&
    equipamento.diasParaManutencao != null &&
    equipamento.diasParaManutencao < 0;

  const manutencaoProxima =
    equipamento.requerManutencaoPeriodica &&
    equipamento.diasParaManutencao != null &&
    equipamento.diasParaManutencao >= 0 &&
    equipamento.diasParaManutencao <= 7;

  return (
    <Link href={`/estoque/equipamentos/${equipamento.id}`}>
      <Card className="transition-all hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-primary/10 p-2">
                <IconComponent className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">{equipamento.codigo}</h3>
                <p className="text-sm text-muted-foreground">
                  {equipamento.nome}
                </p>
              </div>
            </div>
            <Badge variant={statusVariant}>{statusLabel}</Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 text-sm">
          {/* Tipo e Categoria */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">Tipo:</span>
              <p className="font-medium">
                {equipamento.tipo.replace(/_/g, ' ')}
              </p>
            </div>
            {equipamento.categoria && (
              <div>
                <span className="text-muted-foreground">Categoria:</span>
                <p className="font-medium">{equipamento.categoria.nome}</p>
              </div>
            )}
          </div>

          {/* Fabricante e Modelo */}
          {(equipamento.marca || equipamento.modelo) && (
            <div className="text-xs text-muted-foreground">
              {equipamento.marca && <span>{equipamento.marca}</span>}
              {equipamento.marca && equipamento.modelo && <span> â€¢ </span>}
              {equipamento.modelo && <span>{equipamento.modelo}</span>}
            </div>
          )}

          {/* NÃºmero de SÃ©rie */}
          {equipamento.numeroSerie && (
            <div className="text-xs">
              <span className="text-muted-foreground">S/N:</span>{' '}
              <span className="font-mono">{equipamento.numeroSerie}</span>
            </div>
          )}

          {/* LocalizaÃ§Ã£o Atual */}
          {equipamento.localizacaoAtual && (
            <div className="flex items-center gap-1 text-xs">
              <MapPin className="h-3 w-3 text-muted-foreground" />
              <span className="font-medium">
                {equipamento.localizacaoAtual}
              </span>
            </div>
          )}

          {/* Alertas de CalibraÃ§Ã£o */}
          {calibracaoVencida && (
            <div className="flex items-center gap-1 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
              <AlertTriangle className="h-3 w-3" />
              <span>CalibraÃ§Ã£o vencida hÃ¡ {Math.abs(equipamento.diasParaCalibracao!)} dias</span>
            </div>
          )}

          {calibracaoProxima && (
            <div className="flex items-center gap-1 rounded-md bg-yellow-500/10 p-2 text-xs text-yellow-600">
              <Calendar className="h-3 w-3" />
              <span>CalibraÃ§Ã£o em {equipamento.diasParaCalibracao} dias</span>
            </div>
          )}

          {/* Alertas de ManutenÃ§Ã£o */}
          {manutencaoVencida && (
            <div className="flex items-center gap-1 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
              <AlertTriangle className="h-3 w-3" />
              <span>ManutenÃ§Ã£o vencida hÃ¡ {Math.abs(equipamento.diasParaManutencao!)} dias</span>
            </div>
          )}

          {manutencaoProxima && (
            <div className="flex items-center gap-1 rounded-md bg-yellow-500/10 p-2 text-xs text-yellow-600">
              <Calendar className="h-3 w-3" />
              <span>ManutenÃ§Ã£o em {equipamento.diasParaManutencao} dias</span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

