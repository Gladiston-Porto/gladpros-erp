'use client';

// src/components/reports/ReportBuilder.tsx
import { parseApiError } from "@/lib/api/parseApiError";

import { useState, useEffect } from 'react';
import { Save, X, Plus, Trash2 } from 'lucide-react';
import { Badge } from "@gladpros/ui/badge"
import { Button } from "@gladpros/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@gladpros/ui/card"
import { Checkbox } from "@gladpros/ui/checkbox"
import { Input } from "@gladpros/ui/input"
import { Label } from "@gladpros/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@gladpros/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@gladpros/ui/tabs"
import { Textarea } from "@gladpros/ui/textarea";








import { useToast } from "@gladpros/ui/toast";

interface Report {
  id: string;
  name: string;
  type: 'clientes' | 'propostas' | 'financeiro' | 'usuarios';
  status: 'draft' | 'published' | 'archived';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    recipients: string[];
  };
}

interface ReportBuilderProps {
  report?: Report | null;
  onSave: () => void;
  onCancel: () => void;
}

interface ReportField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'select';
  required: boolean;
  options?: string[];
}

interface ReportFilter {
  id: string;
  field: string;
  operator: 'equals' | 'contains' | 'greater' | 'less' | 'between';
  value: string;
  value2?: string;
}

const AVAILABLE_FIELDS: Record<string, ReportField[]> = {
  clientes: [
    { id: 'nome', name: 'Nome', type: 'text', required: true },
    { id: 'email', name: 'E-mail', type: 'text', required: true },
    { id: 'telefone', name: 'Telefone', type: 'text', required: false },
    { id: 'cidade', name: 'Cidade', type: 'text', required: false },
    { id: 'estado', name: 'Estado', type: 'text', required: false },
    { id: 'dataCadastro', name: 'Data de Cadastro', type: 'date', required: false },
    { id: 'status', name: 'Status', type: 'select', required: false, options: ['Ativo', 'Inativo', 'Bloqueado'] },
  ],
  propostas: [
    { id: 'numeroProposta', name: 'Número da Proposta', type: 'text', required: true },
    { id: 'cliente', name: 'Cliente', type: 'text', required: true },
    { id: 'valor', name: 'Valor', type: 'number', required: true },
    { id: 'status', name: 'Status', type: 'select', required: true, options: ['Rascunho', 'Enviada', 'Aprovada', 'Rejeitada'] },
    { id: 'dataCriacao', name: 'Data de Criação', type: 'date', required: false },
    { id: 'dataEnvio', name: 'Data de Envio', type: 'date', required: false },
  ],
  financeiro: [
    { id: 'tipo', name: 'Tipo', type: 'select', required: true, options: ['Receita', 'Despesa'] },
    { id: 'valor', name: 'Valor', type: 'number', required: true },
    { id: 'categoria', name: 'Categoria', type: 'text', required: false },
    { id: 'data', name: 'Data', type: 'date', required: true },
    { id: 'descricao', name: 'Descrição', type: 'text', required: false },
  ],
  usuarios: [
    { id: 'nome', name: 'Nome', type: 'text', required: true },
    { id: 'email', name: 'E-mail', type: 'text', required: true },
    { id: 'role', name: 'Função', type: 'select', required: true, options: ['Admin', 'User', 'Manager'] },
    { id: 'status', name: 'Status', type: 'select', required: false, options: ['Ativo', 'Inativo'] },
    { id: 'ultimoLogin', name: 'Último Login', type: 'date', required: false },
  ],
};

