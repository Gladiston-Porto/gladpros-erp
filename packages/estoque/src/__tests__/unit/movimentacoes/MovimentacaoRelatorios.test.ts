import { describe, it, expect, beforeEach } from 'vitest';

// Interfaces
interface Movimentacao {
  id?: number;
  tipo: 'ENTRADA' | 'SAIDA' | 'TRANSFERENCIA' | 'AJUSTE';
  materialId?: number;
  equipamentoId?: number;
  quantidade: number;
  dataMovimentacao: Date;
  origem?: string;
  destino?: string;
  responsavel: string;
  documento?: string;
  valorUnitario?: number;
  observacoes?: string;
  projetoId?: number;
  motivoAjuste?: string;
}

interface RelatorioMovimentacao {
  materialId: number;
  totalEntradas: number;
  totalSaidas: number;
  saldoAtual: number;
  valorTotal?: number;
}

interface MovimentacaoDiaria {
  data: Date;
  entradas: number;
  saidas: number;
  transferencias: number;
  ajustes: number;
  total: number;
}

interface RastreabilidadeItem {
  movimentacaoId: number;
  tipo: string;
  quantidade: number;
  data: Date;
  responsavel: string;
  origem?: string;
  destino?: string;
  documento?: string;
}

// Banco de dados em memória
let movimentacoes: Movimentacao[] = [];
let nextId = 1;

// Funções auxiliares
function createMovimentacao(data: Omit<Movimentacao, 'id'>): Movimentacao {
  const movimentacao: Movimentacao = {
    ...data,
    id: nextId++
  };
  movimentacoes.push(movimentacao);
  return movimentacao;
}

// Helper functions (unused but kept for future test expansion)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _getAllMovimentacoes(): Movimentacao[] {
  return movimentacoes;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _getMovimentacoesByTipo(tipo: Movimentacao['tipo']): Movimentacao[] {
  return movimentacoes.filter(m => m.tipo === tipo);
}

function getMovimentacoesByMaterial(materialId: number): Movimentacao[] {
  return movimentacoes.filter(m => m.materialId === materialId);
}

// Funções de relatórios
function gerarRelatorioMaterial(materialId: number): RelatorioMovimentacao {
  const movimentacoesMaterial = getMovimentacoesByMaterial(materialId);
  
  const entradas = movimentacoesMaterial
    .filter(m => m.tipo === 'ENTRADA')
    .reduce((total, m) => total + m.quantidade, 0);
  
  const saidas = movimentacoesMaterial
    .filter(m => m.tipo === 'SAIDA')
    .reduce((total, m) => total + m.quantidade, 0);
  
  const ajustes = movimentacoesMaterial.filter(m => m.tipo === 'AJUSTE');
  let saldo = entradas - saidas;
  
  if (ajustes.length > 0) {
    const ultimoAjuste = ajustes[ajustes.length - 1];
    saldo = ultimoAjuste.quantidade;
  }
  
  const valorTotal = movimentacoesMaterial
    .filter(m => m.valorUnitario !== undefined)
    .reduce((total, m) => total + (m.valorUnitario! * m.quantidade), 0);
  
  return {
    materialId,
    totalEntradas: entradas,
    totalSaidas: saidas,
    saldoAtual: saldo,
    valorTotal: valorTotal > 0 ? valorTotal : undefined
  };
}

function gerarRelatorioConsolidado(): RelatorioMovimentacao[] {
  const materiais = new Set(movimentacoes.map(m => m.materialId).filter(id => id !== undefined));
  return Array.from(materiais).map(materialId => gerarRelatorioMaterial(materialId as number));
}

