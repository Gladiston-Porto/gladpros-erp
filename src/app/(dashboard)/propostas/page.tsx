import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Button } from '@gladpros/ui/button'
import { Card, CardContent, CardHeader } from '@gladpros/ui/card'
import { ModulePageHeader } from '@gladpros/ui/module-page-header'
import { StatCard } from '@gladpros/ui/stat-card';
import {
  FileText,
  Plus,
  CheckCircle,
  Send,
  FileEdit,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

export default async function DashboardPropostasPage() {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [
    totalPropostas,
    novasEsteMes,
    aprovadas,
    enviadas,
    rascunhos
  ] = await Promise.all([
    prisma.proposta.count(),
    prisma.proposta.count({
      where: {
        criadoEm: {
          gte: startOfMonth
        }
      }
    }),
    prisma.proposta.count({
      where: {
        status: 'APROVADA'
      }
    }),
    prisma.proposta.count({
      where: {
        status: 'ENVIADA'
      }
    }),
    prisma.proposta.count({
      where: {
        status: 'RASCUNHO'
      }
    })
  ]);

  return (
    <div className="space-y-6">
      <ModulePageHeader
        title="Propostas"
        description="Gestão de propostas comerciais e orçamentos"
        icon={<FileText />}
        accentColor="#FF8C00"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Propostas' }
        ]}
        actions={
          <div className="flex gap-2">
            <Link href="/propostas/relatorios">
              <Button variant="outline" size="default">
                Relatórios
              </Button>
            </Link>
            <Link href="/propostas/nova">
              <Button size="default">
                <Plus className="h-4 w-4 mr-2" />
                Nova Proposta
              </Button>
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total" value={totalPropostas} icon={<FileText />} variant="default" description="Todas as propostas" />
        <StatCard title="Novas (Mês)" value={novasEsteMes} icon={<TrendingUp />} variant="orange" description="Crescimento recente" />
        <StatCard title="Aprovadas" value={aprovadas} icon={<CheckCircle />} variant="income" description="Sucesso comercial" />
        <StatCard title="Enviadas" value={enviadas} icon={<Send />} variant="warning" description="Aguardando resposta" />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Link href="/propostas/lista" className="group">
          <Card className="h-full transition-all hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10">
            <CardHeader>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                <FileText className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold">Lista de Propostas</h3>
              <p className="text-sm text-muted-foreground">
                Visualize, filtre e gerencie todas as propostas comerciais.
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm font-medium text-blue-600 dark:text-blue-400">
                Acessar lista <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/propostas/nova" className="group">
          <Card className="h-full transition-all hover:border-orange-500/50 hover:shadow-lg hover:shadow-orange-500/10">
            <CardHeader>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400">
                <Plus className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold">Nova Proposta</h3>
              <p className="text-sm text-muted-foreground">
                Crie uma nova proposta comercial do zero.
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm font-medium text-orange-600 dark:text-orange-400">
                Criar agora <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
