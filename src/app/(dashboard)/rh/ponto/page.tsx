// src/app/(dashboard)/rh/ponto/page.tsx
// Página de Ponto Eletrônico
// Todos os roles: clock-in / clock-out pessoal
// ADMIN/GERENTE: também veem dashboard de todos os turnos ativos

import { Suspense } from 'react';
import { requireServerUser } from '@/shared/lib/requireServerUser';
import { can, type Role } from '@/shared/lib/rbac-core';
import { redirect } from 'next/navigation';
import PontoDashboard from '@/components/rh/ponto/PontoDashboard';
import PontoWorkerView from '@/components/rh/ponto/PontoWorkerView';
import PontoSkeleton from '@/components/rh/ponto/PontoSkeleton';

export const metadata = { title: 'Ponto Eletrônico — GladPros' };

export default async function PontoPage() {
  const user = await requireServerUser();

  if (!can(user.role as Role, 'rh', 'read') && !can(user.role as Role, 'workforce', 'read')) {
    redirect('/403');
  }

  const isManager = user.role === 'ADMIN' || user.role === 'GERENTE';
  const normalizedUser = {
    id: Number(user.id),
    role: user.role,
    email: user.email ?? '',
    empresaId: Number(user.empresaId),
  };

  return (
    <Suspense fallback={<PontoSkeleton isManager={isManager} />}>
      {/* Todos registram o próprio ponto */}
      <PontoWorkerView user={normalizedUser} />

      {/* ADMIN/GERENTE também veem o painel gerencial */}
      {isManager && <PontoDashboard user={normalizedUser} />}
    </Suspense>
  );
}
