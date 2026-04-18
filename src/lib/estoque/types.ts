/**
 * TIPOS TypeScript - Módulo Estoque
 * 
 * Tipos derivados dos models Prisma + tipos auxiliares
 */

import { Prisma } from '@prisma/client';

// ============================================================================
// TIPOS BASE
// ============================================================================

export type Unidade = Prisma.UnidadeGetPayload<{}>;
export type Categoria = Prisma.CategoriaGetPayload<{}>;
export type Localizacao = Prisma.LocalizacaoGetPayload<{}>;
export type Fornecedor = Prisma.FornecedorGetPayload<{}>;

// ============================================================================
// MATERIAIS
// ============================================================================

export type Material = Prisma.MaterialGetPayload<{}>;
export type MaterialLote = Prisma.MaterialLoteGetPayload<{}>;
export type MaterialSaldo = Prisma.MaterialSaldoGetPayload<{}>;
export type MaterialMovimentacao = Prisma.MaterialMovimentacaoGetPayload<{}>;
export type ProjetoMaterialEstoque = Prisma.ProjetoMaterialEstoqueGetPayload<{}>;

// Material com relações
export type MaterialComRelacoes = Prisma.MaterialGetPayload<{
  include: {
    categoria: true;
    unidade: true;
    lotes: true;
    saldos: {
      include: {
        localizacao: true;
        lote: true;
      };
    };
  };
}>;

// Material com saldo agregado
export interface MaterialComSaldo extends Material {
  saldoTotal: number;
  saldoDisponivel: number;
  saldoReservado: number;
  alertaBaixoEstoque: boolean;
}

// ============================================================================
// EQUIPAMENTOS
// ============================================================================

export type Equipamento = Prisma.EquipamentoGetPayload<{}>;
export type ProjetoEquipamento = Prisma.ProjetoEquipamentoGetPayload<{}>;
export type EquipamentoManutencao = Prisma.EquipamentoManutencaoGetPayload<{}>;

// Equipamento com relações
export type EquipamentoComRelacoes = Prisma.EquipamentoGetPayload<{
  include: {
    categoria: true;
    fornecedor: true;
    projetoAtual: true;
    projetoEquipamentos: {
      include: {
        projeto: true;
        responsavel: true;
      };
    };
    manutencoes: {
      orderBy: {
        dataInicio: 'desc';
      };
      take: 5;
    };
  };
}>;

// ============================================================================
// ALERTAS E COMPRAS
// ============================================================================

export type AlertaEstoque = Prisma.AlertaEstoqueGetPayload<{}>;
export type Compra = Prisma.CompraGetPayload<{}>;
export type CompraItem = Prisma.CompraItemGetPayload<{}>;

// Alerta com relações
export type AlertaComRelacoes = Prisma.AlertaEstoqueGetPayload<{
  include: {
    material: true;
    equipamento: true;
    projeto: true;
    visualizador: true;
    resolvedor: true;
  };
}>;

// Compra com relações
export type CompraComRelacoes = Prisma.CompraGetPayload<{
  include: {
    fornecedor: true;
    projeto: true;
    itens: {
      include: {
        material: true;
        equipamento: true;
        lote: true;
      };
    };
  };
}>;

// ============================================================================
// ENUMS (Re-export do Prisma)
// ============================================================================

export { Categoria_tipo as CategoriaTipo } from '@prisma/client';
export { Localizacao_tipo as LocalizacaoTipo } from '@prisma/client';
export { Fornecedor_tipoDocumento as FornecedorTipoDocumento } from '@prisma/client';
export { MaterialMovimentacao_tipo as MaterialMovimentacaoTipo } from '@prisma/client';
export { Equipamento_tipo as EquipamentoTipo } from '@prisma/client';
export { Equipamento_status as EquipamentoStatus } from '@prisma/client';
export { ProjetoEquipamento_status as ProjetoEquipamentoStatus } from '@prisma/client';
export { ProjetoEquipamento_condicao as ProjetoEquipamentoCondicao } from '@prisma/client';
export { ProjetoEquipamento_condicaoRetorno as ProjetoEquipamentoCondicaoRetorno } from '@prisma/client';
export { EquipamentoManutencao_tipo as EquipamentoManutencaoTipo } from '@prisma/client';
export { AlertaEstoque_tipo as AlertaEstoqueTipo } from '@prisma/client';
export { AlertaEstoque_prioridade as AlertaEstoquePrioridade } from '@prisma/client';
export { Compra_tipo as CompraTipo } from '@prisma/client';
export { Compra_status as CompraStatus } from '@prisma/client';
export { CompraItem_tipo as CompraItemTipo } from '@prisma/client';

// ============================================================================
// TIPOS DE FORMULÁRIO (Input)
// ============================================================================

