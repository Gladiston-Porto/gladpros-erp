// Tipos temporários do Prisma (declarações) — extensão .d.ts para evitar check noise
// Este arquivo substitui as importações do @prisma/client temporariamente

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface Proposta {
  id: number;
  numeroProposta: string;
  titulo?: string | null;
  descricao?: string | null;
  status: StatusProposta;
  valorEstimado: number;
  dataVencimento?: Date | null;
  tokenAcesso?: string | null;
  tokenPublico?: string | null;
  tokenExpiresAt?: Date | null;
  assinadoEm?: Date | null;
  assinaturaTipo?: string | null;
  assinaturaNome?: string | null;
  assinaturaImagem?: string | null;
  criadoEm: Date;
  createdAt: Date;
  atualizadoEm: Date;
  clienteId: number;
  usuarioId?: number | null;
  cliente?: Cliente;
  usuario?: Usuario;
  etapas?: PropostaEtapa[];
  materiais?: PropostaMaterial[];
  anexos?: AnexoProposta[];
  logs?: PropostaLog[];
}

export interface PropostaEtapa {
  id: number;
  propostaId: number;
  servico: string;
  descricao: string;
  status: StatusEtapaProposta;
  ordem: number;
  quantidade?: number | null;
  unidade?: string | null;
  duracaoEstimadaHoras?: number | null;
  custoMaoObraEstimado?: number | null;
  dependencias?: string | null;
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface PropostaMaterial {
  id: number;
  propostaId: number;
  nome: string;
  codigo?: string | null;
  quantidade: number;
  unidade?: string | null;
  valorUnitario?: number | null;
  precoUnitario?: number | null;
  status: StatusMaterialProposta;
  moeda: string;
  observacao?: string | null;
  fornecedorPreferencial?: string | null;
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface AnexoProposta {
  id: number;
  propostaId: number;
  nome: string;
  caminho: string;
  tamanho: number;
  tipo: string;
  criadoEm: Date;
  privado?: boolean;
}

export interface PropostaLog {
  id: number;
  propostaId: number;
  acao: string;
  detalhes?: string | null;
  criadoEm: Date;
  usuarioId?: number | null;
  usuario?: Usuario;
}

export interface Cliente {
  id: number;
  nomeCompleto?: string | null;
  razaoSocial?: string | null;
  email: string;
  telefone?: string | null;
  nomeFantasia?: string | null;
  tipo: string;
  endereco1?: string | null;
  endereco2?: string | null;
  cidade?: string | null;
  estado?: string | null;
  zipcode?: string | null;
  status: string;
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface Usuario {
  id: number;
  email: string;
  nomeCompleto?: string | null;
  status: string;
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface Projeto {
  id: number;
  nome: string;
  descricao?: string | null;
  clienteId: number;
  status: string;
  criadoEm: Date;
  atualizadoEm: Date;
}

export enum StatusProposta {
  RASCUNHO = 'RASCUNHO',
  PENDENTE_APROVACAO = 'PENDENTE_APROVACAO',
  APROVADA = 'APROVADA',
  REJEITADA = 'REJEITADA',
  CANCELADA = 'CANCELADA',
  ENVIADA = 'ENVIADA',
  ASSINADA = 'ASSINADA',
}

export enum StatusPermite {
  NECESSARIO = 'NECESSARIO',
  NAO_NECESSARIO = 'NAO_NECESSARIO',
  OBTIDO = 'OBTIDO',
}

export enum StatusEtapaProposta {
  PLANEJADA = 'PLANEJADA',
  EM_ANDAMENTO = 'EM_ANDAMENTO',
  CONCLUIDA = 'CONCLUIDA',
  CANCELADA = 'CANCELADA',
}

export enum StatusMaterialProposta {
  PLANEJADO = 'PLANEJADO',
  PEDIDO = 'PEDIDO',
  ENTREGUE = 'ENTREGUE',
  SUBSTITUIDO = 'SUBSTITUIDO',
  REMOVIDO = 'REMOVIDO',
}

// Tipos do Prisma Client (stubs) — use unknown/JsonValue for flexible shapes
export interface PrismaClientOptions {}

export interface DefaultArgs {}

export type TransactionClient = {
  proposta: {
    findUnique: (args?: unknown) => Promise<Proposta | null>;
    findFirst: (args?: unknown) => Promise<Proposta | null>;
    findMany: (args?: unknown) => Promise<Proposta[]>;
    create: (args?: unknown) => Promise<Proposta>;
    update: (args?: unknown) => Promise<Proposta>;
    updateMany: (args?: unknown) => Promise<JsonValue>;
    delete: (args?: unknown) => Promise<Proposta>;
    count: (args?: unknown) => Promise<number>;
  };
  propostaLog: {
    create: (args?: unknown) => Promise<PropostaLog>;
    findMany: (args?: unknown) => Promise<PropostaLog[]>;
  };
  propostaEtapa: {
    create: (args?: unknown) => Promise<PropostaEtapa>;
    createMany: (args?: unknown) => Promise<JsonValue>;
    findMany: (args?: unknown) => Promise<PropostaEtapa[]>;
  };
  propostaMaterial: {
    create: (args?: unknown) => Promise<PropostaMaterial>;
    createMany: (args?: unknown) => Promise<JsonValue>;
    findMany: (args?: unknown) => Promise<PropostaMaterial[]>;
  };
  cliente: {
    findUnique: (args?: unknown) => Promise<Cliente | null>;
    findMany: (args?: unknown) => Promise<Cliente[]>;
    create: (args?: unknown) => Promise<Cliente>;
    update: (args?: unknown) => Promise<Cliente>;
    delete: (args?: unknown) => Promise<Cliente>;
    count: (args?: unknown) => Promise<number>;
  };
  usuario: {
    findUnique: (args?: unknown) => Promise<Usuario | null>;
    findMany: (args?: unknown) => Promise<Usuario[]>;
    create: (args?: unknown) => Promise<Usuario>;
    update: (args?: unknown) => Promise<Usuario>;
    delete: (args?: unknown) => Promise<Usuario>;
    count: (args?: unknown) => Promise<number>;
  };
};

export declare class PrismaClient {
  proposta: TransactionClient['proposta'];
  propostaLog: TransactionClient['propostaLog'];
  propostaEtapa: TransactionClient['propostaEtapa'];
  propostaMaterial: TransactionClient['propostaMaterial'];
  cliente: TransactionClient['cliente'];
  usuario: TransactionClient['usuario'];

  constructor(options?: PrismaClientOptions);

  $connect(): Promise<void>;
  $disconnect(): Promise<void>;
  $transaction<T>(fn: (tx: TransactionClient) => Promise<T>): Promise<T>;

  // Método auxiliar (stub) apenas como assinatura
  generatePropostaNumber(): Promise<string>;
}
