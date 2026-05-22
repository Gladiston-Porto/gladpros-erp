// app/(dashboard)/layout.tsx
import { ReactNode } from "react";
import { redirect } from "next/navigation";
import DashboardShell, { AppUser } from "@/shared/components/GladPros";
import { requireServerUser } from "@/shared/lib/requireServerUser";
import { can, type Role } from "@/shared/lib/rbac-core";
import { ConfirmProvider } from "@gladpros/ui/confirm-dialog";
import { WebSocketProvider } from "@/shared/contexts/WebSocketContext";
import { ToastProvider } from "@gladpros/ui/toast";
import { DelegacaoBanner } from "./_components/DelegacaoBanner";
import { PasswordExpiryBanner } from "@/components/auth/PasswordExpiryBanner";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = (await requireServerUser()) as unknown as AppUser; // garanta { name, role, avatarUrl? }
  if (!can(user.role as Role, "dashboard", "read")) {
    redirect("/403");
  }
  return (
    <ToastProvider>
      <ConfirmProvider>
        <WebSocketProvider>
          <DashboardShell user={user}>
            <DelegacaoBanner />
            <PasswordExpiryBanner />
            {children}
          </DashboardShell>
        </WebSocketProvider>
      </ConfirmProvider>
    </ToastProvider>
  );
}
