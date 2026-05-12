/**
 * FORMATAÇÃO - Módulo Estoque
 * 
 * Funções para formatação de dados
 */

import { UNIDADES_COMUNS } from './constants';

/**
 * Formata quantidade com unidade
 */
export function formatQuantidade(quantidade: number, unidadeSigla: string): string {
  // Encontrar nome da unidade
  const unidade = UNIDADES_COMUNS.find(u => u.sigla === unidadeSigla);
   
  const _unidadeNome = unidade?.nome || unidadeSigla;
  
  // Formatação baseada na unidade
  let qtdFormatada: string;
  
  // Unidades que devem mostrar casas decimais
  const unidadesDecimais = ['M', 'M2', 'M3', 'KG', 'L'];
  
  if (unidadesDecimais.includes(unidadeSigla)) {
    qtdFormatada = quantidade.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  } else {
    // Unidades inteiras (UN, CX, PCT, etc)
    qtdFormatada = Math.floor(quantidade).toLocaleString('pt-BR');
  }
  
  return `${qtdFormatada} ${unidadeSigla}`;
}

/**
 * Formata valor monetário (BRL)
 */
export function formatMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor);
}

/**
 * Formata data ISO para formato BR
 */
export function formatData(dataISO: string | Date): string {
  const data = typeof dataISO === 'string' ? new Date(dataISO) : dataISO;
  
  return data.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

/**
 * Formata data e hora ISO para formato BR
 */
export function formatDataHora(dataISO: string | Date): string {
  const data = typeof dataISO === 'string' ? new Date(dataISO) : dataISO;
  
  return data.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Formata código com zeros à esquerda
 */
export function formatCodigo(numero: number, tamanho: number = 6): string {
  return numero.toString().padStart(tamanho, '0');
}

/**
 * Formata NCM (8 dígitos: XXXX.XX.XX)
 */
export function formatNCM(ncm: string): string {
  const digits = ncm.replace(/\D/g, '');
  
  if (digits.length !== 8) return ncm;
  
  return `${digits.slice(0, 4)}.${digits.slice(4, 6)}.${digits.slice(6, 8)}`;
}

/**
 * Formata CNPJ (XX.XXX.XXX/XXXX-XX)
 */
export function formatCNPJ(cnpj: string): string {
  const digits = cnpj.replace(/\D/g, '');
  
  if (digits.length !== 14) return cnpj;
  
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

/**
 * Formata CPF (XXX.XXX.XXX-XX)
 */
export function formatCPF(cpf: string): string {
  const digits = cpf.replace(/\D/g, '');
  
  if (digits.length !== 11) return cpf;
  
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

/**
 * Formata telefone brasileiro
 */
export function formatTelefone(telefone: string): string {
  const digits = telefone.replace(/\D/g, '');
  
  if (digits.length === 11) {
    // Celular: (XX) XXXXX-XXXX
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  } else if (digits.length === 10) {
    // Fixo: (XX) XXXX-XXXX
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6, 10)}`;
  }
  
  return telefone;
}

/**
 * Formata percentual
 */
export function formatPercentual(valor: number, casasDecimais: number = 2): string {
  return `${valor.toFixed(casasDecimais)}%`;
}

/**
 * Formata número de série/patrimônio
 */
export function formatNumeroSerie(numeroSerie: string): string {
  return numeroSerie.toUpperCase().trim();
}

/**
 * Trunca texto com reticências
 */
export function truncate(texto: string, maxLength: number = 50): string {
  if (texto.length <= maxLength) return texto;
  
  return texto.slice(0, maxLength - 3) + '...';
}

/**
 * Formata status como badge (classe CSS)
 */
export function formatStatusBadge(status: string, colors: Record<string, string>): string {
  return colors[status] || 'text-gray-600 bg-gray-50 border-gray-200';
}

/**
 * Formata intervalo de datas
 */
export function formatIntervaloDatas(dataInicio: string | Date, dataFim?: string | Date): string {
  const inicio = formatData(dataInicio);
  
  if (!dataFim) {
    return `${inicio} - Atual`;
  }
  
  return `${inicio} - ${formatData(dataFim)}`;
}

/**
 * Formata duração em dias
 */
export function formatDuracao(dias: number): string {
  if (dias === 0) return 'Hoje';
  if (dias === 1) return '1 dia';
  if (dias < 30) return `${dias} dias`;
  if (dias < 365) {
    const meses = Math.floor(dias / 30);
    return meses === 1 ? '1 mês' : `${meses} meses`;
  }
  
  const anos = Math.floor(dias / 365);
  const mesesRestantes = Math.floor((dias % 365) / 30);
  
  if (mesesRestantes === 0) {
    return anos === 1 ? '1 ano' : `${anos} anos`;
  }
  
  return `${anos === 1 ? '1 ano' : `${anos} anos`} e ${mesesRestantes === 1 ? '1 mês' : `${mesesRestantes} meses`}`;
}

/**
 * Converte data ISO para formato input[type="date"]
 */
export function toInputDate(dataISO: string | Date): string {
  const data = typeof dataISO === 'string' ? new Date(dataISO) : dataISO;
  
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  
  return `${ano}-${mes}-${dia}`;
}

/**
 * Converte input[type="date"] para Date
 */
export function fromInputDate(inputDate: string): Date {
  return new Date(inputDate + 'T00:00:00');
}
