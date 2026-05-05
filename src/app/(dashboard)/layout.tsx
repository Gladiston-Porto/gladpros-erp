// app/(dashboard)/layout.tsx
import { ReactNode } from "react";
import DashboardShell, { AppUser } from "@/shared/components/GladPros";
import { requireServerUser } from "@/shared/lib/requireServerUser";
import { ConfirmProvider } from "@gladpros/ui/confirm-dialog";
import { WebSocketProvider } from "@/shared/contexts/WebSocketContext";
import { ToastProvider } from "@gladpros/ui/toast";
import { DelegacaoBanner } from "./_components/DelegacaoBanner";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = (await requireServerUser()) as unknown as AppUser; // garanta { name, role, avatarUrl? }
  return (
    <ToastProvider>
      <ConfirmProvider>
        <WebSocketProvider>
          <DashboardShell user={user}>
            <DelegacaoBanner />
            {children}
          </DashboardShell>
        </WebSocketProvider>
      </ConfirmProvider>
    </ToastProvider>
  );
}
