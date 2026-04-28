'use client';

import { useState } from 'react';
import { Button } from '@gladpros/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@gladpros/ui/toast';
import { BookTemplate, Loader2 } from 'lucide-react';

export interface TemplateData {
  titulo?: string;
  escopo?: string;
  condicoes?: string;
  observacoes?: string;
  etapasJson?: string;
  materiaisJson?: string;
}

interface TemplateSummary {
  id: number;
  nome: string;
  descricao?: string | null;
  titulo?: string | null;
}

interface TemplateSelectorProps {
  onSelect: (data: TemplateData) => void;
}

export function TemplateSelector({ onSelect }: TemplateSelectorProps) {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const { addToast: showToast } = useToast();

  const fetchTemplates = async () => {
    setLoadingList(true);
    try {
      const res = await fetch('/api/propostas/templates');
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message ?? 'Erro ao carregar templates');
      setTemplates(json.data as TemplateSummary[]);
    } catch (err) {
      showToast({
        title: 'Erro',
        message: err instanceof Error ? err.message : 'Erro ao carregar templates',
        type: 'error',
      });
    } finally {
      setLoadingList(false);
    }
  };

  const handleOpenChange = (val: boolean) => {
    setOpen(val);
    if (val) fetchTemplates();
  };

  const handleSelect = async (id: number) => {
    setLoadingId(id);
    try {
      const res = await fetch(`/api/propostas/templates/${id}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message ?? 'Erro ao carregar template');
      onSelect(json.data as TemplateData);
      setOpen(false);
      showToast({ title: 'Template aplicado', message: 'Dados do template foram preenchidos.', type: 'success' });
    } catch (err) {
      showToast({
        title: 'Erro',
        message: err instanceof Error ? err.message : 'Erro ao aplicar template',
        type: 'error',
      });
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" aria-label="Usar template de proposta">
          <BookTemplate className="h-4 w-4" />
          Usar Template
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Selecionar Template</DialogTitle>
          <DialogDescription>
            Escolha um template para preencher automaticamente o escopo, etapas, materiais e condições.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2 max-h-[60vh] overflow-y-auto space-y-2">
          {loadingList ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando templates...
            </div>
          ) : templates.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Nenhum template salvo ainda. Crie um a partir de uma proposta existente.
            </div>
          ) : (
            templates.map((t) => (
              <button
                key={t.id}
                onClick={() => handleSelect(t.id)}
                disabled={loadingId !== null}
                className="w-full rounded-2xl border border-border bg-card p-4 text-left hover:bg-accent transition-colors disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`Selecionar template ${t.nome}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-foreground">{t.nome}</span>
                  {loadingId === t.id && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                </div>
                {t.descricao && (
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{t.descricao}</p>
                )}
                {t.titulo && (
                  <p className="mt-1 text-xs text-brand-primary truncate">{t.titulo}</p>
                )}
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
