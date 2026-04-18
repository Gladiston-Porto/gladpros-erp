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
