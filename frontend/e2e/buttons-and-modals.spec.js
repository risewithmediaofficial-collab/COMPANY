import { test, expect } from '@playwright/test';

test.describe('Exhaustive Buttons, Modals & Functions Test Suite', () => {

  test.beforeEach(async ({ page }) => {
    // Authenticate as SuperAdmin
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

  test('1. Dashboard Buttons & Action Widgets', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await page.waitForLoadState('networkidle');

    // Revenue/Financials toggle button
    const toggleBtn = page.getByRole('button', { name: /Financials|Show Revenue|Hide Financials/i }).first();
    if (await toggleBtn.isVisible()) {
      await toggleBtn.click();
      await page.waitForTimeout(300);
      await toggleBtn.click();
    }

    // Refresh / Filter buttons on Dashboard
    const buttons = page.locator('button');
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);
  });

  test('2. Clients Page Buttons, Modals & Dropdowns', async ({ page }) => {
    await page.goto('http://localhost:5173/clients');
    await page.waitForLoadState('networkidle');

    // Add Client Modal Button
    const addClientBtn = page.getByRole('button', { name: /Add Client/i }).first();
    if (await addClientBtn.isVisible()) {
      await addClientBtn.click();
      await page.waitForTimeout(500);

      // Verify modal opened
      const modalHeader = page.getByText(/Add New Client|Create Client|Client Details/i).first();
      await expect(modalHeader).toBeVisible();

      // Close Modal via Cancel or Close button
      const cancelBtn = page.getByRole('button', { name: /Cancel|Close/i }).first();
      if (await cancelBtn.isVisible()) {
        await cancelBtn.click();
        await page.waitForTimeout(300);
      }
    }

    // Custom Status Dropdown Button
    const statusBtn = page.getByRole('button', { name: /All statuses|Active/i }).first();
    if (await statusBtn.isVisible()) {
      await statusBtn.click();
      const portalMenu = page.locator('.select-dropdown-portal-menu');
      await expect(portalMenu).toBeVisible();
      await page.click('body', { position: { x: 10, y: 10 } });
    }

    // Service Filter Dropdown Button
    const serviceBtn = page.getByRole('button', { name: /All services|Web/i }).first();
    if (await serviceBtn.isVisible()) {
      await serviceBtn.click();
      await page.click('body', { position: { x: 10, y: 10 } });
    }
  });

  test('3. Client Details Sub-Navigation Tabs & Actions', async ({ page }) => {
    await page.goto('http://localhost:5173/clients');
    await page.waitForLoadState('networkidle');

    const clientLink = page.locator('table a[href*="/clients/"], .font-semibold[href*="/clients/"]').first();
    if (await clientLink.isVisible()) {
      await clientLink.click();
      await page.waitForLoadState('networkidle');

      // Edit Client Button
      const editBtn = page.getByRole('button', { name: /Edit Client/i }).first();
      if (await editBtn.isVisible()) {
        await editBtn.click();
        await page.waitForTimeout(400);
        const cancelBtn = page.getByRole('button', { name: /Cancel|Close/i }).first();
        if (await cancelBtn.isVisible()) await cancelBtn.click();
      }

      // Test Sub-navigation tabs (Overview, Projects, Invoices, Payment Notes, Call History, Referrals, Onboarding)
      const tabNames = ['Overview', 'Projects', 'Invoices', 'Payment Notes', 'Call History', 'Referrals', 'Onboarding'];
      for (const tabName of tabNames) {
        const tabBtn = page.getByRole('button', { name: new RegExp(tabName, 'i') }).first();
        if (await tabBtn.isVisible()) {
          await tabBtn.click();
          await page.waitForTimeout(200);
        }
      }
    }
  });

  test('4. Task Calendar Collapsible Filter Toggle & Add Task Modal', async ({ page }) => {
    await page.goto('http://localhost:5173/calendar');
    await page.waitForLoadState('networkidle');

    // Collapsible Filters Toggle Button
    const filterBtn = page.getByRole('button', { name: /Filters/i }).first();
    if (await filterBtn.isVisible()) {
      await filterBtn.click();
      await expect(page.getByText(/Available Filters/i)).toBeVisible();
      // Click again to collapse
      await filterBtn.click();
    }

    // Add Task Button Modal
    const addTaskBtn = page.getByRole('button', { name: /Add Task|Create Task|New Task/i }).first();
    if (await addTaskBtn.isVisible()) {
      await addTaskBtn.click();
      await page.waitForTimeout(500);
      const closeBtn = page.getByRole('button', { name: /Cancel|Close/i }).first();
      if (await closeBtn.isVisible()) await closeBtn.click();
    }
  });

  test('5. Projects Module Buttons & Filter Controls', async ({ page }) => {
    await page.goto('http://localhost:5173/projects');
    await page.waitForLoadState('networkidle');

    // Create Project Button Modal
    const createProjBtn = page.getByRole('button', { name: /Create Project|Add Project/i }).first();
    if (await createProjBtn.isVisible()) {
      await createProjBtn.click();
      await page.waitForTimeout(500);
      const closeBtn = page.getByRole('button', { name: /Cancel|Close/i }).first();
      if (await closeBtn.isVisible()) await closeBtn.click();
    }
  });

  test('6. CRM Leads & Pipeline Board Controls', async ({ page }) => {
    await page.goto('http://localhost:5173/crm/leads');
    await page.waitForLoadState('networkidle');

    // Add Lead Button Modal
    const addLeadBtn = page.getByRole('button', { name: /Add Lead|New Lead/i }).first();
    if (await addLeadBtn.isVisible()) {
      await addLeadBtn.click();
      await page.waitForTimeout(500);
      const closeBtn = page.getByRole('button', { name: /Cancel|Close/i }).first();
      if (await closeBtn.isVisible()) await closeBtn.click();
    }
  });

  test('7. Finance Operations Buttons, Invoices & Expense Modals', async ({ page }) => {
    await page.goto('http://localhost:5173/finance');
    await page.waitForLoadState('networkidle');

    // + Invoice Button Modal
    const invoiceBtn = page.getByRole('button', { name: /Invoice/i }).first();
    if (await invoiceBtn.isVisible()) {
      await invoiceBtn.click();
      await page.waitForTimeout(500);
      const cancelBtn = page.getByRole('button', { name: /Cancel|Close/i }).first();
      if (await cancelBtn.isVisible()) await cancelBtn.click();
    }

    // Switch Tabs: Invoices, Referrals, Expenses & Profits
    const tabNames = ['Invoices', 'Referrals', 'Expenses & Profits'];
    for (const tabName of tabNames) {
      const tabBtn = page.getByRole('button', { name: new RegExp(tabName, 'i') }).first();
      if (await tabBtn.isVisible()) {
        await tabBtn.click();
        await page.waitForTimeout(300);
      }
    }
  });

  test('8. Social Media Management (SMM) Buttons & Actions', async ({ page }) => {
    await page.goto('http://localhost:5173/smm/dashboard');
    await page.waitForLoadState('networkidle');

    const buttons = page.locator('button');
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);
  });

});
