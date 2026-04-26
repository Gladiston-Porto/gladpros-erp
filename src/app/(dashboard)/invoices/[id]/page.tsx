'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@gladpros/ui/button'
import { Card, CardContent } from '@gladpros/ui/card'
import { Loading } from '@gladpros/ui/loading';
import { FileText } from 'lucide-react';
import { useToast } from '@gladpros/ui/toast';
import { useConfirm } from '@gladpros/ui/confirm-dialog';

import { authenticatedFetch } from '@/lib/api/client';

import {
  InvoiceDetailContent,
  InvoiceDetailHeader,
} from '../_components/InvoiceDetailSections';
import {
  formatInvoiceCurrency,
  getInvoiceFinancialTotals,
  normalizeInvoiceDetail,
} from '../_components/invoice-utils';
import type { InvoiceDetail, InvoicePaymentData } from '../_components/types';

const InvoicePaymentDialog = dynamic(
  () => import('../_components/InvoicePaymentDialog'),
  { ssr: false }
);

export default function InvoiceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const invoiceId = params?.id as string;
  const { success: showSuccess, error: showError } = useToast();
  const { confirm, Dialog: ConfirmDialog } = useConfirm();

  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentData, setPaymentData] = useState<InvoicePaymentData>({
    valor: '',
    dataPagamento: new Date().toISOString().split('T')[0],
    metodoPagamento: 'BANK_TRANSFER',
    referencia: '',
    notas: '',
  });
  const [processingPayment, setProcessingPayment] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [showTaxOverrideModal, setShowTaxOverrideModal] = useState(false);
  const [taxOverrideReason, setTaxOverrideReason] = useState('');
  const [taxOverrideMode, setTaxOverrideMode] = useState('TAX_EXCLUDED');
  const [processingOverride, setProcessingOverride] = useState(false);

  async function fetchInvoice(signal?: AbortSignal) {
    try {
      setLoading(true);
      const response = await authenticatedFetch(`/api/invoices/${invoiceId}`, { signal });
      if (!response.ok) {
        throw new Error('Erro ao carregar invoice');
      }

      const payload = await response.json();
      const invoicePayload = payload.data ?? payload;
      const normalizedInvoice = normalizeInvoiceDetail(invoicePayload);
      setInvoice(normalizedInvoice);
      setPaymentData((current) => ({
        ...current,
        valor: String(normalizedInvoice.saldo),
      }));
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        return;
      }
      console.error('Erro ao carregar invoice:', error);
      showError('Erro ao carregar invoice');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!invoiceId) {
      return;
    }

    const controller = new AbortController();
    void fetchInvoice(controller.signal);

    return () => controller.abort();
  }, [invoiceId]);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        const d = data?.data ?? data;
        if (d?.role) setCurrentUserRole(d.role);
      })
      .catch(() => {});
  }, []);

  const handleTaxOverride = async () => {
    if (!invoice || !taxOverrideReason.trim()) return;
    setProcessingOverride(true);
    try {
      const res = await authenticatedFetch(`/api/invoices/${invoiceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manualTaxOverride: true,
          manualTaxOverrideReason: taxOverrideReason.trim(),
          taxMode: taxOverrideMode,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Erro ao salvar override');
      }
      showSuccess('Configuração fiscal atualizada');
      setShowTaxOverrideModal(false);
      void fetchInvoice();
    } catch (err: any) {
      showError('Erro', err.message);
    } finally {
      setProcessingOverride(false);
    }
  };

  const handleSendInvoice = async () => {
    if (!invoice) {
      return;
    }

    const confirmed = await confirm({
      title: 'Enviar invoice',
      message: `Enviar invoice ${invoice.numeroInvoice} para ${invoice.cliente.email}?`,
    });
    if (!confirmed) return;

    try {
      const response = await authenticatedFetch(`/api/invoices/${invoiceId}/send`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Erro ao enviar invoice');
      }

      showSuccess('Invoice enviada com sucesso!');
      await fetchInvoice();
    } catch (error) {
      console.error('Erro ao enviar invoice:', error);
      showError('Erro ao enviar invoice');
    }
  };

  const handleRegisterPayment = async () => {
    try {
      setProcessingPayment(true);

      const payload = {
        valor: parseFloat(paymentData.valor),
        dataPagamento: new Date(paymentData.dataPagamento).toISOString(),
        metodoPagamento: paymentData.metodoPagamento,
        referencia: paymentData.referencia,
        notas: paymentData.notas,
      };

      const response = await authenticatedFetch(`/api/invoices/${invoiceId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao registrar pagamento');
      }

      showSuccess('Pagamento registrado com sucesso!');
      setShowPaymentDialog(false);
      await fetchInvoice();
    } catch (error: any) {
      console.error('Erro ao registrar pagamento:', error);
      showError('Erro ao registrar pagamento', error.message);
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleDelete = async () => {
    if (!invoice) {
      return;
    }

    const confirmed = await confirm({
      title: 'Cancelar invoice',
      message: `Tem certeza que deseja cancelar a invoice ${invoice.numeroInvoice}? Esta ação não pode ser desfeita.`,
    });
    if (!confirmed) return;

    try {
      const response = await authenticatedFetch(`/api/invoices/${invoiceId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || error.error || 'Erro ao cancelar invoice');
      }

      showSuccess('Invoice cancelada com sucesso');
      router.push('/invoices');
    } catch (error: any) {
      console.error('Erro ao cancelar invoice:', error);
      showError('Erro ao cancelar invoice', error.message);
    }
  };

  const financialTotals = useMemo(
    () => (invoice ? getInvoiceFinancialTotals(invoice) : null),
    [invoice]
  );

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loading text="Carregando invoice..." />
      </div>
    );
  }

  if (!invoice || !financialTotals) {
    return (
      <Card className="border-none shadow-sm">
        <CardContent className="py-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">Invoice não encontrada</p>
          <Button variant="ghost" className="mt-4" onClick={() => router.push('/invoices')}>
            Voltar para lista
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-6">
      <InvoiceDetailHeader
        invoice={invoice}
        invoiceId={invoiceId}
        onBack={() => router.push('/invoices')}
        onSendInvoice={handleSendInvoice}
        onOpenPaymentDialog={() => setShowPaymentDialog(true)}
        onOpenPdf={() => router.push(`/api/invoices/${invoiceId}/pdf`)}
        onPrint={() => window.open(`/invoices/${invoiceId}/print`, '_blank')}
        onEdit={() => router.push(`/invoices/${invoiceId}/edit`)}
        onDelete={handleDelete}
      />

      <InvoiceDetailContent invoice={invoice} financialTotals={financialTotals} />

      {/* Tax Override Button (ADMIN/FINANCEIRO only) */}
      {(currentUserRole === 'ADMIN' || currentUserRole === 'FINANCEIRO') &&
        invoice.taxMode === 'MANUAL_REVIEW' && !invoice.manualTaxOverride && (
        <div className="mt-4 rounded-2xl border border-yellow-500/40 bg-yellow-500/10 p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">⚠ Esta invoice requer revisão fiscal manual</p>
            <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-0.5">{invoice.taxExplanation}</p>
          </div>
          <button
            onClick={() => setShowTaxOverrideModal(true)}
            className="ml-4 shrink-0 rounded-xl bg-yellow-500 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-600 transition-colors"
            aria-label="Revisar classificação fiscal"
          >
            Revisar Tax
          </button>
        </div>
      )}

      {/* Tax Override Modal */}
      {showTaxOverrideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl border border-border">
            <h2 className="text-lg font-semibold text-foreground mb-4">Revisar Classificação Fiscal</h2>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Modo Fiscal</label>
                <select
                  value={taxOverrideMode}
                  onChange={e => setTaxOverrideMode(e.target.value)}
                  className="mt-1 w-full h-10 rounded-xl bg-background border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  aria-label="Modo fiscal"
                >
                  <option value="NON_TAXABLE">Non-Taxable (Residencial / Isento)</option>
                  <option value="TAX_EXCLUDED">Taxable — Tax Excludido do Preço</option>
                  <option value="TAX_INCLUDED">Taxable — Tax Incluído no Preço</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">Motivo do Override *</label>
                <textarea
                  value={taxOverrideReason}
                  onChange={e => setTaxOverrideReason(e.target.value)}
                  placeholder="Ex: Confirmado com contador — serviço residencial, lump-sum, tax não aplicável."
                  rows={3}
                  className="mt-1 w-full rounded-xl bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary resize-none"
                  aria-label="Motivo do override fiscal"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowTaxOverrideModal(false)}
                  className="rounded-xl border border-border px-4 py-2 text-sm hover:bg-muted/50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleTaxOverride}
                  disabled={processingOverride || !taxOverrideReason.trim()}
                  className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary/90 transition-colors disabled:opacity-50"
                  aria-label="Confirmar override fiscal"
                >
                  {processingOverride ? 'Salvando...' : 'Confirmar Override'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <InvoicePaymentDialog
        open={showPaymentDialog}
        paymentData={paymentData}
        processingPayment={processingPayment}
        maxAmount={financialTotals.saldo}
        onClose={() => setShowPaymentDialog(false)}
        onChange={setPaymentData}
        onSubmit={handleRegisterPayment}
        formatCurrency={formatInvoiceCurrency}
      />

      <ConfirmDialog />
    </div>
  );
}
