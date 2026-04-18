'use client';

/**
 * AssignmentFormDialog Component
 * 
 * Modal dialog to add a worker to a Job (ServiceOrder) or Project.
 */

import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { parseApiError } from '@/lib/api/parseApiError';

interface Worker {
    id: number;
    name: string;
    defaultHourlyRate?: number | null;
}

interface AssignmentFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    jobId?: number;
    projectId?: number;
    onSuccess: () => void;
}

export function AssignmentFormDialog({
    open,
    onOpenChange,
    jobId,
    projectId,
    onSuccess
}: AssignmentFormDialogProps) {
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [selectedWorkerId, setSelectedWorkerId] = useState<string>('');
    const [payType, setPayType] = useState<string>('HOURLY');
    const [costRateHourly, setCostRateHourly] = useState<string>('');
    const [fixedCostAmount, setFixedCostAmount] = useState<string>('');
    const [role, setRole] = useState<string>('');
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    // Fetch available workers
    useEffect(() => {
        if (open) {
            fetchWorkers();
        }
    }, [open]);

    const fetchWorkers = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/workforce/workers?status=ACTIVE');
            const data = await res.json();
            if (data.success) {
                setWorkers(data.data?.data || data.data || []);
            }
        } catch (error) {
            console.error('Error fetching workers:', error);
        } finally {
            setLoading(false);
        }
    };

    // Auto-fill rate when worker is selected
    useEffect(() => {
        if (selectedWorkerId) {
            const worker = workers.find(w => w.id === parseInt(selectedWorkerId));
            if (worker?.defaultHourlyRate) {
                setCostRateHourly(worker.defaultHourlyRate.toString());
            }
        }
    }, [selectedWorkerId, workers]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const localErrors: Record<string, string> = {};
        if (!selectedWorkerId) localErrors.workerId = 'Selecione um worker';
        if (payType === 'HOURLY' && !costRateHourly) localErrors.costRateHourly = 'Custo por hora é obrigatório';
        if (payType === 'FIXED' && !fixedCostAmount) localErrors.fixedCostAmount = 'Valor fixo é obrigatório';
        if (Object.keys(localErrors).length > 0) {
            setFieldErrors(localErrors);
            toast.error(Object.values(localErrors)[0]);
            return;
        }
        setFieldErrors({});

        setSubmitting(true);
        try {
            const payload: any = {
                workerId: parseInt(selectedWorkerId),
                payType,
                role: role || undefined
            };

            if (jobId) payload.jobId = jobId;
            if (projectId) payload.projectId = projectId;

            if (payType === 'HOURLY' && costRateHourly) {
                payload.costRateHourly = parseFloat(costRateHourly);
            }
            if (payType === 'FIXED' && fixedCostAmount) {
                payload.fixedCostAmount = parseFloat(fixedCostAmount);
            }

            const res = await fetch('/api/workforce/assignments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (data.success) {
                onSuccess();
                resetForm();
            } else {
                const { fieldErrors: serverErrors, firstMessage } = parseApiError(data, 'Erro ao adicionar worker');
                setFieldErrors(serverErrors);
                toast.error(firstMessage);
            }
        } catch (error) {
            toast.error('Erro ao adicionar worker');
        } finally {
            setSubmitting(false);
        }
    };

    const resetForm = () => {
        setSelectedWorkerId('');
        setPayType('HOURLY');
        setCostRateHourly('');
        setFixedCostAmount('');
        setRole('');
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Adicionar Worker</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {/* Worker Select */}
                        <div className="space-y-2">
                            <Label htmlFor="worker">Worker <span className="text-destructive">*</span></Label>
                            <Select
                                value={selectedWorkerId}
                                onValueChange={(v) => {
                                    setSelectedWorkerId(v);
                                    if (fieldErrors.workerId) setFieldErrors(p => { const n = { ...p }; delete n.workerId; return n; });
                                }}
                            >
                                <SelectTrigger aria-invalid={!!fieldErrors.workerId}>
                                    <SelectValue placeholder={loading ? 'Carregando...' : 'Selecione um worker'} />
                                </SelectTrigger>
                                <SelectContent>
                                    {workers.map((worker) => (
                                        <SelectItem key={worker.id} value={worker.id.toString()}>
                                            {worker.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {fieldErrors.workerId && (
                                <p className="text-sm text-destructive">{fieldErrors.workerId}</p>
                            )}
                        </div>

                        {/* Role */}
                        <div className="space-y-2">
                            <Label htmlFor="role">Função neste Job</Label>
                            <Input
                                id="role"
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                placeholder="Ex: Electrician, Helper"
                            />
                        </div>

                        {/* Pay Type */}
                        <div className="space-y-2">
                            <Label htmlFor="payType">Tipo de Pagamento <span className="text-destructive">*</span></Label>
                            <Select value={payType} onValueChange={setPayType}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="HOURLY">Por Hora</SelectItem>
                                    <SelectItem value="FIXED">Valor Fixo</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Rate */}
                        {payType === 'HOURLY' ? (
                            <div className="space-y-2">
                                <Label htmlFor="rate">Custo por Hora (USD) <span className="text-destructive">*</span></Label>
                                <Input
                                    id="rate"
                                    type="number"
                                    step="0.01"
                                    value={costRateHourly}
                                    onChange={(e) => {
                                        setCostRateHourly(e.target.value);
                                        if (fieldErrors.costRateHourly) setFieldErrors(p => { const n = { ...p }; delete n.costRateHourly; return n; });
                                    }}
                                    placeholder="0.00"
                                    aria-invalid={!!fieldErrors.costRateHourly}
                                />
                                {fieldErrors.costRateHourly && (
                                    <p className="text-sm text-destructive">{fieldErrors.costRateHourly}</p>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <Label htmlFor="fixed">Valor Fixo (USD) <span className="text-destructive">*</span></Label>
                                <Input
                                    id="fixed"
                                    type="number"
                                    step="0.01"
                                    value={fixedCostAmount}
                                    onChange={(e) => {
                                        setFixedCostAmount(e.target.value);
                                        if (fieldErrors.fixedCostAmount) setFieldErrors(p => { const n = { ...p }; delete n.fixedCostAmount; return n; });
                                    }}
                                    placeholder="0.00"
                                    aria-invalid={!!fieldErrors.fixedCostAmount}
                                />
                                {fieldErrors.fixedCostAmount && (
                                    <p className="text-sm text-destructive">{fieldErrors.fixedCostAmount}</p>
                                )}
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={submitting}>
                            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Adicionar
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
