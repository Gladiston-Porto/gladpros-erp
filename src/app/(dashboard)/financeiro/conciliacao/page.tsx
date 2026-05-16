import { redirect } from "next/navigation";
import { requireServerUser } from "@/shared/lib/requireServerUser";
import { can, type Role } from "@/shared/lib/rbac-core";
import { ModulePageHeader } from "@gladpros/ui/module-page-header";
import { GitMerge, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ConciliacaoPage() {
  const user = await requireServerUser();
  if (!can(user.role as Role, "financeiro", "read")) redirect("/403");

  return (
    <div className="space-y-6">
      <div className="bg-hero-gradient rounded-2xl p-6">
        <ModulePageHeader
          title="Conciliação Bancária"
          description="Reconciliação de extratos bancários com lançamentos do sistema"
          icon={<GitMerge className="h-6 w-6 text-white" />}
          breadcrumbs={[
            { label: "Financeiro", href: "/financeiro" },
            { label: "Conciliação" },
          ]}
          className="text-white"
        />
      </div>

      <div className="rounded-2xl border border-border bg-card p-12 flex flex-col items-center justify-center gap-4 text-center">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
          <Clock className="h-8 w-8 text-muted-foreground" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground text-lg">Em desenvolvimento</h3>
          <p className="text-muted-foreground text-sm mt-2 max-w-md">
            O módulo de conciliação bancária está previsto para uma versão futura. 
            Permitirá importar extratos OFX/CSV e reconciliar automaticamente com os lançamentos do sistema.
          </p>
        </div>
        <div className="mt-4 text-xs text-muted-foreground bg-muted/50 rounded-lg px-4 py-2">
          Funcionalidade planejada: importação OFX, matching automático, diferenças pendentes, aprovação manual
        </div>
      </div>
    </div>
  );
}
