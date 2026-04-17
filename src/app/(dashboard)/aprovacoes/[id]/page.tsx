'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  User,
  Calendar,
  DollarSign,
  Paperclip,
  MessageSquare,
  Tag,
  Building,
} from 'lucide-react';
import { Badge } from '@gladpros/ui/badge'
import { Button } from '@gladpros/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@gladpros/ui/card';

interface Aprovador {
  id: string;
  nome: string;
  email: string;
  cargo: string;
  status: 'pendente' | 'aprovado' | 'rejeitado';
  dataAprovacao: string | null;
  comentario: string | null;
}

interface Anexo {
  nome: string;
  url: string;
}

interface Aprovacao {
  id: string;
  titulo: string;
  tipo: string;
  status: string;
  prioridade: string;
  valor: number;
  dataCriacao: string;
  dataLimite: string;
  descricao: string;
  departamento?: string;
  solicitante: { nome: string; email: string };
  aprovadores: Aprovador[];
  anexos: Anexo[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  aprovado:     { label: 'Aprovado',     color: 'bg-emerald-100 text-emerald-700 border-emerald-200',  icon: <CheckCircle className="h-4 w-4" /> },
  rejeitado:    { label: 'Rejeitado',    color: 'bg-red-100 text-red-700 border-red-200',              icon: <XCircle className="h-4 w-4" /> },
  em_aprovacao: { label: 'Aguardando',   color: 'bg-amber-100 text-amber-700 border-amber-200',        icon: <Clock className="h-4 w-4" /> },
  pendente:     { label: 'Pendente',     color: 'bg-muted text-muted-foreground border-border',        icon: <AlertTriangle className="h-4 w-4" /> },
};

const PRIORIDADE_CONFIG: Record<string, { label: string; color: string }> = {
  alta:   { label: 'Alta',   color: 'bg-red-100 text-red-700 border-red-200' },
  media:  { label: 'Média',  color: 'bg-amber-100 text-amber-700 border-amber-200' },
  baixa:  { label: 'Baixa',  color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pendente;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${cfg.color}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

export default function AprovacaoDetalhePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [aprovacao, setAprovacao] = useState<Aprovacao | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [comentario, setComentario] = useState('');
  const [showActionForm, setShowActionForm] = useState<'aprovar' | 'rejeitar' | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/aprovacoes/${id}`);
        if (!res.ok) throw new Error('Aprovação não encontrada');
        const result = await res.json();
        setAprovacao(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar aprovação');
      } finally {
        setLoading(false);
      }
    }
    if (id) load();
  }, [id]);

  const handleAction = async (acao: 'aprovar' | 'rejeitar') => {
    if (!aprovacao) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/aprovacoes/${aprovacao.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao, comentario: comentario || null }),
      });
      if (!res.ok) throw new Error('Falha ao processar ação');
      const result = await res.json();
      setAprovacao(result.data);
      setShowActionForm(null);
      setComentario('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao processar ação');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <Clock className="mx-auto mb-3 h-8 w-8 animate-spin text-blue-500" />
          <p className="text-sm text-muted-foreground">Carregando aprovação...</p>
        </div>
      </div>
    );
  }

  if (error || !aprovacao) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <AlertTriangle className="h-12 w-12 text-amber-500" />
        <p className="text-lg font-medium text-muted-foreground">{error ?? 'Aprovação não encontrada'}</p>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[aprovacao.status] ?? STATUS_CONFIG.pendente;
  const prioridadeCfg = PRIORIDADE_CONFIG[aprovacao.prioridade] ?? PRIORIDADE_CONFIG.media;
  const isPending = aprovacao.status === 'em_aprovacao';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button
            onClick={() => router.back()}
            className="mb-2 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para aprovações
          </button>
          <h1 className="text-2xl font-bold text-foreground">{aprovacao.titulo}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Criado em {formatDate(aprovacao.dataCriacao)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${prioridadeCfg.color}`}>
            {prioridadeCfg.label}
          </span>
          <StatusBadge status={aprovacao.status} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Coluna principal */}
        <div className="space-y-6 lg:col-span-2">
          {/* Descrição */}
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Descrição</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground leading-relaxed">{aprovacao.descricao}</p>
            </CardContent>
          </Card>

