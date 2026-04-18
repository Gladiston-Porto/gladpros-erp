// src/componimport { useToast } from "@gladpros/ui/toast";nts/documents/DocumentUpload.tsx
'use client';

import { useState, useCallback } from 'react';
import { Upload, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Badge } from "@gladpros/ui/badge"
import { Button } from "@gladpros/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@gladpros/ui/card"
import { Input } from "@gladpros/ui/input"
import { Label } from "@gladpros/ui/label"
import { Progress } from "@gladpros/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@gladpros/ui/select"
import { Textarea } from "@gladpros/ui/textarea";







import { useToast } from "@gladpros/ui/toast";

interface UploadFile {
  id: string;
  file: File;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
}

interface DocumentUploadProps {
  onUploadComplete: () => void;
  onCancel: () => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'image/jpeg',
  'image/png',
  'image/gif',
];

export function DocumentUpload({ onUploadComplete, onCancel }: DocumentUploadProps) {
  const toast = useToast();
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return 'Arquivo muito grande (máximo 10MB)';
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Tipo de arquivo não permitido';
    }
    return null;
  };

  const uploadFiles = useCallback(async (filesToUpload: UploadFile[]) => {
    setIsUploading(true);

    for (const uploadFile of filesToUpload) {
      try {
        const formData = new FormData();
        formData.append('file', uploadFile.file);
        formData.append('category', category);
        formData.append('tags', JSON.stringify(tags));

        const response = await fetch('/api/documents/upload', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          setFiles(prev => prev.map(f =>
            f.id === uploadFile.id
              ? { ...f, progress: 100, status: 'completed' }
              : f
          ));
        } else {
          const error = await response.text();
          setFiles(prev => prev.map(f =>
            f.id === uploadFile.id
              ? { ...f, status: 'error', error: error || 'Erro no upload' }
              : f
          ));
        }
      } catch {
        setFiles(prev => prev.map(f =>
          f.id === uploadFile.id
            ? { ...f, status: 'error', error: 'Erro de conexão' }
            : f
        ));
      }
    }

    setIsUploading(false);
  }, [category, tags]);

  const handleFileSelect = useCallback((selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const newFiles: UploadFile[] = [];
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const error = validateFile(file);

      newFiles.push({
        id: `${Date.now()}-${i}`,
        file,
        progress: 0,
        status: error ? 'error' : 'uploading',
        error: error || undefined,
      });
    }

    setFiles(prev => [...prev, ...newFiles]);
    uploadFiles(newFiles.filter(f => !f.error));
  }, [uploadFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags(prev => [...prev, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(prev => prev.filter(tag => tag !== tagToRemove));
  };

  const handleComplete = () => {
    const completedFiles = files.filter(f => f.status === 'completed');
    if (completedFiles.length > 0) {
      toast.success('Sucesso', `${completedFiles.length} arquivo(s) enviado(s) com sucesso`);
      onUploadComplete();
    } else {
      toast.error('Atenção', 'Nenhum arquivo foi enviado com sucesso');
    }
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return '📄';
    if (['doc', 'docx'].includes(ext || '')) return '📝';
    if (['xls', 'xlsx'].includes(ext || '')) return '📊';
    if (['jpg', 'png', 'gif'].includes(ext || '')) return '🖼️';
    return '📄';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Upload de Documentos</h2>
          <p className="text-gray-600 mt-1">
            Faça upload de arquivos de forma segura e organizada
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={onCancel}>
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button
            onClick={handleComplete}
            disabled={files.length === 0 || isUploading}
          >
            Concluir Upload
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Area */}
        <Card>
          <CardHeader>
            <CardTitle>Selecionar Arquivos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Drag and Drop Area */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Arraste arquivos aqui
              </h3>
              <p className="text-gray-600 mb-4">
                ou clique para selecionar arquivos
              </p>
              <input
                type="file"
                multiple
                accept={ALLOWED_TYPES.join(',')}
                onChange={(e) => handleFileSelect(e.target.files)}
                className="hidden"
                id="file-upload"
              />
              <Button asChild>
                <label htmlFor="file-upload" className="cursor-pointer">
                  Selecionar Arquivos
                </label>
              </Button>
              <p className="text-sm text-gray-500 mt-2">
                Máximo 10MB por arquivo • PDF, Word, Excel, TXT, Imagens
              </p>
            </div>

            {/* File List */}
            {files.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Arquivos Selecionados</h4>
                {files.map((uploadFile) => (
                  <div key={uploadFile.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                    <div className="text-xl">{getFileIcon(uploadFile.file.name)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {uploadFile.file.name}
                      </p>
                      <p className="text-xs text-gray-600">
                        {(uploadFile.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      {uploadFile.status === 'uploading' && (
                        <Progress value={uploadFile.progress} className="mt-2" />
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      {uploadFile.status === 'uploading' && (
                        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                      )}
                      {uploadFile.status === 'completed' && (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      )}
                      {uploadFile.status === 'error' && (
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(uploadFile.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    {uploadFile.error && (
                      <p className="text-xs text-red-600 mt-1">{uploadFile.error}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Metadata */}
        <Card>
          <CardHeader>
            <CardTitle>Informações do Documento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="category">Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contratos">Contratos</SelectItem>
                  <SelectItem value="propostas">Propostas</SelectItem>
                  <SelectItem value="financeiro">Financeiro</SelectItem>
                  <SelectItem value="rh">Recursos Humanos</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Tags</Label>
              <div className="flex space-x-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Adicionar tag..."
                  onKeyPress={(e) => e.key === 'Enter' && addTag()}
                />
                <Button type="button" onClick={addTag} size="sm">
                  Adicionar
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => removeTag(tag)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea
                id="description"
                placeholder="Adicione uma descrição para o documento..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
