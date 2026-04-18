/**
 * CÁLCULOS - Módulo Estoque
 * 
 * Funções para cálculos de negócio
 */

/**
 * Calcula quantidade disponível (total - reservado)
 */
export function calcularDisponivel(quantidade: number, reservado: number): number {
  return Math.max(0, quantidade - reservado);
}

/**
 * Verifica se material está em estoque baixo
 */
export function isEstoqueBaixo(disponivel: number, estoqueMinimo: number): boolean {
  return disponivel <= estoqueMinimo;
}

/**
 * Verifica se material atingiu ponto de reposição
 */
export function isPontoReposicao(disponivel: number, pontoReposicao: number): boolean {
  return disponivel <= pontoReposicao;
}

/**
 * Calcula dias até o vencimento de lote
 */
export function calcularDiasVencimento(dataValidade: string | Date): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  
  const validade = typeof dataValidade === 'string' 
    ? new Date(dataValidade) 
    : dataValidade;
  validade.setHours(0, 0, 0, 0);
  
  const diffMs = validade.getTime() - hoje.getTime();
  const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  
  return diffDias;
}

/**
 * Verifica se lote está vencido
 */
export function isLoteVencido(dataValidade: string | Date): boolean {
  return calcularDiasVencimento(dataValidade) < 0;
}

/**
 * Verifica se lote está próximo ao vencimento (30 dias)
 */
export function isLoteProximoVencimento(dataValidade: string | Date, diasAlerta: number = 30): boolean {
  const dias = calcularDiasVencimento(dataValidade);
  return dias >= 0 && dias <= diasAlerta;
}

/**
 * Calcula dias de uso de equipamento
 */
export function calcularDiasUso(dataAlocacao: string | Date, dataDevolucao?: string | Date): number {
  const inicio = typeof dataAlocacao === 'string' 
    ? new Date(dataAlocacao) 
    : dataAlocacao;
  inicio.setHours(0, 0, 0, 0);
  
  const fim = dataDevolucao 
    ? (typeof dataDevolucao === 'string' ? new Date(dataDevolucao) : dataDevolucao)
    : new Date();
  fim.setHours(0, 0, 0, 0);
  
  const diffMs = fim.getTime() - inicio.getTime();
  const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  
  return Math.max(0, diffDias);
}

/**
 * Calcula valor total de item de compra
 */
export function calcularValorTotalItem(
  quantidade: number,
  valorUnitario: number,
  desconto: number = 0,
  impostos: number = 0
): number {
  const subtotal = quantidade * valorUnitario;
  const valorComDesconto = subtotal - desconto;
  const valorFinal = valorComDesconto + impostos;
  
  return Math.max(0, valorFinal);
}

/**
 * Calcula valor total de compra
 */
export function calcularValorTotalCompra(
  itens: Array<{
    quantidade: number;
    valorUnitario: number;
    desconto?: number;
    impostos?: number;
  }>
): number {
  return itens.reduce((total, item) => {
    return total + calcularValorTotalItem(
      item.quantidade,
      item.valorUnitario,
      item.desconto || 0,
      item.impostos || 0
    );
  }, 0);
}

/**
 * Calcula custo de locação de equipamento
 */
export function calcularCustoLocacao(
  custoDiaria: number,
  diasUso: number,
  descontoPercentual: number = 0
): number {
  const custoBase = custoDiaria * diasUso;
  const desconto = (custoBase * descontoPercentual) / 100;
  
  return Math.max(0, custoBase - desconto);
}

/**
 * Calcula próxima data de calibração/manutenção
 */
export function calcularProximaData(
  dataReferencia: string | Date,
  periodicidadeDias: number
): Date {
  const referencia = typeof dataReferencia === 'string' 
    ? new Date(dataReferencia) 
    : dataReferencia;
  
  const proxima = new Date(referencia);
  proxima.setDate(proxima.getDate() + periodicidadeDias);
  
  return proxima;
}

/**
 * Verifica se data está próxima (dentro de X dias)
 */
export function isDataProxima(data: string | Date, diasAlerta: number): boolean {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  
  const dataVerificar = typeof data === 'string' 
    ? new Date(data) 
    : data;
  dataVerificar.setHours(0, 0, 0, 0);
  
  const diffMs = dataVerificar.getTime() - hoje.getTime();
  const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  
  return diffDias >= 0 && diffDias <= diasAlerta;
}

