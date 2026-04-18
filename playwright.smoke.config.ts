/**
 * Playwright config mínimo para Prova C: Smoke Visual
 * Usa o servidor de produção já rodando na porta 3777
 */
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: 'smoke-visual.spec.ts',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'list',
  timeout: 60000,
  use: {
    baseURL: 'http://localhost:3777',
    trace: 'off',
    screenshot: 'on',
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Não iniciar servidor — já rodando na 3777
});
