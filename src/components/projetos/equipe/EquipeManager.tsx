'use client';

/**
 * EquipeManager - Gerenciador de Equipe do Projeto
 * 
 * Integrado com o módulo Workforce v2.
 * Usa APIs de Assignments para gerenciar workers no projeto.
 */

import { useState, useEffect } from 'react';
import { Plus, Trash2, User, DollarSign, Clock, Loader2 } from 'lucide-react';
import { Badge } from '@gladpros/ui/badge'
import { Button } from '@gladpros/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@gladpros/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@gladpros/ui/dialog';
import { Label } from "@gladpros/ui/label";
import { Input } from "@gladpros/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@gladpros/ui/select";
import { toast } from 'sonner';
import { parseApiError } from '@/lib/api/parseApiError';

interface EquipeManagerProps {
  projetoId: number;
}

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

interface WorkerOption {
  id: number;
  name: string;
  defaultHourlyRate?: number | null;
}

export function EquipeManager({ projetoId }: EquipeManagerProps) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [workers, setWorkers] = useState<WorkerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [selectedWorkerId, setSelectedWorkerId] = useState('');
  const [payType, setPayType] = useState('HOURLY');
  const [costRateHourly, setCostRateHourly] = useState('');
  const [fixedCostAmount, setFixedCostAmount] = useState('');
  const [role, setRole] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchAssignments();
    fetchWorkers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projetoId]);

  const fetchAssignments = async () => {
    try {
      const res = await fetch(`/api/workforce/assignments?projectId=${projetoId}&status=ACTIVE`);
      if (res.ok) {
        const data = await res.json();
        setAssignments(data.data || data || []);
      }
    } catch (error) {
      console.error('Erro ao buscar assignments', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkers = async () => {
    try {
      const res = await fetch('/api/workforce/workers?status=ACTIVE');
      if (res.ok) {
        const data = await res.json();
        const list = data.data?.data || data.data || data || [];
        setWorkers(list);
      }
    } catch (error) {
      console.error('Erro ao buscar workers', error);
    }
  };

  // Auto-fill rate when worker is selected
  useEffect(() => {
    if (selectedWorkerId) {
      const w = workers.find(c => c.id === parseInt(selectedWorkerId));
      if (w?.defaultHourlyRate) {
        setCostRateHourly(w.defaultHourlyRate.toString());
      }
    }
  }, [selectedWorkerId, workers]);

  const handleAlocar = async () => {
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
      const payload: {
        workerId: number;
        projectId: number;
        payType: string;
        role?: string;
        costRateHourly?: number;
        fixedCostAmount?: number;
      } = {
        workerId: parseInt(selectedWorkerId),
        projectId: projetoId,
        payType,
        role: role || undefined
      };

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

      if (res.ok && data.success !== false) {
        toast.success('Worker adicionado à equipe');
        setIsDialogOpen(false);
        fetchAssignments();
        // Reset form
        setSelectedWorkerId('');
        setPayType('HOURLY');
        setCostRateHourly('');
        setFixedCostAmount('');
        setRole('');
      } else {
        const { fieldErrors: serverErrors, firstMessage } = parseApiError(data, 'Erro ao adicionar worker');
        setFieldErrors(serverErrors);
        toast.error(firstMessage);
      }
    } catch (error) {
      toast.error('Erro de conexão');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemover = async (id: number) => {
    if (!confirm('Tem certeza que deseja remover este worker do projeto?')) return;

    try {
      const res = await fetch(`/api/workforce/assignments/${id}`, {
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

  const formatCurrency = (value: number | null | undefined) => {
    if (!value) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  const statusColors: Record<string, string> = {
    ACTIVE: 'bg-green-500/10 text-green-600',
    COMPLETED: 'bg-brand-primary/10 text-brand-primary',
    CANCELLED: 'bg-muted text-foreground'
  };

  // Calculate total cost
  const totalFixedCost = assignments
    .filter(a => a.payType === 'FIXED')
    .reduce((sum, a) => sum + (Number(a.fixedCostAmount) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Equipe do Projeto</h3>
          <p className="text-sm text-muted-foreground">
            Gerencie os workers alocados neste projeto e seus rates.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" aria-label="Adicionar worker ao projeto">
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Worker</DialogTitle>
              <DialogDescription>
                Adicione um membro da equipe ao projeto com rate definido.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Worker <span className="text-destructive">*</span></Label>
                <Select
                  value={selectedWorkerId}
                  onValueChange={(v) => {
                    setSelectedWorkerId(v);
                    if (fieldErrors.workerId) setFieldErrors(p => { const n = { ...p }; delete n.workerId; return n; });
                  }}
                >
                  <SelectTrigger aria-invalid={!!fieldErrors.workerId}>
                    <SelectValue placeholder="Selecione um worker..." />
                  </SelectTrigger>
                  <SelectContent>
                    {workers.map((w) => (
                      <SelectItem key={w.id} value={w.id.toString()}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldErrors.workerId && <p className="text-sm text-destructive">{fieldErrors.workerId}</p>}
              </div>
              <div className="grid gap-2">
                <Label>Função neste Projeto</Label>
                <Input
                  placeholder="Ex: Electrician, Foreman"
                  value={role}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRole(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Tipo de Pagamento <span className="text-destructive">*</span></Label>
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
              {payType === 'HOURLY' ? (
                <div className="grid gap-2">
                  <Label>Custo por Hora (USD) <span className="text-destructive">*</span></Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={costRateHourly}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setCostRateHourly(e.target.value);
                      if (fieldErrors.costRateHourly) setFieldErrors(p => { const n = { ...p }; delete n.costRateHourly; return n; });
                    }}
                    aria-invalid={!!fieldErrors.costRateHourly}
                  />
                  {fieldErrors.costRateHourly && <p className="text-sm text-destructive">{fieldErrors.costRateHourly}</p>}
                </div>
              ) : (
                <div className="grid gap-2">
                  <Label>Valor Fixo (USD) <span className="text-destructive">*</span></Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={fixedCostAmount}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setFixedCostAmount(e.target.value);
                      if (fieldErrors.fixedCostAmount) setFieldErrors(p => { const n = { ...p }; delete n.fixedCostAmount; return n; });
                    }}
                    aria-invalid={!!fieldErrors.fixedCostAmount}
                  />
                  {fieldErrors.fixedCostAmount && <p className="text-sm text-destructive">{fieldErrors.fixedCostAmount}</p>}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleAlocar} disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {submitting ? 'Salvando...' : 'Adicionar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      {assignments.length > 0 && (
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span>{assignments.length} worker{assignments.length !== 1 ? 's' : ''}</span>
          </div>
          {totalFixedCost > 0 && (
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span>Custo Fixo: {formatCurrency(totalFixedCost)}</span>
            </div>
          )}
        </div>
      )}

      {/* Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {assignments.map((assignment) => (
          <Card key={assignment.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
              <div className="w-10 h-10 rounded-full bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                {assignment.worker.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 overflow-hidden">
                <CardTitle className="text-base truncate">
                  {assignment.worker.name}
                </CardTitle>
                <CardDescription className="truncate">
                  {assignment.role || 'Worker'}
                </CardDescription>
              </div>
              <Badge className={statusColors[assignment.status]}>
                {assignment.status}
              </Badge>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  <span>
                    {assignment.payType === 'HOURLY'
                      ? `${formatCurrency(Number(assignment.costRateHourly))}/hr`
                      : formatCurrency(Number(assignment.fixedCostAmount))}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>
                    {assignment.payType === 'HOURLY' ? 'Por Hora' : 'Valor Fixo'}
                  </span>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleRemover(assignment.id)}
                  aria-label="Remover worker do projeto"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remover
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {assignments.length === 0 && !loading && (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-center text-muted-foreground border rounded-2xl border-dashed">
            <User className="h-12 w-12 mb-4 opacity-20" />
            <p>Nenhum worker alocado neste projeto.</p>
            <p className="text-sm">Clique em &quot;Adicionar Worker&quot; para começar.</p>
          </div>
        )}
        {loading && (
          <div className="col-span-full flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
    </div>
  );
}

