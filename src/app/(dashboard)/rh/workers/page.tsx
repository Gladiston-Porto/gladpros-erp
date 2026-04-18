/**
 * Página: /rh/workers
 * 
 * Lista de Workers (1099 Contractors / Vendors)
 * Com KPIs do Workforce e lista usando model Worker
 */

import Link from "next/link";
import { Button } from "@gladpros/ui/button"
import { ModulePageHeader } from "@gladpros/ui/module-page-header"
import { StatCard } from "@gladpros/ui/stat-card";
import {
    Users,
    UserPlus,
    Building2,
    Briefcase,
    Plus,
    DollarSign,
    ClipboardList
} from "lucide-react";

import { prisma } from "@/lib/prisma";
import { WorkerList } from "@/components/workforce";

export default async function WorkersPage() {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Workers + Workforce KPIs — 1 round-trip ao banco em vez de 7 sequenciais
    const [
      totalWorkers,
      workersAtivos,
      workersIndividuais,
      workersEmpresas,
      assignmentsAtivos,
      payablesPendentes,
      payablesPagosMes
    ] = await Promise.all([
      prisma.worker.count(),
      prisma.worker.count({ where: { status: 'ACTIVE' } }),
      prisma.worker.count({ where: { type: 'INDIVIDUAL' } }),
      prisma.worker.count({ where: { type: 'COMPANY' } }),
      prisma.assignment.count({ where: { status: 'ACTIVE' } }),
      prisma.payable.count({ where: { status: { in: ['PENDING', 'APPROVED'] } } }),
      prisma.payable.aggregate({
        where: { status: 'PAID', paidAt: { gte: startOfMonth } },
        _sum: { totalAmount: true }
      })
    ]);

    const totalPagoMes = Number(payablesPagosMes._sum.totalAmount || 0);

    return (
        <div className="space-y-6">
            <ModulePageHeader
                title="Workers (1099)"
                description="Gestão de Contractors, Vendors e Crews (1099)"
                icon={<Briefcase />}
                accentColor="#0098DA"
                breadcrumbs={[
                    { label: 'Dashboard', href: '/dashboard' },
                    { label: 'RH', href: '/rh' },
                    { label: 'Workers' }
                ]}
                actions={
                    <Link href="/rh/workers/novo">
                        <Button size="default">
                            <Plus className="h-4 w-4 mr-2" />
                            Novo Worker
                        </Button>
                    </Link>
                }
            />

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <StatCard title="Total Workers" value={totalWorkers} icon={<Users />} variant="default" description={`${workersAtivos} ativos`} />
                <StatCard title="Individuais" value={workersIndividuais} icon={<UserPlus />} variant="default" description="1099-NEC" />
                <StatCard title="Empresas" value={workersEmpresas} icon={<Building2 />} variant="orange" description="1099-MISC" />
                <StatCard title="Assignments" value={assignmentsAtivos} icon={<ClipboardList />} variant="income" description="Ativos" />
                <StatCard title="Payables" value={payablesPendentes} icon={<Briefcase />} variant={payablesPendentes > 0 ? "warning" : "muted"} description="Pendentes" />
                <StatCard title="Pago Mês" value={`$${totalPagoMes.toLocaleString('en-US', { minimumFractionDigits: 0 })}`} icon={<DollarSign />} variant="income" description="Este mês" />
            </div>

            {/* Lista de Workers */}
            <div className="rounded-xl border border-border bg-card shadow-sm">
                <div className="border-b border-border p-4 flex items-center justify-between">
                    <h3 className="font-semibold text-foreground">Workers Cadastrados</h3>
                    <div className="flex gap-2">
                        <Link href="/dashboard/financeiro/payables">
                            <Button variant="outline" size="sm">
                                <DollarSign className="h-4 w-4 mr-1" />
                                Ver Payables
                            </Button>
                        </Link>
                    </div>
                </div>
                <div className="p-0">
                    <WorkerList baseUrl="/rh/workers" />
                </div>
            </div>
        </div>
    );
}
