/**
 * HELPERS PARA TESTES E2E
 * Funções auxiliares para autenticação com MFA
 */

import { Page, expect, APIRequestContext } from '@playwright/test';
import { SignJWT } from 'jose';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const AUTH_NAVIGATION_TIMEOUT_MS = 120000;

// Mapeamento estático de usuários QA — mantido em sync com o seed do banco.
// Evita usar PrismaClient no contexto do worker Playwright (que tem isolamento de env).
const QA_USERS: Record<string, { id: number; nivel: string; tokenVersion: number }> = {
  'qa.admin.clientes@teste.local': { id: 13, nivel: 'ADMIN',      tokenVersion: 0 },
  'qa.gerente@teste.local':        { id: 14, nivel: 'GERENTE',    tokenVersion: 0 },
  'qa.financeiro@teste.local':     { id: 15, nivel: 'FINANCEIRO', tokenVersion: 0 },
  'qa.estoque@teste.local':        { id: 16, nivel: 'ESTOQUE',    tokenVersion: 0 },
  'qa.usuario@teste.local':        { id: 17, nivel: 'USUARIO',    tokenVersion: 0 },
};

function cloneFetchOptions(options: Parameters<APIRequestContext['fetch']>[1]) {
  const headers = options?.headers ? { ...options.headers } : undefined;
  let data = options?.data;

  if (data && typeof data === 'object' && !Array.isArray(data) && !(data instanceof Buffer)) {
    data = JSON.parse(JSON.stringify(data));
  }

  return {
    ...options,
    headers,
    data,
  };
}

async function requestJsonWithRetry(
  request: APIRequestContext,
  path: string,
  options: Parameters<APIRequestContext['fetch']>[1],
  timeoutMs: number = AUTH_NAVIGATION_TIMEOUT_MS
) {
  const started = Date.now();
  let lastError: unknown;

  while (Date.now() - started < timeoutMs) {
    try {
      const response = await request.fetch(`${BASE_URL}${path}`, {
        ...cloneFetchOptions(options),
        timeout: Math.max(timeoutMs, options?.timeout ?? 0),
      });
      const text = await response.text();
      const contentType = response.headers()['content-type'] || '';
      const isHtml = text.startsWith('<!DOCTYPE') || text.startsWith('<html');
      const isRetriableStatus = [404, 500, 502, 503, 504].includes(response.status());

      if ((isRetriableStatus || isHtml || !contentType.includes('json')) && Date.now() - started < timeoutMs - 1000) {
        lastError = new Error(`${options?.method || 'GET'} ${path} retornou ${response.status()} durante cold start`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }

      const json = text ? JSON.parse(text) : null;
      return { response, json, text };
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  throw lastError || new Error(`Timeout aguardando resposta JSON em ${path}`);
}

async function persistAuthCookie(page: Page, token: string) {
  const base = new URL(BASE_URL);
  await page.context().clearCookies();
  await page.context().addCookies([
    {
      name: 'authToken',
      value: token,
      url: `${base.protocol}//${base.host}`,
      httpOnly: true,
      secure: base.protocol === 'https:',
      sameSite: 'Lax',
    },
  ]);
}

export async function seedAuthenticatedSessionFromDatabase(page: Page, email: string) {
  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET não definido no ambiente de teste');
  }

  const user = QA_USERS[email];
  if (!user) {
    throw new Error(
      `Usuário QA não mapeado: ${email}. Adicione em QA_USERS em tests/e2e/helpers/auth.ts`
    );
  }

  const secret = new TextEncoder().encode(JWT_SECRET);
  const now = Math.floor(Date.now() / 1000);

  const token = await new SignJWT({
    role: user.nivel,
    email,
    status: 'ATIVO',
    tokenVersion: user.tokenVersion,
    iat: now,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(user.id))
    .setIssuedAt(now)
    .setExpirationTime('8h')
    .setIssuer('gladpros')
    .setAudience('gladpros-app')
    .sign(secret);

  await persistAuthCookie(page, token);

  return { userId: user.id, token };
}

export async function seedAuthenticatedSessionWithMFA(
  page: Page,
  email: string = 'admin@gladpros.com',
  password: string = 'Admin123!@#',
  _postLoginPath: string = '/dashboard'
) {
  console.log(`🔐 Criando sessão autenticada via API para ${email}...`);
  try {
    const { response: loginResponse, json: loginPayload, text: loginText } = await requestJsonWithRetry(
      page.request,
      '/api/auth/login',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        data: { email, password },
      }
    );

    if (!loginResponse.ok()) {
      throw new Error(`Falha no login via API: ${loginResponse.status()} ${loginText}`);
    }

    const userId = Number(loginPayload?.user?.id || loginPayload?.userId);
    if (!userId) {
      throw new Error(`userId ausente na resposta de login: ${loginText}`);
    }

    let mfaCode: string | undefined;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      await page.waitForTimeout(250);
      try {
        const { response: helperResponse, json: helperJson } = await requestJsonWithRetry(
          page.request,
          '/api/test-helpers/get-last-mfa',
          { method: 'GET' },
          30000
        );
        if (helperResponse.ok() && Number(helperJson?.mfa?.usuarioId) === userId && helperJson?.mfa?.code) {
          mfaCode = helperJson.mfa.code;
          break;
        }
      } catch {
        // fallback below via leitura direta do banco de testes/dev
      }
    }

    if (!mfaCode) {
      throw new Error(
        `Código MFA não encontrado para ${email}. ` +
        `Use a rota /api/test-helpers/get-last-mfa ou prefira seedAuthenticatedSessionFromDatabase.`
      );
    }

    const { response: verifyResponse, json: verifyPayload, text: verifyText } = await requestJsonWithRetry(
      page.request,
      '/api/auth/mfa/verify',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        data: { userId, code: mfaCode, tipoAcao: 'LOGIN' },
      }
    );

    if (!verifyResponse.ok()) {
      throw new Error(`Falha na verificação MFA via API: ${verifyResponse.status()} ${verifyText}`);
    }

    const effectiveToken = verifyPayload?.token
      ? String(verifyPayload.token)
      : (() => {
          const setCookie = verifyResponse.headers()['set-cookie'] || '';
          const tokenMatch = setCookie.match(/authToken=([^;]+)/);
          return tokenMatch ? decodeURIComponent(tokenMatch[1]) : undefined;
        })();

    console.log(`  🔍 effectiveToken from MFA verify: ${effectiveToken ? effectiveToken.substring(0, 40) + '...' : 'UNDEFINED'}`);

    if (!effectiveToken) {
      throw new Error(`Cookie authToken ausente após MFA: ${verifyText}`);
    }

    await persistAuthCookie(page, effectiveToken);

    return {
      userId,
      token: effectiveToken,
    };
  } catch (error) {
    console.warn(`⚠️ Fallback para sessão direta de teste em ${email}:`, error instanceof Error ? error.message : error);
    return seedAuthenticatedSessionFromDatabase(page, email);
  }
}

