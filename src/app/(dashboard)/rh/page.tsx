import { ModulePageHeader } from "@gladpros/ui/module-page-header"
import { StatCard } from "@gladpros/ui/stat-card";
import { Button } from "@gladpros/ui/button"
import { prisma } from "@/lib/prisma";
import { Users, Briefcase } from "lucide-react";
import Link from "next/link";

export default async function RHDashboardPage() {
  const [
    totalWorkers,
    activeWorkers,
  ] = await Promise.all([
    prisma.worker.count(),
    prisma.worker.count({ where: { status: 'ACTIVE' } }),
  ]);

  return (
    <div className="space-y-6">
      <ModulePageHeader
        title="Recursos Humanos"
        description={`${totalWorkers} workers · ${activeWorkers} ativos`}
        icon={<Users />}
        accentColor="#0098DA"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "RH" },
        ]}
        actions={
          <Link href="/rh/relatorios">
            <Button variant="outline" size="sm">
              Relatórios
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Workers Total"
          value={totalWorkers}
          icon={<Users />}
          variant="default"
          description="Todos os workers"
        />
        <StatCard
          title="Workers Ativos"
          value={activeWorkers}
          icon={<Briefcase />}
          variant="orange"
          description="W-2 e 1099"
        />
      </div>
    </div>
  );
}
