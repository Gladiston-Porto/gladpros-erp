// src/components/documents/DocumentViewer.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { ArrowLeft, Download, Share, Eye, FileText, ImageIcon, File } from 'lucide-react';
import { Badge } from "@gladpros/ui/badge"
import { Button } from "@gladpros/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@gladpros/ui/card"
import { Separator } from "@gladpros/ui/separator";
import { useToast } from "@gladpros/ui/toast";

interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
  uploadedBy: string;
  category: string;
  tags: string[];
  status: 'active' | 'archived' | 'deleted';
  versions: number;
  shared: boolean;
  url: string;
}

interface DocumentViewerProps {
  document: Document;
  onBack: () => void;
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileIcon = (type: string) => {
  if (type.includes('pdf')) return <FileText className="h-8 w-8 text-red-600" />;
  if (type.includes('doc') || type.includes('txt')) return <FileText className="h-8 w-8 text-blue-600" />;
  if (type.includes('xls')) return <FileText className="h-8 w-8 text-green-600" />;
  if (type.includes('jpg') || type.includes('png')) return <ImageIcon className="h-8 w-8 text-purple-600" />;
  return <File className="h-8 w-8 text-gray-600" />;
};

export function DocumentViewer({ document, onBack }: DocumentViewerProps) {
  const toast = useToast();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadPreview = useCallback(async () => {
    try {
      // In production, this would load actual preview
      if (document.type.includes('image')) {
        setPreviewUrl(document.url);
      } else {
        // For non-image files, show a placeholder
        setPreviewUrl(null);
      }
    } catch (error) {
      console.error('Erro ao carregar preview:', error);
    } finally {
      setIsLoading(false);
    }
  }, [document.type, document.url]);

  useEffect(() => {
    loadPreview();
  }, [loadPreview]);

  const handleDownload = async () => {
    try {
      const response = await fetch(`/api/documents/${document.id}/download`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = window.document.createElement('a');
        a.href = url;
        a.download = document.name;
        window.document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        window.document.body.removeChild(a);

        toast.success('Sucesso', 'Download iniciado');
      } else {
        throw new Error('Erro no download');
      }
    } catch {
      toast.error('Erro', 'Erro ao baixar documento');
    }
  };

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/documentos/${document.id}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success('Sucesso', 'Link copiado para a área de transferência');
  };

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
            <h2 className="text-2xl font-bold text-gray-900">{document.name}</h2>
            <div className="flex items-center space-x-2 mt-1">
              <Badge variant="outline">{document.type.toUpperCase()}</Badge>
              <Badge className={
                document.status === 'active' ? 'bg-green-100 text-green-800' :
                document.status === 'archived' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }>
                {document.status}
              </Badge>
              {document.shared && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Share className="h-3 w-3" />
                  Compartilhado
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
          <Button onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Baixar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Preview */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Visualização</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-96">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : previewUrl ? (
                <div className="flex items-center justify-center">
                  <Image
                    src={previewUrl}
                    alt={document.name}
                    width={800}
                    height={600}
                    className="max-w-full max-h-96 object-contain rounded-lg"
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-96 text-center">
                  {getFileIcon(document.type)}
                  <h3 className="text-lg font-medium text-gray-900 mt-4">
                    Preview não disponível
                  </h3>
                  <p className="text-gray-600 mt-2">
                    Este tipo de arquivo não suporta visualização direta.
                    Faça o download para visualizar o conteúdo.
                  </p>
                  <Button onClick={handleDownload} className="mt-4">
                    <Download className="h-4 w-4 mr-2" />
                    Baixar Arquivo
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Metadata */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações do Arquivo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Nome</label>
                <p className="text-sm text-gray-900">{document.name}</p>
              </div>

              <Separator />

              <div>
                <label className="text-sm font-medium text-gray-700">Tamanho</label>
                <p className="text-sm text-gray-900">{formatFileSize(document.size)}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Tipo</label>
                <p className="text-sm text-gray-900">{document.type}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Categoria</label>
                <p className="text-sm text-gray-900">{document.category}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Enviado por</label>
                <p className="text-sm text-gray-900">{document.uploadedBy}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Data de Upload</label>
                <p className="text-sm text-gray-900">
                  {new Date(document.uploadedAt).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>

              {document.versions > 1 && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Versões</label>
                  <p className="text-sm text-gray-900">{document.versions} versões</p>
                </div>
              )}
            </CardContent>
          </Card>

          {document.tags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {document.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Ações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={handleDownload} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Baixar Arquivo
              </Button>
              <Button variant="outline" onClick={handleShare} className="w-full">
                <Share className="h-4 w-4 mr-2" />
                Compartilhar Link
              </Button>
              <Button variant="outline" className="w-full">
                <Eye className="h-4 w-4 mr-2" />
                Ver Versões
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
