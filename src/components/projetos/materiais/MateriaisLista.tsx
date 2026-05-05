/**
 * MateriaisLista - Gestão de materiais do projeto
 * 
 * Lista materiais com:
 * - Status e quantidades (planejada, liberada, utilizada, devolvida)
 * - Badges de status coloridos
 * - Integração com estoque
 * - Ações de liberação e devolução
 */

'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, Box, CheckCircle2, Clock, Package, Plus, TrendingDown, TrendingUp } from 'lucide-react';
import { Badge, badgeVariants } from "@gladpros/ui/badge";
import type { VariantProps } from "class-variance-authority";
import { Button } from '@gladpros/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from "@gladpros/ui/card";
import { Loading } from "@gladpros/ui/loading";

type MaterialStatus = 'planejado' | 'liberado' | 'em_uso' | 'devolucao_pendente' | 'triagem_pendente' | 'finalizado';

type Material = {
  id: number;
  projetoId: number;
  codigo?: string | null;
  nome: string;
  unidade?: string | null;
  quantidadePlanejada: number;
  quantidadeLiberada: number;
  quantidadeUtilizada: number;
  quantidadeDevolvida: number;
  status: MaterialStatus;
  centroCustoId?: number | null;
  repassarCustoCliente: boolean;
  criadoEm: Date;
  atualizadoEm?: Date | null;
};

type Props = {
  projetoId: number;
};

