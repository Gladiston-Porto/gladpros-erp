// src/components/dashboard/ReportBuilder.tsx
'use client';

import { useState } from 'react';

import { Badge } from "@gladpros/ui/badge"
import { Button } from "@gladpros/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@gladpros/ui/card"
import { Checkbox } from "@gladpros/ui/checkbox"
import { Input } from "@gladpros/ui/input"
import { Label } from "@gladpros/ui/label"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@gladpros/ui/select"
import { useToast } from "@gladpros/ui/toast";

import { FileText, Download, Filter } from 'lucide-react';

interface ReportField {
  id: string;
  label: string;
  type: 'string' | 'number' | 'date';
}

export const ReportBuilder = () => {
  const toast = useToast();
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [reportType, setReportType] = useState('clients');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [format, setFormat] = useState('json');
  const [loading, setLoading] = useState(false);

  const availableFields: Record<string, ReportField[]> = {
    clients: [
      { id: 'id', label: 'ID', type: 'number' },
      { id: 'nome', label: 'Nome', type: 'string' },
      { id: 'email', label: 'Email', type: 'string' },
      { id: 'telefone', label: 'Telefone', type: 'string' },
      { id: 'status', label: 'Status', type: 'string' },
      { id: 'criadoEm', label: 'Data de Criação', type: 'date' },
    ],
    proposals: [
      { id: 'id', label: 'ID', type: 'number' },
      { id: 'numero', label: 'Número', type: 'string' },
      { id: 'cliente', label: 'Cliente', type: 'string' },
      { id: 'valor', label: 'Valor', type: 'number' },
      { id: 'status', label: 'Status', type: 'string' },
      { id: 'criadoEm', label: 'Data de Criação', type: 'date' },
    ],
    revenue: [
      { id: 'periodo', label: 'Período', type: 'string' },
      { id: 'receita', label: 'Receita', type: 'number' },
      { id: 'propostas', label: 'Propostas', type: 'number' },
      { id: 'conversao', label: 'Conversão (%)', type: 'number' },
      { id: 'clientesNovos', label: 'Clientes Novos', type: 'number' },
    ],
  };

  const handleFieldToggle = (fieldId: string) => {
    setSelectedFields(prev =>
      prev.includes(fieldId)
        ? prev.filter(id => id !== fieldId)
        : [...prev, fieldId]
    );
  };

  const handleGenerateReport = async () => {
    if (selectedFields.length === 0) {
      toast.error('Campo obrigatório', 'Selecione pelo menos um campo');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/reports/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: reportType,
          format,
          fields: selectedFields,
          startDate: dateRange.start || undefined,
          endDate: dateRange.end || undefined,
        }),
      });

      if (!response.ok) {
        toast.error('Erro ao gerar relatório', 'Não foi possível gerar o relatório. Tente novamente.');
        return;
      }

      if (format === 'json') {
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data.data ?? data, null, 2)], { type: 'application/json' });
        triggerDownload(blob, `relatorio-${reportType}-${Date.now()}.json`);
        toast.success('Relatório gerado', 'Download iniciado com sucesso');
      } else {
        // For CSV/XLSX: get blob directly from response
        const blob = await response.blob();
        const ext = format === 'xlsx' ? 'xlsx' : 'csv';
        triggerDownload(blob, `relatorio-${reportType}-${Date.now()}.${ext}`);
        toast.success('Download iniciado', `Relatório ${format.toUpperCase()} gerado com sucesso`);
      }
    } catch (error) {
      console.error('[ReportBuilder] Erro ao gerar relatório:', error);
      toast.error('Erro ao gerar relatório', 'Não foi possível gerar o relatório. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  function triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const currentFields = availableFields[reportType] || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Construtor de Relatórios</h1>
          <p className="text-muted-foreground">
            Crie relatórios customizados com os dados que você precisa
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Configurações do Relatório */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="h-5 w-5 mr-2" />
              Configurações
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="reportType">Tipo de Relatório</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="clients">Clientes</SelectItem>
                  <SelectItem value="proposals">Propostas</SelectItem>
                  <SelectItem value="revenue">Receita</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="format">Formato</Label>
              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="xlsx">Excel</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Período</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="startDate" className="text-xs">Data Inicial</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate" className="text-xs">Data Final</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Seleção de Campos */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Campos Selecionados
            </CardTitle>
            <CardDescription>
              Selecione os campos que deseja incluir no relatório
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {currentFields.map((field) => (
                <div key={field.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={field.id}
                    checked={selectedFields.includes(field.id)}
                    onCheckedChange={() => handleFieldToggle(field.id)}
                  />
                  <Label htmlFor={field.id} className="text-sm">
                    {field.label}
                  </Label>
                </div>
              ))}
            </div>

            {selectedFields.length > 0 && (
              <div className="mt-4">
                <Label>Campos Selecionados:</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedFields.map((fieldId) => {
                    const field = currentFields.find(f => f.id === fieldId);
                    return (
                      <Badge key={fieldId} variant="secondary">
                        {field?.label}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ações */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              {selectedFields.length} campo(s) selecionado(s)
            </div>
            <Button
              onClick={handleGenerateReport}
              disabled={loading || selectedFields.length === 0}
            >
              {loading ? (
                'Gerando...'
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Gerar Relatório
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