function gerarRelatorioMensal(ano: number, mes: number): MovimentacaoDiaria[] {
  const diasNoMes = new Date(ano, mes, 0).getDate();
  const relatorio: MovimentacaoDiaria[] = [];
  
  for (let dia = 1; dia <= diasNoMes; dia++) {
    const data = new Date(ano, mes - 1, dia);
    const movimentacoesDia = movimentacoes.filter(m => {
      const movData = new Date(m.dataMovimentacao);
      return (
        movData.getFullYear() === ano &&
        movData.getMonth() === mes - 1 &&
        movData.getDate() === dia
      );
    });
    
    const entradas = movimentacoesDia.filter(m => m.tipo === 'ENTRADA').length;
    const saidas = movimentacoesDia.filter(m => m.tipo === 'SAIDA').length;
    const transferencias = movimentacoesDia.filter(m => m.tipo === 'TRANSFERENCIA').length;
    const ajustes = movimentacoesDia.filter(m => m.tipo === 'AJUSTE').length;
    
    if (entradas + saidas + transferencias + ajustes > 0) {
      relatorio.push({
        data,
        entradas,
        saidas,
        transferencias,
        ajustes,
        total: entradas + saidas + transferencias + ajustes
      });
    }
  }
  
  return relatorio;
}

function gerarRastreabilidade(materialId: number): RastreabilidadeItem[] {
  return getMovimentacoesByMaterial(materialId)
    .sort((a, b) => a.dataMovimentacao.getTime() - b.dataMovimentacao.getTime())
    .map(m => ({
      movimentacaoId: m.id!,
      tipo: m.tipo,
      quantidade: m.quantidade,
      data: m.dataMovimentacao,
      responsavel: m.responsavel,
      origem: m.origem,
      destino: m.destino,
      documento: m.documento
    }));
}

function gerarRastreabilidadePorDocumento(documento: string): RastreabilidadeItem[] {
  return movimentacoes
    .filter(m => m.documento?.toLowerCase().includes(documento.toLowerCase()))
    .map(m => ({
      movimentacaoId: m.id!,
      tipo: m.tipo,
      quantidade: m.quantidade,
      data: m.dataMovimentacao,
      responsavel: m.responsavel,
      origem: m.origem,
      destino: m.destino,
      documento: m.documento
    }));
}

function gerarRelatorioResponsavel(responsavel: string): {
  responsavel: string;
  totalMovimentacoes: number;
  entradas: number;
  saidas: number;
  transferencias: number;
  ajustes: number;
} {
  const movimentacoesResp = movimentacoes.filter(m =>
    m.responsavel.toLowerCase().includes(responsavel.toLowerCase())
  );
  
  return {
    responsavel,
    totalMovimentacoes: movimentacoesResp.length,
    entradas: movimentacoesResp.filter(m => m.tipo === 'ENTRADA').length,
    saidas: movimentacoesResp.filter(m => m.tipo === 'SAIDA').length,
    transferencias: movimentacoesResp.filter(m => m.tipo === 'TRANSFERENCIA').length,
    ajustes: movimentacoesResp.filter(m => m.tipo === 'AJUSTE').length
  };
}

function gerarRelatorioProjeto(projetoId: number): {
  projetoId: number;
  totalMovimentacoes: number;
  materiais: Set<number>;
  quantidadeTotal: number;
  valorTotal: number;
} {
  const movimentacoesProjeto = movimentacoes.filter(m => m.projetoId === projetoId);
  
  const materiais = new Set(
    movimentacoesProjeto
      .map(m => m.materialId)
      .filter(id => id !== undefined) as number[]
  );
  
  const quantidadeTotal = movimentacoesProjeto.reduce((total, m) => total + m.quantidade, 0);
  
  const valorTotal = movimentacoesProjeto
    .filter(m => m.valorUnitario !== undefined)
    .reduce((total, m) => total + (m.valorUnitario! * m.quantidade), 0);
  
  return {
    projetoId,
    totalMovimentacoes: movimentacoesProjeto.length,
    materiais,
    quantidadeTotal,
    valorTotal
  };
}

