import { StatusProposta, StatusPermite } from '@/shared/types/prisma-temp'

// Tipos específicos do formulário de proposta
export interface Material {
  id: string;
  codigo: string;
  nome: string;
  quantidade: number;
  unidade: string;
  preco?: number; // interno
  status: "necessario" | "opcional" | "substituivel";
  fornecedor?: string;
  obs?: string;
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
  local_endereco: string;
  titulo: string;
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
}

export interface TotaisCalculados {
  mat: number;
  mo: number;
  terce: number;
  frete: number;
  overhead: number;
  margem: number;
  conting: number;
  impostos: number;
  precoCliente: number;
}