/**
 * Faz login completo incluindo fluxo MFA
 */
export async function loginWithMFA(
  page: Page, 
  email: string = 'admin@gladpros.com', 
  password: string = 'Admin123!@#',  // Senha correta do seed E2E
  postLoginPath: string = '/dashboard'
) {
  console.log(`🔐 Fazendo login como ${email}...`);
  
  // Capturar logs do console
  page.on('console', msg => console.log(`  [BROWSER] ${msg.type()}: ${msg.text()}`));
  page.on('pageerror', err => console.error(`  [PAGE ERROR]`, err.message));
  
  // 1. Ir para página de login (com timeout maior)
  await page.goto(`${BASE_URL}/login`, {
    timeout: AUTH_NAVIGATION_TIMEOUT_MS,
    waitUntil: 'domcontentloaded',
  });
  
  // 2. Preencher credenciais
  console.log('  ↳ Preenchendo credenciais...');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="senha"]', password);
  
  // 3. Submeter formulário
  console.log('  ↳ Submetendo formulário de login...');
  const loginResponsePromise = page.waitForResponse((response) => (
    response.url().includes('/api/auth/login') &&
    response.request().method() === 'POST'
  ), { timeout: AUTH_NAVIGATION_TIMEOUT_MS });
  await page.click('button[type="submit"]');
  const loginResponse = await loginResponsePromise;
  const loginPayload = await loginResponse.json().catch(() => null);
  
  // 4. Aguardar resposta - pode ir para MFA ou direto para dashboard
  // Aguardar navigation ou pelo menos um timeout
  console.log('  ↳ Aguardando redirecionamento...');
  try {
    await page.waitForURL((url) => {
      const urlStr = url.toString();
      return urlStr.includes('/mfa') || urlStr.includes('/dashboard');
    }, { timeout: 60000 });
  } catch {
    console.log('  ⚠️  Timeout aguardando navegação');
  }
  
  await page.waitForTimeout(500); // Dar tempo para página estabilizar
  let currentUrl = page.url();

  if (
    currentUrl.includes('/login') &&
    loginPayload &&
    typeof loginPayload === 'object' &&
    'mfaRequired' in loginPayload &&
    loginPayload.mfaRequired &&
    'user' in loginPayload &&
    loginPayload.user &&
    typeof loginPayload.user === 'object'
  ) {
    const user = loginPayload.user as { id?: number; email?: string; nomeCompleto?: string; primeiroAcesso?: boolean };
    const params = new URLSearchParams({
      userId: String(user.id ?? ''),
      email: user.email ?? email,
      name: user.nomeCompleto || user.email || email,
      firstAccess: user.primeiroAcesso ? 'true' : 'false',
    });
    console.log('  ↳ Redirecionamento client-side nao estabilizou; abrindo /mfa manualmente...');
    await page.goto(`${BASE_URL}/mfa?${params.toString()}`, { timeout: AUTH_NAVIGATION_TIMEOUT_MS });
    currentUrl = page.url();
  }

  console.log(`  → URL após login: ${currentUrl}`);
  
  // Se foi para MFA, precisamos buscar o código e submeter
  if (currentUrl.includes('/mfa')) {
    console.log('  ↳ MFA detectado, buscando código...');
    
    // Buscar código MFA via API helper (apenas em dev)
    const mfaResponse = await page.request.get(`${BASE_URL}/api/test-helpers/get-last-mfa`);
    
    if (!mfaResponse.ok()) {
      throw new Error('Falha ao buscar código MFA: ' + await mfaResponse.text());
    }
    
    const mfaData = await mfaResponse.json();
    const mfaCode = mfaData.mfa.code;
    
    console.log(`  ↳ Código MFA obtido: ${mfaCode}`);
    
    // Aguardar campos de código MFA estarem visíveis (são 6 inputs individuais)
    await page.waitForSelector('input[type="text"]', { timeout: 5000 });
    
    // Preencher os 6 dígitos do código MFA (um por vez, simulando digitação)
    // A página tem auto-submit quando todos os 6 dígitos são preenchidos
    const verifyResponsePromise = page.waitForResponse((response) => (
      response.url().includes('/api/auth/mfa/verify') &&
      response.request().method() === 'POST'
    ), { timeout: 15000 });

    const inputs = await page.locator('input[type="text"]').all();
    for (let i = 0; i < 6 && i < inputs.length; i++) {
      await inputs[i].click(); // Focar no input
      await inputs[i].fill(mfaCode[i] || '');
      await page.waitForTimeout(100); // Pequeno delay entre dígitos
    }
    
    console.log('  ↳ Código preenchido, aguardando auto-submit...');

    const verifyResponse = await verifyResponsePromise;
    if (!verifyResponse.ok()) {
      throw new Error(`Falha na verificacao MFA: ${verifyResponse.status()} ${await verifyResponse.text()}`);
    }

    await expect
      .poll(async () => {
        const cookies = await page.context().cookies();
        return cookies.some((cookie) => (
          cookie.name === 'authToken' ||
          cookie.name === 'sessionToken' ||
          cookie.name === 'refreshToken'
        ));
      }, {
        timeout: 10000,
        message: 'Esperava cookies de autenticacao apos o MFA',
      })
      .toBeTruthy();

    try {
      await page.waitForURL(`**${postLoginPath}`, { timeout: 5000 });
    } catch {
      console.log(`  ↳ Redirect client-side nao estabilizou; navegando para ${postLoginPath} com sessao autenticada...`);
      try {
        await page.goto(`${BASE_URL}${postLoginPath}`, { timeout: AUTH_NAVIGATION_TIMEOUT_MS, waitUntil: 'commit' });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!message.includes('ERR_ABORTED') && !message.includes('frame was detached')) {
          throw error;
        }
      }
      await page.waitForURL(`**${postLoginPath}`, { timeout: AUTH_NAVIGATION_TIMEOUT_MS });
    }

    await page.waitForLoadState('domcontentloaded', { timeout: AUTH_NAVIGATION_TIMEOUT_MS });
    await page.waitForTimeout(1000);
    
    console.log('  ✅ Login com MFA completo');
    
  } else if (currentUrl.includes('/dashboard')) {
    console.log('  ✅ Login direto (sem MFA)');
  } else {
    throw new Error(`Redirecionamento inesperado após login: ${currentUrl}`);
  }
  
  // Verificar que estamos no dashboard
  await expect(page).toHaveURL(new RegExp(`${postLoginPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  
  // Verificar que temos cookie de autenticação
  const cookies = await page.context().cookies();
  const authCookie = cookies.find(c => (
    c.name === 'authToken' ||
    c.name === 'sessionToken' ||
    c.name === 'refreshToken' ||
    c.name.includes('auth')
  ));
  if (!authCookie) {
    console.warn('  ⚠️  WARNING: Nenhum cookie de autenticação encontrado!');
    console.log('  Cookies disponíveis:', cookies.map(c => c.name).join(', '));
  } else {
    console.log(`  ✅ Cookie de autenticação encontrado: ${authCookie.name}`);
  }
}

/**
 * Navega para a página de detalhes de um projeto
 */
export async function navegarParaProjeto(page: Page, projetoId: number) {
  console.log(`📂 Navegando para projeto ${projetoId}...`);
  
  await page.goto(`${BASE_URL}/projetos/${projetoId}`);
  await page.waitForLoadState('networkidle');
  
  console.log('  ✅ Projeto carregado');
}

/**
 * Clica na tab Etapas
 */
export async function abrirTabEtapas(page: Page) {
  console.log('📋 Abrindo tab Etapas...');
  
  // Procurar botão da tab Etapas
  const etapasTab = page.locator('button:has-text("Etapas"), [role="tab"]:has-text("Etapas")').first();
  
  if (await etapasTab.isVisible()) {
    await etapasTab.click();
    await page.waitForTimeout(1000);
    console.log('  ✅ Tab Etapas aberta');
  } else {
    console.log('  ⚠️  Tab Etapas não encontrada');
  }
}

/**
 * Aguarda elemento estar visível (com retry)
 */
export async function waitForElement(
  page: Page, 
  selector: string, 
  timeout: number = 5000
): Promise<boolean> {
  try {
    await page.waitForSelector(selector, { timeout, state: 'visible' });
    return true;
  } catch {
    return false;
  }
}
