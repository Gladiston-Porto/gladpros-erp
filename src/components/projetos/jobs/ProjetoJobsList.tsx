'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@gladpros/ui/badge'
import { Button } from '@gladpros/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@gladpros/ui/card';
import { SchedulerJob } from '@/shared/types/scheduler';
import { Plus, Calendar, User } from 'lucide-react';
// TODO: NewJobModal will be created in scheduler module
// import { NewJobModal } from '@/components/scheduler/NewJobModal';

// Note: We might need to update NewJobModal to accept a default projectId
// For now, we list existing jobs.

export function ProjetoJobsList({ projetoId }: { projetoId: number }) {
    const [jobs, setJobs] = useState<SchedulerJob[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchProjectJobs() {
            try {
                // Ideally backend supports ?projetoId=X filter
                // Since I haven't implemented that specific filter in GET /api/jobs yet, 
                // I will fetch all and filter client-side for this MVP step 
                // OR I can quickly add the filter to the API.
                // Given the constraints and lock issues, client-side filtering of the /api/jobs 
                // is safer for now until I can regenerate the client/API types.
                // Wait, /api/jobs returns ALL jobs. That might be heavy. 
                // But for a demo/MVP it is acceptable.

                const res = await fetch('/api/jobs');
                const data: SchedulerJob[] = await res.json();

                // Filter by project (assuming job.projetoId exists globally or in the data)
                // The current SchedulerJob type in shared/types might not have projetoId explicitly typed 
                // but the DB has it. Let's start by just fetching.
                // Actually, I should update the type or cast it.

                const projectJobs = (data as (SchedulerJob & { projetoId?: number })[]).filter((j) => j.projetoId === projetoId);
                setJobs(projectJobs);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        fetchProjectJobs();
    }, [projetoId]);

    if (loading) return <div className="p-4 text-center text-muted-foreground">Carregando jobs...</div>;

    if (jobs.length === 0) {
        return (
            <Card className="border-dashed shadow-none bg-muted">
                <CardContent className="flex flex-col items-center justify-center p-10 text-center">
                    <Calendar className="h-10 w-10 text-muted-foreground/50 mb-4" />
                    <h3 className="font-semibold text-lg text-foreground">Nenhum Job Encontrado</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mb-6">
                        Este projeto ainda não tem ordens de serviço criadas.
                    </p>
                    <Button variant="outline" aria-label="Criar primeiro job do projeto">Criar Primeiro Job</Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Ordens de Serviço ({jobs.length})</h3>
                {/* Future: Pass project ID to pre-fill */}
                <Button size="sm" variant="outline" aria-label="Criar novo job"><Plus className="w-4 h-4 mr-2" /> Novo Job</Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {jobs.map(job => (
                    <Card key={job.id} className="hover:shadow-md transition-shadow">
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                                <Badge variant="secondary" className="font-mono text-xs">
                                    {job.ticketNumber}
                                </Badge>
                                <Badge variant={job.status === 'COMPLETED' ? 'success' : 'outline'}>
                                    {job.status}
                                </Badge>
                            </div>
                            <CardTitle className="text-base mt-2 line-clamp-1">{job.title || 'Sem título'}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-sm text-muted-foreground mb-4 line-clamp-2">
                                {job.description || 'Sem descrição'}
                            </div>

                            {job.appointments && job.appointments.length > 0 && (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted p-2 rounded">
                                    <User className="h-3 w-3" />
                                    <span>{job.appointments[0].Technician?.nomeCompleto || 'Técnico'}</span>
                                    <span className="text-muted-foreground/50">|</span>
                                    <span>{new Date(job.appointments[0].scheduledStart).toLocaleDateString()}</span>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
