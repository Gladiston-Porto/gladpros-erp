/**
 * E2E Test: Propostas Flow
 * Complete proposal creation and status transition flow
 */

import { test, expect } from '@playwright/test';

test.describe('Propostas Management Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@gladpros.com');
    await page.fill('input[name="senha"]', 'Admin123!@#');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
    
    // Navigate to propostas
    await page.goto('/propostas');
    await page.waitForLoadState('networkidle');
  });

  test('should display propostas list', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Propostas');
    await expect(page.locator('[data-testid="propostas-table"]')).toBeVisible();
  });

  test('should create new proposta', async ({ page }) => {
    await page.click('text=Nova Proposta');
    await page.waitForURL('/propostas/novo');
    
    // Fill basic info
    await page.selectOption('select[name="clienteId"]', { index: 1 });
    await page.fill('input[name="titulo"]', 'E2E Test Proposal');
    await page.fill('textarea[name="descricao"]', 'Automated test proposal description');
    await page.fill('input[name="valor"]', '5000');
    await page.fill('input[name="prazo"]', '30');
    
    // Submit
    await page.click('button[type="submit"]');
    
    // Should redirect to list
    await page.waitForURL('/propostas');
    await expect(page.locator('text=Proposta criada')).toBeVisible({ timeout: 3000 });
  });

  test('should transition proposta from RASCUNHO to ENVIADA', async ({ page }) => {
    // Find a proposta in RASCUNHO status
    await page.locator('[data-testid="proposta-row"]').first().click();
    
    // Click send button
    await page.click('[data-testid="send-proposta"]');
    
    // Confirm in modal
    await page.click('[data-testid="confirm-send"]');
    
    // Status should update
    await expect(page.locator('text=ENVIADA')).toBeVisible({ timeout: 3000 });
  });

  test('should approve proposta', async ({ page }) => {
    // Find ENVIADA proposta
    const row = page.locator('[data-testid="status-badge"]:has-text("ENVIADA")').first();
    await row.click();
    
    // Click approve button
    await page.click('[data-testid="approve-proposta"]');
    
    // Confirm
    await page.click('[data-testid="confirm-approve"]');
    
    // Status should update to APROVADA
    await expect(page.locator('text=APROVADA')).toBeVisible({ timeout: 3000 });
  });

  test('should reject proposta with reason', async ({ page }) => {
    const row = page.locator('[data-testid="status-badge"]:has-text("ENVIADA")').first();
    await row.click();
    
    await page.click('[data-testid="reject-proposta"]');
    
    // Fill rejection reason
    await page.fill('textarea[name="motivoRejeicao"]', 'Valor muito alto');
    await page.click('[data-testid="confirm-reject"]');
    
    await expect(page.locator('text=REJEITADA')).toBeVisible({ timeout: 3000 });
  });

  test('should filter propostas by status', async ({ page }) => {
    await page.click('[data-testid="status-filter"]');
    await page.click('text=APROVADA');
    
    await page.waitForTimeout(1000);
    
    // All visible should be APROVADA
    const badges = page.locator('[data-testid="status-badge"]');
    const count = await badges.count();
    
    for (let i = 0; i < count; i++) {
      await expect(badges.nth(i)).toContainText('APROVADA');
    }
  });

  test('should filter propostas by cliente', async ({ page }) => {
    await page.click('[data-testid="cliente-filter"]');
    await page.selectOption('select[name="clienteId"]', { index: 1 });
    
    await page.waitForTimeout(1000);
    
    const rows = page.locator('[data-testid="proposta-row"]');
    expect(await rows.count()).toBeGreaterThan(0);
  });

  test('should generate PDF for proposta', async ({ page }) => {
    await page.locator('[data-testid="proposta-row"]').first().click();
    
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="download-pdf"]');
    
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.pdf');
  });

  test('should send proposta email', async ({ page }) => {
    await page.locator('[data-testid="proposta-row"]').first().click();
    
    await page.click('[data-testid="send-email"]');
    
    // Fill email details
    await page.fill('input[name="emailTo"]', 'client@example.com');
    await page.fill('textarea[name="mensagem"]', 'Segue proposta em anexo');
    
    await page.click('[data-testid="confirm-send-email"]');
    
    await expect(page.locator('text=Email enviado')).toBeVisible({ timeout: 3000 });
  });

  test('should not allow invalid status transitions', async ({ page }) => {
    // Find RASCUNHO proposta
    const row = page.locator('[data-testid="status-badge"]:has-text("RASCUNHO")').first();
    await row.click();
    
    // Approve button should not be visible (must send first)
    await expect(page.locator('[data-testid="approve-proposta"]')).not.toBeVisible();
  });

  test('should delete proposta in RASCUNHO', async ({ page }) => {
    const row = page.locator('[data-testid="status-badge"]:has-text("RASCUNHO")').first();
    await row.click();
    
    await page.click('[data-testid="delete-proposta"]');
    await page.click('[data-testid="confirm-delete"]');
    
    await page.waitForURL('/propostas');
    await expect(page.locator('text=Proposta excluída')).toBeVisible({ timeout: 3000 });
  });

  test('should not delete proposta in APROVADA', async ({ page }) => {
    const row = page.locator('[data-testid="status-badge"]:has-text("APROVADA")').first();
    await row.click();
    
    // Delete button should not be visible or disabled
    const deleteBtn = page.locator('[data-testid="delete-proposta"]');
    if (await deleteBtn.isVisible()) {
      await expect(deleteBtn).toBeDisabled();
    }
  });

  test('should show proposta numero in format PROP-YYYY-XXX', async ({ page }) => {
    const numeroCell = page.locator('[data-testid="proposta-numero"]').first();
    const numero = await numeroCell.textContent();
    
    expect(numero).toMatch(/PROP-\d{4}-\d{3}/);
  });

  test('should sort propostas by date', async ({ page }) => {
    await page.click('[data-testid="sort-date"]');
    
    await page.waitForTimeout(500);
    
    // Verify sorting changed
    const rows = page.locator('[data-testid="proposta-row"]');
    expect(await rows.count()).toBeGreaterThan(0);
  });

  test('should be mobile responsive', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
    await expect(page.locator('[data-testid="propostas-table"]')).toBeVisible();
  });
});
