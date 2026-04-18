/**
 * ProjectNumberService
 * Serviço responsável pela geração de números únicos de projeto
 * Formato: PRJ-AAAA-NNNN (ex: PRJ-2025-0001)
 */

import { prisma } from "@/lib/prisma";

export class ProjectNumberService {
  private prisma = prisma;

  /**
   * Gera o próximo número de projeto disponível para o ano corrente
   * @returns Número do projeto no formato PRJ-AAAA-NNNN
   */
  async gerarNumeroProjeto(): Promise<string> {
    const ano = new Date().getFullYear();
    const prefixo = `PRJ-${ano}-`;

    // Busca o último projeto criado no ano corrente
    const ultimoProjeto = await this.prisma.projeto.findFirst({
      where: {
        numeroProjeto: {
          startsWith: prefixo,
        },
      },
      orderBy: {
        numeroProjeto: 'desc',
      },
      select: {
        numeroProjeto: true,
      },
    });

    if (!ultimoProjeto) {
      // Primeiro projeto do ano
      return `${prefixo}0001`;
    }

    // Extrai o número sequencial do último projeto
    const ultimoNumero = ultimoProjeto.numeroProjeto.split('-')[2];
    const proximoNumero = parseInt(ultimoNumero, 10) + 1;

    // Formata com 4 dígitos (padding com zeros)
    const numeroFormatado = proximoNumero.toString().padStart(4, '0');

    return `${prefixo}${numeroFormatado}`;
  }

  /**
   * Valida se um número de projeto já existe no banco
   * @param numeroProjeto Número do projeto a validar
   * @returns true se já existe, false caso contrário
   */
  async numeroprojetoJaExiste(numeroProjeto: string): Promise<boolean> {
    const count = await this.prisma.projeto.count({
      where: {
        numeroProjeto,
      },
    });

    return count > 0;
  }

  /**
   * Valida o formato do número de projeto
   * @param numeroProjeto Número do projeto a validar
   * @returns true se o formato está correto
   */
  validarFormato(numeroProjeto: string): boolean {
    const regex = /^PRJ-\d{4}-\d{4}$/;
    return regex.test(numeroProjeto);
  }

  /**
   * Extrai o ano de um número de projeto
   * @param numeroProjeto Número do projeto
   * @returns Ano extraído do número
   */
  extrairAno(numeroProjeto: string): number | null {
    if (!this.validarFormato(numeroProjeto)) {
      return null;
    }

    const ano = numeroProjeto.split('-')[1];
    return parseInt(ano, 10);
  }

  /**
   * Extrai o número sequencial de um número de projeto
   * @param numeroProjeto Número do projeto
   * @returns Número sequencial extraído
   */
  extrairNumeroSequencial(numeroProjeto: string): number | null {
    if (!this.validarFormato(numeroProjeto)) {
      return null;
    }

    const numero = numeroProjeto.split('-')[2];
    return parseInt(numero, 10);
  }
}
