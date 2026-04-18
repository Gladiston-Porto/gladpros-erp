/**
 * MovimentacaoCard Component
 * Card para exibir movimentaÃ§Ã£o na listagem
 */

'use client';

import Link from 'next/link';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowLeftRight,
  Plus,
  Minus,
  Lock,
  XCircle,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';
import { formatDate, formatQuantity } from '@gladpros/estoque/lib/utils/formatters';

type MovimentacaoCardProps = {
  movimentacao: any; // Simplified type
};

const TIPO_CONFIG = {
  ENTRADA: { icon: ArrowDownCircle, color: 'text-green-600', bg: 'bg-green-50', label: 'Entrada' },
  SAIDA: { icon: ArrowUpCircle, color: 'text-red-600', bg: 'bg-red-50', label: 'SaÃ­da' },
  TRANSFERENCIA: { icon: ArrowLeftRight, color: 'text-blue-600', bg: 'bg-blue-50', label: 'TransferÃªncia' },
  AJUSTE_POSITIVO: { icon: Plus, color: 'text-green-600', bg: 'bg-green-50', label: 'Ajuste +' },
  AJUSTE_NEGATIVO: { icon: Minus, color: 'text-red-600', bg: 'bg-red-50', label: 'Ajuste -' },
  RESERVA: { icon: Lock, color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Reserva' },
  CANCELAMENTO_RESERVA: { icon: XCircle, color: 'text-gray-600', bg: 'bg-gray-50', label: 'Cancel. Reserva' },
  DEVOLUCAO: { icon: RotateCcw, color: 'text-blue-600', bg: 'bg-blue-50', label: 'DevoluÃ§Ã£o' },
  PERDA: { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50', label: 'Perda' },
};

export function MovimentacaoCard({ movimentacao }: MovimentacaoCardProps) {
  const config = TIPO_CONFIG[movimentacao.tipo as keyof typeof TIPO_CONFIG];
  const Icon = config.icon;

  return (
    <Link href={`/estoque/movimentacoes/${movimentacao.id}`}>
      <Card className="transition-all hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className={`rounded-lg ${config.bg} p-2`}>
                <Icon className={`h-5 w-5 ${config.color}`} />
              </div>
              <div>
                <h3 className="font-semibold">{config.label}</h3>
                <p className="text-xs text-muted-foreground">
                  {formatDate(movimentacao.dataMovimentacao)}
                </p>
              </div>
            </div>
            <Badge variant="outline">
              {Number(movimentacao.quantidade).toFixed(2)}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-2 text-sm">
          {movimentacao.material && (
            <div>
              <span className="text-muted-foreground">Material:</span>
              <p className="font-medium">{movimentacao.material.nome}</p>
            </div>
          )}
          
          {movimentacao.equipamento && (
            <div>
              <span className="text-muted-foreground">Equipamento:</span>
              <p className="font-medium">{movimentacao.equipamento.nome}</p>
            </div>
          )}

          {movimentacao.projeto && (
            <div>
              <span className="text-muted-foreground">Projeto:</span>
              <p className="font-medium text-xs">{movimentacao.projeto.numeroProjeto}</p>
            </div>
          )}

          {movimentacao.usuario && (
            <div className="text-xs text-muted-foreground">
              por {movimentacao.usuario.nomeCompleto}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

