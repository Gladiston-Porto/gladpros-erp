// src/components/reports/ReportViewer.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Download, Share, RefreshCw, Eye } from 'lucide-react';
import { Badge } from "@gladpros/ui/badge"
import { Button } from "@gladpros/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@gladpros/ui/card"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@gladpros/ui/select"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@gladpros/ui/table";
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

interface ReportViewerProps {
  report: Report;
  onBack: () => void;
}

interface ReportData {
  headers: string[];
  rows: (string | number | boolean | null)[][];
  summary?: {
    totalRecords: number;
    generatedAt: string;
  };
}

export function ReportViewer({ report, onBack }: ReportViewerProps) {
  const toast = useToast();
  const [data, setData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [exportFormat, setExportFormat] = useState('pdf');

  const fetchReportData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/reports/${report.id}/data`);
      if (response.ok) {
        const reportData = await response.json();
        setData(reportData);
      } else {
        // Mock data for demonstration
        setData({
          headers: ['Nome', 'E-mail', 'Status', 'Data Cadastro'],
          rows: [
            ['João Silva', 'joao@email.com', 'Ativo', '2024-01-15'],
            ['Maria Santos', 'maria@email.com', 'Ativo', '2024-01-20'],
            ['Pedro Costa', 'pedro@email.com', 'Inativo', '2024-01-10'],
          ],
          summary: {
            totalRecords: 3,
            generatedAt: new Date().toISOString(),
          },
        });
      }
    } catch {
      toast.error('Erro', 'Erro ao carregar dados do relatório');
    } finally {
      setIsLoading(false);
    }
  }, [report.id, toast]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  const handleExport = async () => {
    try {
      const response = await fetch(`/api/reports/${report.id}/export?format=${exportFormat}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${report.name}.${exportFormat}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast.success('Sucesso', `Relatório exportado como ${exportFormat.toUpperCase()}`);
      } else {
        throw new Error('Erro ao exportar');
      }
    } catch {
      toast.error('Erro', 'Erro ao exportar relatório');
    }
  };

  const handleShare = () => {
    const url = `${window.location.origin}/relatorios/${report.id}`;
    navigator.clipboard.writeText(url);
    toast.success('Sucesso', 'Link copiado para a área de transferência');
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-48"></div>
          </div>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{report.name}</h2>
            <div className="flex items-center space-x-2 mt-1">
              <Badge variant="outline">{report.type}</Badge>
              <Badge className={
                report.status === 'published' ? 'bg-green-100 text-green-800' :
                report.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }>
                {report.status}
              </Badge>
              {report.schedule && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <RefreshCw className="h-3 w-3" />
                  {report.schedule.frequency}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={handleShare}>
            <Share className="h-4 w-4 mr-2" />
            Compartilhar
          </Button>

          <div className="flex items-center space-x-2">
            <Select value={exportFormat} onValueChange={setExportFormat}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="excel">Excel</SelectItem>
                <SelectItem value="csv">CSV</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>
      </div>

      {/* Summary */}
      {data?.summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total de Registros</p>
                  <p className="text-2xl font-bold text-gray-900">{data.summary.totalRecords}</p>
                </div>
                <Eye className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Gerado em</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {new Date(data.summary.generatedAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <RefreshCw className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Última Atualização</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {new Date(report.updatedAt).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <RefreshCw className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Dados do Relatório</CardTitle>
        </CardHeader>
        <CardContent>
          {data && data.rows.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {data.headers.map((header, index) => (
                      <TableHead key={index}>{header}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.rows.map((row, rowIndex) => (
                    <TableRow key={rowIndex}>
                      {row.map((cell, cellIndex) => (
                        <TableCell key={cellIndex}>
                          {typeof cell === 'boolean' ? (
                            <Badge variant={cell ? 'default' : 'secondary'}>
                              {cell ? 'Sim' : 'Não'}
                            </Badge>
                          ) : cell || '-'}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Eye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Nenhum dado encontrado para este relatório</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
