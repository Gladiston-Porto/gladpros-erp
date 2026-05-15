import { expect, type Locator, type Page } from '@playwright/test';

export async function fillControlledInput(input: Locator, value: string): Promise<void> {
  await input.waitFor({ state: 'visible' });
  await input.click();
  await input.fill('');

  if (value.length > 0) {
    await input.pressSequentially(value, { delay: 5 });
  }

  await expect(input).toHaveValue(value, { timeout: 5000 });
}

export async function fillLoginForm(page: Page, email: string, senha: string): Promise<void> {
  await fillControlledInput(page.locator('input[name="email"]'), email);
  await fillControlledInput(page.locator('input[name="senha"]'), senha);
}
