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

interface EstoqueMaterial {
  materialId: number;
  localizacao: string;
  quantidade: number;
}

// Banco de dados em memória para TDD
let movimentacoes: Movimentacao[] = [];
let estoqueMateriais: EstoqueMaterial[] = [];
let nextId = 1;

// Funções CRUD inline para TDD
function createMovimentacao(data: Omit<Movimentacao, 'id'>): Movimentacao {
  const movimentacao: Movimentacao = {
    ...data,
    id: nextId++
  };
  movimentacoes.push(movimentacao);
  
  // Atualiza estoque automaticamente
  if (data.materialId) {
    atualizarEstoque(movimentacao);
  }
  
  return movimentacao;
}

function atualizarEstoque(mov: Movimentacao): void {
  if (!mov.materialId) return;

  switch (mov.tipo) {
    case 'ENTRADA':
      adicionarEstoque(mov.materialId, mov.origem || 'Geral', mov.quantidade);
      break;
    case 'SAIDA':
      removerEstoque(mov.materialId, mov.quantidade);
      break;
    case 'TRANSFERENCIA':
      if (mov.origem && mov.destino) {
        removerEstoqueLocal(mov.materialId, mov.origem, mov.quantidade);
        adicionarEstoque(mov.materialId, mov.destino, mov.quantidade);
      }
      break;
    case 'AJUSTE':
      ajustarEstoque(mov.materialId, mov.quantidade);
      break;
  }
}

function adicionarEstoque(materialId: number, localizacao: string, quantidade: number): void {
  const estoque = estoqueMateriais.find(
    e => e.materialId === materialId && e.localizacao === localizacao
  );
  
  if (estoque) {
    estoque.quantidade += quantidade;
  } else {
    estoqueMateriais.push({ materialId, localizacao, quantidade });
  }
}

function removerEstoque(materialId: number, quantidade: number): void {
  const estoques = estoqueMateriais.filter(e => e.materialId === materialId);
  let restante = quantidade;
  
  for (const estoque of estoques) {
    if (restante <= 0) break;
    
    const retirar = Math.min(estoque.quantidade, restante);
    estoque.quantidade -= retirar;
    restante -= retirar;
  }
}

function removerEstoqueLocal(materialId: number, localizacao: string, quantidade: number): void {
  const estoque = estoqueMateriais.find(
    e => e.materialId === materialId && e.localizacao === localizacao
  );
  
  if (estoque) {
    estoque.quantidade -= quantidade;
  }
}

function ajustarEstoque(materialId: number, quantidadeAjuste: number): void {
  const totalAtual = getEstoqueTotalMaterial(materialId);
  const diferenca = quantidadeAjuste - totalAtual;
  
  if (diferenca > 0) {
    adicionarEstoque(materialId, 'Geral', diferenca);
  } else if (diferenca < 0) {
    removerEstoque(materialId, Math.abs(diferenca));
  }
}

function getMovimentacaoById(id: number): Movimentacao | undefined {
  return movimentacoes.find(m => m.id === id);
}

function getAllMovimentacoes(): Movimentacao[] {
  return movimentacoes;
}

function getMovimentacoesByTipo(tipo: Movimentacao['tipo']): Movimentacao[] {
  return movimentacoes.filter(m => m.tipo === tipo);
}

function getMovimentacoesByMaterial(materialId: number): Movimentacao[] {
  return movimentacoes.filter(m => m.materialId === materialId);
}

function getMovimentacoesByEquipamento(equipamentoId: number): Movimentacao[] {
  return movimentacoes.filter(m => m.equipamentoId === equipamentoId);
}

function getMovimentacoesByProjeto(projetoId: number): Movimentacao[] {
  return movimentacoes.filter(m => m.projetoId === projetoId);
}

function getMovimentacoesByResponsavel(responsavel: string): Movimentacao[] {
  return movimentacoes.filter(m => 
    m.responsavel.toLowerCase().includes(responsavel.toLowerCase())
  );
}

function getMovimentacoesByPeriodo(dataInicio: Date, dataFim: Date): Movimentacao[] {
  return movimentacoes.filter(m => 
    m.dataMovimentacao >= dataInicio && m.dataMovimentacao <= dataFim
  );
}

function getMovimentacoesByLocalizacao(localizacao: string): Movimentacao[] {
  const lowerLoc = localizacao.toLowerCase();
  return movimentacoes.filter(m => 
    m.origem?.toLowerCase().includes(lowerLoc) || 
    m.destino?.toLowerCase().includes(lowerLoc)
  );
}

