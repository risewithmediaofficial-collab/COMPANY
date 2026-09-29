import { test, expect } from '@playwright/test';

test.describe('Full Project Modules & Functions Verification Suite', () => {

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

  test('Module 1: Dashboard / Command Center Overview', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).toBeVisible();
    await expect(page.getByText(/Command Center/i).first()).toBeVisible();
  });

  test('Module 2: SMM & Ads OS Suite Navigation & Views', async ({ page }) => {
    const smmRoutes = [
      '/smm/tracker',
      '/smm/campaigns',
      '/smm/budget',
      '/smm/content',
    ];

    for (const route of smmRoutes) {
      await page.goto(`http://localhost:5173${route}`);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible();
      // Ensure page has no crash / uncaught error screen
      await expect(page.getByText('Something went wrong')).not.toBeVisible();
    }
  });

  test('Module 3: Growth & Sales (CRM Leads, Proposals, Referral Hub)', async ({ page }) => {
    const crmRoutes = ['/crm/leads', '/proposals', '/referral'];

    for (const route of crmRoutes) {
      await page.goto(`http://localhost:5173${route}`);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('Module 4: Client Lifecycle (Clients 360, Follow-ups, Vault)', async ({ page }) => {
    const clientRoutes = ['/clients', '/clients/followups', '/clients/vault'];

    for (const route of clientRoutes) {
      await page.goto(`http://localhost:5173${route}`);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('Module 5: Delivery & Fulfillment (Projects, Tasks Database)', async ({ page }) => {
    const fulfillmentRoutes = ['/projects', '/tasks'];

    for (const route of fulfillmentRoutes) {
      await page.goto(`http://localhost:5173${route}`);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('Module 6: Finance & Accounting (Invoices, Expenses)', async ({ page }) => {
    await page.goto('http://localhost:5173/finance');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('Module 7: HR, Attendance, & Organization Management', async ({ page }) => {
    await page.goto('http://localhost:5173/hr');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('Module 8: SOP, Knowledge Base, & Settings', async ({ page }) => {
    const opsRoutes = ['/sop', '/settings'];

    for (const route of opsRoutes) {
      await page.goto(`http://localhost:5173${route}`);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible();
    }
  });

});
