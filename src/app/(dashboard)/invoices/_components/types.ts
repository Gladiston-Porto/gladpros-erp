export interface InvoiceListItem {
  id: number;
  numeroInvoice: string;
  cliente: {
    nome: string;
    email: string;
  };
  projeto?: {
    nome: string;
  };
  dataEmissao: string;
  dataVencimento: string;
  valorTotal: number;
  valorPago: number;
  saldo: number;
  status: string;
  _count: {
    pagamentos: number;
  };
}

export interface InvoicePagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface InvoiceListFilters {
  status: string;
  clienteId: string;
  projetoId: string;
  dataInicio: string;
  dataFim: string;
  search: string;
}

export interface InvoiceClientOption {
  id: number;
  nome: string;
  email: string;
}

export interface InvoiceProjectOption {
  id: number;
  nome: string;
  clienteId: number;
}

export type InvoiceItemType = "SERVICE" | "MATERIAL" | "EQUIPMENT" | "OTHER";

export interface InvoiceFormItem {
  tipo: InvoiceItemType;
  descricao: string;
  quantidade: number;
  unidade: string;
  precoUnitario: number;
  desconto: number;
  taxavel: boolean;
  ordem: number;
}

export interface InvoiceFormData {
  clienteId: string;
  projetoId: string;
  dataVencimento: string;
  notas: string;
  termos: string;
}

export interface InvoiceDetail {
  id: number;
  numeroInvoice: string;
  cliente: {
    id: number;
    nome: string;
    email: string;
    telefone?: string;
  };
  projeto?: {
    id: number;
    nome: string;
  };
  dataEmissao: string;
  dataVencimento: string;
  dataPagamento?: string;
  subtotal: number;
  descontoValor: number;
  descontoPercentual: number;
  taxRate: number;
  taxAmount: number;
  // Tax Classification (Fase 2)
  propertyType?: string | null;
  serviceCategory?: string | null;
  contractType?: string | null;
  taxMode?: string | null;
  taxScenario?: string | null;
  taxableAmount?: number | null;
  nonTaxableAmount?: number | null;
  taxExplanation?: string | null;
  taxAddressCity?: string | null;
  taxAddressState?: string | null;
  manualTaxOverride?: boolean;
  manualTaxOverrideReason?: string | null;
  valorTotal: number;
  valorPago: number;
  saldo: number;
  status: string;
  notas?: string;
  termos?: string;
  itens: Array<{
    id: number;
    tipo: string;
    descricao: string;
    quantidade: number;
    unidade: string;
    precoUnitario: number;
    desconto: number;
    subtotal: number;
    taxavel: boolean;
  }>;
  pagamentos: Array<{
    id: number;
    valor: number;
    dataPagamento: string;
    metodoPagamento: string;
    referencia?: string;
    notas?: string;
    criador: {
      nome: string;
    };
  }>;
  criador: {
    nome: string;
    email: string;
  };
  criadoEm: string;
  lembretes?: Array<{
    id: number;
    tipo: string;
    dataEnvio: string;
    metodo: string;
    destinatario: string;
    assunto: string;
    status: string;
    erro?: string | null;
    diasAposVencimento?: number | null;
  }>;
}

export interface InvoicePaymentData {
  valor: string;
  dataPagamento: string;
  metodoPagamento: string;
  referencia: string;
  notas: string;
}
