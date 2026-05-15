import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireServerUser } from "@/shared/lib/requireServerUser";
import { can, type Role } from "@/shared/lib/rbac-core";
import { getProjectListScopeForUser } from "@/shared/lib/rbac-projects";
import { redirect } from "next/navigation";
import { Button } from "@gladpros/ui/button"
import { ModulePageHeader } from "@gladpros/ui/module-page-header"
import { StatCard } from "@gladpros/ui/stat-card";
import { Plus, Briefcase, CheckCircle, AlertTriangle, Clock } from "lucide-react";
import ProjetosClient from "./ProjetosClient";

export default async function ProjetosPage() {
  const user = await requireServerUser();
  const role = user.role as Role;
  if (!can(role, "projetos", "read")) redirect("/403");
  const projectScope = await getProjectListScopeForUser(user);
  const canCreateProject = can(role, "projetos", "create");
  const canUpdateProject = can(role, "projetos", "update");
  const canDeleteProject = can(role, "projetos", "delete");
  const canViewReports = can(role, "reports", "read");

  // Fetch real-time stats em paralelo — 1 round-trip ao banco em vez de 5 sequenciais
  const [totalProjetos, emAndamento, concluidos, atrasados, planejados] = await Promise.all([
    prisma.projeto.count({ where: projectScope }),
    prisma.projeto.count({ where: { ...projectScope, status: 'em_execucao' } }),
    prisma.projeto.count({ where: { ...projectScope, status: 'concluido' } }),
    prisma.projeto.count({
      where: {
        ...projectScope,
        dataConclusaoPrevista: { lt: new Date() },
        status: { not: 'concluido' }
      }
    }),
    prisma.projeto.count({ where: { ...projectScope, status: 'planejado' } })
  ]);

  // Calculate percentage of completed projects
  const percentConcluido = totalProjetos > 0 
    ? Math.round((concluidos / totalProjetos) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      <ModulePageHeader
        title="Projetos"
        description="Gestão completa do ciclo de projetos, do planejamento à entrega."
        icon={<Briefcase />}
        accentColor="#0098DA"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Projetos' }
        ]}
        actions={
          <div className="flex gap-2">
            {canViewReports && (
              <Link href="/projetos/relatorios">
                <Button variant="outline" size="default">
                  Relatórios
                </Button>
              </Link>
            )}
            {canCreateProject && (
              <Link href="/projetos/novo">
                <Button size="default">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Projeto
                </Button>
              </Link>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Em Andamento" value={emAndamento} icon={<Briefcase />} variant="default" description="Execução ativa" />
        <StatCard title="Concluídos" value={concluidos} icon={<CheckCircle />} variant="income" description={`${percentConcluido}% do total`} />
        <StatCard title="Em Atraso" value={atrasados} icon={<AlertTriangle />} variant="expense" description="Atenção requerida" />
        <StatCard title="Planejados" value={planejados} icon={<Clock />} variant="warning" description="Próximos inícios" />
      </div>

      <ProjetosClient
        permissions={{
          canCreate: canCreateProject,
          canUpdate: canUpdateProject,
          canDelete: canDeleteProject,
        }}
      />
    </div>
  );
}