function updateMovimentacao(id: number, data: Partial<Movimentacao>): Movimentacao | undefined {
  const movimentacao = movimentacoes.find(m => m.id === id);
  if (!movimentacao) return undefined;

  Object.assign(movimentacao, data);
  return movimentacao;
}

function deleteMovimentacao(id: number): boolean {
  const index = movimentacoes.findIndex(m => m.id === id);
  if (index === -1) return false;

  movimentacoes.splice(index, 1);
  return true;
}

function getEstoqueTotalMaterial(materialId: number): number {
  return estoqueMateriais
    .filter(e => e.materialId === materialId)
    .reduce((total, e) => total + e.quantidade, 0);
}

function getEstoquePorLocalizacao(materialId: number, localizacao: string): number {
  const estoque = estoqueMateriais.find(
    e => e.materialId === materialId && e.localizacao === localizacao
  );
  return estoque?.quantidade || 0;
}

function getValorTotalMovimentacoes(): number {
  return movimentacoes
    .filter(m => m.valorUnitario !== undefined)
    .reduce((total, m) => total + (m.valorUnitario! * m.quantidade), 0);
}

function getValorTotalEntradas(): number {
  return movimentacoes
    .filter(m => m.tipo === 'ENTRADA' && m.valorUnitario !== undefined)
    .reduce((total, m) => total + (m.valorUnitario! * m.quantidade), 0);
}

function getValorTotalSaidas(): number {
  return movimentacoes
    .filter(m => m.tipo === 'SAIDA' && m.valorUnitario !== undefined)
    .reduce((total, m) => total + (m.valorUnitario! * m.quantidade), 0);
}

function getQuantidadeTotalEntradas(materialId?: number): number {
  let filtradas = movimentacoes.filter(m => m.tipo === 'ENTRADA');
  if (materialId) {
    filtradas = filtradas.filter(m => m.materialId === materialId);
  }
  return filtradas.reduce((total, m) => total + m.quantidade, 0);
}

function getQuantidadeTotalSaidas(materialId?: number): number {
  let filtradas = movimentacoes.filter(m => m.tipo === 'SAIDA');
  if (materialId) {
    filtradas = filtradas.filter(m => m.materialId === materialId);
  }
  return filtradas.reduce((total, m) => total + m.quantidade, 0);
}

function getMovimentacoesPorDia(data: Date): Movimentacao[] {
  return movimentacoes.filter(m => {
    const movData = new Date(m.dataMovimentacao);
    return (
      movData.getFullYear() === data.getFullYear() &&
      movData.getMonth() === data.getMonth() &&
      movData.getDate() === data.getDate()
    );
  });
}

function getHistoricoMaterial(materialId: number): Movimentacao[] {
  return movimentacoes
    .filter(m => m.materialId === materialId)
    .sort((a, b) => b.dataMovimentacao.getTime() - a.dataMovimentacao.getTime());
}

