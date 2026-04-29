// @ts-check
import { test, expect } from '@playwright/test';

test.describe('Portfolio SPA', () => {
  test('navigates across all routes', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Alaska');

    // Navigate to JobBot
    const jobbotLink = page.locator('[data-router-link][href="/proyectos/jobbot"]').first();
    await jobbotLink.scrollIntoViewIfNeeded();
    await jobbotLink.click();
    await expect(page).toHaveURL(/\/proyectos\/jobbot/);
    await expect(page.locator('[data-i18n="jobbot.header.title"]')).toBeVisible();

    // Back home to find next link
    await page.goto('/');

    // Navigate to Auditoría
    const auditLink = page.locator('[data-router-link][href="/proyectos/auditoria-contratacion"]').first();
    await auditLink.scrollIntoViewIfNeeded();
    await auditLink.click();
    await expect(page).toHaveURL(/\/proyectos\/auditoria-contratacion/);
    await expect(page.locator('[data-i18n="auditoria.header.title"]')).toBeVisible();

    // Back home
    await page.goto('/');

    // Navigate to INVARIANT
    const invariantLink = page.locator('[data-router-link][href="/proyectos/invariant"]').first();
    await invariantLink.scrollIntoViewIfNeeded();
    await invariantLink.click();
    await expect(page).toHaveURL(/\/proyectos\/invariant/);
    await expect(page.locator('h1')).toContainText('INVARIANT');
  });

  test('switches locale between es and en', async ({ page }) => {
    await page.goto('/');

    // Determine current locale by reading the contact section title
    const contactTitle = page.locator('[data-i18n="home.contact.section_title"]');
    const initialText = await contactTitle.textContent();

    // Click language toggle using data-action
    await page.locator('[data-action="toggle-language"]').first().click();

    // Wait for text to change
    await expect(async () => {
      const newText = await contactTitle.textContent();
      expect(newText).not.toBe(initialText);
    }).toPass({ timeout: 5000 });

    // Toggle back
    await page.locator('[data-action="toggle-language"]').first().click();
    await expect(contactTitle).toHaveText(initialText);
  });

  test('executes terminal commands', async ({ page }) => {
    await page.goto('/');
    const input = page.locator('#terminal-input');
    await input.fill('whoami');
    await input.press('Enter');
    await expect(page.locator('.terminal-output')).toContainText('alaska');
  });

  test('submits contact form with mocked endpoint', async ({ page }) => {
    await page.goto('/');

    await page.route('https://formspree.io/f/xqalwwvp', async route => {
      await route.fulfill({ status: 200, body: JSON.stringify({ ok: true }) });
    });

    await page.fill('#name', 'Test User');
    await page.fill('#email', 'test@example.com');
    await page.fill('#message', 'Hello from Playwright');
    await page.click('#contact-form button[type="submit"]');

    await expect(page.locator('text=¡Mensaje enviado!')).toBeVisible();
  });
});
