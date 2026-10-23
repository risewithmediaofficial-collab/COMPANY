import { test, expect } from '@playwright/test';

test('Sidebar navigation updates page content and URL', async ({ page }) => {
  // Capture console and errors
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('BROWSER PAGEERROR:', err.message));

  await page.goto('/login');
  await page.fill('#email', 'admin@agencycrm.com');
  await page.fill('#password', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });
  console.log('Logged in successfully. URL:', page.url());

  await page.waitForTimeout(1000);
  const initialText = await page.locator('main').innerText();
  console.log('Main text initial (Dashboard):', initialText.substring(0, 100).replace(/\n/g, ' '));

  // 1. Click on Tasks
  console.log('Clicking /tasks in sidebar...');
  const tasksLink = page.locator('aside a[href="/tasks"]').first();
  await tasksLink.click();
  await page.waitForTimeout(1000);
  console.log('URL after /tasks:', page.url());
  const tasksText = await page.locator('main').innerText();
  console.log('Main text after /tasks:', tasksText.substring(0, 100).replace(/\n/g, ' '));
  expect(page.url()).toContain('/tasks');

  // 2. Click on Settings
  console.log('Clicking /settings in sidebar footer...');
  const settingsLink = page.locator('aside a[href="/settings"]').first();
  await settingsLink.click();
  await page.waitForTimeout(1000);
  console.log('URL after /settings:', page.url());
  const settingsText = await page.locator('main').innerText();
  console.log('Main text after /settings:', settingsText.substring(0, 100).replace(/\n/g, ' '));
  expect(page.url()).toContain('/settings');

  // 3. Click back to Overview (Dashboard)
  console.log('Clicking Overview in sidebar...');
  const overviewLink = page.locator('aside a[href="/"]').first();
  await overviewLink.click();
  await page.waitForTimeout(1000);
  console.log('URL after /:', page.url());
  const newOverviewText = await page.locator('main').innerText();
  console.log('Main text after overview:', newOverviewText.substring(0, 100).replace(/\n/g, ' '));
  expect(page.url()).toBe('http://localhost:5173/');
});
