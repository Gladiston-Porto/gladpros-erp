// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Carregar variáveis de ambiente seguindo a mesma ordem de prioridade do Next.js:
// .env.local > arquivo explícito (PLAYWRIGHT_ENV_FILE) > .env.e2e > .env.test > .env
//
// IMPORTANTE: dotenv.config não sobrescreve vars já definidas no processo.
// Carregamos do mais específico para o mais genérico — vars já carregadas têm prioridade.
const envLocalPath  = path.resolve(process.cwd(), '.env.local');
const requestedEnvPath = process.env.PLAYWRIGHT_ENV_FILE
  ? path.resolve(process.cwd(), process.env.PLAYWRIGHT_ENV_FILE)
  : null;
const envE2EPath    = path.resolve(process.cwd(), '.env.e2e');
const envTestPath   = path.resolve(process.cwd(), '.env.test');
const envBasePath   = path.resolve(process.cwd(), '.env');

// 1. .env.local — máxima prioridade (Next.js usa este em primeiro lugar)
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath, override: true });
  console.log('[Playwright] .env.local carregado (prioridade máxima)');
}

// 2. Arquivo explícito via PLAYWRIGHT_ENV_FILE (quando fornecido)
if (requestedEnvPath) {
  if (fs.existsSync(requestedEnvPath)) {
    console.log('[Playwright] Carregando variáveis de', requestedEnvPath);
    dotenv.config({ path: requestedEnvPath });
  } else {
    console.warn('[Playwright] PLAYWRIGHT_ENV_FILE não encontrado:', requestedEnvPath);
  }
} else if (fs.existsSync(envE2EPath)) {
  // 3. .env.e2e (banco E2E dedicado, quando configurado)
  console.log('[Playwright] Carregando variáveis de', envE2EPath);
  dotenv.config({ path: envE2EPath });
} else if (fs.existsSync(envTestPath)) {
  // 4. .env.test (fallback)
  console.log('[Playwright] .env.e2e não encontrado, usando', envTestPath);
  dotenv.config({ path: envTestPath });
} else if (fs.existsSync(envBasePath)) {
  // 5. .env (fallback final)
  console.log('[Playwright] Usando .env como fallback');
  dotenv.config({ path: envBasePath });
} else {
  console.warn('[Playwright] Nenhum arquivo de ambiente encontrado');
}

const FALLBACK_JWT_SECRET = 'abcdefghijklmnopqrstuvwxyz0123456789secretkey';
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = FALLBACK_JWT_SECRET;
}
if (!process.env.RBAC_TRUST_JWT) {
  process.env.RBAC_TRUST_JWT = '1';
}

// Validação de variáveis críticas
if (!process.env.DATABASE_URL) {
  console.error('[Playwright] ❌ DATABASE_URL não está definida!');
  console.error('[Playwright] Certifique-se de ter .env.e2e ou .env.test com DATABASE_URL configurada');
} else {
  console.log('[Playwright] ✅ DATABASE_URL carregada:', process.env.DATABASE_URL.replace(/:[^:@]+@/, ':***@'));
}

const E2E_BUILD_PORT = 3007;

const baseURL = process.env.BASE_URL || `http://127.0.0.1:${E2E_BUILD_PORT}`;
const shouldStartServer = process.env.PLAYWRIGHT_START_SERVER === '1'
  ? true
  : process.env.PLAYWRIGHT_SKIP_SERVER === '1'
    ? false
    : !process.env.BASE_URL;

export default defineConfig({
  testDir: './tests/e2e',
  // globalSetup removido — desnecessário com `next start` (sem JIT, sem pré-aquecimento)
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0, // servidor built é estável; sem retry local
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  timeout: 60000, // 60s por teste (servidor built responde rápido)
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,       // 10s para ações individuais
    navigationTimeout: 20000,   // 20s para navegações (next start é rápido)
  },
  projects: process.env.CI
    ? [
        // No CI, apenas chromium para velocidade máxima
        {
          name: 'chromium',
          use: { ...devices['Desktop Chrome'] },
        },
      ]
    : [
        // Localmente, todos os navegadores
        {
          name: 'chromium',
          use: { ...devices['Desktop Chrome'] },
        },
        {
          name: 'firefox',
          use: { ...devices['Desktop Firefox'] },
        },
        {
          name: 'webkit',
          use: { ...devices['Desktop Safari'] },
        },
        {
          name: 'Mobile Chrome',
          use: { ...devices['Pixel 5'] },
        },
        {
          name: 'Mobile Safari',
          use: { ...devices['iPhone 12'] },
        },
      ],
  webServer: shouldStartServer
    ? {
        // build:e2e → compila com ignoreBuildErrors=1; next start → servidor de produção
        command: 'npm run serve:e2e',
        url: baseURL,
        reuseExistingServer: true, // não rebuilda se já estiver rodando na porta
        timeout: 600 * 1000,       // até 10 min para o build (primeira vez)
        stdout: 'pipe',
        stderr: 'pipe',
        env: {
          ...process.env,
          DATABASE_URL: process.env.DATABASE_URL || '',
          JWT_SECRET: process.env.JWT_SECRET || FALLBACK_JWT_SECRET,
          KMS_MASTER_KEY: process.env.KMS_MASTER_KEY || '',
          RBAC_TRUST_JWT: process.env.RBAC_TRUST_JWT || '1',
          TOKEN_VERSION_COLUMN_EXISTS: '1',
          NODE_ENV: 'production',
        },
      }
    : undefined,
});