          {/* Timeline de aprovadores */}
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Aprovadores ({aprovacao.aprovadores.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {aprovacao.aprovadores.map((apr, idx) => {
                  const aprCfg = STATUS_CONFIG[apr.status] ?? STATUS_CONFIG.pendente;
                  return (
                    <div key={apr.id ?? idx} className="flex items-start gap-4">
                      <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${apr.status === 'aprovado' ? 'bg-emerald-100' : apr.status === 'rejeitado' ? 'bg-red-100' : 'bg-muted'}`}>
                        <span className={`text-xs font-bold ${apr.status === 'aprovado' ? 'text-emerald-600' : apr.status === 'rejeitado' ? 'text-red-600' : 'text-muted-foreground'}`}>
                          {idx + 1}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium text-foreground">{apr.nome}</p>
                            <p className="text-xs text-muted-foreground">{apr.cargo}</p>
                          </div>
                          <StatusBadge status={apr.status} />
                        </div>
                        {apr.comentario && (
                          <div className="mt-2 flex items-start gap-2 rounded-lg bg-muted p-2.5">
                            <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground italic">"{apr.comentario}"</p>
                          </div>
                        )}
                        {apr.dataAprovacao && (
                          <p className="mt-1 text-xs text-muted-foreground">{formatDate(apr.dataAprovacao)}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Anexos */}
          {aprovacao.anexos.length > 0 && (
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Anexos</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {aprovacao.anexos.map((anexo, idx) => (
                    <li key={idx}>
                      <a
                        href={anexo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 rounded-lg border border-border p-2.5 text-sm text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        <Paperclip className="h-4 w-4 shrink-0" />
                        {anexo.nome}
                      </a>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Formulário de ação */}
          {isPending && showActionForm && (
            <Card className={`border-2 shadow-sm ${showActionForm === 'aprovar' ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">
                  {showActionForm === 'aprovar' ? '✅ Confirmar Aprovação' : '❌ Confirmar Rejeição'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Comentário {showActionForm === 'rejeitar' ? '(obrigatório)' : '(opcional)'}
                  </label>
                  <textarea
                    value={comentario}
                    onChange={(e) => setComentario(e.target.value)}
                    rows={3}
                    placeholder="Adicione um comentário..."
                    className="w-full rounded-lg border border-border p-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleAction(showActionForm)}
                    disabled={actionLoading || (showActionForm === 'rejeitar' && !comentario.trim())}
                    className={showActionForm === 'aprovar' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}
                  >
                    {actionLoading ? 'Processando...' : showActionForm === 'aprovar' ? 'Confirmar Aprovação' : 'Confirmar Rejeição'}
                  </Button>
                  <Button variant="outline" onClick={() => { setShowActionForm(null); setComentario(''); }}>
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Info rápida */}
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Informações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2.5">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Tipo</p>
                  <p className="text-sm font-medium capitalize">{aprovacao.tipo}</p>
                </div>
              </div>
              {aprovacao.departamento && (
                <div className="flex items-center gap-2.5">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Departamento</p>
                    <p className="text-sm font-medium">{aprovacao.departamento}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2.5">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Valor</p>
                  <p className="text-base font-bold text-emerald-600">{formatCurrency(aprovacao.valor)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Prazo</p>
                  <p className="text-sm font-medium">{formatDate(aprovacao.dataLimite)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Solicitante</p>
                  <p className="text-sm font-medium">{aprovacao.solicitante.nome}</p>
                  <p className="text-xs text-muted-foreground">{aprovacao.solicitante.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ações */}
          {isPending && !showActionForm && (
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Ações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => setShowActionForm('aprovar')}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Aprovar
                </Button>
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => setShowActionForm('rejeitar')}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Rejeitar
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Status final */}
          {!isPending && (
            <Card className={`border-2 shadow-sm ${aprovacao.status === 'aprovado' ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
              <CardContent className="flex items-center gap-3 py-4">
                {aprovacao.status === 'aprovado'
                  ? <CheckCircle className="h-8 w-8 text-emerald-500" />
                  : <XCircle className="h-8 w-8 text-red-500" />
                }
                <div>
                  <p className="font-semibold">{statusCfg.label}</p>
                  <p className="text-xs text-muted-foreground">Processo encerrado</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
