/**
 * Página: /rh/workers/novo
 * 
 * Criar novo Worker (1099 Contractor / Vendor)
 */

import { ModulePageHeader } from "@gladpros/ui/module-page-header";
import { WorkerForm } from "@/components/workforce";
import { UserPlus } from "lucide-react";

export default function NewWorkerPage() {
    return (
        <div className="space-y-6">
            <ModulePageHeader
                title="Novo Worker"
                description="Cadastrar novo Contractor ou Vendor (1099)"
                icon={<UserPlus />}
                accentColor="#0098DA"
                breadcrumbs={[
                    { label: 'Dashboard', href: '/dashboard' },
                    { label: 'RH', href: '/rh' },
                    { label: 'Workers', href: '/rh/workers' },
                    { label: 'Novo' }
                ]}
            />

            <WorkerForm baseUrl="/rh/workers" />
        </div>
    );
}
