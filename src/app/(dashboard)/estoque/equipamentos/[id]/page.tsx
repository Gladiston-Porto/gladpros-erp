/**
 * Equipamento Detalhes - Página
 */

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Pencil, ArrowLeft, Wrench } from 'lucide-react';
import { Badge } from '@gladpros/ui/badge'
import { Button } from '@gladpros/ui/button'
import { ModulePageHeader } from '@gladpros/ui/module-page-header';
import { Card, CardContent, CardHeader, CardTitle } from "@gladpros/ui/card";
import { prisma } from '@/lib/prisma';
import { formatCurrency, formatDate } from '@/lib/estoque/utils/formatters';

type PageProps = {
  params: Promise<{ id: string }>;
};

const STATUS_COLORS = {
  DISPONIVEL: 'default',
  EM_USO: 'secondary',
  EM_MANUTENCAO: 'outline',
  CALIBRACAO: 'outline',
  DANIFICADO: 'destructive',
  PERDIDO: 'destructive',
  DESCARTADO: 'secondary',
} as const;

export default async function EquipamentoDetalhesPage({ params }: PageProps) {
  const { id } = await params;
  const equipamento = await prisma.equipamento.findUnique({
    where: { id: Number(id) },
    include: {
      categoria: true,
      fornecedor: true,
      criador: { select: { nomeCompleto: true } },
      atualizador: { select: { nomeCompleto: true } },
    },
  });

  if (!equipamento) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <ModulePageHeader
        title={equipamento.nome}
        description={`Código: ${equipamento.codigo} • Série: ${equipamento.numeroSerie || 'N/A'}`}
        icon={<Wrench />}
        accentColor="#0098DA"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Estoque', href: '/estoque' },
          { label: 'Equipamentos', href: '/estoque/equipamentos' },
          { label: equipamento.nome },
        ]}
        badges={<Badge variant={STATUS_COLORS[equipamento.status] as "default" | "secondary" | "outline"}>{equipamento.status.replace('_', ' ')}</Badge>}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/estoque/equipamentos">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            </Link>
            <Link href={`/estoque/equipamentos/${equipamento.id}/editar`}>
              <Button size="sm" className="gap-2">
                <Pencil className="h-4 w-4" />
                Editar
              </Button>
            </Link>
          </div>
        }
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Info Básicas */}
        <Card>
          <CardHeader>
            <CardTitle>Informações Básicas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <span className="text-sm text-muted-foreground">Código:</span>
              <p className="font-medium">{equipamento.codigo}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Nome:</span>
              <p className="font-medium">{equipamento.nome}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Tipo:</span>
              <p className="font-medium">
                {equipamento.tipo.replace(/_/g, ' ')}
              </p>
            </div>
            {equipamento.categoria && (
              <div>
                <span className="text-sm text-muted-foreground">Categoria:</span>
                <p className="font-medium">{equipamento.categoria.nome}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Especificações */}
        <Card>
          <CardHeader>
            <CardTitle>Especificações Técnicas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {equipamento.marca && (
              <div>
                <span className="text-sm text-muted-foreground">Marca:</span>
                <p className="font-medium">{equipamento.marca}</p>
              </div>
            )}
            {equipamento.modelo && (
              <div>
                <span className="text-sm text-muted-foreground">Modelo:</span>
                <p className="font-medium">{equipamento.modelo}</p>
              </div>
            )}
            {equipamento.numeroSerie && (
              <div>
                <span className="text-sm text-muted-foreground">S/N:</span>
                <p className="font-mono text-sm">{equipamento.numeroSerie}</p>
              </div>
            )}
            {equipamento.anoFabricacao && (
              <div>
                <span className="text-sm text-muted-foreground">Ano de Fabricação:</span>
                <p className="font-medium">{equipamento.anoFabricacao}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Aquisição */}
        <Card>
          <CardHeader>
            <CardTitle>Dados de Aquisição</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <span className="text-sm text-muted-foreground">Data:</span>
              <p className="font-medium">{formatDate(equipamento.dataAquisicao)}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Valor:</span>
              <p className="font-medium">
                {formatCurrency(Number(equipamento.valorAquisicao))}
              </p>
            </div>
            {equipamento.fornecedor && (
              <div>
                <span className="text-sm text-muted-foreground">Fornecedor:</span>
                <p className="font-medium">{equipamento.fornecedor.nome}</p>
              </div>
            )}
            {equipamento.notaFiscal && (
              <div>
                <span className="text-sm text-muted-foreground">NF:</span>
                <p className="font-medium">{equipamento.notaFiscal}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Localização */}
        <Card>
          <CardHeader>
            <CardTitle>Localização e Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <span className="text-sm text-muted-foreground">Status:</span>
              <div className="mt-1">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <Badge variant={STATUS_COLORS[equipamento.status] as any}>
                  {equipamento.status.replace(/_/g, ' ')}
                </Badge>
              </div>
            </div>
            {equipamento.localizacaoAtual && (
              <div>
                <span className="text-sm text-muted-foreground">Localização:</span>
                <p className="font-medium">{equipamento.localizacaoAtual}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Calibração */}
        {equipamento.requerCalibracao && (
          <Card>
            <CardHeader>
              <CardTitle>Calibração</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <span className="text-sm text-muted-foreground">Periodicidade:</span>
                <p className="font-medium">
                  {equipamento.periodicidadeCalibracaoDias} dias
                </p>
              </div>
              {equipamento.ultimaCalibracao && (
                <div>
                  <span className="text-sm text-muted-foreground">Última:</span>
                  <p className="font-medium">
                    {formatDate(equipamento.ultimaCalibracao)}
                  </p>
                </div>
              )}
              {equipamento.proximaCalibracao && (
                <div>
                  <span className="text-sm text-muted-foreground">Próxima:</span>
                  <p className="font-medium">
                    {formatDate(equipamento.proximaCalibracao)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Manutenção */}
        {equipamento.requerManutencaoPeriodica && (
          <Card>
            <CardHeader>
              <CardTitle>Manutenção</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <span className="text-sm text-muted-foreground">Periodicidade:</span>
                <p className="font-medium">
                  {equipamento.periodicidadeManutencaoDias} dias
                </p>
              </div>
              {equipamento.ultimaManutencao && (
                <div>
                  <span className="text-sm text-muted-foreground">Última:</span>
                  <p className="font-medium">
                    {formatDate(equipamento.ultimaManutencao)}
                  </p>
                </div>
              )}
              {equipamento.proximaManutencao && (
                <div>
                  <span className="text-sm text-muted-foreground">Próxima:</span>
                  <p className="font-medium">
                    {formatDate(equipamento.proximaManutencao)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Observações */}
      {equipamento.observacoes && (
        <Card>
          <CardHeader>
            <CardTitle>Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{equipamento.observacoes}</p>
          </CardContent>
        </Card>
      )}

      {/* Auditoria */}
      <Card>
        <CardHeader>
          <CardTitle>Auditoria</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <span className="text-sm text-muted-foreground">Criado em:</span>
            <p className="text-sm">{formatDate(equipamento.criadoEm)}</p>
            {equipamento.criador && (
              <p className="text-xs text-muted-foreground">
                por {equipamento.criador.nomeCompleto}
              </p>
            )}
          </div>
          {equipamento.atualizadoEm && (
            <div>
              <span className="text-sm text-muted-foreground">Atualizado em:</span>
              <p className="text-sm">{formatDate(equipamento.atualizadoEm)}</p>
              {equipamento.atualizador && (
                <p className="text-xs text-muted-foreground">
                  por {equipamento.atualizador.nomeCompleto}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
