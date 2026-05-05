'use client';

/**
 * AssignmentList Component
 * 
 * Displays a list of assignments for a Job (ServiceOrder) or Project.
 * Includes add button and empty state.
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AssignmentCard } from './AssignmentCard';
import { AssignmentFormDialog } from './AssignmentFormDialog';
import { Plus, Users, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Assignment {
    id: number;
    status: string;
    payType: 'HOURLY' | 'FIXED';
    costRateHourly?: number | null;
    fixedCostAmount?: number | null;
    role?: string | null;
    effectiveFrom: string;
    worker: {
        id: number;
        name: string;
        email?: string | null;
    };
}

interface AssignmentListProps {
    jobId?: number;
    projectId?: number;
    readonly?: boolean;
    title?: string;
}

export function AssignmentList({
    jobId,
    projectId,
    readonly = false,
    title = 'Equipe'
}: AssignmentListProps) {
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);

    const fetchAssignments = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (jobId) params.append('jobId', jobId.toString());
            if (projectId) params.append('projectId', projectId.toString());
            params.append('status', 'ACTIVE');

            const res = await fetch(`/api/workforce/assignments?${params}`);
            const data = await res.json();

            if (data.success) {
                setAssignments(data.data || []);
            }
        } catch (error) {
            console.error('Error fetching assignments:', error);
            toast.error('Erro ao carregar equipe');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAssignments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [jobId, projectId]);

    const handleRemove = async (assignmentId: number) => {
        try {
            const res = await fetch(`/api/workforce/assignments/${assignmentId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'CANCELLED' })
            });

            if (res.ok) {
                toast.success('Worker removido da equipe');
                fetchAssignments();
            } else {
                toast.error('Erro ao remover worker');
            }
        } catch (error) {
            toast.error('Erro ao remover worker');
        }
    };

    const handleAssignmentCreated = () => {
        setShowForm(false);
        fetchAssignments();
        toast.success('Worker adicionado à equipe');
    };

    // Calculate total estimated cost
    const totalEstimatedCost = assignments.reduce((sum, a) => {
        if (a.payType === 'FIXED') {
            return sum + (Number(a.fixedCostAmount) || 0);
        }
        return sum; // HOURLY depends on hours worked
    }, 0);

    if (loading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        {title}
                        {assignments.length > 0 && (
                            <span className="ml-2 text-sm font-normal text-gray-500">
                                ({assignments.length} {assignments.length === 1 ? 'worker' : 'workers'})
                            </span>
                        )}
                    </CardTitle>

                    {!readonly && (
                        <Button
                            size="sm"
                            onClick={() => setShowForm(true)}
                            className="gap-1"
                        >
                            <Plus className="h-4 w-4" />
                            Adicionar
                        </Button>
                    )}
                </CardHeader>

                <CardContent>
                    {assignments.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                            <p className="font-medium">Nenhum worker atribuído</p>
                            <p className="text-sm">Adicione membros à equipe para começar</p>
                            {!readonly && (
                                <Button
                                    variant="outline"
                                    className="mt-4"
                                    onClick={() => setShowForm(true)}
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Adicionar primeiro worker
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {assignments.map((assignment) => (
                                <AssignmentCard
                                    key={assignment.id}
                                    assignment={assignment}
                                    onRemove={readonly ? undefined : handleRemove}
                                    readonly={readonly}
                                />
                            ))}

                            {totalEstimatedCost > 0 && (
                                <div className="mt-4 pt-4 border-t flex justify-between text-sm">
                                    <span className="text-gray-600">Custo Fixo Total:</span>
                                    <span className="font-semibold">
                                        {new Intl.NumberFormat('en-US', {
                                            style: 'currency',
                                            currency: 'USD'
                                        }).format(totalEstimatedCost)}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            <AssignmentFormDialog
                open={showForm}
                onOpenChange={setShowForm}
                jobId={jobId}
                projectId={projectId}
                onSuccess={handleAssignmentCreated}
            />
        </>
    );
}
