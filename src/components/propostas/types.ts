import { StatusProposta, StatusPermite } from '@/shared/types/prisma-temp'

// Tipos específicos do formulário de proposta
export interface Material {
  id: string;
  codigo: string;
  nome: string;
  quantidade: number;
  unidade: string;
  preco?: number; // interno (custo por unidade base)
  status: "necessario" | "opcional" | "substituivel";
  fornecedor?: string;
  obs?: string;
  estoqueItemId?: number; // soft-link to EstoqueItem for stock availability check
  estoqueDisponivel?: number; // read-only: populated when checking stock
  /** false = material from stock (tax already embedded in cost); true = needs to be purchased (TX sales tax 8.25% applies) */
  aComprar: boolean;
  // Multi-UOM fields (optional — only set when entering via embalagem)
  tipoEntrada?: 'unidade' | 'embalagem'; // UI toggle
  embalagemId?: number;       // FK to MaterialEmbalagem
  qtdEmbalagens?: number;     // number of packages entered
  embalagemBaseQtyAtTime?: number; // SNAPSHOT: baseQtyPerUnit at time of entry
  embalagemPrecoAtTime?: number;   // SNAPSHOT: precoCompra at time of entry
  embalagemUnitAtTime?: string;    // SNAPSHOT: packageType label (e.g. "ROLL", "PACK")
}

export interface Etapa {
  id: string;
  servico: string;
  descricao: string;
  quantidade?: number;
  unidade?: string;
  duracaoHoras?: number;
  custoMO?: number; // interno
  status: "planejada" | "opcional" | "removida";
}

export interface ClienteInfo {
  id: string;
  contato_nome: string;
  contato_email: string;
  contato_telefone?: string;
  local_endereco: string; // kept as legacy/fallback text
  titulo: string;
  // Structured service address (where work happens — may differ from client billing address)
  serviceAddressLine1?: string;
  serviceAddressLine2?: string;
  serviceAddressCity?: string;
  serviceAddressState?: string; // 2-letter state code, default "TX"
  serviceAddressZip?: string;
}

export interface PrazosInfo {
  tempo_para_aceite: number;
  validade_proposta: string;
  prazo_execucao_dias: number;
  janela?: string;
  restricoes?: string;
}

export interface ComerciaisInfo {
  condicoes_pagamento: string;
  garantia: string;
  exclusoes: string;
  condicoes_gerais: string;
  desconto: number;
}

export interface ComercialInfo {
  valor_proposta: number;
  prazo_validade: number;
  local_execucao: string;
  condicoes_pagamento: string[];
  observacoes: string;
  garantias: string;
}

export interface PermiteInfo {
  status: StatusPermite;
  quais_permites?: string;
  normas?: string;
  inspecoes?: string;
}

export interface ObservacoesInfo {
  obs_cliente?: string;
  obs_internas?: string;
}

export interface EscopoInfo {
  titulo: string;
  escopo: string;
  resumo_executivo?: string;
}

export interface InternoInfo {
  custo_material: number;
  custo_mo: number;
  horas_mo: number;
  custo_terceiros: number;
  overhead_pct: number;
  margem_pct: number;
  impostos_pct: number;
  contingencia_pct: number;
  frete: number;
}

export interface FaturamentoInfo {
  gatilho: "na_aprovacao" | "por_marcos" | "na_entrega" | "custom";
  percentual_sinal: number;
  forma_preferida: string;
  instrucoes: string;
}

export interface PropostaFormData {
  // Identificação
  cliente: ClienteInfo;
  escopo: string;

  // Prazos
  prazos: PrazosInfo;

  // Permits
  permite: StatusPermite;
  quaisPermites: string;
  normas: string;
  inspecoes: string;

  // Linhas
  materiais: Material[];
  etapas: Etapa[];

  // Comerciais
  comerciais: ComerciaisInfo;

  // Internos
  interno: InternoInfo;

  // Faturamento
  faturamento: FaturamentoInfo;

  // Observações
  obsCliente: string;
  obsInternas: string;

  // Status
  status: StatusProposta;

  // Tax classification (used by salesTaxService for TX sales tax)
  propertyType?: 'RESIDENTIAL' | 'COMMERCIAL' | 'MIXED_USE' | 'EXEMPT_ORGANIZATION' | 'GOVERNMENT';
  serviceCategory?: 'NEW_CONSTRUCTION' | 'REPAIR' | 'REMODEL' | 'RESTORATION' | 'MAINTENANCE' | 'INSPECTION' | 'CONSULTATION';
  contractType?: 'LUMP_SUM' | 'SEPARATED' | 'COST_PLUS';
}

export interface TotaisCalculados {
  mat: number;          // total materials including sales tax
  matEstoque: number;   // materials from stock (tax already in purchase cost)
  matComprar: number;   // materials to buy (pre-tax base price)
  salesTax: number;     // TX sales tax 8.25% applied only on matComprar
  mo: number;
  terce: number;
  frete: number;
  overhead: number;
  margem: number;
  conting: number;
  impostos: number;
  precoCliente: number;
}
