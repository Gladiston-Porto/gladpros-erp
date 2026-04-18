// src/components/documents/DocumentsList.tsx
'use client';

import { useState } from 'react';
import { FileText, Download, Share, Trash2, Eye, MoreHorizontal, Upload, RefreshCw } from 'lucide-react';
import { Badge } from "@gladpros/ui/badge"
import { Button } from "@gladpros/ui/button"
import { Card, CardContent } from "@gladpros/ui/card"
import { Checkbox } from "@gladpros/ui/checkbox"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@gladpros/ui/dropdown-menu"
import { Input } from "@gladpros/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@gladpros/ui/select";







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

interface DocumentsListProps {
  documents: Document[];
  isLoading: boolean;
  onView: (document: Document) => void;
  onUpload: () => void;
  onRefresh: () => void;
}

const getFileIcon = (type: string) => {
  if (type.includes('pdf')) return '📄';
  if (type.includes('doc') || type.includes('txt')) return '📝';
  if (type.includes('xls')) return '📊';
  if (type.includes('jpg') || type.includes('png')) return '🖼️';
  return '📄';
};

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active': return 'bg-green-100 text-green-800';
    case 'archived': return 'bg-yellow-100 text-yellow-800';
    case 'deleted': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export function DocumentsList({ documents, isLoading, onView, onUpload, onRefresh }: DocumentsListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || doc.category === filterCategory;
    const matchesType = filterType === 'all' || doc.type.includes(filterType);
    return matchesSearch && matchesCategory && matchesType;
  });

  const handleSelectDocument = (docId: string) => {
    setSelectedDocuments(prev =>
      prev.includes(docId)
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    );
  };

  const handleSelectAll = () => {
    if (selectedDocuments.length === filteredDocuments.length) {
      setSelectedDocuments([]);
    } else {
      setSelectedDocuments(filteredDocuments.map(doc => doc.id));
    }
  };

  const handleDownload = async (document: Document) => {
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
      }
    } catch (error) {
      console.error('Erro ao baixar documento:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="h-10 w-10 bg-gray-200 rounded"></div>
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-gray-200 rounded w-48"></div>
                  <div className="h-3 bg-gray-200 rounded w-32"></div>
                </div>
                <div className="h-8 bg-gray-200 rounded w-20"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters and Actions */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar documentos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                <SelectItem value="contratos">Contratos</SelectItem>
                <SelectItem value="propostas">Propostas</SelectItem>
                <SelectItem value="financeiro">Financeiro</SelectItem>
                <SelectItem value="rh">RH</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="doc">Word</SelectItem>
                <SelectItem value="xls">Excel</SelectItem>
                <SelectItem value="jpg">Imagem</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {selectedDocuments.length > 0 && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-700">
                  {selectedDocuments.length} documento(s) selecionado(s)
                </span>
                <div className="flex items-center space-x-2">
                  <Button size="sm" variant="outline">
                    <Share className="h-4 w-4 mr-2" />
                    Compartilhar
                  </Button>
                  <Button size="sm" variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Baixar
                  </Button>
                  <Button size="sm" variant="destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documents List */}
      <div className="space-y-4">
        {filteredDocuments.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhum documento encontrado
              </h3>
              <p className="text-gray-600 mb-6">
                {searchTerm || filterCategory !== 'all' || filterType !== 'all'
                  ? 'Tente ajustar os filtros de busca'
                  : 'Comece fazendo upload do seu primeiro documento'
                }
              </p>
              <Button onClick={onUpload}>
                <Upload className="h-4 w-4 mr-2" />
                Fazer Upload
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {/* Header with select all */}
            <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
              <Checkbox
                checked={selectedDocuments.length === filteredDocuments.length}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm font-medium text-gray-700">
                Selecionar todos ({filteredDocuments.length})
              </span>
            </div>

            {filteredDocuments.map((document) => (
              <Card key={document.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Checkbox
                        checked={selectedDocuments.includes(document.id)}
                        onCheckedChange={() => handleSelectDocument(document.id)}
                      />
                      <div className="text-2xl">{getFileIcon(document.type)}</div>
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          {document.name}
                        </h3>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="outline">{document.type.toUpperCase()}</Badge>
                          <Badge className={getStatusColor(document.status)}>
                            {document.status}
                          </Badge>
                          {document.shared && (
                            <Badge variant="outline" className="flex items-center gap-1">
                              <Share className="h-3 w-3" />
                              Compartilhado
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {formatFileSize(document.size)} •
                          Enviado em {new Date(document.uploadedAt).toLocaleDateString('pt-BR')} por {document.uploadedBy}
                        </p>
                        {document.tags.length > 0 && (
                          <div className="flex items-center space-x-1 mt-2">
                            {document.tags.slice(0, 3).map((tag, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {document.tags.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{document.tags.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onView(document)}
                        className="flex items-center gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        Visualizar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(document)}
                        className="flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Baixar
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Share className="h-4 w-4 mr-2" />
                            Compartilhar
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Eye className="h-4 w-4 mr-2" />
                            Ver versões
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