const STATUS_CONFIG: Record<MaterialStatus, { label: string; variant: VariantProps<typeof badgeVariants>['variant']; icon: React.ReactNode }> = {
  planejado: {
    label: 'Planejado',
    variant: 'secondary',
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  liberado: {
    label: 'Liberado',
    variant: 'info',
    icon: <Package className="h-3.5 w-3.5" />,
  },
  em_uso: {
    label: 'Em Uso',
    variant: 'primary',
    icon: <TrendingUp className="h-3.5 w-3.5" />,
  },
  devolucao_pendente: {
    label: 'Devolução Pendente',
    variant: 'warning',
    icon: <TrendingDown className="h-3.5 w-3.5" />,
  },
  triagem_pendente: {
    label: 'Triagem Pendente',
    variant: 'warning',
    icon: <AlertCircle className="h-3.5 w-3.5" />,
  },
  finalizado: {
    label: 'Finalizado',
    variant: 'success',
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
};

export function MateriaisLista({ projetoId }: Props) {
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMateriais();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projetoId]);

  const loadMateriais = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/projetos/${projetoId}/materiais`);
      if (!response.ok) {
        throw new Error('Erro ao carregar materiais');
      }

      const data = await response.json();
      setMateriais(data.materiais || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar materiais');
    } finally {
      setLoading(false);
    }
  };

  const calcularProgresso = (material: Material) => {
    if (material.quantidadePlanejada === 0) return 0;
    return Math.round((material.quantidadeUtilizada / material.quantidadePlanejada) * 100);
  };

  const calcularSaldo = (material: Material) => {
    return material.quantidadeLiberada - material.quantidadeUtilizada + material.quantidadeDevolvida;
  };

  if (loading) {
    return <Loading text="Carregando materiais..." />;
  }

  if (error) {
    return (
      <Card className="border-destructive/30 bg-destructive/10">
        <CardContent className="py-8">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <p>{error}</p>
          </div>
          <Button variant="outline" className="mt-4" onClick={loadMateriais}>
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (materiais.length === 0) {
    return (
      <Card className="border-none shadow-sm">
        <CardContent className="py-12">
          <div className="flex flex-col items-center gap-4 text-center">
            <Box className="h-12 w-12 text-muted-foreground" />
            <div>
              <h3 className="font-medium text-foreground">Nenhum material cadastrado</h3>
              <p className="text-sm text-muted-foreground">Adicione materiais para este projeto</p>
            </div>
            <Button className="gap-2" aria-label="Adicionar material ao projeto">
              <Plus className="h-4 w-4" />
              Adicionar Material
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calcular totais
  const totais = materiais.reduce(
    (acc, m) => ({
      planejada: acc.planejada + Number(m.quantidadePlanejada),
      liberada: acc.liberada + Number(m.quantidadeLiberada),
      utilizada: acc.utilizada + Number(m.quantidadeUtilizada),
      devolvida: acc.devolvida + Number(m.quantidadeDevolvida),
    }),
    { planejada: 0, liberada: 0, utilizada: 0, devolvida: 0 }
  );

  return (
    <div className="space-y-4">
      {/* Header com stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-none shadow-sm">
          <CardContent className="pt-6">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Total Materiais</p>
              <p className="text-2xl font-bold text-foreground">{materiais.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardContent className="pt-6">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Qtd. Planejada</p>
              <p className="text-2xl font-bold text-brand-primary">{totais.planejada.toFixed(0)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardContent className="pt-6">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Qtd. Utilizada</p>
              <p className="text-2xl font-bold text-green-600">{totais.utilizada.toFixed(0)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardContent className="pt-6">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Qtd. Devolvida</p>
              <p className="text-2xl font-bold text-orange-600">{totais.devolvida.toFixed(0)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de materiais */}
      <Card className="border-none shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Box className="h-5 w-5 text-brand-blue" />
            Materiais do Projeto
          </CardTitle>
          <Button size="sm" className="gap-2" aria-label="Adicionar material ao projeto">
            <Plus className="h-4 w-4" />
            Adicionar
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Material
                  </th>
                  <th className="pb-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Status
                  </th>
                  <th className="pb-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Planejada
                  </th>
                  <th className="pb-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Liberada
                  </th>
                  <th className="pb-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Utilizada
                  </th>
                  <th className="pb-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Devolvida
                  </th>
                  <th className="pb-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Saldo
                  </th>
                  <th className="pb-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Progresso
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {materiais.map((material) => {
                  const statusConfig = STATUS_CONFIG[material.status];
                  const progresso = calcularProgresso(material);
                  const saldo = calcularSaldo(material);

                  return (
                    <tr key={material.id} className="group hover:bg-muted">
                      <td className="py-4">
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">{material.nome}</p>
                          {material.codigo && (
                            <p className="text-xs text-muted-foreground">Cód: {material.codigo}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-4">
                        <Badge variant={statusConfig.variant} className="gap-1">
                          {statusConfig.icon}
                          {statusConfig.label}
                        </Badge>
                      </td>
                      <td className="py-4 text-right">
                        <span className="text-sm text-foreground">
                          {Number(material.quantidadePlanejada).toFixed(2)}
                        </span>
                        {material.unidade && (
                          <span className="ml-1 text-xs text-muted-foreground">{material.unidade}</span>
                        )}
                      </td>
                      <td className="py-4 text-right">
                        <span className="text-sm text-brand-primary">
                          {Number(material.quantidadeLiberada).toFixed(2)}
                        </span>
                        {material.unidade && (
                          <span className="ml-1 text-xs text-muted-foreground">{material.unidade}</span>
                        )}
                      </td>
                      <td className="py-4 text-right">
                        <span className="text-sm text-green-600">
                          {Number(material.quantidadeUtilizada).toFixed(2)}
                        </span>
                        {material.unidade && (
                          <span className="ml-1 text-xs text-muted-foreground">{material.unidade}</span>
                        )}
                      </td>
                      <td className="py-4 text-right">
                        <span className="text-sm text-orange-600">
                          {Number(material.quantidadeDevolvida).toFixed(2)}
                        </span>
                        {material.unidade && (
                          <span className="ml-1 text-xs text-muted-foreground">{material.unidade}</span>
                        )}
                      </td>
                      <td className="py-4 text-right">
                        <span
                          className={`text-sm font-medium ${
                            saldo > 0 ? 'text-green-600' : saldo < 0 ? 'text-destructive' : 'text-muted-foreground'
                          }`}
                        >
                          {saldo.toFixed(2)}
                        </span>
                        {material.unidade && (
                          <span className="ml-1 text-xs text-muted-foreground">{material.unidade}</span>
                        )}
                      </td>
                      <td className="py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="h-2 w-20 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full bg-brand-blue transition-all"
                              style={{ width: `${Math.min(progresso, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-muted-foreground">{progresso}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Legendas */}
      <Card className="border-none bg-muted/40 shadow-sm">
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-full bg-brand-primary" />
              <span>Liberada: Material disponível para uso no projeto</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-full bg-success-400" />
              <span>Utilizada: Material consumido no projeto</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-full bg-orange-500" />
              <span>Devolvida: Material retornado ao estoque</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-full bg-muted0" />
              <span>Saldo: Liberada - Utilizada + Devolvida</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