describe('MovimentacaoCRUD', () => {
  beforeEach(() => {
    movimentacoes = [];
    estoqueMateriais = [];
    nextId = 1;
  });

  describe('Create - Criar Movimentações', () => {
    it('deve criar movimentação de ENTRADA completa', () => {
      const movimentacao = createMovimentacao({
        tipo: 'ENTRADA',
        materialId: 1,
        quantidade: 100,
        dataMovimentacao: new Date('2024-10-15'),
        origem: 'Fornecedor XYZ Ltda',
        responsavel: 'João Silva',
        documento: 'NF-123456',
        valorUnitario: 15.50,
        observacoes: 'Material de qualidade premium'
      });

      expect(movimentacao.id).toBe(1);
      expect(movimentacao.tipo).toBe('ENTRADA');
      expect(movimentacao.quantidade).toBe(100);
      expect(movimentacao.valorUnitario).toBe(15.50);
    });

    it('deve criar movimentação de SAIDA', () => {
      // Cria entrada primeiro
      createMovimentacao({
        tipo: 'ENTRADA',
        materialId: 1,
        quantidade: 100,
        dataMovimentacao: new Date('2024-10-01'),
        origem: 'Fornecedor ABC',
        responsavel: 'João Silva'
      });

      const movimentacao = createMovimentacao({
        tipo: 'SAIDA',
        materialId: 1,
        quantidade: 50,
        dataMovimentacao: new Date('2024-10-15'),
        destino: 'Obra Centro - Fase 2',
        responsavel: 'Pedro Oliveira',
        projetoId: 10,
        observacoes: 'Material para fundação'
      });

      expect(movimentacao.id).toBe(2);
      expect(movimentacao.tipo).toBe('SAIDA');
      expect(movimentacao.destino).toBe('Obra Centro - Fase 2');
      expect(movimentacao.projetoId).toBe(10);
    });

    it('deve criar movimentação de TRANSFERENCIA', () => {
      // Entrada no Galpão A
      createMovimentacao({
        tipo: 'ENTRADA',
        materialId: 1,
        quantidade: 100,
        dataMovimentacao: new Date('2024-10-01'),
        origem: 'Galpão A - Setor 1',
        responsavel: 'João Silva'
      });

      const movimentacao = createMovimentacao({
        tipo: 'TRANSFERENCIA',
        materialId: 1,
        quantidade: 30,
        dataMovimentacao: new Date('2024-10-15'),
        origem: 'Galpão A - Setor 1',
        destino: 'Galpão B - Setor 3',
        responsavel: 'Carlos Ferreira',
        observacoes: 'Reorganização de estoque'
      });

      expect(movimentacao.tipo).toBe('TRANSFERENCIA');
      expect(movimentacao.origem).toBe('Galpão A - Setor 1');
      expect(movimentacao.destino).toBe('Galpão B - Setor 3');
    });

    it('deve criar movimentação de AJUSTE', () => {
      const movimentacao = createMovimentacao({
        tipo: 'AJUSTE',
        materialId: 1,
        quantidade: 95,
        dataMovimentacao: new Date('2024-10-15'),
        responsavel: 'Supervisor Estoque',
        motivoAjuste: 'Inventário - contagem física divergente',
        observacoes: 'Ajuste após auditoria'
      });

      expect(movimentacao.tipo).toBe('AJUSTE');
      expect(movimentacao.motivoAjuste).toBe('Inventário - contagem física divergente');
    });

    it('deve criar movimentação com equipamento', () => {
      const movimentacao = createMovimentacao({
        tipo: 'ENTRADA',
        equipamentoId: 5,
        quantidade: 1,
        dataMovimentacao: new Date('2024-10-15'),
        origem: 'Compra Direta',
        responsavel: 'Maria Santos',
        documento: 'NF-789012',
        valorUnitario: 3500.00
      });

      expect(movimentacao.equipamentoId).toBe(5);
      expect(movimentacao.materialId).toBeUndefined();
    });

    it('deve criar múltiplas movimentações com IDs sequenciais', () => {
      const mov1 = createMovimentacao({
        tipo: 'ENTRADA',
        materialId: 1,
        quantidade: 100,
        dataMovimentacao: new Date('2024-10-15'),
        origem: 'Fornecedor A',
        responsavel: 'João'
      });

      const mov2 = createMovimentacao({
        tipo: 'ENTRADA',
        materialId: 2,
        quantidade: 200,
        dataMovimentacao: new Date('2024-10-15'),
        origem: 'Fornecedor B',
        responsavel: 'Maria'
      });

      expect(mov1.id).toBe(1);
      expect(mov2.id).toBe(2);
    });
  });

  describe('Read - Buscar Movimentações', () => {
    beforeEach(() => {
      createMovimentacao({
        tipo: 'ENTRADA',
        materialId: 1,
        quantidade: 100,
        dataMovimentacao: new Date('2024-10-01'),
        origem: 'Fornecedor ABC',
        responsavel: 'João Silva',
        documento: 'NF-001',
        valorUnitario: 10.00
      });

      createMovimentacao({
        tipo: 'SAIDA',
        materialId: 1,
        quantidade: 50,
        dataMovimentacao: new Date('2024-10-05'),
        destino: 'Obra Centro',
        responsavel: 'Pedro Oliveira',
        projetoId: 10
      });

      createMovimentacao({
        tipo: 'TRANSFERENCIA',
        materialId: 2,
        quantidade: 30,
        dataMovimentacao: new Date('2024-10-10'),
        origem: 'Galpão A',
        destino: 'Galpão B',
        responsavel: 'Carlos Ferreira'
      });

      createMovimentacao({
        tipo: 'AJUSTE',
        materialId: 1,
        quantidade: 95,
        dataMovimentacao: new Date('2024-10-15'),
        responsavel: 'Supervisor',
        motivoAjuste: 'Inventário'
      });
    });

    it('deve buscar movimentação por ID', () => {
      const movimentacao = getMovimentacaoById(1);

      expect(movimentacao).toBeDefined();
      expect(movimentacao?.tipo).toBe('ENTRADA');
      expect(movimentacao?.documento).toBe('NF-001');
    });

    it('deve retornar undefined para ID inexistente', () => {
      const movimentacao = getMovimentacaoById(999);

      expect(movimentacao).toBeUndefined();
    });

    it('deve listar todas as movimentações', () => {
      const todas = getAllMovimentacoes();

      expect(todas).toHaveLength(4);
    });

    it('deve buscar movimentações por tipo ENTRADA', () => {
      const entradas = getMovimentacoesByTipo('ENTRADA');

      expect(entradas).toHaveLength(1);
      expect(entradas[0].tipo).toBe('ENTRADA');
    });

    it('deve buscar movimentações por tipo SAIDA', () => {
      const saidas = getMovimentacoesByTipo('SAIDA');

      expect(saidas).toHaveLength(1);
      expect(saidas[0].destino).toBe('Obra Centro');
    });

    it('deve buscar movimentações por tipo TRANSFERENCIA', () => {
      const transferencias = getMovimentacoesByTipo('TRANSFERENCIA');

      expect(transferencias).toHaveLength(1);
      expect(transferencias[0].origem).toBe('Galpão A');
      expect(transferencias[0].destino).toBe('Galpão B');
    });

    it('deve buscar movimentações por tipo AJUSTE', () => {
      const ajustes = getMovimentacoesByTipo('AJUSTE');

      expect(ajustes).toHaveLength(1);
      expect(ajustes[0].motivoAjuste).toBe('Inventário');
    });

    it('deve buscar movimentações por material', () => {
      const movimentacoesMaterial1 = getMovimentacoesByMaterial(1);

      expect(movimentacoesMaterial1).toHaveLength(3);
      expect(movimentacoesMaterial1.every(m => m.materialId === 1)).toBe(true);
    });

    it('deve buscar movimentações por equipamento', () => {
      createMovimentacao({
        tipo: 'ENTRADA',
        equipamentoId: 5,
        quantidade: 1,
        dataMovimentacao: new Date('2024-10-20'),
        origem: 'Compra',
        responsavel: 'Maria'
      });

      const movimentacoesEquip = getMovimentacoesByEquipamento(5);

      expect(movimentacoesEquip).toHaveLength(1);
      expect(movimentacoesEquip[0].equipamentoId).toBe(5);
    });

    it('deve buscar movimentações por projeto', () => {
      const movimentacoesProjeto = getMovimentacoesByProjeto(10);

      expect(movimentacoesProjeto).toHaveLength(1);
      expect(movimentacoesProjeto[0].projetoId).toBe(10);
    });

    it('deve buscar movimentações por responsável', () => {
      const movimentacoesJoao = getMovimentacoesByResponsavel('João');

      expect(movimentacoesJoao).toHaveLength(1);
      expect(movimentacoesJoao[0].responsavel).toBe('João Silva');
    });

    it('deve buscar movimentações por período', () => {
      const dataInicio = new Date('2024-10-01');
      const dataFim = new Date('2024-10-10');
      const movimentacoesPeriodo = getMovimentacoesByPeriodo(dataInicio, dataFim);

      expect(movimentacoesPeriodo).toHaveLength(3);
    });

    it('deve buscar movimentações por localização (origem)', () => {
      const movimentacoesGalpao = getMovimentacoesByLocalizacao('Galpão');

      expect(movimentacoesGalpao).toHaveLength(1);
      expect(movimentacoesGalpao[0].tipo).toBe('TRANSFERENCIA');
    });

    it('deve buscar movimentações por localização (destino)', () => {
      const movimentacoesObra = getMovimentacoesByLocalizacao('Obra');

      expect(movimentacoesObra).toHaveLength(1);
      expect(movimentacoesObra[0].destino).toBe('Obra Centro');
    });

    it('deve buscar movimentações do dia', () => {
      const hoje = new Date('2024-10-15');
      const movimentacoesHoje = getMovimentacoesPorDia(hoje);

      expect(movimentacoesHoje).toHaveLength(1);
      expect(movimentacoesHoje[0].tipo).toBe('AJUSTE');
    });

    it('deve buscar histórico completo de um material', () => {
      const historico = getHistoricoMaterial(1);

      expect(historico).toHaveLength(3);
      // Verifica ordem decrescente por data
      expect(historico[0].dataMovimentacao >= historico[1].dataMovimentacao).toBe(true);
      expect(historico[1].dataMovimentacao >= historico[2].dataMovimentacao).toBe(true);
    });
  });

  describe('Update - Atualizar Movimentações', () => {
    beforeEach(() => {
      createMovimentacao({
        tipo: 'ENTRADA',
        materialId: 1,
        quantidade: 100,
        dataMovimentacao: new Date('2024-10-15'),
        origem: 'Fornecedor ABC',
        responsavel: 'João Silva'
      });
    });

    it('deve atualizar observações', () => {
      const atualizado = updateMovimentacao(1, { 
        observacoes: 'Material conferido e aprovado' 
      });

      expect(atualizado).toBeDefined();
      expect(atualizado?.observacoes).toBe('Material conferido e aprovado');
    });

    it('deve atualizar documento', () => {
      const atualizado = updateMovimentacao(1, { documento: 'NF-999999' });

      expect(atualizado?.documento).toBe('NF-999999');
    });

    it('deve atualizar valor unitário', () => {
      const atualizado = updateMovimentacao(1, { valorUnitario: 12.75 });

      expect(atualizado?.valorUnitario).toBe(12.75);
    });

    it('deve atualizar projeto vinculado', () => {
      const atualizado = updateMovimentacao(1, { projetoId: 25 });

      expect(atualizado?.projetoId).toBe(25);
    });

    it('deve retornar undefined para ID inexistente', () => {
      const resultado = updateMovimentacao(999, { observacoes: 'Teste' });

      expect(resultado).toBeUndefined();
    });
  });

  describe('Delete - Excluir Movimentações', () => {
    beforeEach(() => {
      createMovimentacao({
        tipo: 'ENTRADA',
        materialId: 1,
        quantidade: 100,
        dataMovimentacao: new Date('2024-10-15'),
        origem: 'Fornecedor ABC',
        responsavel: 'João Silva'
      });

      createMovimentacao({
        tipo: 'SAIDA',
        materialId: 1,
        quantidade: 50,
        dataMovimentacao: new Date('2024-10-16'),
        destino: 'Obra Centro',
        responsavel: 'Pedro'
      });
    });

    it('deve excluir movimentação existente', () => {
      const resultado = deleteMovimentacao(1);

      expect(resultado).toBe(true);
      expect(getAllMovimentacoes()).toHaveLength(1);
      expect(getMovimentacaoById(1)).toBeUndefined();
    });

    it('deve retornar false para ID inexistente', () => {
      const resultado = deleteMovimentacao(999);

      expect(resultado).toBe(false);
      expect(getAllMovimentacoes()).toHaveLength(2);
    });

    it('deve manter outras movimentações após exclusão', () => {
      deleteMovimentacao(1);

      const mov2 = getMovimentacaoById(2);
      expect(mov2).toBeDefined();
      expect(mov2?.tipo).toBe('SAIDA');
    });
  });

  describe('Business Rules - Controle de Estoque', () => {
    it('deve atualizar estoque após ENTRADA', () => {
      createMovimentacao({
        tipo: 'ENTRADA',
        materialId: 1,
        quantidade: 100,
        dataMovimentacao: new Date('2024-10-15'),
        origem: 'Fornecedor ABC',
        responsavel: 'João Silva'
      });

      const estoque = getEstoqueTotalMaterial(1);
      expect(estoque).toBe(100);
    });

    it('deve atualizar estoque após SAIDA', () => {
      createMovimentacao({
        tipo: 'ENTRADA',
        materialId: 1,
        quantidade: 100,
        dataMovimentacao: new Date('2024-10-01'),
        origem: 'Fornecedor ABC',
        responsavel: 'João'
      });

      createMovimentacao({
        tipo: 'SAIDA',
        materialId: 1,
        quantidade: 30,
        dataMovimentacao: new Date('2024-10-15'),
        destino: 'Obra Centro',
        responsavel: 'Pedro'
      });

      const estoque = getEstoqueTotalMaterial(1);
      expect(estoque).toBe(70);
    });

    it('deve atualizar estoque após TRANSFERENCIA', () => {
      createMovimentacao({
        tipo: 'ENTRADA',
        materialId: 1,
        quantidade: 100,
        dataMovimentacao: new Date('2024-10-01'),
        origem: 'Galpão A',
        responsavel: 'João'
      });

      createMovimentacao({
        tipo: 'TRANSFERENCIA',
        materialId: 1,
        quantidade: 40,
        dataMovimentacao: new Date('2024-10-15'),
        origem: 'Galpão A',
        destino: 'Galpão B',
        responsavel: 'Carlos'
      });

      const estoqueGalpaoA = getEstoquePorLocalizacao(1, 'Galpão A');
      const estoqueGalpaoB = getEstoquePorLocalizacao(1, 'Galpão B');
      const total = getEstoqueTotalMaterial(1);

      expect(estoqueGalpaoA).toBe(60);
      expect(estoqueGalpaoB).toBe(40);
      expect(total).toBe(100);
    });

    it('deve ajustar estoque com AJUSTE positivo', () => {
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
        quantidade: 110,
        dataMovimentacao: new Date('2024-10-15'),
        responsavel: 'Supervisor',
        motivoAjuste: 'Inventário - encontrado mais material'
      });

      const estoque = getEstoqueTotalMaterial(1);
      expect(estoque).toBe(110);
    });

    it('deve ajustar estoque com AJUSTE negativo', () => {
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
        quantidade: 85,
        dataMovimentacao: new Date('2024-10-15'),
        responsavel: 'Supervisor',
        motivoAjuste: 'Perda/quebra identificada'
      });

      const estoque = getEstoqueTotalMaterial(1);
      expect(estoque).toBe(85);
    });

    it('deve manter estoque separado por localização', () => {
      createMovimentacao({
        tipo: 'ENTRADA',
        materialId: 1,
        quantidade: 100,
        dataMovimentacao: new Date('2024-10-01'),
        origem: 'Galpão A',
        responsavel: 'João'
      });

      createMovimentacao({
        tipo: 'ENTRADA',
        materialId: 1,
        quantidade: 50,
        dataMovimentacao: new Date('2024-10-05'),
        origem: 'Galpão B',
        responsavel: 'Maria'
      });

      const estoqueA = getEstoquePorLocalizacao(1, 'Galpão A');
      const estoqueB = getEstoquePorLocalizacao(1, 'Galpão B');
      const total = getEstoqueTotalMaterial(1);

      expect(estoqueA).toBe(100);
      expect(estoqueB).toBe(50);
      expect(total).toBe(150);
    });
  });

  describe('Business Rules - Cálculos Financeiros', () => {
    beforeEach(() => {
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
        tipo: 'ENTRADA',
        materialId: 2,
        quantidade: 50,
        valorUnitario: 20.00,
        dataMovimentacao: new Date('2024-10-05'),
        origem: 'Fornecedor B',
        responsavel: 'Maria'
      });

      createMovimentacao({
        tipo: 'SAIDA',
        materialId: 1,
        quantidade: 30,
        valorUnitario: 10.00,
        dataMovimentacao: new Date('2024-10-10'),
        destino: 'Obra Centro',
        responsavel: 'Pedro'
      });
    });

    it('deve calcular valor total de todas as movimentações', () => {
      const valorTotal = getValorTotalMovimentacoes();

      // (100 * 10) + (50 * 20) + (30 * 10) = 1000 + 1000 + 300 = 2300
      expect(valorTotal).toBe(2300.00);
    });

    it('deve calcular valor total de entradas', () => {
      const valorEntradas = getValorTotalEntradas();

      // (100 * 10) + (50 * 20) = 1000 + 1000 = 2000
      expect(valorEntradas).toBe(2000.00);
    });

    it('deve calcular valor total de saídas', () => {
      const valorSaidas = getValorTotalSaidas();

      // (30 * 10) = 300
      expect(valorSaidas).toBe(300.00);
    });

    it('deve calcular quantidade total de entradas', () => {
      const quantidadeEntradas = getQuantidadeTotalEntradas();

      expect(quantidadeEntradas).toBe(150); // 100 + 50
    });

    it('deve calcular quantidade total de saídas', () => {
      const quantidadeSaidas = getQuantidadeTotalSaidas();

      expect(quantidadeSaidas).toBe(30);
    });

    it('deve calcular quantidade de entradas por material', () => {
      const entradasMaterial1 = getQuantidadeTotalEntradas(1);

      expect(entradasMaterial1).toBe(100);
    });

    it('deve calcular quantidade de saídas por material', () => {
      const saidasMaterial1 = getQuantidadeTotalSaidas(1);

      expect(saidasMaterial1).toBe(30);
    });

    it('deve retornar zero para movimentações sem valor unitário', () => {
      createMovimentacao({
        tipo: 'TRANSFERENCIA',
        materialId: 3,
        quantidade: 25,
        dataMovimentacao: new Date('2024-10-15'),
        origem: 'Galpão A',
        destino: 'Galpão B',
        responsavel: 'Carlos'
      });

      const valorTotal = getValorTotalMovimentacoes();
      
      // Não deve incluir a transferência sem valor
      expect(valorTotal).toBe(2300.00);
    });
  });

  describe('Business Rules - Validações Complexas', () => {
    it('deve processar múltiplas entradas do mesmo material', () => {
      createMovimentacao({
        tipo: 'ENTRADA',
        materialId: 1,
        quantidade: 50,
        dataMovimentacao: new Date('2024-10-01'),
        origem: 'Fornecedor A',
        responsavel: 'João'
      });

      createMovimentacao({
        tipo: 'ENTRADA',
        materialId: 1,
        quantidade: 30,
        dataMovimentacao: new Date('2024-10-05'),
        origem: 'Fornecedor B',
        responsavel: 'Maria'
      });

      createMovimentacao({
        tipo: 'ENTRADA',
        materialId: 1,
        quantidade: 20,
        dataMovimentacao: new Date('2024-10-10'),
        origem: 'Fornecedor C',
        responsavel: 'Pedro'
      });

      const estoque = getEstoqueTotalMaterial(1);
      const movimentacoes = getMovimentacoesByMaterial(1);

      expect(estoque).toBe(100);
      expect(movimentacoes).toHaveLength(3);
    });

    it('deve processar entrada, saída e ajuste sequenciais', () => {
      // Entrada inicial
      createMovimentacao({
        tipo: 'ENTRADA',
        materialId: 1,
        quantidade: 100,
        dataMovimentacao: new Date('2024-10-01'),
        origem: 'Fornecedor',
        responsavel: 'João'
      });

      expect(getEstoqueTotalMaterial(1)).toBe(100);

      // Saída parcial
      createMovimentacao({
        tipo: 'SAIDA',
        materialId: 1,
        quantidade: 40,
        dataMovimentacao: new Date('2024-10-05'),
        destino: 'Obra A',
        responsavel: 'Pedro'
      });

      expect(getEstoqueTotalMaterial(1)).toBe(60);

      // Ajuste para correção
      createMovimentacao({
        tipo: 'AJUSTE',
        materialId: 1,
        quantidade: 55,
        dataMovimentacao: new Date('2024-10-10'),
        responsavel: 'Supervisor',
        motivoAjuste: 'Contagem física'
      });

      expect(getEstoqueTotalMaterial(1)).toBe(55);
    });

    it('deve manter integridade após múltiplas transferências', () => {
      createMovimentacao({
        tipo: 'ENTRADA',
        materialId: 1,
        quantidade: 100,
        dataMovimentacao: new Date('2024-10-01'),
        origem: 'Galpão Principal',
        responsavel: 'João'
      });

      createMovimentacao({
        tipo: 'TRANSFERENCIA',
        materialId: 1,
        quantidade: 30,
        dataMovimentacao: new Date('2024-10-05'),
        origem: 'Galpão Principal',
        destino: 'Obra A',
        responsavel: 'Carlos'
      });

      createMovimentacao({
        tipo: 'TRANSFERENCIA',
        materialId: 1,
        quantidade: 20,
        dataMovimentacao: new Date('2024-10-10'),
        origem: 'Galpão Principal',
        destino: 'Obra B',
        responsavel: 'Ana'
      });

      const totalGeral = getEstoqueTotalMaterial(1);
      const estoqueOrigem = getEstoquePorLocalizacao(1, 'Galpão Principal');
      const estoqueObraA = getEstoquePorLocalizacao(1, 'Obra A');
      const estoqueObraB = getEstoquePorLocalizacao(1, 'Obra B');

      expect(totalGeral).toBe(100);
      expect(estoqueOrigem).toBe(50);
      expect(estoqueObraA).toBe(30);
      expect(estoqueObraB).toBe(20);
    });
  });
});