// Material Form
export interface MaterialFormData {
  codigo: string;
  nome: string;
  descricao?: string;
  categoriaId?: number;
  unidadeId: number;
  fabricante?: string;
  modelo?: string;
  ncm?: string;
  pesoUnitario?: number;
  dimensoes?: string;
  fotoUrl?: string;
  estoqueMinimo: number;
  pontoReposicao: number;
  rastreioLote: boolean;
  possuiValidade: boolean;
}

// Equipamento Form
export interface EquipamentoFormData {
  codigo: string;
  nome: string;
  tipo: string;
  categoriaId?: number;
  marca?: string;
  modelo?: string;
  numeroSerie?: string;
  anoFabricacao?: number;
  dataAquisicao: string; // ISO date
  valorAquisicao: number;
  fornecedorId?: number;
  notaFiscal?: string;
  requerCalibracao: boolean;
  periodicidadeCalibracaoDias?: number;
  requerManutencaoPeriodica: boolean;
  periodicidadeManutencaoDias?: number;
  fotoUrl?: string;
  manualUrl?: string;
  observacoes?: string;
}

// Movimentação
export interface MovimentacaoFormData {
  tipo: string;
  materialId: number;
  loteId?: number;
  localizacaoOrigemId?: number;
  localizacaoDestinoId?: number;
  quantidade: number;
  custoUnitario?: number;
  projetoId?: number;
  motivo?: string;
  referenciaExterna?: string;
}

// Reserva de Material
export interface ReservaMaterialFormData {
  projetoId: number;
  materialId: number;
  loteId?: number;
  quantidade: number;
  observacoes?: string;
}

// Alocação de Equipamento
export interface AlocacaoEquipamentoFormData {
  projetoId: number;
  equipamentoId: number;
  responsavelId: number;
  dataDevolucaoPrevista?: string; // ISO date
  condicaoSaida: string;
  condicaoSaidaObs?: string;
  custoDiaria?: number;
  cobrarCliente: boolean;
  observacoes?: string;
}

// Devolução de Equipamento
export interface DevolucaoEquipamentoFormData {
  condicaoRetorno: string;
  condicaoRetornoObs?: string;
  verificadoPor: number;
}

// Manutenção
export interface ManutencaoFormData {
  equipamentoId: number;
  tipo: string;
  dataInicio: string; // ISO date
  dataConclusao?: string; // ISO date
  fornecedorId?: number;
  custo?: number;
  notaFiscal?: string;
  descricao: string;
  servicosRealizados?: string;
  pecasTrocadas?: string;
  proximaManutencao?: string; // ISO date
  proximaCalibracao?: string; // ISO date
}

// ============================================================================
// TIPOS DE RESPOSTA API
// ============================================================================

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface SaldoResponse {
  materialId: number;
  materialNome: string;
  saldos: Array<{
    localizacao: string;
    lote?: string;
    quantidade: number;
    reservado: number;
    disponivel: number;
  }>;
  totalQuantidade: number;
  totalReservado: number;
  totalDisponivel: number;
}

// ============================================================================
// TIPOS DE FILTRO
// ============================================================================

export interface MaterialFilter {
  codigo?: string;
  nome?: string;
  categoriaId?: number;
  ativo?: boolean;
  baixoEstoque?: boolean; // estoqueDisponivel <= estoqueMinimo
}

export interface EquipamentoFilter {
  codigo?: string;
  nome?: string;
  tipo?: string;
  status?: string;
  categoriaId?: number;
  projetoId?: number;
  ativo?: boolean;
}

export interface MovimentacaoFilter {
  materialId?: number;
  projetoId?: number;
  tipo?: string;
  dataInicio?: string; // ISO date
  dataFim?: string; // ISO date
}

export interface AlertaFilter {
  tipo?: string;
  prioridade?: string;
  ativo?: boolean;
  materialId?: number;
  equipamentoId?: number;
  projetoId?: number;
}

// ============================================================================
// TIPOS DE DASHBOARD/ANALYTICS
// ============================================================================

export interface EstoqueDashboard {
  resumo: {
    totalMateriais: number;
    materiaisAtivos: number;
    materiaisBaixoEstoque: number;
    totalEquipamentos: number;
    equipamentosDisponiveis: number;
    equipamentosEmUso: number;
    equipamentosManutencao: number;
    alertasCriticos: number;
  };
  alertas: AlertaComRelacoes[];
  materiaisCriticos: MaterialComSaldo[];
  equipamentosPendentes: EquipamentoComRelacoes[];
}

export interface ConsumoProjetoReport {
  projetoId: number;
  projetoNome: string;
  materiais: Array<{
    materialId: number;
    materialNome: string;
    quantidadeReservada: number;
    quantidadeUsada: number;
    custoTotal: number;
    cobrarCliente: boolean;
  }>;
  equipamentos: Array<{
    equipamentoId: number;
    equipamentoNome: string;
    dataAlocacao: Date;
    dataDevolucao?: Date;
    diasUso: number;
    valorTotal: number;
    cobrarCliente: boolean;
  }>;
  custoTotalMateriais: number;
  custoTotalEquipamentos: number;
  custoTotalGeral: number;
}
