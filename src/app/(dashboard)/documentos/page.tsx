// src/app/(dashboard)/documentos/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { FileText, Upload, Share, Folder, Plus } from 'lucide-react';
import { Button } from "@gladpros/ui/button"
import { ModulePageHeader } from "@gladpros/ui/module-page-header"
import { StatCard } from "@gladpros/ui/stat-card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@gladpros/ui/tabs";

import { DocumentsList } from '@/components/documents/DocumentsList';
import { DocumentUpload } from '@/components/documents/DocumentUpload';
import { DocumentViewer } from '@/components/documents/DocumentViewer';
import { documentsApi } from '@/lib/api/client';

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

export default function DocumentsPage() {
  const [activeTab, setActiveTab] = useState('list');
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const data = await documentsApi.getDocuments();
      setDocuments(data);
    } catch (error) {
      console.error('Erro ao carregar documentos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = () => {
    setActiveTab('upload');
  };

  const handleViewDocument = (document: Document) => {
    setSelectedDocument(document);
    setActiveTab('viewer');
  };

  const handleCreateFolder = () => {
    // TODO: implementar dialog de criação de pasta
  };

  return (
    <div className="space-y-6">
      <ModulePageHeader
        title="Documentos"
        description="Gerencie, compartilhe e organize seus documentos de forma segura"
        icon={<FileText />}
        accentColor="#0098DA"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Documentos" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleCreateFolder}>
              <Folder className="h-4 w-4 mr-2" />
              Nova Pasta
            </Button>
            <Button onClick={handleUpload}>
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </Button>
          </div>
        }
      />
      <div className="max-w-7xl mx-auto">

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Total de Arquivos"
            value={documents.length}
            icon={<FileText />}
            variant="default"
            compact
          />
          <StatCard
            title="Espaço Utilizado"
            value="2.4 GB"
            icon={<Upload />}
            variant="income"
            compact
          />
          <StatCard
            title="Compartilhados"
            value={documents.filter(d => d.shared).length}
            icon={<Share />}
            variant="purple"
            compact
          />
          <StatCard
            title="Uploads Hoje"
            value={8}
            icon={<Plus />}
            variant="orange"
            compact
          />
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="list">Meus Documentos</TabsTrigger>
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="viewer">Visualizar</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="mt-6">
            <DocumentsList
              documents={documents}
              isLoading={isLoading}
              onView={handleViewDocument}
              onUpload={handleUpload}
              onRefresh={fetchDocuments}
            />
          </TabsContent>

          <TabsContent value="upload" className="mt-6">
            <DocumentUpload
              onUploadComplete={() => {
                fetchDocuments();
                setActiveTab('list');
              }}
              onCancel={() => setActiveTab('list')}
            />
          </TabsContent>

          <TabsContent value="viewer" className="mt-6">
            {selectedDocument ? (
              <DocumentViewer
                document={selectedDocument}
                onBack={() => setActiveTab('list')}
              />
            ) : (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Selecione um documento para visualizar</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
