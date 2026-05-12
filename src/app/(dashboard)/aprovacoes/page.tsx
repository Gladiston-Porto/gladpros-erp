'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@gladpros/ui/card";
import { Badge } from "@gladpros/ui/badge";
import { Button } from "@gladpros/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@gladpros/ui/tabs";
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Plus,
  Filter,
  Search,
  Eye,
  User,
  ShieldCheck
} from 'lucide-react';
import { ModulePageHeader } from "@gladpros/ui/module-page-header";
import { Input } from "@gladpros/ui/input";
// TODO: Refatorar para usar versão em packages/ após mover código antigo
// import { NewApprovalForm } from '@/modules/aprovacoes/components/NewApprovalForm';
// import { ApprovalModal } from '@/modules/aprovacoes/components/ApprovalModal';
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';
import { useNotifications } from '@/shared/hooks/useNotifications';

interface Approval {
  id: string;
  titulo: string;
  tipo: string;
  status: string;
  prioridade: string;
  valor: number;
  dataCriacao: string;
  dataLimite: string;
  descricao: string;
  solicitante: {
    nome: string;
    email: string;
  };
  aprovadores: Array<{
    nome: string;
    status: string;
    cargo: string;
  }>;
}

export default function ApprovalsPage() {
  const router = useRouter();
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('pendentes');
  const [showNewForm, setShowNewForm] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);
  const [approvalAction, setApprovalAction] = useState<'aprovar' | 'rejeitar' | null>(null);

  // Notifications hook
  const { notifications, unreadCount, markAsRead, markAllAsRead, sendNotification } = useNotifications('user-123'); // Mock user ID

  const fetchApprovals = async (status?: string) => {
    try {
      setLoading(true);
      const url = status ? `/api/aprovacoes?status=${status}` : '/api/aprovacoes';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch approvals');
      const result = await response.json();
      setApprovals(result.data);
    } catch (error) {
      console.error('Error fetching approvals:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals(activeTab === 'pendentes' ? 'em_aprovacao' : undefined);
  }, [activeTab]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aprovado': return 'bg-green-500';
      case 'rejeitado': return 'bg-red-500';
      case 'em_aprovacao': return 'bg-yellow-500';
      default: return 'bg-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'aprovado': return <CheckCircle className="h-4 w-4" />;
      case 'rejeitado': return <XCircle className="h-4 w-4" />;
      case 'em_aprovacao': return <Clock className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (prioridade: string) => {
    switch (prioridade) {
      case 'alta': return 'destructive';
      case 'media': return 'default';
      case 'baixa': return 'secondary';
      default: return 'outline';
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  const handleApprovalAction = (approval: Approval, action: 'aprovar' | 'rejeitar') => {
    setSelectedApproval(approval);
    setApprovalAction(action);
    setShowApprovalModal(true);
  };

   
  const _submitApprovalAction = async (comentario?: string) => {
    if (!selectedApproval || !approvalAction) return;

    try {
      const response = await fetch(`/api/aprovacoes/${selectedApproval.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          acao: approvalAction,
          comentario: comentario || null
        }),
      });

      if (response.ok) {
        // Send notification to the requester
        try {
          await sendNotification({
            type: approvalAction === 'aprovar' ? 'approval_status' : 'approval_rejected',
            title: approvalAction === 'aprovar' ? 'Solicitação Aprovada' : 'Solicitação Rejeitada',
            message: `Sua solicitação "${selectedApproval.titulo}" foi ${approvalAction === 'aprovar' ? 'aprovada' : 'rejeitada'}`,
            data: {
              approvalId: selectedApproval.id,
              status: approvalAction === 'aprovar' ? 'approved' : 'rejected',
              approvedBy: 'Current User', // In real app, get from auth context
              comment: comentario
            }
          });
        } catch (notificationError) {
          console.error('Failed to send notification:', notificationError);
          // Don't fail the approval if notification fails
        }

        alert(`Solicitação ${approvalAction === 'aprovar' ? 'aprovada' : 'rejeitada'} com sucesso!`);
        fetchApprovals(activeTab === 'pendentes' ? 'em_aprovacao' : undefined);
        setShowApprovalModal(false);
        setSelectedApproval(null);
        setApprovalAction(null);
      } else {
        alert('Erro ao processar solicitação');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Erro ao processar solicitação');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const filteredApprovals = approvals.filter(approval =>
    approval.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    approval.solicitante.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Clock className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Carregando aprovações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ModulePageHeader
        title="Aprovações"
        description="Gerencie solicitações e aprovações"
        icon={<ShieldCheck />}
        accentColor="#0098DA"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Aprovações' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <NotificationDropdown
              notifications={notifications}
              unreadCount={unreadCount}
              onMarkAsRead={markAsRead}
              onMarkAllAsRead={markAllAsRead}
            />
            <Button onClick={() => setShowNewForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Solicitação
            </Button>
          </div>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pendentes">Pendentes</TabsTrigger>
          <TabsTrigger value="todas">Todas</TabsTrigger>
          <TabsTrigger value="aprovadas">Aprovadas</TabsTrigger>
          <TabsTrigger value="rejeitadas">Rejeitadas</TabsTrigger>
        </TabsList>

        <div className="flex items-center space-x-4 mt-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar aprovações..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
        </div>

        <TabsContent value={activeTab} className="space-y-4">
          {filteredApprovals.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium">Nenhuma aprovação encontrada</h3>
                  <p className="text-muted-foreground">
                    Não há aprovações com os filtros selecionados.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            filteredApprovals.map((approval) => (
              <Card key={approval.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{approval.titulo}</CardTitle>
                      <CardDescription>{approval.descricao}</CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={getPriorityColor(approval.prioridade)}>
                        {approval.prioridade}
                      </Badge>
                      <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-white text-xs ${getStatusColor(approval.status)}`}>
                        {getStatusIcon(approval.status)}
                        <span className="capitalize">{approval.status.replace('_', ' ')}</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{approval.solicitante.nome}</p>
                        <p className="text-xs text-muted-foreground">{approval.solicitante.email}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Valor</p>
                      <p className="text-lg font-bold text-green-600">{formatCurrency(approval.valor)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Prazo</p>
                      <p className="text-sm">{formatDate(approval.dataLimite)}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <span>Criado em {formatDate(approval.dataCriacao)}</span>
                      <span>{approval.aprovadores.length} aprovadores</span>
                    </div>
                    <div className="flex space-x-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => router.push(`/aprovacoes/${approval.id}`)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Ver Detalhes
                      </Button>
                      {approval.status === 'em_aprovacao' && (
                        <>
                          <Button type="button" size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleApprovalAction(approval, 'aprovar')}>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Aprovar
                          </Button>
                          <Button type="button" size="sm" variant="destructive" onClick={() => handleApprovalAction(approval, 'rejeitar')}>
                            <XCircle className="h-4 w-4 mr-2" />
                            Rejeitar
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {showNewForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-card border border-border p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Novo Formulário de Aprovação</h3>
            <p className="text-muted-foreground mb-4">Em refatoração - usar versão em packages/</p>
            <Button type="button" onClick={() => setShowNewForm(false)}>Fechar</Button>
          </div>
        </div>
      )}

      {showApprovalModal && selectedApproval && approvalAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-card border border-border p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Modal de Aprovação</h3>
            <p className="text-muted-foreground mb-4">Em refatoração - usar versão em packages/</p>
            <Button type="button" onClick={() => { setShowApprovalModal(false); setSelectedApproval(null); setApprovalAction(null); }}>Fechar</Button>
          </div>
        </div>
      )}
    </div>
  );
}
