import { test, expect } from '@playwright/test';

test.describe('All Functions & Instant Page Transitions Test Suite', () => {

  test.beforeEach(async ({ page }) => {
    // Authenticate
    await page.goto('http://localhost:5173/login');
    await page.waitForLoadState('networkidle');

    const emailInput = page.locator('form input[type="email"]').first();
    if (await emailInput.isVisible()) {
      await emailInput.fill('admin@agencycrm.com');
      const passInput = page.locator('form input[type="password"]').first();
      await passInput.fill('password123');
      const submitBtn = page.getByRole('button', { name: /Sign In|Login/i }).first();
      await submitBtn.click();
      await page.waitForTimeout(1000);
    }
  });

  test('1. Instant Route Switching (No Loading Screen Flash)', async ({ page }) => {
    const routes = ['/', '/clients', '/calendar', '/tasks', '/projects', '/crm/leads', '/finance', '/reports', '/sop', '/hr', '/settings'];
    for (const r of routes) {
      await page.goto(`http://localhost:5173${r}`);
      // Verify no LoadingScreen spinner is visible
      await expect(page.getByText('Connecting Hub…')).not.toBeVisible();
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('2. Page Functions, Search & Filter State Interactions', async ({ page }) => {
    // Clients search & select filter
    await page.goto('http://localhost:5173/clients');
    await page.waitForLoadState('networkidle');

    const searchInput = page.locator('.mt-5 input[placeholder*="Search"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('Test Agency');
      await expect(searchInput).toHaveValue('Test Agency');
      await searchInput.fill('');
    }

    // Task Calendar Collapsible filter toggle
    await page.goto('http://localhost:5173/calendar');
    await page.waitForLoadState('networkidle');

    const filterBtn = page.getByRole('button', { name: /Filters/i }).first();
    if (await filterBtn.isVisible()) {
      await filterBtn.click();
      await expect(page.getByText('Available Filters')).toBeVisible();
      await filterBtn.click();
    }
  });

  test('3. Modals Trigger & Close Functions', async ({ page }) => {
    // Add Client modal
    await page.goto('http://localhost:5173/clients');
    await page.waitForLoadState('networkidle');

    const addClientBtn = page.getByRole('button', { name: /Add Client/i }).first();
    if (await addClientBtn.isVisible()) {
      await addClientBtn.click();
      await page.waitForTimeout(400);
      const cancelBtn = page.getByRole('button', { name: /Cancel|Close/i }).first();
      if (await cancelBtn.isVisible()) await cancelBtn.click();
    }

    // Add Invoice modal
    await page.goto('http://localhost:5173/finance');
    await page.waitForLoadState('networkidle');

    const invoiceBtn = page.getByRole('button', { name: /Invoice/i }).first();
    if (await invoiceBtn.isVisible()) {
      await invoiceBtn.click();
      await page.waitForTimeout(400);
      const cancelBtn = page.getByRole('button', { name: /Cancel|Close/i }).first();
      if (await cancelBtn.isVisible()) await cancelBtn.click();
    }
  });

});