export function ReportBuilder({ report, onSave, onCancel }: ReportBuilderProps) {
  const toast = useToast();
  const [reportName, setReportName] = useState(report?.name || '');
  const [reportType, setReportType] = useState<string>(report?.type || 'clientes');
  const [description, setDescription] = useState('');
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [filters, setFilters] = useState<ReportFilter[]>([]);
  const [schedule, setSchedule] = useState({
    enabled: false,
    frequency: 'weekly' as 'daily' | 'weekly' | 'monthly',
    recipients: [] as string[],
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (report?.schedule) {
      setSchedule({
        enabled: true,
        frequency: report.schedule.frequency,
        recipients: report.schedule.recipients,
      });
    }
  }, [report]);

  const availableFields = AVAILABLE_FIELDS[reportType] || [];

  const handleFieldToggle = (fieldId: string) => {
    setSelectedFields(prev =>
      prev.includes(fieldId)
        ? prev.filter(id => id !== fieldId)
        : [...prev, fieldId]
    );
  };

  const handleAddFilter = () => {
    const newFilter: ReportFilter = {
      id: Date.now().toString(),
      field: availableFields[0]?.id || '',
      operator: 'equals',
      value: '',
    };
    setFilters(prev => [...prev, newFilter]);
  };

  const handleRemoveFilter = (filterId: string) => {
    setFilters(prev => prev.filter(f => f.id !== filterId));
  };

  const handleFilterChange = (filterId: string, updates: Partial<ReportFilter>) => {
    setFilters(prev => prev.map(f =>
      f.id === filterId ? { ...f, ...updates } : f
    ));
  };

  const handleSave = async () => {
    if (!reportName.trim()) {
      toast.error('Erro', 'Nome do relatório é obrigatório');
      return;
    }

    if (selectedFields.length === 0) {
      toast.error('Erro', 'Selecione pelo menos um campo');
      return;
    }

    setIsSaving(true);
    try {
      const reportData = {
        name: reportName,
        type: reportType,
        description,
        fields: selectedFields,
        filters,
        schedule: schedule.enabled ? schedule : undefined,
        status: 'draft' as const,
      };

      const url = report ? `/api/reports/${report.id}` : '/api/reports';
      const method = report ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData),
      });

      if (response.ok) {
        toast.success('Sucesso', `Relatório ${report ? 'atualizado' : 'criado'} com sucesso`);
        onSave();
      } else {
        const data = await response.json().catch(() => ({}));
        const { firstMessage } = parseApiError(data, 'Erro ao salvar relatório');
        toast.error('Erro', firstMessage);
      }
    } catch {
      toast.error('Erro', 'Erro ao salvar relatório');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {report ? 'Editar Relatório' : 'Criar Novo Relatório'}
          </h2>
          <p className="text-gray-600 mt-1">
            Configure os campos, filtros e agendamento do seu relatório
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={onCancel}>
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="config" className="space-y-6">
        <TabsList>
          <TabsTrigger value="config">Configuração</TabsTrigger>
          <TabsTrigger value="fields">Campos</TabsTrigger>
          <TabsTrigger value="filters">Filtros</TabsTrigger>
          <TabsTrigger value="schedule">Agendamento</TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nome do Relatório</Label>
                  <Input
                    id="name"
                    value={reportName}
                    onChange={(e) => setReportName(e.target.value)}
                    placeholder="Ex: Relatório de Clientes Ativos"
                  />
                </div>
                <div>
                  <Label htmlFor="type">Tipo de Relatório</Label>
                  <Select value={reportType} onValueChange={setReportType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="clientes">Clientes</SelectItem>
                      <SelectItem value="propostas">Propostas</SelectItem>
                      <SelectItem value="financeiro">Financeiro</SelectItem>
                      <SelectItem value="usuarios">Usuários</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva o propósito deste relatório..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fields" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Seleção de Campos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableFields.map((field) => (
                  <div key={field.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={field.id}
                      checked={selectedFields.includes(field.id)}
                      onCheckedChange={() => handleFieldToggle(field.id)}
                    />
                    <Label htmlFor={field.id} className="flex-1">
                      <div className="flex items-center justify-between">
                        <span>{field.name}</span>
                        {field.required && (
                          <Badge variant="secondary" className="text-xs">
                            Obrigatório
                          </Badge>
                        )}
                      </div>
                    </Label>
                  </div>
                ))}
              </div>
              {selectedFields.length === 0 && (
                <p className="text-sm text-gray-500 mt-4">
                  Selecione os campos que deseja incluir no relatório
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="filters" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Filtros
                <Button onClick={handleAddFilter} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Filtro
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {filters.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">
                  Nenhum filtro configurado. Adicione filtros para refinar os dados do relatório.
                </p>
              ) : (
                filters.map((filter) => (
                  <div key={filter.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                    <Select
                      value={filter.field}
                      onValueChange={(value) => handleFilterChange(filter.id, { field: value })}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableFields.map((field) => (
                          <SelectItem key={field.id} value={field.id}>
                            {field.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={filter.operator}
                      onValueChange={(value: "equals" | "contains" | "greater" | "less" | "between") => handleFilterChange(filter.id, { operator: value })}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="equals">Igual a</SelectItem>
                        <SelectItem value="contains">Contém</SelectItem>
                        <SelectItem value="greater">Maior que</SelectItem>
                        <SelectItem value="less">Menor que</SelectItem>
                        <SelectItem value="between">Entre</SelectItem>
                      </SelectContent>
                    </Select>

                    <Input
                      value={filter.value}
                      onChange={(e) => handleFilterChange(filter.id, { value: e.target.value })}
                      placeholder="Valor"
                      className="flex-1"
                    />

                    {filter.operator === 'between' && (
                      <Input
                        value={filter.value2 || ''}
                        onChange={(e) => handleFilterChange(filter.id, { value2: e.target.value })}
                        placeholder="Valor 2"
                        className="w-32"
                      />
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveFilter(filter.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Agendamento Automático</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="schedule-enabled"
                  checked={schedule.enabled}
                  onCheckedChange={(checked) => setSchedule(prev => ({ ...prev, enabled: !!checked }))}
                />
                <Label htmlFor="schedule-enabled">
                  Habilitar agendamento automático
                </Label>
              </div>

              {schedule.enabled && (
                <div className="space-y-4 ml-6">
                  <div>
                    <Label>Frequência</Label>
                    <Select
                      value={schedule.frequency}
                      onValueChange={(value: "daily" | "weekly" | "monthly") => setSchedule(prev => ({ ...prev, frequency: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Diariamente</SelectItem>
                        <SelectItem value="weekly">Semanalmente</SelectItem>
                        <SelectItem value="monthly">Mensalmente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Destinatários (e-mails separados por vírgula)</Label>
                    <Textarea
                      value={schedule.recipients.join(', ')}
                      onChange={(e) => setSchedule(prev => ({
                        ...prev,
                        recipients: e.target.value.split(',').map(email => email.trim()).filter(Boolean)
                      }))}
                      placeholder="email1@exemplo.com, email2@exemplo.com"
                      rows={3}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