/**
 * Verifica se data está vencida
 */
export function isDataVencida(data: string | Date): boolean {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  
  const dataVerificar = typeof data === 'string' 
    ? new Date(data) 
    : data;
  dataVerificar.setHours(0, 0, 0, 0);
  
  return dataVerificar < hoje;
}

/**
 * Calcula dias de atraso
 */
export function calcularDiasAtraso(dataPrevista: string | Date): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  
  const prevista = typeof dataPrevista === 'string' 
    ? new Date(dataPrevista) 
    : dataPrevista;
  prevista.setHours(0, 0, 0, 0);
  
  if (prevista >= hoje) return 0;
  
  const diffMs = hoje.getTime() - prevista.getTime();
  const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  
  return diffDias;
}

/**
 * Calcula custo médio ponderado (CMPM)
 */
export function calcularCustoMedio(
  custoAtual: number,
  quantidadeAtual: number,
  custoNovo: number,
  quantidadeNova: number
): number {
  const valorTotal = (custoAtual * quantidadeAtual) + (custoNovo * quantidadeNova);
  const quantidadeTotal = quantidadeAtual + quantidadeNova;
  
  if (quantidadeTotal === 0) return 0;
  
  return valorTotal / quantidadeTotal;
}

/**
 * Calcula valor de depreciação de equipamento (método linear)
 */
export function calcularDepreciacao(
  valorAquisicao: number,
  dataAquisicao: string | Date,
  vidaUtilAnos: number = 10
): number {
  const hoje = new Date();
  const aquisicao = typeof dataAquisicao === 'string' 
    ? new Date(dataAquisicao) 
    : dataAquisicao;
  
  const anosUso = (hoje.getTime() - aquisicao.getTime()) / (1000 * 60 * 60 * 24 * 365);
  
  if (anosUso >= vidaUtilAnos) return 0;
  
  const depreciacao = (valorAquisicao / vidaUtilAnos) * anosUso;
  const valorAtual = valorAquisicao - depreciacao;
  
  return Math.max(0, valorAtual);
}

/**
 * Calcula ROI de equipamento
 */
export function calcularROI(
  valorAquisicao: number,
  receitaGerada: number,
  custosOperacionais: number = 0
): number {
  const investimento = valorAquisicao + custosOperacionais;
  
  if (investimento === 0) return 0;
  
  return ((receitaGerada - investimento) / investimento) * 100;
}

/**
 * Calcula saldo agregado de múltiplas localizações
 */
export function calcularSaldoTotal(
  saldos: Array<{ quantidade: number; reservado: number }>
): { quantidade: number; reservado: number; disponivel: number } {
  const totais = saldos.reduce(
    (acc, saldo) => ({
      quantidade: acc.quantidade + saldo.quantidade,
      reservado: acc.reservado + saldo.reservado
    }),
    { quantidade: 0, reservado: 0 }
  );
  
  return {
    ...totais,
    disponivel: calcularDisponivel(totais.quantidade, totais.reservado)
  };
}

/**
 * Calcula taxa de consumo mensal de material
 */
export function calcularTaxaConsumoMensal(
  movimentacoes: Array<{ quantidade: number; data: string | Date }>,
  meses: number = 3
): number {
  if (movimentacoes.length === 0) return 0;
  
  const dataCorte = new Date();
  dataCorte.setMonth(dataCorte.getMonth() - meses);
  
  const movimentacoesRecentes = movimentacoes.filter(m => {
    const data = typeof m.data === 'string' ? new Date(m.data) : m.data;
    return data >= dataCorte;
  });
  
  if (movimentacoesRecentes.length === 0) return 0;
  
  const totalConsumido = movimentacoesRecentes.reduce(
    (total, mov) => total + mov.quantidade,
    0
  );
  
  return totalConsumido / meses;
}

/**
 * Calcula estoque de segurança
 */
export function calcularEstoqueSeguranca(
  taxaConsumoMensal: number,
  tempoReposicaoDias: number = 30
): number {
  const taxaDiaria = taxaConsumoMensal / 30;
  return Math.ceil(taxaDiaria * tempoReposicaoDias);
}
