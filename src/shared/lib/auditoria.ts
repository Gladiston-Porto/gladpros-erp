/** @deprecated Use @/shared/lib/audit instead */
import { prisma } from "@/lib/prisma";

interface AuditoriaData {
  tabela: string;
  registroId: number;
  acao: "CREATE" | "UPDATE" | "DELETE" | "LOGIN" | "LOGOUT";
  usuarioId?: number;
  ip?: string;
  payload?: Record<string, unknown>;
}

export class AuditoriaService {
  static async registrar({
    tabela,
    registroId,
    acao,
    usuarioId,
    ip,
    payload
  }: AuditoriaData) {
    try {
      await prisma.$executeRaw`
        INSERT INTO Auditoria (tabela, registroId, acao, usuarioId, ip, payload)
        VALUES (${tabela}, ${registroId}, ${acao}, ${usuarioId}, ${ip}, ${JSON.stringify(payload)})
      `;
    } catch (error) {
      console.error("Erro ao registrar auditoria:", error);
      // Não deve quebrar o fluxo principal se auditoria falhar
    }
  }

  static async registrarLogin(usuarioId: number, ip?: string, userAgent?: string) {
    await this.registrar({
      tabela: "Usuario",
      registroId: usuarioId,
      acao: "LOGIN",
      usuarioId,
      ip,
      payload: { userAgent, timestamp: new Date().toISOString() }
    });
  }

  static async registrarLogout(usuarioId: number, ip?: string, duration?: string) {
    await this.registrar({
      tabela: "Usuario", 
      registroId: usuarioId,
      acao: "LOGOUT",
      usuarioId,
      ip,
      payload: { duration, timestamp: new Date().toISOString() }
    });
  }

  static async registrarCriacaoUsuario(usuarioId: number, dados: Record<string, unknown>, adminId?: number, ip?: string) {
    await this.registrar({
      tabela: "Usuario",
      registroId: usuarioId,
      acao: "CREATE",
      usuarioId: adminId,
      ip,
      payload: dados
    });
  }

  static async registrarAtualizacaoUsuario(usuarioId: number, dadosAntes: Record<string, unknown>, dadosDepois: Record<string, unknown>, adminId?: number, ip?: string) {
    await this.registrar({
      tabela: "Usuario",
      registroId: usuarioId, 
      acao: "UPDATE",
      usuarioId: adminId,
      ip,
      payload: { before: dadosAntes, after: dadosDepois }
    });
  }

  static async registrarExclusaoUsuario(usuarioId: number, dados: Record<string, unknown>, adminId?: number, ip?: string) {
    await this.registrar({
      tabela: "Usuario",
      registroId: usuarioId,
      acao: "DELETE", 
      usuarioId: adminId,
      ip,
      payload: dados
    });
  }

  static async buscarPorUsuario(usuarioId: number, limite = 100) {
    return (await prisma.$queryRaw`
      SELECT 
        a.id,
        a.tabela,
        a.registroId,
        a.acao,
        a.usuarioId,
        a.ip,
        a.payload,
        a.criadoEm,
        u.nomeCompleto,
        u.email
      FROM Auditoria a
      LEFT JOIN Usuario u ON a.usuarioId = u.id
      WHERE a.registroId = ${usuarioId} AND a.tabela = 'Usuario'
         OR a.usuarioId = ${usuarioId}
      ORDER BY a.criadoEm DESC
      LIMIT ${limite}
    `) as unknown;
  }

  static async buscarPorTabela(tabela: string, registroId: number) {
    return (await prisma.$queryRaw`
      SELECT 
        a.id,
        a.tabela,
        a.registroId,
        a.acao,
        a.usuarioId,
        a.ip,
        a.payload,
        a.criadoEm,
        u.nomeCompleto,
        u.email
      FROM Auditoria a
      LEFT JOIN Usuario u ON a.usuarioId = u.id
      WHERE a.tabela = ${tabela} AND a.registroId = ${registroId}
      ORDER BY a.criadoEm DESC
    `) as unknown;
  }
}
