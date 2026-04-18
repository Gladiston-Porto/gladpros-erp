/**
 * Material Card Component
 * Card para exibir material na listagem
 */

'use client';

import Link from 'next/link';
import { Badge } from "@gladpros/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@gladpros/ui/card";
import { Package, AlertTriangle, TrendingDown } from 'lucide-react';
import { formatCurrency, formatQuantity } from '@/lib/estoque/utils/formatters';
import { cn } from '@/shared/lib/utils';
import type { Material } from '@/lib/estoque/types';

type MaterialCardProps = {
  material: Material & {
    categoria?: { id: number; nome: string } | null;
    unidade?: { id: number; nome: string; codigo: string } | null;
    saldoTotal?: number;
    abaixoMinimo?: boolean;
  };
};

export function MaterialCard({ material }: MaterialCardProps) {
  const saldo = material.saldoTotal || 0;
  const estoqueMin = Number(material.estoqueMinimo);
  const pontoRep = Number(material.pontoReposicao);
  const abaixoMinimo = saldo < estoqueMin;
  const abaixoPontoReposicao = saldo < pontoRep && saldo >= estoqueMin;

  return (
    <Link href={`/estoque/materiais/${material.id}`}>
      <Card
        className={cn(
          'transition-all hover:shadow-lg cursor-pointer',
          abaixoMinimo && 'border-destructive'
        )}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="rounded-md bg-primary/10 p-2">
                <Package className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base truncate">
                  {material.nome}
                </CardTitle>
                <CardDescription className="text-xs">
                  {material.codigo}
                </CardDescription>
              </div>
            </div>

            <Badge variant={material.ativo ? 'default' : 'secondary'} className="shrink-0">
              {material.ativo ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Informações Básicas */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Categoria:</span>
              <p className="font-medium truncate">
                {material.categoria?.nome || '-'}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Unidade:</span>
              <p className="font-medium">
                {material.unidade?.codigo || '-'}
              </p>
            </div>
          </div>

          {/* Saldo */}
          <div className="rounded-lg border bg-muted/50 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Saldo Atual</p>
                <p className="text-lg font-bold">
                  {formatQuantity(saldo, material.unidade?.codigo || '')}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Mínimo</p>
                <p className="text-sm font-medium">
                  {formatQuantity(
                    estoqueMin,
                    material.unidade?.codigo || ''
                  )}
                </p>
              </div>
            </div>

            {/* Barra de progresso */}
            <div className="mt-2 h-2 w-full rounded-full bg-muted">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  abaixoMinimo
                    ? 'bg-destructive'
                    : abaixoPontoReposicao
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
                )}
                style={{
                  width: `${Math.min(
                    (saldo / pontoRep) * 100,
                    100
                  )}%`,
                }}
              />
            </div>
          </div>

          {/* Custo */}
          {material.ultimoCusto && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Último Custo:</span>
              <span className="font-semibold">
                {formatCurrency(Number(material.ultimoCusto))}
              </span>
            </div>
          )}

          {/* Alertas */}
          {abaixoMinimo && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span className="font-medium">Estoque abaixo do mínimo</span>
            </div>
          )}

          {abaixoPontoReposicao && !abaixoMinimo && (
            <div className="flex items-center gap-2 rounded-md bg-yellow-500/10 p-2 text-xs text-yellow-700 dark:text-yellow-500">
              <TrendingDown className="h-4 w-4 shrink-0" />
              <span className="font-medium">Atingiu ponto de reposição</span>
            </div>
          )}

          {/* Fabricante/Modelo */}
          {(material.fabricante || material.modelo) && (
            <div className="text-xs text-muted-foreground">
              {material.fabricante && <span>Fabricante: {material.fabricante}</span>}
              {material.fabricante && material.modelo && <span> • </span>}
              {material.modelo && <span>Modelo: {material.modelo}</span>}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
