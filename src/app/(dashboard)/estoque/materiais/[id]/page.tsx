/**
 * Página de Detalhes do Material
 * /estoque/materiais/[id]
 * Design System v2.0 - Semana 2
 */

import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { ModulePageHeader } from '@gladpros/ui/module-page-header';
import Link from 'next/link';
import { ChevronLeft, Edit, Package } from 'lucide-react';
import { Button } from "@gladpros/ui/button";
import { Badge } from "@gladpros/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@gladpros/ui/card";
import { formatCurrency, formatDate, formatQuantity } from '@/lib/estoque/utils/formatters';
import { MaterialEmbalagemTab } from '@/components/estoque/materiais/MaterialEmbalagemTab';
import { DynamicBar } from '@/components/ui/dynamic-bar';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function MaterialDetalhesPage({ params }: PageProps) {
  const { id } = await params;
  const materialId = parseInt(id);

  if (isNaN(materialId)) {
    notFound();
  }

  // Buscar material e saldos em paralelo
  const [material, saldos] = await Promise.all([
    prisma.material.findUnique({
      where: { id: materialId },
      include: { categoria: true, unidade: true }
    }),
    prisma.materialSaldo.findMany({ where: { materialId } })
  ]);

  if (!material) {
    notFound();
  }

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
      <ModulePageHeader
        title={`${material.codigo} - ${material.nome}`}
        description={material.categoria?.nome || 'Material'}
        icon={<Package />}
        accentColor="#0098DA"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Estoque', href: '/estoque' },
          { label: 'Materiais', href: '/estoque/materiais' },
          { label: material.nome },
        ]}
        badges={
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant={material.ativo ? 'default' : 'secondary'}>{material.ativo ? 'Ativo' : 'Inativo'}</Badge>
            {abaixoMinimo && <Badge variant="destructive">Estoque Baixo</Badge>}
            {abaixoPontoReposicao && <Badge variant="outline">Ponto de Reposição</Badge>}
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link href="/estoque/materiais">
              <Button variant="outline" size="sm">
                <ChevronLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
            </Link>
            <Link href={`/estoque/materiais/${material.id}/editar`}>
              <Button size="sm">
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </Button>
            </Link>
          </div>
        }
      />

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
                <DynamicBar
                  value={Math.min((saldoTotal / pontoRep) * 100, 100)}
                  className={`h-full transition-all ${abaixoMinimo
                    ? 'bg-destructive'
                    : abaixoPontoReposicao
                      ? 'bg-yellow-500'
                      : 'bg-primary'
                    }`}
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

      {/* Embalagens UPC/EAN */}
      <Card>
        <CardHeader>
          <CardTitle>Embalagens de Compra (UPC/EAN)</CardTitle>
        </CardHeader>
        <CardContent>
          <MaterialEmbalagemTab
            materialId={material.id}
            materialNome={material.nome}
            unidadeBase={material.unidade.codigo}
          />
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
