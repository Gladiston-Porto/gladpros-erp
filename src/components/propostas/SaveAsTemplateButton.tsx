'use client';

import { useState } from 'react';
import { Button } from '@gladpros/ui/button';
import { Input } from '@gladpros/ui/input';
import { Label } from '@gladpros/ui/label';
import { Textarea } from '@gladpros/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@gladpros/ui/toast';
import { BookMarked } from 'lucide-react';

interface SaveAsTemplateButtonProps {
  titulo?: string;
  escopo?: string;
  condicoes?: string;
  observacoes?: string;
  etapas?: unknown[];
  materiais?: unknown[];
}

export function SaveAsTemplateButton({
  titulo,
  escopo,
  condicoes,
  observacoes,
  etapas,
  materiais,
}: SaveAsTemplateButtonProps) {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [saving, setSaving] = useState(false);
  const { addToast: showToast } = useToast();

  const handleSave = async () => {
    if (!nome.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/propostas/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: nome.trim(),
          descricao: descricao.trim() || undefined,
          titulo,
          escopo,
          condicoes,
          observacoes,
          etapasJson: etapas ? JSON.stringify(etapas) : undefined,
          materiaisJson: materiais ? JSON.stringify(materiais) : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message ?? 'Erro ao salvar template');
      }
      showToast({ title: 'Template salvo', message: `"${nome}" salvo com sucesso!`, type: 'success' });
      setOpen(false);
      setNome('');
      setDescricao('');
    } catch (err) {
      showToast({
        title: 'Erro',
        message: err instanceof Error ? err.message : 'Erro ao salvar template',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2" aria-label="Salvar como template">
          <BookMarked className="h-4 w-4" />
          Salvar como Template
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Salvar como Template</DialogTitle>
          <DialogDescription>
            Salve o escopo, etapas, materiais e condições desta proposta como um template reutilizável.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label htmlFor="template-nome">
              Nome do Template <span className="text-destructive" aria-hidden="true">*</span>
            </Label>
            <Input
              id="template-nome"
              placeholder="Ex: Instalação Elétrica Residencial"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              maxLength={200}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="template-descricao">Descrição (opcional)</Label>
            <Textarea
              id="template-descricao"
              placeholder="Descreva quando usar este template..."
              rows={3}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              maxLength={500}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !nome.trim()}
            className="bg-brand-primary text-white"
          >
            {saving ? 'Salvando...' : 'Salvar Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
