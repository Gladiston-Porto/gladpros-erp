/**
 * Layout do Módulo Financeiro
 * Estrutura base com navegação e Sidebar
 */

import { ReactNode } from "react";
import DashboardShell, { AppUser } from "@/shared/components/GladPros";
import { requireServerUser } from "@/shared/lib/requireServerUser";
import { ConfirmProvider } from "@gladpros/ui";
import { ToastProvider } from "@gladpros/ui";

export const metadata = {
  title: 'Financeiro | GladPros',
  description: 'Gestão financeira, receitas e despesas',
};

export default async function FinanceiroLayout({ children }: { children: ReactNode }) {
  const user = (await requireServerUser()) as unknown as AppUser;

  return (
    <ToastProvider>
      <ConfirmProvider>
        <DashboardShell user={user}>
          <div className="flex flex-col gap-6">
            {/* TODO: Adicionar Navegação Interna do Módulo (Tabs) se necessário */}
            
            {/* Conteúdo da Página */}
            <div className="min-h-screen">
              {children}
            </div>
          </div>
        </DashboardShell>
      </ConfirmProvider>
    </ToastProvider>
  );
}