// Helper function (unused but kept for future test expansion)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _getMateriaisComBaixoGiro(diasSemMovimentacao: number): number[] {
  const hoje = new Date();
  const limiteData = new Date(hoje.getTime() - diasSemMovimentacao * 24 * 60 * 60 * 1000);
  
  const materiaisComMovimentacao = new Set(
    movimentacoes
      .filter(m => m.dataMovimentacao >= limiteData && m.materialId)
      .map(m => m.materialId!)
  );
  
  const todosMateriais = new Set(
    movimentacoes.map(m => m.materialId).filter(id => id !== undefined) as number[]
  );
  
  return Array.from(todosMateriais).filter(id => !materiaisComMovimentacao.has(id));
}

function getMateriaisMaisMovimentados(limite: number = 10): Array<{ materialId: number; totalMovimentacoes: number }> {
  const contagem = new Map<number, number>();
  
  movimentacoes.forEach(m => {
    if (m.materialId) {
      contagem.set(m.materialId, (contagem.get(m.materialId) || 0) + 1);
    }
  });
  
  return Array.from(contagem.entries())
    .map(([materialId, totalMovimentacoes]) => ({ materialId, totalMovimentacoes }))
    .sort((a, b) => b.totalMovimentacoes - a.totalMovimentacoes)
    .slice(0, limite);
}

function getMovimentacoesPendentesDocumento(): Movimentacao[] {
  return movimentacoes.filter(m =>
    m.tipo === 'ENTRADA' && (!m.documento || m.documento.trim() === '')
  );
}

function validarSaldoEstoque(materialId: number, saldoEsperado: number): {
  valido: boolean;
  saldoCalculado: number;
  diferenca: number;
} {
  const relatorio = gerarRelatorioMaterial(materialId);
  const diferenca = relatorio.saldoAtual - saldoEsperado;
  
  return {
    valido: diferenca === 0,
    saldoCalculado: relatorio.saldoAtual,
    diferenca
  };
}

