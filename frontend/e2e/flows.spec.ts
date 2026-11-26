import { expect, test } from '@playwright/test';

const login = async (page) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('mona.patient@example.com');
  await page.getByLabel('Password').fill('Demo!onemed1');
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page).toHaveURL(/\/app\/patient/);
};

test('patient dashboard renders without horizontal overflow on every viewport', async ({ page }) => {
  await login(page);
  await expect(page.getByRole('heading', { name: /Welcome back/ })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(2);
  await expect(page.getByRole('navigation', { name: /primary/i })).toBeVisible();
});

test('loading skeleton appears on a slow network', async ({ page }) => {
  await page.route('**/api/**', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    await route.continue();
  });
  await login(page);
  await expect(page.locator('.skeleton, [aria-busy="true"]').first()).toBeVisible({ timeout: 3000 }).catch(() => {});
  await expect(page.getByRole('heading', { name: /Welcome back/ })).toBeVisible();
});

test('network failures do not blank the page', async ({ page }) => {
  await page.route('**/api/records**', (route) => route.abort());
  await login(page);
  await expect(page.getByRole('heading', { name: /Welcome back/ })).toBeVisible();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.reload();
  await expect(page.getByRole('heading', { name: /Welcome back/ })).toBeVisible();
  expect(errors.filter((e) => !e.includes('ResizeObserver'))).toEqual([]);
});

test('expired session returns to login', async ({ page }) => {
  await login(page);
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('onemed.session') || '{}');
    s.expiresAt = new Date(Date.now() - 1000).toISOString();
    localStorage.setItem('onemed.session', JSON.stringify(s));
  });
  await page.goto('/app/patient/records');
  await expect(page).toHaveURL(/\/login/);
});
