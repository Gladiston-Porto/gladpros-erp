"use client";

/**
 * Página: /rh/workers/[id]
 * 
 * Detalhes e edição de Worker (W-2 / 1099 Contractor)
 * Usa model Worker e WorkerForm
 */

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Badge } from "@gladpros/ui/badge"
import { Button } from "@gladpros/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@gladpros/ui/card"
import { ModulePageHeader } from "@gladpros/ui/module-page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  DollarSign,
  Loader2,
  Building2,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Edit,
  ArrowLeft
} from "lucide-react";
import Link from "next/link";
import { WorkerForm } from "@/components/workforce";

interface Worker {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  type: 'INDIVIDUAL' | 'COMPANY';
  companyName: string | null;
  ein: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  defaultHourlyRate: number | null;
  financialProfile: {
    paymentMethod: string;
    payeeName: string | null;
    accountLast4: string | null;
    taxIdLast4: string | null;
    preferredPayday: string | null;
  } | null;
}

interface Assignment {
  id: number;
  status: string;
  payType: 'HOURLY' | 'FIXED';
  costRateHourly?: number | null;
  fixedCostAmount?: number | null;
  role?: string | null;
  effectiveFrom: string;
  job?: { id: number; ticketNumber: string; title: string } | null;
  project?: { id: number; numeroProjeto: string; titulo: string } | null;
}

interface Payable {
  id: number;
  status: string;
  totalAmount: number;
  paidAt?: string | null;
  paymentMethod?: string | null;
}

