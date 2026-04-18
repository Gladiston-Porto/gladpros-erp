'use client';

import { ModulePageHeader } from '@gladpros/ui/module-page-header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@gladpros/ui/tabs';
import { Tag } from 'lucide-react';
import { CategoriaList } from '@/components/estoque/categorias/CategoriaList';

export default function CategoriasPage() {
    return (
        <div className="flex flex-col gap-6">
            <ModulePageHeader
                title="Categorias"
                description="Gerencie as categorias e hierarquias para materiais e equipamentos."
                icon={<Tag />}
                accentColor="#0098DA"
                breadcrumbs={[
                    { label: 'Dashboard', href: '/dashboard' },
                    { label: 'Configurações', href: '/configuracoes' },
                    { label: 'Categorias' },
                ]}
            />

            <div className="rounded-lg border border-border bg-card p-6">
                <Tabs defaultValue="MATERIAL" className="w-full">
                    <TabsList className="mb-4">
                        <TabsTrigger value="MATERIAL">Materiais</TabsTrigger>
                        <TabsTrigger value="EQUIPAMENTO">Equipamentos</TabsTrigger>
                    </TabsList>

                    <TabsContent value="MATERIAL">
                        <CategoriaList tipo="MATERIAL" />
                    </TabsContent>

                    <TabsContent value="EQUIPAMENTO">
                        <CategoriaList tipo="EQUIPAMENTO" />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
