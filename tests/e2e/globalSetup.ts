/**
 * GLOBAL SETUP — Playwright E2E
 *
 * Com `next start` (servidor de produção pré-compilado) não há necessidade de
 * pré-aquecimento de rotas. Este arquivo é mantido para futuros usos
 * (ex: seed de dados, validação de saúde do servidor).
 */

export default async function globalSetup() {
  // Servidor de produção já está compilado e respondendo antes deste ponto.
  // Playwright garante isso via webServer.url antes de iniciar os testes.
  console.log('[GlobalSetup] ✅ Servidor pronto (next start). Nenhum pré-aquecimento necessário.');
}