describe('MovimentacaoRelatorios', () => {
  beforeEach(() => {
    movimentacoes = [];
    nextId = 1;
  });

  describe('Relatório por Material', () => {
    it('deve gerar relatório completo de um material', () => {
      createMovimentacao({
        tipo: 'ENTRADA',
        materialId: 1,
        quantidade: 100,
        valorUnitario: 10.00,
        dataMovimentacao: new Date('2024-10-01'),
        origem: 'Fornecedor A',
        responsavel: 'João'
      });

      createMovimentacao({
        tipo: 'SAIDA',
        materialId: 1,
        quantidade: 30,
        dataMovimentacao: new Date('2024-10-05'),
        destino: 'Obra Centro',
        responsavel: 'Pedro'
      });

      const relatorio = gerarRelatorioMaterial(1);

      expect(relatorio.materialId).toBe(1);
      expect(relatorio.totalEntradas).toBe(100);
      expect(relatorio.totalSaidas).toBe(30);
      expect(relatorio.saldoAtual).toBe(70);
      expect(relatorio.valorTotal).toBe(1000.00);
    });

    it('deve calcular saldo considerando ajuste', () => {
      createMovimentacao({
        tipo: 'ENTRADA',
        materialId: 1,
        quantidade: 100,
        dataMovimentacao: new Date('2024-10-01'),
        origem: 'Fornecedor',
        responsavel: 'João'
      });

      createMovimentacao({
        tipo: 'SAIDA',
        materialId: 1,
        quantidade: 30,
        dataMovimentacao: new Date('2024-10-05'),
        destino: 'Obra',
        responsavel: 'Pedro'
      });

      createMovimentacao({
        tipo: 'AJUSTE',
        materialId: 1,
        quantidade: 65,
        dataMovimentacao: new Date('2024-10-10'),
        responsavel: 'Supervisor',
        motivoAjuste: 'Inventário'
      });

      const relatorio = gerarRelatorioMaterial(1);

      expect(relatorio.saldoAtual).toBe(65);
    });

    it('deve retornar relatório vazio para material sem movimentação', () => {
      const relatorio = gerarRelatorioMaterial(999);

      expect(relatorio.totalEntradas).toBe(0);
      expect(relatorio.totalSaidas).toBe(0);
      expect(relatorio.saldoAtual).toBe(0);
      expect(relatorio.valorTotal).toBeUndefined();
    });
  });

  describe('Relatório Consolidado', () => {
    it('deve gerar relatório consolidado de múltiplos materiais', () => {
      createMovimentacao({
        tipo: 'ENTRADA',
        materialId: 1,
        quantidade: 100,
        dataMovimentacao: new Date('2024-10-01'),
        origem: 'Fornecedor',
        responsavel: 'João'
      });

      createMovimentacao({
        tipo: 'ENTRADA',
        materialId: 2,
        quantidade: 50,
        dataMovimentacao: new Date('2024-10-01'),
        origem: 'Fornecedor',
        responsavel: 'João'
      });

      createMovimentacao({
        tipo: 'ENTRADA',
        materialId: 3,
        quantidade: 200,
        dataMovimentacao: new Date('2024-10-01'),
        origem: 'Fornecedor',
        responsavel: 'João'
      });

      const relatorio = gerarRelatorioConsolidado();

      expect(relatorio).toHaveLength(3);
      expect(relatorio.find(r => r.materialId === 1)?.totalEntradas).toBe(100);
      expect(relatorio.find(r => r.materialId === 2)?.totalEntradas).toBe(50);
      expect(relatorio.find(r => r.materialId === 3)?.totalEntradas).toBe(200);
    });

    it('deve retornar array vazio quando não houver movimentações', () => {
      const relatorio = gerarRelatorioConsolidado();

      expect(relatorio).toHaveLength(0);
    });
  });

  describe('Relatório Mensal', () => {
    it('deve retornar array vazio para mês sem movimentações', () => {
      const relatorio = gerarRelatorioMensal(2024, 11);

      expect(relatorio).toHaveLength(0);
    });
  });

  describe('Rastreabilidade', () => {
    it('deve rastrear todas as movimentações de um material', () => {
      createMovimentacao({
        tipo: 'ENTRADA',
        materialId: 1,
        quantidade: 100,
        dataMovimentacao: new Date('2024-10-01'),
        origem: 'Fornecedor ABC',
        responsavel: 'João Silva',
        documento: 'NF-12345'
      });

      createMovimentacao({
        tipo: 'SAIDA',
        materialId: 1,
        quantidade: 30,
        dataMovimentacao: new Date('2024-10-05'),
        destino: 'Obra Centro',
        responsavel: 'Pedro Oliveira'
      });

      createMovimentacao({
        tipo: 'TRANSFERENCIA',
        materialId: 1,
        quantidade: 20,
        dataMovimentacao: new Date('2024-10-10'),
        origem: 'Galpão A',
        destino: 'Galpão B',
        responsavel: 'Carlos Ferreira'
      });

      const rastreio = gerarRastreabilidade(1);

      expect(rastreio).toHaveLength(3);
      expect(rastreio[0].tipo).toBe('ENTRADA');
      expect(rastreio[0].documento).toBe('NF-12345');
      expect(rastreio[1].tipo).toBe('SAIDA');
      expect(rastreio[2].tipo).toBe('TRANSFERENCIA');
    });

    it('deve ordenar rastreabilidade por data (cronológica)', () => {
      createMovimentacao({
        tipo: 'SAIDA',
        materialId: 1,
        quantidade: 30,
        dataMovimentacao: new Date('2024-10-15'),
        destino: 'Obra',
        responsavel: 'Pedro'
      });

      createMovimentacao({
        tipo: 'ENTRADA',
        materialId: 1,
        quantidade: 100,
        dataMovimentacao: new Date('2024-10-01'),
        origem: 'Fornecedor',
        responsavel: 'João'
      });

      createMovimentacao({
        tipo: 'AJUSTE',
        materialId: 1,
        quantidade: 65,
        dataMovimentacao: new Date('2024-10-20'),
        responsavel: 'Supervisor',
        motivoAjuste: 'Inventário'
      });

      const rastreio = gerarRastreabilidade(1);

      expect(rastreio[0].data).toEqual(new Date('2024-10-01'));
      expect(rastreio[1].data).toEqual(new Date('2024-10-15'));
      expect(rastreio[2].data).toEqual(new Date('2024-10-20'));
    });

    it('deve rastrear por documento (nota fiscal)', () => {
      createMovimentacao({
        tipo: 'ENTRADA',
        materialId: 1,
        quantidade: 100,
        dataMovimentacao: new Date('2024-10-01'),
        origem: 'Fornecedor A',
        responsavel: 'João',
        documento: 'NF-12345'
      });

      createMovimentacao({
        tipo: 'ENTRADA',
        materialId: 2,
        quantidade: 50,
        dataMovimentacao: new Date('2024-10-01'),
        origem: 'Fornecedor A',
        responsavel: 'João',
        documento: 'NF-12345'
      });

      createMovimentacao({
        tipo: 'ENTRADA',
        materialId: 3,
        quantidade: 75,
        dataMovimentacao: new Date('2024-10-05'),
        origem: 'Fornecedor B',
        responsavel: 'Maria',
        documento: 'NF-99999'
      });

      const rastreio = gerarRastreabilidadePorDocumento('NF-12345');

      expect(rastreio).toHaveLength(2);
      expect(rastreio.every(r => r.documento === 'NF-12345')).toBe(true);
    });

    it('deve retornar array vazio para material sem movimentação', () => {
      const rastreio = gerarRastreabilidade(999);

      expect(rastreio).toHaveLength(0);
    });
  });

  describe('Relatório por Responsável', () => {
    it('deve gerar relatório de movimentações por responsável', () => {
      createMovimentacao({
        tipo: 'ENTRADA',
        materialId: 1,
        quantidade: 100,
        dataMovimentacao: new Date('2024-10-01'),
        origem: 'Fornecedor',
        responsavel: 'João Silva'
      });

      createMovimentacao({
        tipo: 'SAIDA',
        materialId: 1,
        quantidade: 30,
        dataMovimentacao: new Date('2024-10-05'),
        destino: 'Obra',
        responsavel: 'João Silva'
      });

      createMovimentacao({
        tipo: 'TRANSFERENCIA',
        materialId: 1,
        quantidade: 20,
        dataMovimentacao: new Date('2024-10-10'),
        origem: 'Galpão A',
        destino: 'Galpão B',
        responsavel: 'João Silva'
      });

      const relatorio = gerarRelatorioResponsavel('João');

      expect(relatorio.totalMovimentacoes).toBe(3);
      expect(relatorio.entradas).toBe(1);
      expect(relatorio.saidas).toBe(1);
      expect(relatorio.transferencias).toBe(1);
      expect(relatorio.ajustes).toBe(0);
    });
  });

  describe('Relatório por Projeto', () => {
    it('deve gerar relatório de movimentações por projeto', () => {
      createMovimentacao({
        tipo: 'SAIDA',
        materialId: 1,
        quantidade: 100,
        valorUnitario: 10.00,
        dataMovimentacao: new Date('2024-10-01'),
        destino: 'Obra Centro',
        responsavel: 'Pedro',
        projetoId: 10
      });

      createMovimentacao({
        tipo: 'SAIDA',
        materialId: 2,
        quantidade: 50,
        valorUnitario: 20.00,
        dataMovimentacao: new Date('2024-10-05'),
        destino: 'Obra Centro',
        responsavel: 'Carlos',
        projetoId: 10
      });

      const relatorio = gerarRelatorioProjeto(10);

      expect(relatorio.totalMovimentacoes).toBe(2);
      expect(relatorio.materiais.size).toBe(2);
      expect(relatorio.quantidadeTotal).toBe(150);
      expect(relatorio.valorTotal).toBe(2000.00);
    });
  });

  describe('Análise de Giro', () => {
    it('deve listar materiais mais movimentados', () => {
      createMovimentacao({
        tipo: 'ENTRADA',
        materialId: 1,
        quantidade: 100,
        dataMovimentacao: new Date('2024-10-01'),
        origem: 'Fornecedor',
        responsavel: 'João'
      });

      createMovimentacao({
        tipo: 'SAIDA',
        materialId: 1,
        quantidade: 30,
        dataMovimentacao: new Date('2024-10-05'),
        destino: 'Obra',
        responsavel: 'Pedro'
      });

      createMovimentacao({
        tipo: 'ENTRADA',
        materialId: 1,
        quantidade: 50,
        dataMovimentacao: new Date('2024-10-10'),
        origem: 'Fornecedor',
        responsavel: 'João'
      });

      createMovimentacao({
        tipo: 'ENTRADA',
        materialId: 2,
        quantidade: 75,
        dataMovimentacao: new Date('2024-10-15'),
        origem: 'Fornecedor',
        responsavel: 'Maria'
      });

      const maisMovimentados = getMateriaisMaisMovimentados(2);

      expect(maisMovimentados[0].materialId).toBe(1);
      expect(maisMovimentados[0].totalMovimentacoes).toBe(3);
      expect(maisMovimentados[1].materialId).toBe(2);
      expect(maisMovimentados[1].totalMovimentacoes).toBe(1);
    });
  });

  describe('Validações e Auditorias', () => {
    it('deve identificar entradas sem documento', () => {
      createMovimentacao({
        tipo: 'ENTRADA',
        materialId: 1,
        quantidade: 100,
        dataMovimentacao: new Date('2024-10-01'),
        origem: 'Fornecedor A',
        responsavel: 'João'
      });

      createMovimentacao({
        tipo: 'ENTRADA',
        materialId: 2,
        quantidade: 50,
        dataMovimentacao: new Date('2024-10-05'),
        origem: 'Fornecedor B',
        responsavel: 'Maria',
        documento: 'NF-12345'
      });

      const pendentes = getMovimentacoesPendentesDocumento();

      expect(pendentes).toHaveLength(1);
      expect(pendentes[0].materialId).toBe(1);
    });

    it('deve validar saldo de estoque', () => {
      createMovimentacao({
        tipo: 'ENTRADA',
        materialId: 1,
        quantidade: 100,
        dataMovimentacao: new Date('2024-10-01'),
        origem: 'Fornecedor',
        responsavel: 'João'
      });

      createMovimentacao({
        tipo: 'SAIDA',
        materialId: 1,
        quantidade: 30,
        dataMovimentacao: new Date('2024-10-05'),
        destino: 'Obra',
        responsavel: 'Pedro'
      });

      const validacao = validarSaldoEstoque(1, 70);

      expect(validacao.valido).toBe(true);
      expect(validacao.saldoCalculado).toBe(70);
      expect(validacao.diferenca).toBe(0);
    });

    it('deve detectar divergência no saldo de estoque', () => {
      createMovimentacao({
        tipo: 'ENTRADA',
        materialId: 1,
        quantidade: 100,
        dataMovimentacao: new Date('2024-10-01'),
        origem: 'Fornecedor',
        responsavel: 'João'
      });

      createMovimentacao({
        tipo: 'SAIDA',
        materialId: 1,
        quantidade: 30,
        dataMovimentacao: new Date('2024-10-05'),
        destino: 'Obra',
        responsavel: 'Pedro'
      });

      const validacao = validarSaldoEstoque(1, 65);

      expect(validacao.valido).toBe(false);
      expect(validacao.saldoCalculado).toBe(70);
      expect(validacao.diferenca).toBe(5);
    });
  });
});
