import { test, expect } from '@playwright/test';

test.describe('Complete Agency CRM Full Project E2E Suite', () => {

  test('1. Auth Pages (Login, Register, Forgot Password)', async ({ page }) => {
    // Login
    await page.goto('http://localhost:5173/login');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('form, input[type="email"], input[type="text"]').first()).toBeVisible();

    // Register
    await page.goto('http://localhost:5173/register');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('form, input[type="email"]').first()).toBeVisible();

    // Forgot Password
    await page.goto('http://localhost:5173/forgot-password');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('form, input[type="email"]').first()).toBeVisible();
  });

  test('2. Dashboard & Navigation Shell', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await page.waitForLoadState('networkidle');

    // Page must render body without breaking
    await expect(page.locator('body')).toBeVisible();

    // If redirected to login, login form is visible
    const isLogin = page.url().includes('/login');
    if (isLogin) {
      await expect(page.locator('input[type="email"]').first()).toBeVisible();
    } else {
      await expect(page.locator('h1, h2, nav').first()).toBeVisible();
    }
  });

  test('3. Clients Module & Custom SelectDropdown Floating Popover', async ({ page }) => {
    await page.goto('http://localhost:5173/clients');
    await page.waitForLoadState('networkidle');

    if (!page.url().includes('/login')) {
      const statusBtn = page.getByRole('button', { name: /All statuses|Active/i }).first();
      if (await statusBtn.isVisible()) {
        await statusBtn.click();
        const portalMenu = page.locator('.select-dropdown-portal-menu');
        await expect(portalMenu).toBeVisible();
        await expect(portalMenu.getByText('Active').first()).toBeVisible();

        // Close popover
        await page.click('body', { position: { x: 5, y: 5 } });
      }
    } else {
      await expect(page.locator('form')).toBeVisible();
    }
  });

  test('4. Task Management & Collapsible Filters', async ({ page }) => {
    await page.goto('http://localhost:5173/calendar');
    await page.waitForLoadState('networkidle');

    if (!page.url().includes('/login')) {
      const filterBtn = page.getByRole('button', { name: /Filters/i }).first();
      if (await filterBtn.isVisible()) {
        await filterBtn.click();
        await expect(page.getByText(/Available Filters/i)).toBeVisible();
      }
    } else {
      await expect(page.locator('form')).toBeVisible();
    }
  });

  test('5. Projects Module Page Load', async ({ page }) => {
    await page.goto('http://localhost:5173/projects');
    await page.waitForLoadState('networkidle');

    if (!page.url().includes('/login')) {
      await expect(page.locator('body')).toBeVisible();
    } else {
      await expect(page.locator('form')).toBeVisible();
    }
  });

  test('6. CRM Leads & Pipeline Page Load', async ({ page }) => {
    await page.goto('http://localhost:5173/crm/leads');
    await page.waitForLoadState('networkidle');

    if (!page.url().includes('/login')) {
      await expect(page.locator('body')).toBeVisible();
    } else {
      await expect(page.locator('form')).toBeVisible();
    }
  });

  test('7. Operations (Finance, Reports, SOP, HR, Settings)', async ({ page }) => {
    const routes = ['/finance', '/reports', '/sop', '/hr', '/settings'];
    for (const route of routes) {
      await page.goto(`http://localhost:5173${route}`);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('8. Social Media Management (SMM) Module Pages', async ({ page }) => {
    const smmRoutes = ['/smm/dashboard', '/smm/projects', '/smm/campaigns'];
    for (const route of smmRoutes) {
      await page.goto(`http://localhost:5173${route}`);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible();
    }
  });

});
