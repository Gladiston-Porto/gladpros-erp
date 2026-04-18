"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { can, type Role } from "@/shared/lib/rbac-core";

type ClientesAccess = {
  role: Role;
  canRead: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
};

const ClientesAccessContext = createContext<ClientesAccess | undefined>(undefined);

export function ClientesAccessProvider({
  children,
  role,
}: {
  children: ReactNode;
  role: Role;
}) {
  const value = useMemo(
    () => ({
      role,
      canRead: can(role, "clientes", "read"),
      canCreate: can(role, "clientes", "create"),
      canUpdate: can(role, "clientes", "update"),
      canDelete: can(role, "clientes", "delete"),
    }),
    [role]
  );

  return <ClientesAccessContext.Provider value={value}>{children}</ClientesAccessContext.Provider>;
}

export function useClientesAccess() {
  const context = useContext(ClientesAccessContext);
  if (!context) {
    throw new Error("useClientesAccess must be used within ClientesAccessProvider");
  }
  return context;
}
