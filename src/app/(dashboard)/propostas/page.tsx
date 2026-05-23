import { prisma } from '@/lib/prisma';
import { requireServerUser } from '@/shared/lib/requireServerUser';
import { can, type Role } from '@/shared/lib/rbac-core';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@gladpros/ui/button';
import { Card, CardContent, CardHeader } from '@gladpros/ui/card';
import { ModulePageHeader } from '@gladpros/ui/module-page-header';
import { StatCard } from '@gladpros/ui/stat-card';
import { FileText, Plus, CheckCircle, Send, ArrowRight, TrendingUp } from 'lucide-react';

export default async function DashboardPropostasPage() {
  const user = await requireServerUser();
  if (!can(user.role as Role, 'propostas', 'read')) redirect('/403');

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [totalPropostas, novasEsteMes, aprovadas, enviadas] = await Promise.all([
    prisma.proposta.count(),
    prisma.proposta.count({
      where: {
        criadoEm: {
          gte: startOfMonth,
        },
      },
    }),
    prisma.proposta.count({
      where: {
        status: 'APROVADA',
      },
    }),
    prisma.proposta.count({
      where: {
        status: 'ENVIADA',
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <ModulePageHeader
        title="Propostas"
        description="Gestão de propostas comerciais e orçamentos"
        icon={<FileText />}
        accentColor="#FF8C00"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Propostas' }]}
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
        <StatCard
          title="Total"
          value={totalPropostas}
          icon={<FileText />}
          variant="default"
          description="Todas as propostas"
        />
        <StatCard
          title="Novas (Mês)"
          value={novasEsteMes}
          icon={<TrendingUp />}
          variant="orange"
          description="Crescimento recente"
        />
        <StatCard
          title="Aprovadas"
          value={aprovadas}
          icon={<CheckCircle />}
          variant="income"
          description="Sucesso comercial"
        />
        <StatCard
          title="Enviadas"
          value={enviadas}
          icon={<Send />}
          variant="warning"
          description="Aguardando resposta"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Link href="/propostas/lista" className="group">
          <Card className="h-full transition-all hover:border-brand-primary/50 hover:shadow-lg hover:shadow-brand-primary/10">
            <CardHeader>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-primary/10 text-brand-primary">
                <FileText className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold">Lista de Propostas</h3>
              <p className="text-sm text-muted-foreground">
                Visualize, filtre e gerencie todas as propostas comerciais.
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm font-medium text-brand-primary">
                Acessar lista{' '}
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/propostas/nova" className="group">
          <Card className="h-full transition-all hover:border-brand-secondary/50 hover:shadow-lg hover:shadow-brand-secondary/10">
            <CardHeader>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-secondary/10 text-brand-secondary">
                <Plus className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold">Nova Proposta</h3>
              <p className="text-sm text-muted-foreground">
                Crie uma nova proposta comercial do zero.
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm font-medium text-brand-secondary">
                Criar agora{' '}
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
