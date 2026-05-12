'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { useToast } from '@gladpros/ui/toast';

import { clientsApi, generalProjectsApi, invoicesApi } from '@/lib/api/client';

import {
  InvoiceBasicsStep,
  InvoiceItemsStep,
  InvoiceReviewStep,
} from '../_components/InvoiceFormSections';
import { InvoiceStepper } from '../_components/InvoiceStepper';
import { calculateInvoiceItemSubtotal } from '../_components/invoice-utils';
import type {
  InvoiceClientOption,
  InvoiceFormData,
  InvoiceFormItem,
  InvoiceProjectOption,
} from '../_components/types';

const INITIAL_FORM_DATA: InvoiceFormData = {
  clienteId: '',
  projetoId: '',
  dataVencimento: '',
  notas: '',
  termos: '',
};

const INITIAL_ITEM: InvoiceFormItem = {
  tipo: 'SERVICE',
  descricao: '',
  quantidade: 1,
  unidade: 'hour',
  precoUnitario: 0,
  desconto: 0,
  taxavel: true,
  ordem: 0,
};

export default function NewInvoicePage() {
  const router = useRouter();
  const { success: showSuccess, error: showError } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [bootstrapLoading, setBootstrapLoading] = useState(true);
  const [clientes, setClientes] = useState<InvoiceClientOption[]>([]);
  const [projetos, setProjetos] = useState<InvoiceProjectOption[]>([]);
  const [formData, setFormData] = useState<InvoiceFormData>(INITIAL_FORM_DATA);
  const [itens, setItens] = useState<InvoiceFormItem[]>([INITIAL_ITEM]);
  const [descontoValor, setDescontoValor] = useState(0);
  const [descontoPercentual, setDescontoPercentual] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadInitialData() {
      try {
        setBootstrapLoading(true);
        const [clientesData, projetosData] = await Promise.all([
          clientsApi.getClients({ signal: controller.signal }),
          generalProjectsApi.getProjects({ signal: controller.signal }),
        ]);

        setClientes(Array.isArray(clientesData) ? clientesData : []);
        setProjetos(Array.isArray(projetosData) ? projetosData : []);
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          return;
        }
        console.error('Erro ao carregar dados iniciais da invoice:', error);
      } finally {
        setBootstrapLoading(false);
      }
    }

    loadInitialData();

    return () => controller.abort();
  }, []);

  const filteredProjetos = useMemo(() => {
    if (!formData.clienteId) {
      return [];
    }

    const clienteId = parseInt(formData.clienteId, 10);
    return projetos.filter((projeto) => projeto.clienteId === clienteId);
  }, [formData.clienteId, projetos]);

  const totals = useMemo(() => {
    const subtotal = itens.reduce(
      (sum, item) => sum + calculateInvoiceItemSubtotal(item),
      0
    );
    const desconto =
      descontoPercentual > 0
        ? subtotal * (descontoPercentual / 100)
        : descontoValor;
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
    () => clientes.find((cliente) => cliente.id === Number(formData.clienteId)),
    [clientes, formData.clienteId]
  );

  const selectedProjeto = useMemo(
    () => projetos.find((projeto) => projeto.id === Number(formData.projetoId)),
    [projetos, formData.projetoId]
  );

  const addItem = () => {
    setItens((current) => [
      ...current,
      {
        ...INITIAL_ITEM,
        ordem: current.length,
      },
    ]);
  };

  const removeItem = (index: number) => {
    setItens((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

   
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateItem = (index: number, field: keyof InvoiceFormItem, value: any) => {
    setItens((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      )
    );
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      if (!formData.clienteId || !formData.dataVencimento) {
        showError('Campos obrigatórios', 'Preencha cliente e data de vencimento');
        return;
      }

      if (itens.length === 0 || itens.some((item) => !item.descricao)) {
        showError('Itens inválidos', 'Adicione pelo menos um item com descrição');
        return;
      }

      const payload = {
        clienteId: parseInt(formData.clienteId, 10),
        projetoId: formData.projetoId ? parseInt(formData.projetoId, 10) : undefined,
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

      const invoice = await invoicesApi.createInvoice(payload);
      showSuccess('Invoice criada com sucesso!');
       
      router.push(`/invoices/${invoice.id}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error('Erro ao criar invoice:', error);
      showError('Erro ao criar invoice', error.message || 'Tente novamente');
    } finally {
      setLoading(false);
    }
  };

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
        <h1 className="text-3xl font-bold text-foreground">Nova Invoice</h1>
        <p className="mt-1 text-muted-foreground">
          Crie uma nova fatura para seus clientes
        </p>
      </div>

      <InvoiceStepper step={step} />

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        {step === 1 && (
          <InvoiceBasicsStep
            bootstrapLoading={bootstrapLoading}
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
                Criando...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Criar Invoice
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
