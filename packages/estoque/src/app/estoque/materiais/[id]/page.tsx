/**
 * Página de Detalhes do Material
 * /estoque/materiais/[id]
 */

import { prisma } from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Edit } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { formatCurrency, formatDate, formatQuantity } from '@/lib/estoque/utils/formatters';

type PageProps = {
  params: { id: string };
};

export default async function MaterialDetalhesPage({ params }: PageProps) {
  const materialId = parseInt(params.id);

  if (isNaN(materialId)) {
    notFound();
  }

  // Buscar material com informações relacionadas
  const material = await prisma.material.findUnique({
    where: { id: materialId },
    include: {
      categoria: true,
      unidade: true,
    },
  });

  if (!material) {
    notFound();
  }

  // Calcular saldo total consultando MaterialSaldo
  const saldos = await prisma.materialSaldo.findMany({
    where: { materialId },
  });

  const saldoTotal = saldos.reduce(
    (acc: number, s) => acc + Number(s.quantidade),
    0
  );

  const estoqueMin = Number(material.estoqueMinimo);
  const pontoRep = Number(material.pontoReposicao);
  const abaixoMinimo = saldoTotal < estoqueMin;
  const abaixoPontoReposicao = saldoTotal < pontoRep && saldoTotal >= estoqueMin;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/estoque/materiais">
            <Button variant="ghost" size="icon">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">
                {material.codigo}
              </h1>
              <Badge variant={material.ativo ? 'default' : 'secondary'}>
                {material.ativo ? 'Ativo' : 'Inativo'}
              </Badge>
              {abaixoMinimo && (
                <Badge variant="destructive">Estoque Baixo</Badge>
              )}
              {abaixoPontoReposicao && (
                <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                  Ponto de Reposição
                </Badge>
              )}
            </div>
            <p className="text-xl text-muted-foreground">{material.nome}</p>
          </div>
        </div>
        <Link href={`/estoque/materiais/${material.id}/editar`}>
          <Button>
            <Edit className="mr-2 h-4 w-4" />
            Editar
          </Button>
        </Link>
      </div>

      {/* Cards de Informações */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Informações Básicas */}
        <Card>
          <CardHeader>
            <CardTitle>Informações Básicas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Categoria:</span>
              <p className="font-medium">{material.categoria?.nome || '-'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Unidade:</span>
              <p className="font-medium">{material.unidade.codigo} - {material.unidade.nome}</p>
            </div>
            {material.fabricante && (
              <div>
                <span className="text-muted-foreground">Fabricante:</span>
                <p className="font-medium">{material.fabricante}</p>
              </div>
            )}
            {material.modelo && (
              <div>
                <span className="text-muted-foreground">Modelo:</span>
                <p className="font-medium">{material.modelo}</p>
              </div>
            )}
            {material.ncm && (
              <div>
                <span className="text-muted-foreground">NCM:</span>
                <p className="font-medium">{material.ncm}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Estoque */}
        <Card>
          <CardHeader>
            <CardTitle>Estoque</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Saldo Total:</span>
              <p className="text-2xl font-bold">
                {formatQuantity(saldoTotal, material.unidade.codigo)}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Estoque Mínimo:</span>
              <p className="font-medium">
                {formatQuantity(estoqueMin, material.unidade.codigo)}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Ponto de Reposição:</span>
              <p className="font-medium">
                {formatQuantity(pontoRep, material.unidade.codigo)}
              </p>
            </div>
            <div className="pt-2">
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full transition-all ${
                    abaixoMinimo
                      ? 'bg-destructive'
                      : abaixoPontoReposicao
                      ? 'bg-yellow-500'
                      : 'bg-primary'
                  }`}
                  style={{
                    width: `${Math.min((saldoTotal / pontoRep) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Custo */}
        <Card>
          <CardHeader>
            <CardTitle>Custo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {material.ultimoCusto && (
              <div>
                <span className="text-muted-foreground">Último Custo:</span>
                <p className="text-xl font-bold">
                  {formatCurrency(Number(material.ultimoCusto))}
                </p>
              </div>
            )}
            {material.custoMedio && (
              <div>
                <span className="text-muted-foreground">Custo Médio:</span>
                <p className="font-medium">
                  {formatCurrency(Number(material.custoMedio))}
                </p>
              </div>
            )}
            {material.ultimaCompraEm && (
              <div>
                <span className="text-muted-foreground">Última Compra:</span>
                <p className="font-medium">
                  {formatDate(material.ultimaCompraEm)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Descrição */}
      {material.descricao && (
        <Card>
          <CardHeader>
            <CardTitle>Descrição</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {material.descricao}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Detalhes Técnicos */}
      {(material.pesoUnitario || material.dimensoes) && (
        <Card>
          <CardHeader>
            <CardTitle>Detalhes Técnicos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {material.pesoUnitario && (
              <div>
                <span className="text-muted-foreground">Peso Unitário:</span>
                <p className="font-medium">{Number(material.pesoUnitario)} kg</p>
              </div>
            )}
            {material.dimensoes && (
              <div>
                <span className="text-muted-foreground">Dimensões:</span>
                <p className="font-medium">{material.dimensoes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Controles */}
      <Card>
        <CardHeader>
          <CardTitle>Controles</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <span className="text-sm text-muted-foreground">Rastreio de Lote:</span>
            <p className="font-medium">{material.rastreioLote ? 'Sim' : 'Não'}</p>
          </div>
          <div>
            <span className="text-sm text-muted-foreground">Possui Validade:</span>
            <p className="font-medium">{material.possuiValidade ? 'Sim' : 'Não'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Auditoria */}
      <Card>
        <CardHeader>
          <CardTitle>Auditoria</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <span className="text-muted-foreground">Criado em:</span>
            <p className="font-medium">{formatDate(material.criadoEm)}</p>
          </div>
          {material.atualizadoEm && (
            <div>
              <span className="text-muted-foreground">Atualizado em:</span>
              <p className="font-medium">{formatDate(material.atualizadoEm)}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
