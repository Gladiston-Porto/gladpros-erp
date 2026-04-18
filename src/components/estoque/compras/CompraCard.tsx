/**
 * CompraCard Component
 * Card para exibir compra na listagem
 */

'use client';

import Link from 'next/link';
import { Badge } from "@gladpros/ui/badge";
import { Card, CardContent, CardHeader } from "@gladpros/ui/card";
import { ShoppingCart, Package, CheckCircle2, XCircle } from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/estoque/utils/formatters';

type CompraCardProps = {
  compra: {
    id: number;
    numeroNf?: string | null;
    status: string;
    tipo: string;
    dataCompra: Date;
    valorTotal: number;
    fornecedor?: { nome: string } | null;
    projeto?: { numeroProjeto: string } | null;
    _count?: { itens: number };
  };
};

const STATUS_CONFIG = {
  PENDENTE: { icon: ShoppingCart, label: 'Pendente', variant: 'secondary' as const },
  PARCIAL: { icon: Package, label: 'Parcial', variant: 'default' as const },
  RECEBIDA: { icon: CheckCircle2, label: 'Recebida', variant: 'outline' as const },
  CANCELADA: { icon: XCircle, label: 'Cancelada', variant: 'destructive' as const },
};

const TIPO_LABELS = {
  MATERIAL: 'Material',
  EQUIPAMENTO: 'Equipamento',
  AMBOS: 'Material + Equipamento',
};

export function CompraCard({ compra }: CompraCardProps) {
  const statusConfig = STATUS_CONFIG[compra.status as keyof typeof STATUS_CONFIG];
  const Icon = statusConfig.icon;

  return (
    <Link href={`/estoque/compras/${compra.id}`}>
      <Card className="transition-all hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className={`rounded-lg bg-blue-50 p-2`}>
                <Icon className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold">
                  {compra.numeroNf ? `NF: ${compra.numeroNf}` : `Compra #${compra.id}`}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {formatDate(compra.dataCompra)}
                </p>
              </div>
            </div>
            <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-2 text-sm">
          {compra.fornecedor && (
            <div>
              <span className="text-muted-foreground">Fornecedor:</span>
              <p className="font-medium">{compra.fornecedor.nome}</p>
            </div>
          )}

          <div>
            <span className="text-muted-foreground">Tipo:</span>
            <p className="font-medium">{TIPO_LABELS[compra.tipo as keyof typeof TIPO_LABELS]}</p>
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-muted-foreground">Valor Total:</span>
            <span className="font-bold text-lg">{formatCurrency(Number(compra.valorTotal))}</span>
          </div>

          {(compra._count?.itens ?? 0) > 0 && (
            <div className="text-xs text-muted-foreground">
              {compra._count?.itens} {compra._count?.itens === 1 ? 'item' : 'itens'}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
