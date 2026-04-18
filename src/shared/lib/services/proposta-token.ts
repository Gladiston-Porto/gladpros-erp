// src/lib/services/proposta-token.ts
import { randomBytes } from 'crypto';
import { prisma } from "@/lib/prisma";

export interface TokenPublico {
  token: string;
  expiresAt: Date;
}

/**
 * Gera um token público único para visualização de proposta pelo cliente
 * @param diasExpiracao Dias até expiração (padrão: 30)
 * @returns Token e data de expiração
 */
export async function generateTokenPublico(diasExpiracao: number = 30): Promise<TokenPublico> {
  let token: string;
  let tentativas = 0;
  const maxTentativas = 5;

  do {
    // Gerar token seguro (32 bytes = 64 chars hex)
    token = randomBytes(32).toString('hex');
    
    // Verificar se token já existe
        const existingToken = await prisma.proposta.findFirst({
      where: { 
        tokenPublico: token,
        tokenExpiresAt: {
          gt: new Date() // Ainda não expirado
        }
      }
    });

    if (!existingToken) {
      break;
    }

    tentativas++;
  } while (tentativas < maxTentativas);

  if (tentativas >= maxTentativas) {
    throw new Error('Não foi possível gerar token único após várias tentativas');
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + diasExpiracao);

  return {
    token,
    expiresAt
  };
}

/**
 * Valida se um token público é válido e não expirado
 * @param token Token para validar
 * @returns Proposta se token válido, null se inválido/expirado
 */
export async function validateTokenPublico(token: string) {
  if (!token || token.length !== 64) {
    return null;
  }

  const proposta = await prisma.proposta.findFirst({
    where: {
      tokenPublico: token,
      tokenExpiresAt: {
        gt: new Date() // Ainda não expirado
      },
      deletedAt: null,
      status: {
        in: ['ENVIADA', 'ASSINADA'] // Apenas propostas enviadas ou já assinadas
      }
    },
    include: {
      Cliente: {
        select: {
          id: true,
          nomeCompleto: true,
          razaoSocial: true,
          email: true
        }
      },
      PropostaEtapa: {
        orderBy: { ordem: 'asc' }
      },
      PropostaMaterial: {
        orderBy: { nome: 'asc' }
      },
      AnexoProposta: {
        where: {
          privado: false // Apenas anexos públicos para o cliente
        },
        orderBy: { criadoEm: 'asc' }
      }
    }
  });

  return proposta;
}

/**
 * Invalida um token público (marca como expirado)
 * @param propostaId ID da proposta
 */
export async function invalidateTokenPublico(propostaId: number) {
  await prisma.proposta.update({
    where: { id: propostaId },
    data: {
      tokenExpiresAt: new Date() // Marca como expirado
    }
  });
}

/**
 * Limpa tokens expirados (job de limpeza)
 * @returns Número de tokens removidos
 */
export async function cleanExpiredTokens(): Promise<number> {
  const result = await prisma.proposta.updateMany({
    where: {
      tokenExpiresAt: {
        lt: new Date()
      },
      tokenPublico: {
        not: null
      }
    },
    data: {
      tokenPublico: null,
      tokenExpiresAt: null
    }
  });

  return result.count;
}

/**
 * Renova um token público existente
 * @param propostaId ID da proposta
 * @param diasExpiracao Novos dias até expiração
 * @returns Novo token e data de expiração
 */
export async function renewTokenPublico(propostaId: number, diasExpiracao: number = 30): Promise<TokenPublico> {
  const { token, expiresAt } = await generateTokenPublico(diasExpiracao);

  await prisma.proposta.update({
    where: { id: propostaId },
    data: {
      tokenPublico: token,
      tokenExpiresAt: expiresAt
    }
  });

  return { token, expiresAt };
}
