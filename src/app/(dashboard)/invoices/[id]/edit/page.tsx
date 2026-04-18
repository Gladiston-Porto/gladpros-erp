'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { useToast } from '@gladpros/ui/toast';

import { authenticatedFetch, clientsApi, generalProjectsApi } from '@/lib/api/client';

import {
  InvoiceBasicsStep,
  InvoiceItemsStep,
  InvoiceReviewStep,
} from '../../_components/InvoiceFormSections';
import { InvoiceStepper } from '../../_components/InvoiceStepper';
import { calculateInvoiceItemSubtotal, normalizeInvoiceDetail } from '../../_components/invoice-utils';
import type {
  InvoiceClientOption,
  InvoiceFormData,
  InvoiceFormItem,
  InvoiceProjectOption,
} from '../../_components/types';

export default function EditInvoicePage() {
  const router = useRouter();
  const params = useParams();
  const invoiceId = params?.id as string;
  const { success: showSuccess, error: showError } = useToast();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [bootstrapLoading, setBootstrapLoading] = useState(true);
  const [clientes, setClientes] = useState<InvoiceClientOption[]>([]);
  const [projetos, setProjetos] = useState<InvoiceProjectOption[]>([]);
  const [formData, setFormData] = useState<InvoiceFormData>({
    clienteId: '',
    projetoId: '',
    dataVencimento: '',
    notas: '',
    termos: '',
  });
  const [itens, setItens] = useState<InvoiceFormItem[]>([]);
  const [descontoValor, setDescontoValor] = useState(0);
  const [descontoPercentual, setDescontoPercentual] = useState(0);
  const [notFound, setNotFound] = useState(false);
  const [notEditable, setNotEditable] = useState(false);

  useEffect(() => {
    if (!invoiceId) return;
    const controller = new AbortController();

    async function loadData() {
      try {
        setBootstrapLoading(true);

        const [invoiceRes, clientesData, projetosData] = await Promise.all([
          authenticatedFetch(`/api/invoices/${invoiceId}`, { signal: controller.signal }),
          clientsApi.getClients({ signal: controller.signal }),
          generalProjectsApi.getProjects({ signal: controller.signal }),
        ]);

        if (!invoiceRes.ok) {
          setNotFound(true);
          return;
        }

        const json = await invoiceRes.json();
        const invoice = normalizeInvoiceDetail(json.data ?? json);

        if (['PAID', 'CANCELLED'].includes(invoice.status)) {
          setNotEditable(true);
          return;
        }

        setClientes(Array.isArray(clientesData) ? clientesData : []);
        setProjetos(Array.isArray(projetosData) ? projetosData : []);

        setFormData({
          clienteId: String(invoice.cliente.id),
          projetoId: invoice.projeto ? String(invoice.projeto.id) : '',
          dataVencimento: invoice.dataVencimento
            ? new Date(invoice.dataVencimento).toISOString().split('T')[0]
            : '',
          notas: invoice.notas ?? '',
          termos: invoice.termos ?? '',
        });

        setItens(
          invoice.itens.map((item, idx) => ({
            tipo: item.tipo as InvoiceFormItem['tipo'],
            descricao: item.descricao,
            quantidade: item.quantidade,
            unidade: item.unidade,
            precoUnitario: item.precoUnitario,
            desconto: item.desconto,
            taxavel: item.taxavel,
            ordem: idx,
          })),
        );

        setDescontoValor(Number(invoice.descontoValor));
        setDescontoPercentual(Number(invoice.descontoPercentual));
      } catch (error) {
        if ((error as Error).name === 'AbortError') return;
        console.error('Erro ao carregar invoice para edição:', error);
        setNotFound(true);
      } finally {
        setBootstrapLoading(false);
      }
    }

    loadData();
    return () => controller.abort();
  }, [invoiceId]);

  const filteredProjetos = useMemo(() => {
    if (!formData.clienteId) return [];
    const clienteId = parseInt(formData.clienteId, 10);
    return projetos.filter((p) => p.clienteId === clienteId);
  }, [formData.clienteId, projetos]);

  const totals = useMemo(() => {
    const subtotal = itens.reduce((sum, item) => sum + calculateInvoiceItemSubtotal(item), 0);
    const desconto = descontoPercentual > 0 ? subtotal * (descontoPercentual / 100) : descontoValor;
    const subtotalComDesconto = subtotal - desconto;
    const subtotalTaxavel = itens
      .filter((item) => item.taxavel)
      .reduce((sum, item) => sum + calculateInvoiceItemSubtotal(item), 0);
    const taxBase = subtotal > 0 ? subtotalTaxavel * (subtotalComDesconto / subtotal) : subtotalTaxavel;
    const taxAmount = taxBase * 0.0825;
    const total = subtotalComDesconto + taxAmount;
    return { subtotal, desconto, subtotalComDesconto, taxAmount, total };
  }, [itens, descontoPercentual, descontoValor]);

  const selectedCliente = useMemo(
    () => clientes.find((c) => c.id === Number(formData.clienteId)),
    [clientes, formData.clienteId],
  );

  const selectedProjeto = useMemo(
    () => projetos.find((p) => p.id === Number(formData.projetoId)),
    [projetos, formData.projetoId],
  );

  const addItem = () => {
    setItens((current) => [
      ...current,
      {
        tipo: 'SERVICE' as const,
        descricao: '',
        quantidade: 1,
        unidade: 'hour',
        precoUnitario: 0,
        desconto: 0,
        taxavel: true,
        ordem: current.length,
      },
    ]);
  };

  const removeItem = (index: number) => {
    setItens((current) => current.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof InvoiceFormItem, value: any) => {
    setItens((current) =>
      current.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      if (!formData.dataVencimento) {
        showError('Campos obrigatórios', 'Informe a data de vencimento');
        return;
      }

      if (itens.length === 0 || itens.some((item) => !item.descricao)) {
        showError('Itens inválidos', 'Adicione pelo menos um item com descrição');
        return;
      }

      const payload = {
        dataVencimento: new Date(formData.dataVencimento).toISOString(),
        notas: formData.notas,
        termos: formData.termos,
        itens: itens.map((item) => ({
          ...item,
          quantidade: Number(item.quantidade),
          precoUnitario: Number(item.precoUnitario),
          desconto: Number(item.desconto),
        })),
        descontoValor: Number(descontoValor),
        descontoPercentual: Number(descontoPercentual),
      };

      const response = await authenticatedFetch(`/api/invoices/${invoiceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || err.error || 'Erro ao atualizar invoice');
      }

      showSuccess('Invoice atualizada com sucesso!');
      router.push(`/invoices/${invoiceId}`);
    } catch (error: any) {
      console.error('Erro ao atualizar invoice:', error);
      showError('Erro ao atualizar invoice', error.message);
    } finally {
      setLoading(false);
    }
  };

  if (bootstrapLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-5xl p-6 text-center text-muted-foreground">
        Invoice não encontrada.{' '}
        <button className="text-brand-primary underline" onClick={() => router.push('/invoices')}>
          Voltar para lista
        </button>
      </div>
    );
  }

  if (notEditable) {
    return (
      <div className="mx-auto max-w-5xl p-6 text-center text-muted-foreground">
        Esta invoice não pode ser editada.{' '}
        <button
          className="text-brand-primary underline"
          onClick={() => router.push(`/invoices/${invoiceId}`)}
        >
          Ver detalhes
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <button
          onClick={() => router.back()}
          className="mb-4 flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
          Voltar
        </button>
        <h1 className="text-3xl font-bold text-foreground">Editar Invoice</h1>
        <p className="mt-1 text-muted-foreground">Atualize os dados desta fatura</p>
      </div>

      <InvoiceStepper step={step} />

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        {step === 1 && (
          <InvoiceBasicsStep
            bootstrapLoading={false}
            formData={formData}
            clientes={clientes}
            filteredProjetos={filteredProjetos}
            onChange={setFormData}
          />
        )}

        {step === 2 && (
          <InvoiceItemsStep
            itens={itens}
            onAddItem={addItem}
            onRemoveItem={removeItem}
            onUpdateItem={updateItem}
            onCalculateSubtotal={calculateInvoiceItemSubtotal}
          />
        )}

        {step === 3 && (
          <InvoiceReviewStep
            formData={formData}
            itens={itens}
            descontoValor={descontoValor}
            descontoPercentual={descontoPercentual}
            selectedCliente={selectedCliente}
            selectedProjeto={selectedProjeto}
            totals={totals}
            onCalculateSubtotal={calculateInvoiceItemSubtotal}
            onDiscountValueChange={(value) => {
              setDescontoValor(value);
              setDescontoPercentual(0);
            }}
            onDiscountPercentChange={(value) => {
              setDescontoPercentual(value);
              setDescontoValor(0);
            }}
          />
        )}
      </div>

      <div className="mt-6 flex justify-between">
        <button
          onClick={() => setStep((current) => current - 1)}
          disabled={step === 1}
          className="flex items-center gap-2 rounded-xl border border-border px-6 py-3 transition-colors hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>

        {step < 3 ? (
          <button
            onClick={() => setStep((current) => current + 1)}
            className="flex items-center gap-2 rounded-xl bg-brand-primary px-6 py-3 text-white transition-colors hover:bg-brand-primary/90"
          >
            Próximo
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-green-600 px-6 py-3 text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Salvando...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Salvar Alterações
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