export default function WorkerDetailPage() {
  const params = useParams();
  const [worker, setWorker] = useState<Worker | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [payables, setPayables] = useState<Payable[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingWorkforce, setLoadingWorkforce] = useState(true);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    const fetchWorker = async () => {
      try {
        const res = await fetch(`/api/workforce/workers/${params.id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setWorker(data.data);
          }
        }
      } catch (error) {
        console.error("Erro ao buscar worker:", error);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchWorker();
    }
  }, [params.id]);

  // Fetch workforce data
  useEffect(() => {
    const fetchWorkforceData = async () => {
      if (!worker?.id) return;

      setLoadingWorkforce(true);
      try {
        const [assignmentsRes, payablesRes] = await Promise.all([
          fetch(`/api/workforce/assignments?workerId=${worker.id}`),
          fetch(`/api/workforce/payables?workerId=${worker.id}`)
        ]);

        if (assignmentsRes.ok) {
          const data = await assignmentsRes.json();
          setAssignments(data.data || []);
        }

        if (payablesRes.ok) {
          const data = await payablesRes.json();
          setPayables(data.data || []);
        }
      } catch (error) {
        console.error("Erro ao buscar dados workforce:", error);
      } finally {
        setLoadingWorkforce(false);
      }
    };

    fetchWorkforceData();
  }, [worker?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!worker) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Worker não encontrado.</p>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  const statusColors: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-800',
    INACTIVE: 'bg-muted text-foreground',
    SUSPENDED: 'bg-red-100 text-red-800',
    COMPLETED: 'bg-blue-100 text-blue-800',
    CANCELLED: 'bg-muted text-foreground',
    PENDING: 'bg-yellow-100 text-yellow-800',
    APPROVED: 'bg-blue-100 text-blue-800',
    PAID: 'bg-green-100 text-green-800'
  };

  const totalPago = payables
    .filter(p => p.status === 'PAID')
    .reduce((sum, p) => sum + Number(p.totalAmount), 0);

  const totalPendente = payables
    .filter(p => p.status === 'PENDING' || p.status === 'APPROVED')
    .reduce((sum, p) => sum + Number(p.totalAmount), 0);

  // Converter worker para formato do WorkerForm
  const workerFormData = {
    name: worker.name,
    email: worker.email || '',
    phone: worker.phone || '',
    addressLine1: worker.addressLine1 || '',
    addressLine2: worker.addressLine2 || '',
    city: worker.city || '',
    state: worker.state || '',
    zip: worker.zip || '',
    type: worker.type,
    companyName: worker.companyName || '',
    ein: worker.ein || '',
    status: worker.status,
    defaultHourlyRate: worker.defaultHourlyRate?.toString() || '',
    financialProfile: {
      paymentMethod: worker.financialProfile?.paymentMethod || 'CHECK',
      payeeName: worker.financialProfile?.payeeName || '',
      accountLast4: worker.financialProfile?.accountLast4 || '',
      taxIdLast4: worker.financialProfile?.taxIdLast4 || '',
      preferredPayday: worker.financialProfile?.preferredPayday || ''
    }
  };

  if (editMode) {
    return (
      <div className="space-y-8">
        <ModulePageHeader
          title="Editar Worker"
          description={`Editando informações de ${worker.name}`}
          icon={<Users />}
          accentColor="#0098DA"
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "RH", href: "/rh" },
            { label: "Workers", href: "/rh/workers" },
            { label: worker.name },
            { label: "Editar" }
          ]}
        />
        <WorkerForm
          initialData={workerFormData}
          workerId={worker.id}
          isEditing
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <ModulePageHeader
        title={worker.name}
        description={worker.type === 'COMPANY' ? worker.companyName || 'Empresa' : 'Individual'}
        icon={<Users />}
        accentColor="#0098DA"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "RH", href: "/rh" },
          { label: "Workers", href: "/rh/workers" },
          { label: worker.name },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/rh/workers">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            </Link>
            <Button size="sm" onClick={() => setEditMode(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          </div>
        }
      />

      {/* Header Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className={`
              w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold
              ${worker.type === 'COMPANY' ? 'bg-purple-500' : 'bg-blue-500'}
            `}>
              {worker.type === 'COMPANY' ? (
                <Building2 className="h-10 w-10" />
              ) : (
                worker.name.charAt(0).toUpperCase()
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold">{worker.name}</h2>
                <Badge className={statusColors[worker.status]}>
                  {worker.status}
                </Badge>
                <Badge className={worker.type === 'COMPANY' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}>
                  {worker.type === 'COMPANY' ? 'Empresa' : 'Individual'}
                </Badge>
              </div>

              {worker.companyName && (
                <p className="text-muted-foreground mb-2">{worker.companyName}</p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                {worker.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span>{worker.email}</span>
                  </div>
                )}
                {worker.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{worker.phone}</span>
                  </div>
                )}
                {worker.city && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{worker.city}, {worker.state}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="text-right space-y-2">
              {worker.defaultHourlyRate && (
                <div>
                  <p className="text-2xl font-bold text-green-600">
                    ${worker.defaultHourlyRate}/hr
                  </p>
                  <p className="text-sm text-muted-foreground">Taxa Padrão</p>
                </div>
              )}
              {worker.financialProfile && (
                <div>
                  <Badge className="bg-muted">
                    {worker.financialProfile.paymentMethod}
                  </Badge>
                  {worker.financialProfile.accountLast4 && (
                    <p className="text-sm text-muted-foreground mt-1">
                      ****{worker.financialProfile.accountLast4}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="assignments" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="assignments" className="gap-2">
            <Briefcase className="h-4 w-4" />
            Assignments ({assignments.length})
          </TabsTrigger>
          <TabsTrigger value="pagamentos" className="gap-2">
            <DollarSign className="h-4 w-4" />
            Pagamentos ({payables.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assignments">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Atribuições em Jobs/Projetos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingWorkforce ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : assignments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p>Nenhuma atribuição encontrada</p>
                  <p className="text-sm">Este worker ainda não foi atribuído a nenhum job ou projeto.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {assignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50"
                    >
                      <div>
                        <div className="font-medium">
                          {assignment.job
                            ? `OS #${assignment.job.ticketNumber} - ${assignment.job.title}`
                            : assignment.project
                              ? `Projeto #${assignment.project.numeroProjeto} - ${assignment.project.titulo}`
                              : 'Sem vínculo'}
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          <span>{assignment.role || 'Worker'}</span>
                          <span>•</span>
                          <span>
                            {assignment.payType === 'HOURLY'
                              ? `${formatCurrency(Number(assignment.costRateHourly))}/hr`
                              : formatCurrency(Number(assignment.fixedCostAmount))}
                          </span>
                        </div>
                      </div>
                      <Badge className={statusColors[assignment.status]}>
                        {assignment.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pagamentos">
          {/* Resumo de Pagamentos */}
          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-600">{formatCurrency(totalPago)}</div>
                <p className="text-sm text-muted-foreground">Total Pago</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-yellow-600">{formatCurrency(totalPendente)}</div>
                <p className="text-sm text-muted-foreground">Pendente/Aprovado</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{payables.length}</div>
                <p className="text-sm text-muted-foreground">Total de Payables</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Histórico de Pagamentos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingWorkforce ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : payables.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <DollarSign className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p>Nenhum pagamento encontrado</p>
                  <p className="text-sm">Pagamentos serão exibidos aqui quando forem gerados.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {payables.map((payable) => (
                    <div
                      key={payable.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50"
                    >
                      <div>
                        <div className="font-medium">
                          Payable #{payable.id}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {payable.paidAt
                            ? `Pago em ${new Date(payable.paidAt).toLocaleDateString('en-US')}`
                            : 'Aguardando pagamento'}
                          {payable.paymentMethod && ` via ${payable.paymentMethod}`}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{formatCurrency(Number(payable.totalAmount))}</div>
                        <Badge className={statusColors[payable.status]}>
                          {payable.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}