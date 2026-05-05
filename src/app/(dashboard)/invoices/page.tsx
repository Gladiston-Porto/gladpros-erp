'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle, Clock, DollarSign, Plus } from 'lucide-react';
import { useToast } from '@gladpros/ui/toast';
import { useConfirm } from '@gladpros/ui/confirm-dialog';

import { Button } from '@gladpros/ui/button'
import { Card, CardContent } from '@gladpros/ui/card'
import { ModulePageHeader } from '@gladpros/ui/module-page-header';
import { FileText as InvoiceIcon } from 'lucide-react';

import { authenticatedFetch } from '@/lib/api/client';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';

import { InvoicesFiltersCard } from './_components/InvoicesFiltersCard';
import { InvoicesTableCard } from './_components/InvoicesTableCard';
import { formatInvoiceCurrency, normalizeInvoiceListItem } from './_components/invoice-utils';
import type {
  InvoiceListFilters,
  InvoiceListItem,
  InvoicePagination,
} from './_components/types';

const INITIAL_PAGINATION: InvoicePagination = {
  total: 0,
  page: 1,
  limit: 20,
  totalPages: 0,
};

const INITIAL_FILTERS: InvoiceListFilters = {
  status: '',
  clienteId: '',
  projetoId: '',
  dataInicio: '',
  dataFim: '',
  search: '',
};

type InvoiceStats = {
  totalFaturado: number;
  totalRecebido: number;
  totalPendente: number;
  countVencidas: number;
};

export default function InvoicesPage() {
  const router = useRouter();
  const { success: showSuccess, error: showError } = useToast();
  const { confirm, Dialog: ConfirmDialog } = useConfirm();
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [pagination, setPagination] = useState<InvoicePagination>(INITIAL_PAGINATION);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<InvoiceListFilters>(INITIAL_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [downloading, setDownloading] = useState<number | null>(null);
  const [sending, setSending] = useState<number | null>(null);
  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const debouncedSearch = useDebouncedValue(filters.search, 300);

  async function fetchInvoices(signal?: AbortSignal) {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.status && { status: filters.status }),
        ...(filters.clienteId && { clienteId: filters.clienteId }),
        ...(filters.projetoId && { projetoId: filters.projetoId }),
        ...(filters.dataInicio && {
          dataInicio: new Date(filters.dataInicio).toISOString(),
        }),
        ...(filters.dataFim && {
          dataFim: new Date(filters.dataFim).toISOString(),
        }),
        ...(debouncedSearch && { search: debouncedSearch }),
      });

      const response = await authenticatedFetch(`/api/invoices?${params.toString()}`, {
        signal,
      });
      if (!response.ok) {
        throw new Error('Erro ao carregar invoices');
      }

      const payload = await response.json();
      const invoicePayload = payload.data ?? payload;
      const rawInvoices = Array.isArray(invoicePayload.invoices)
        ? invoicePayload.invoices
        : Array.isArray(invoicePayload)
          ? invoicePayload
          : [];
      const nextPagination = invoicePayload.pagination ?? payload.pagination;

      setInvoices(rawInvoices.map(normalizeInvoiceListItem));
      if (nextPagination) {
        setPagination((current) => ({ ...current, ...nextPagination }));
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        return;
      }
      console.error('Erro ao carregar invoices:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void authenticatedFetch('/api/invoices/stats')
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setStats(json.data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void fetchInvoices(controller.signal);
    return () => controller.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    pagination.page,
    pagination.limit,
    filters.status,
    filters.clienteId,
    filters.projetoId,
    filters.dataInicio,
    filters.dataFim,
    debouncedSearch,
  ]);

  const handleDownloadPDF = async (invoiceId: number, event: React.MouseEvent) => {
    event.stopPropagation();

    try {
      setDownloading(invoiceId);
      const response = await authenticatedFetch(`/api/invoices/${invoiceId}/pdf`);
      if (!response.ok) {
        throw new Error('Erro ao gerar PDF');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download =
        response.headers
          .get('Content-Disposition')
          ?.split('filename="')[1]
          ?.replace('"', '') || `invoice-${invoiceId}.pdf`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      link.remove();
    } catch (error) {
      console.error('Erro ao baixar PDF:', error);
    } finally {
      setDownloading(null);
    }
  };

  const handleSendEmail = async (invoiceId: number, event: React.MouseEvent) => {
    event.stopPropagation();

    const confirmed = await confirm({ title: 'Enviar invoice', message: 'Enviar esta invoice por email ao cliente?' });
    if (!confirmed) return;

    try {
      setSending(invoiceId);
      const response = await authenticatedFetch(`/api/invoices/${invoiceId}/send`, {
        method: 'POST',
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || payload.error || 'Erro ao enviar');
      }

      showSuccess(`Invoice enviada para ${payload.sentTo ?? payload.data?.sentTo ?? 'cliente'}`);
      await fetchInvoices();
    } catch (error) {
      console.error('Erro ao enviar email:', error);
      showError('Erro ao enviar email', 'Verifique a configuração SMTP.');
    } finally {
      setSending(null);
    }
  };

  return (
    <div className="space-y-6">
      <ModulePageHeader
        title="Invoices"
        description="Gerencie suas faturas e recebimentos"
        icon={<InvoiceIcon />}
        accentColor="#0098DA"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Invoices' },
        ]}
        actions={
          <div className="flex gap-2">
            <Button
                          variant="outline"
              onClick={() => router.push('/invoices/relatorios')}
              size="default"
            >
              Relatórios
            </Button>
            <Button onClick={() => router.push('/invoices/new')} size="default">
              <Plus className="h-4 w-4" />
              Nova Invoice
            </Button>
          </div>
        }
      />

      {stats && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card className="border-border shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Faturado</p>
                  <p className="text-lg font-bold text-foreground">{formatInvoiceCurrency(stats.totalFaturado)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Recebido</p>
                  <p className="text-lg font-bold text-foreground">{formatInvoiceCurrency(stats.totalRecebido)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-500/10">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pendente</p>
                  <p className="text-lg font-bold text-foreground">{formatInvoiceCurrency(stats.totalPendente)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Vencidas</p>
                  <p className="text-lg font-bold text-foreground">{stats.countVencidas}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <InvoicesFiltersCard
        filters={filters}
        showFilters={showFilters}
        onFiltersChange={(nextFilters) => {
          setFilters(nextFilters);
          setPagination((current) => ({ ...current, page: 1 }));
        }}
        onToggleFilters={() => setShowFilters((current) => !current)}
        onCreateInvoice={() => router.push('/invoices/new')}
      />

      <InvoicesTableCard
        invoices={invoices}
        loading={loading}
        pagination={pagination}
        downloading={downloading}
        sending={sending}
        onOpenInvoice={(invoiceId) => router.push(`/invoices/${invoiceId}`)}
        onCreateInvoice={() => router.push('/invoices/new')}
        onDownloadPDF={handleDownloadPDF}
        onSendEmail={handleSendEmail}
        onPageChange={(page) => setPagination((current) => ({ ...current, page }))}
      />
      <ConfirmDialog />
    </div>
  );
}
