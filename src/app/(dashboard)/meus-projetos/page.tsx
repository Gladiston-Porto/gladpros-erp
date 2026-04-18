'use client';

import { useEffect, useState } from 'react';
import { ModulePageHeader } from "@gladpros/ui/module-page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@gladpros/ui/card";
import { Badge } from "@gladpros/ui/badge";
import { Calendar, Briefcase, FolderOpen } from 'lucide-react';
import Link from 'next/link';
import { projectsApi } from '@/lib/api/client';

interface Alocacao {
  id: number;
  papel: string | null;
  dataInicio: string;
  dataFim: string | null;
  projeto: {
    id: number;
    titulo: string;
    status: string;
    Cliente: {
      nome: string;
    } | null;
  };
}

export default function MeusProjetosPage() {
  const [alocacoes, setAlocacoes] = useState<Alocacao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    projectsApi.getMyProjects()
      .then(data => {
        if (Array.isArray(data)) {
          setAlocacoes(data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ModulePageHeader
        title="Meus Projetos"
        description="Projetos onde você está alocado como colaborador"
        icon={<FolderOpen />}
        accentColor="#0098DA"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Meus Projetos" },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {alocacoes.map((alocacao) => (
          <Link href={`/projetos/${alocacao.projeto.id}`} key={alocacao.id} className="block h-full">
            <Card className="h-full hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-brand-blue">
              <CardHeader>
                <div className="flex justify-between items-start gap-2">
                  <CardTitle className="text-lg line-clamp-2">{alocacao.projeto.titulo}</CardTitle>
                  <Badge variant={alocacao.projeto.status === 'concluido' ? 'success' : 'secondary'}>
                    {alocacao.projeto.status}
                  </Badge>
                </div>
                <CardDescription>{alocacao.projeto.Cliente?.nome || 'Cliente não informado'}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-2 rounded-md">
                  <Briefcase className="h-4 w-4 text-primary" />
                  <span className="font-medium text-foreground">{alocacao.papel || 'Membro da Equipe'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {new Date(alocacao.dataInicio).toLocaleDateString()} 
                    {alocacao.dataFim ? ` - ${new Date(alocacao.dataFim).toLocaleDateString()}` : ' - Atual'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
        
        {alocacoes.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-muted-foreground border-2 border-dashed rounded-xl bg-muted/10">
            <Briefcase className="h-12 w-12 mb-4 opacity-20" />
            <p className="text-lg font-medium">Nenhum projeto encontrado</p>
            <p className="text-sm">Você ainda não foi alocado em nenhum projeto.</p>
          </div>
        )}
      </div>
    </div>
  );
}
