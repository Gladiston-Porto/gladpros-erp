'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@gladpros/ui/button';

interface GerarInvoiceButtonProps {
  propostaId: number;
  status: string;
}

interface InvoiceResult {
  invoiceId: number;
  numeroInvoice: string;
  valorTotal: string | number;
}

export function GerarInvoiceButton({ propostaId, status }: GerarInvoiceButtonProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InvoiceResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  if (status !== 'APROVADA') return null;

  if (result) {
    return (
      <a
        href={`/invoices/${result.invoiceId}`}
        className="inline-flex items-center gap-2 rounded-2xl bg-green-500/10 px-4 py-2 text-sm font-medium text-green-600 hover:bg-green-500/20 border border-green-500/30 min-h-[48px]"
      >
        <ExternalLink className="h-4 w-4" />
        Invoice {result.numeroInvoice} criada → ver invoice
      </a>
    );
  }

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/propostas/${propostaId}/gerar-invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        if (res.status === 409 && json.invoiceId) {
          // Já existe — redirecionar para ela
          router.push(`/invoices/${json.invoiceId}`);
          return;
        }
        setError(json.message ?? 'Erro ao gerar invoice');
        return;
      }

      setResult(json.data as InvoiceResult);
    } catch {
      setError('Erro de conexão ao gerar invoice');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Button
        variant="outline"
        size="sm"
        onClick={handleClick}
        disabled={loading}
        className="min-h-[48px]"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
        ) : (
          <FileText className="h-4 w-4 mr-1" />
        )}
        Gerar Invoice
      </Button>
      {error && (
        <p className="text-xs text-destructive px-1">{error}</p>
      )}
    </div>
  );
}
