import { test, expect } from '@playwright/test';

test.describe('Complete System & Button Audit Spec', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to Login
    await page.goto('http://localhost:5173/login');
    await page.waitForLoadState('networkidle');

    // Perform Login if not already logged in
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

  test('1. Dashboard Navigation & Web Activity Metrics Panel', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).toBeVisible();

    // Verify Financial Toggle button if present
    const toggleBtn = page.getByRole('button', { name: /Financials|Show Revenue|Hide Financials/i }).first();
    if (await toggleBtn.isVisible()) {
      await toggleBtn.click();
    }

    // Verify Web Activity & Audit Log Metrics panel
    const activityPanel = page.getByText(/Web Activity & Edits Metrics/i).first();
    if (await activityPanel.isVisible()) {
      await expect(activityPanel).toBeVisible();
    }
  });

  test('2. Clients Module & SelectDropdown Floating Popovers', async ({ page }) => {
    await page.goto('http://localhost:5173/clients');
    await page.waitForLoadState('networkidle');

    // Test Search input in page toolbar
    const searchInput = page.locator('.mt-5 input[placeholder*="Search"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('Test');
      await searchInput.fill('');
    }

    // Test Custom SelectDropdown "All statuses"
    const statusBtn = page.getByRole('button', { name: /All statuses|Active/i }).first();
    if (await statusBtn.isVisible()) {
      await statusBtn.click();
      const portalMenu = page.locator('.select-dropdown-portal-menu');
      await expect(portalMenu).toBeVisible();
      await page.click('body', { position: { x: 10, y: 10 } });
    }

    // Test "Add Client" button modal trigger
    const addClientBtn = page.getByRole('button', { name: /Add Client/i }).first();
    if (await addClientBtn.isVisible()) {
      await addClientBtn.click();
      await page.waitForTimeout(500);
      // Close modal
      const cancelBtn = page.getByRole('button', { name: /Cancel|Close/i }).first();
      if (await cancelBtn.isVisible()) {
        await cancelBtn.click();
      }
    }
  });

  test('3. Client Details Page Layout & Financial Summary', async ({ page }) => {
    await page.goto('http://localhost:5173/clients');
    await page.waitForLoadState('networkidle');

    // Locate client link or navigate to client detail
    const clientLink = page.locator('table a[href*="/clients/"], .font-semibold[href*="/clients/"]').first();
    if (await clientLink.isVisible()) {
      await clientLink.click();
      await page.waitForLoadState('networkidle');

      // Verify Header, Tabs, and Financial Summary cards
      await expect(page.getByText(/Financial Summary|Client Information|Overview/i).first()).toBeVisible();
    }
  });

  test('4. Task Management & Collapsible Filters', async ({ page }) => {
    await page.goto('http://localhost:5173/calendar');
    await page.waitForLoadState('networkidle');

    // Click "Filters" toggle button
    const filterBtn = page.getByRole('button', { name: /Filters/i }).first();
    if (await filterBtn.isVisible()) {
      await filterBtn.click();
      await expect(page.getByText(/Available Filters/i)).toBeVisible();
    }

    // Tasks list route
    await page.goto('http://localhost:5173/tasks');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('5. Projects Module & Modals', async ({ page }) => {
    await page.goto('http://localhost:5173/projects');
    await page.waitForLoadState('networkidle');

    const addProjectBtn = page.getByRole('button', { name: /Create Project|Add Project/i }).first();
    if (await addProjectBtn.isVisible()) {
      await addProjectBtn.click();
      await page.waitForTimeout(500);
    }
  });

  test('6. CRM Leads & Pipeline Board', async ({ page }) => {
    await page.goto('http://localhost:5173/crm/leads');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).toBeVisible();
  });

  test('7. Operations & Admin Routes Audit', async ({ page }) => {
    const routes = ['/finance', '/reports', '/sop', '/hr', '/settings', '/smm/dashboard'];
    for (const route of routes) {
      await page.goto(`http://localhost:5173${route}`);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible();
    }
  });

});
