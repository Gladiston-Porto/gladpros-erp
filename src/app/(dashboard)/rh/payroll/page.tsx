// src/app/(dashboard)/rh/payroll/page.tsx
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { requireServerUser } from '@/shared/lib/requireServerUser';
import { can, type Role } from '@/shared/lib/rbac-core';
import PayrollDashboard from '@/components/rh/payroll/PayrollDashboard';
import { DollarSign, Home, Users } from 'lucide-react';
import Link from 'next/link';

export const metadata = { title: 'Payroll — GladPros' };

function PayrollSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-card border border-border rounded-2xl h-24" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-card border border-border rounded-2xl h-96" />
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl h-96" />
      </div>
    </div>
  );
}

export default async function PayrollPage() {
  const user = await requireServerUser();

  // ADMIN, GERENTE, FINANCEIRO can access payroll
  if (!can(user.role as Role, 'rh', 'read')) {
    redirect('/403');
  }

  // USUARIO role has rh read but we restrict payroll to management roles
  const allowedRoles = ['ADMIN', 'GERENTE', 'FINANCEIRO'];
  if (!allowedRoles.includes(user.role)) {
    redirect('/403');
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="bg-hero-gradient px-6 py-8">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm text-white/70 mb-4" aria-label="Breadcrumb">
          <Link
            href="/dashboard"
            className="flex items-center gap-1 hover:text-white transition-colors"
          >
            <Home className="w-3.5 h-3.5" />
            Home
          </Link>
          <span>/</span>
          <Link href="/rh" className="flex items-center gap-1 hover:text-white transition-colors">
            <Users className="w-3.5 h-3.5" />
            RH
          </Link>
          <span>/</span>
          <span className="text-white font-medium">Payroll</span>
        </nav>

        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <DollarSign className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="font-title text-3xl font-bold text-white tracking-wide">💰 Payroll</h1>
            <p className="text-white/80 text-sm mt-1">
              Gestão de períodos e cálculo de folha de pagamento
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6">
        <Suspense fallback={<PayrollSkeleton />}>
          <PayrollDashboard
            user={{ id: Number(user.id), role: user.role, empresaId: user.empresaId }}
          />
        </Suspense>
      </div>
    </div>
  );
}
