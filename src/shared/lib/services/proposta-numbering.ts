// src/lib/services/proposta-numbering.ts
import { prisma } from "@/lib/prisma";

/**
 * Gera o próximo número de proposta no formato GP-YYYYMM-NNNNN
 * Utiliza transação para garantir atomicidade e evitar duplicatas
 * 
 * @returns Promise<string> Número da proposta único
 */
export async function generateNumeroProposta(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `GP-${year}${month}-`;

  return await prisma.$transaction(async (tx) => {
    // Buscar o último número no mês atual
    const lastProposta = await tx.proposta.findFirst({
      where: {
        numeroProposta: {
          startsWith: prefix
        }
      },
      orderBy: {
        numeroProposta: 'desc'
      }
    });

    let nextSequence = 1;

    if (lastProposta) {
      // Extrair o número sequencial do último número
      const lastNumber = lastProposta.numeroProposta.substring(prefix.length);
      nextSequence = parseInt(lastNumber, 10) + 1;
    }

    const sequenceStr = String(nextSequence).padStart(5, '0');
    const numeroProposta = `${prefix}${sequenceStr}`;

    // Verificar se o número já existe (safety check)
    const exists = await tx.proposta.findUnique({
      where: { numeroProposta }
    });

    if (exists) {
      throw new Error('Número de proposta já existe. Tente novamente.');
    }

    return numeroProposta;
  });
}

/**
 * Valida o formato do número de proposta
 * 
 * @param numero - Número da proposta a ser validado
 * @returns boolean - True se válido
 */
export function isValidNumeroProposta(numero: string): boolean {
  const pattern = /^GP-\d{6}-\d{5}$/;
  return pattern.test(numero);
}

/**
 * Extrai informações do número da proposta
 * 
 * @param numero - Número da proposta
 * @returns Object com ano, mês e sequência ou null se inválido
 */
export function parseNumeroProposta(numero: string): {
  year: number;
  month: number;
  sequence: number;
} | null {
  if (!isValidNumeroProposta(numero)) {
    return null;
  }

  const parts = numero.split('-');
  const yearMonth = parts[1];
  const sequence = parts[2];

  return {
    year: parseInt(yearMonth.substring(0, 4), 10),
    month: parseInt(yearMonth.substring(4, 6), 10),
    sequence: parseInt(sequence, 10)
  };
}
