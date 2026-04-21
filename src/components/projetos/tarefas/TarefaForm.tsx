/**
 * TarefaForm - Formulário inline para criar tarefa
 */

'use client';

import { useState } from 'react';
import { Button } from '@gladpros/ui/button';
import { Input } from "@gladpros/ui/input";
import { Card, CardContent } from "@gladpros/ui/card";
import { X, Check } from 'lucide-react';

type Props = {
  projetoId: number;
  initialStatus: string;
  onSubmit: (data: { titulo: string; status: string; projetoId: number; prioridade?: string }) => Promise<void>;
  onCancel: () => void;
};

export function TarefaForm({ projetoId, initialStatus, onSubmit, onCancel }: Props) {
  const [titulo, setTitulo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) return;

    setSubmitting(true);
    try {
      await onSubmit({
        projetoId,
        titulo: titulo.trim(),
        status: initialStatus,
        prioridade: 'media',
      });
      setTitulo('');
    } catch (error) {
      console.error('Erro ao criar tarefa:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border-dashed">
      <CardContent className="p-3">
        <form onSubmit={handleSubmit} className="space-y-2">
          <Input
            autoFocus
            placeholder="Título da tarefa..."
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            disabled={submitting}
          />
          <div className="flex gap-2">
            <Button
              type="submit"
              size="sm"
              className="flex-1 gap-1"
              disabled={!titulo.trim() || submitting}
            >
              <Check className="h-3.5 w-3.5" />
              Criar
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onCancel}
              disabled={submitting}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
