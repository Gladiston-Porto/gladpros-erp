/**
 * Página: /financeiro/payables
 * 
 * Payables (Contas a Pagar de Terceirizados / Workforce)
 * Área Financeira - Gestão de pagamentos a Workers (1099)
 */

import Link from "next/link";
import { Badge } from "@gladpros/ui/badge"
import { Button } from "@gladpros/ui/button"
import { Card, CardContent } from "@gladpros/ui/card"
import { PageHeader } from "@gladpros/ui/page-header";
import {
    DollarSign,
    Clock,
    CheckCircle,
    AlertCircle,
    ChevronRight,
    User,
    Banknote,
    ArrowRight
} from "lucide-react";

import { prisma } from "@/lib/prisma";

export default async function FinanceiroPayablesPage() {
    // Buscar payables com workers
    const payables = await prisma.payable.findMany({
        include: {
            worker: {
                select: { id: true, name: true, type: true }
            },
            _count: { select: { lineItems: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 100
    });

    // KPIs
    const totalPendentes = payables.filter(p => p.status === 'PENDING').length;
    const totalAprovados = payables.filter(p => p.status === 'APPROVED').length;
    const totalPagos = payables.filter(p => p.status === 'PAID').length;

    const valorPendente = payables
        .filter(p => p.status === 'PENDING' || p.status === 'APPROVED')
        .reduce((sum, p) => sum + Number(p.totalAmount), 0);

    const valorPago = payables
        .filter(p => p.status === 'PAID')
        .reduce((sum, p) => sum + Number(p.totalAmount), 0);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(value);
    };

    const statusConfig: Record<string, { icon: any; color: string; label: string; bgColor: string }> = {
        PENDING: { icon: Clock, color: 'text-yellow-600', bgColor: 'bg-yellow-100', label: 'Pendente' },
        APPROVED: { icon: CheckCircle, color: 'text-blue-600', bgColor: 'bg-blue-100', label: 'Aprovado' },
        PAID: { icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100', label: 'Pago' },
        CANCELLED: { icon: AlertCircle, color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Cancelado' }
    };

    return (
        <div className="space-y-8">
            <PageHeader
                title="Payables - Contas a Pagar (Terceirizados)"
                description="Gestão financeira de pagamentos a Workers e Contractors (1099)"
                breadcrumbs={[
                    { label: 'Dashboard', href: '/dashboard' },
                    { label: 'Financeiro', href: '/dashboard/financeiro' },
                    { label: 'Payables' }
                ]}
            />

            {/* Hero Section Financeiro */}
            <section className="rounded-3xl border border-white/30 bg-[linear-gradient(135deg,#10B981_0%,#0098DA_100%)] p-6 text-white shadow-2xl shadow-green-500/20">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-[0.5em] text-white/70">FINANCEIRO</p>
                        <h2 className="text-2xl font-semibold font-title">Contas a Pagar - Workforce</h2>
                        <p className="text-sm text-white/80">Payables gerados de Timesheets aprovados de terceirizados</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-xs text-white/70">A Pagar</p>
                            <p className="text-2xl font-bold font-title">{formatCurrency(valorPendente)}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-white/70">Pago Total</p>
                            <p className="text-2xl font-bold font-title">{formatCurrency(valorPago)}</p>
                        </div>
                    </div>
                </div>

                {/* Grid de Stats */}
                <div className="mt-6 grid gap-4 md:grid-cols-4">
                    <div className="space-y-1 rounded-2xl bg-white/10 p-4 backdrop-blur-sm border border-white/10">
                        <div className="flex items-center gap-2 text-white/80">
                            <Clock className="h-4 w-4" />
                            <p className="text-sm">Pendentes</p>
                        </div>
                        <p className="text-2xl font-semibold">{totalPendentes}</p>
                        <p className="text-xs text-white/60">Aguardando aprovação</p>
                    </div>

                    <div className="space-y-1 rounded-2xl bg-white/10 p-4 backdrop-blur-sm border border-white/10">
                        <div className="flex items-center gap-2 text-white/80">
                            <CheckCircle className="h-4 w-4" />
                            <p className="text-sm">Aprovados</p>
                        </div>
                        <p className="text-2xl font-semibold">{totalAprovados}</p>
                        <p className="text-xs text-white/60">Prontos para pagar</p>
                    </div>

                    <div className="space-y-1 rounded-2xl bg-white/10 p-4 backdrop-blur-sm border border-white/10">
                        <div className="flex items-center gap-2 text-white/80">
                            <Banknote className="h-4 w-4" />
                            <p className="text-sm">Pagos</p>
                        </div>
                        <p className="text-2xl font-semibold">{totalPagos}</p>
                        <p className="text-xs text-white/60">Concluídos</p>
                    </div>

                    <div className="space-y-1 rounded-2xl bg-white/10 p-4 backdrop-blur-sm border border-white/10">
                        <div className="flex items-center gap-2 text-white/80">
                            <DollarSign className="h-4 w-4" />
                            <p className="text-sm">Total Geral</p>
                        </div>
                        <p className="text-2xl font-semibold">{payables.length}</p>
                        <p className="text-xs text-white/60">Todos os payables</p>
                    </div>
                </div>
            </section>

            {/* Ações Rápidas */}
            <div className="flex gap-4">
                <Link href="/rh/workers">
                    <Button variant="outline">
                        <User className="h-4 w-4 mr-2" />
                        Ver Workers
                    </Button>
                </Link>
            </div>

            {/* Lista de Payables */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-100 p-4 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">Todos os Payables</h3>
                    <div className="text-sm text-gray-500">
                        {payables.length} registros
                    </div>
                </div>

                {payables.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Nenhum payable encontrado</p>
                        <p className="text-sm">Payables são gerados automaticamente quando Timesheets são aprovados.</p>
                    </div>
                ) : (
                    <div className="divide-y">
                        {payables.map((payable) => {
                            const config = statusConfig[payable.status] || statusConfig.PENDING;
                            const StatusIcon = config.icon;
                            const workerName = payable.worker.name;
                            const workerId = payable.worker.id;

                            return (
                                <div key={payable.id} className="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                                    {/* Status Icon */}
                                    <div className={`p-2 rounded-full ${config.bgColor}`}>
                                        <StatusIcon className={`h-5 w-5 ${config.color}`} />
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-medium text-gray-900">
                                                Payable #{payable.id}
                                            </h4>
                                            <Badge className={`${config.bgColor} ${config.color} border-none`}>
                                                {config.label}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                                            <span className="flex items-center gap-1">
                                                <User className="h-3 w-3" />
                                                {workerName}
                                            </span>
                                            <span>{payable._count.lineItems} itens</span>
                                            {payable.paidAt && (
                                                <span className="text-green-600">
                                                    Pago em {new Date(payable.paidAt).toLocaleDateString('en-US')}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Amount */}
                                    <div className="text-right">
                                        <p className="font-semibold text-lg">
                                            {formatCurrency(Number(payable.totalAmount))}
                                        </p>
                                        {payable.paymentMethod && (
                                            <Badge className="bg-gray-100 text-gray-800 text-xs border-none">
                                                {payable.paymentMethod}
                                            </Badge>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    {workerId && (
                                        <Link href={`/rh/workers/${workerId}`}>
                                            <Button variant="ghost" size="sm">
                                                <ArrowRight className="h-4 w-4" />
                                            </Button>
                                        </Link>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
