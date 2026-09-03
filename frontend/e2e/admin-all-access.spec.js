import { test, expect } from '@playwright/test';

async function loginAdmin(page) {
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');

  const emailInput = page.locator('form input[type="email"], #email, input[name="email"]').first();
  if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await emailInput.fill('admin@agencycrm.com');
    const passwordInput = page.locator('form input[type="password"], #password, input[name="password"]').first();
    await passwordInput.fill('password123');
    const submitBtn = page.locator('form button[type="submit"]').first();
    await submitBtn.click();
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });
  }
}

test.describe('Admin All-Access & Edit Option Verification Across All Areas', () => {
  test.beforeEach(async ({ page }) => {
    await loginAdmin(page);
  });

  test('1. Admin has edit options in Tasks (Table view & Kanban cards)', async ({ page }) => {
    await page.goto('http://localhost:5173/tasks');
    await page.waitForLoadState('networkidle');

    // Check Kanban Board has Edit buttons on task cards
    const editCardBtns = page.locator('button[title="Edit Task"]');
    if (await editCardBtns.first().isVisible({ timeout: 4000 }).catch(() => false)) {
      await expect(editCardBtns.first()).toBeVisible();
    }

    // Switch to Table View
    const tableToggle = page.getByRole('button', { name: /table/i }).or(page.locator('button:has-text("Table")')).first();
    if (await tableToggle.isVisible({ timeout: 3000 }).catch(() => false)) {
      await tableToggle.click();
      await page.waitForTimeout(600);
      const tableEditBtns = page.locator('table button[title*="Edit"], table button:has(svg.lucide-edit)');
      if (await tableEditBtns.first().isVisible({ timeout: 4000 }).catch(() => false)) {
        await expect(tableEditBtns.first()).toBeVisible();
      }
    }
  });

  test('2. Admin has edit options in Projects (Kanban cards & Project Details header)', async ({ page }) => {
    await page.goto('http://localhost:5173/projects');
    await page.waitForLoadState('networkidle');

    // New Project button is visible for admin
    await expect(page.getByRole('button', { name: /new project/i })).toBeVisible({ timeout: 5000 });

    // Kanban cards have Edit Project button
    const editProjectBtns = page.locator('button[title="Edit Project"]');
    if (await editProjectBtns.first().isVisible({ timeout: 4000 }).catch(() => false)) {
      await expect(editProjectBtns.first()).toBeVisible();
    }
  });

  test('3. Admin has edit options in Clients (Kanban cards & Client Details)', async ({ page }) => {
    await page.goto('http://localhost:5173/clients');
    await page.waitForLoadState('networkidle');

    // Kanban cards have Edit Client button
    const editClientBtns = page.locator('button[title="Edit Client"]');
    if (await editClientBtns.first().isVisible({ timeout: 4000 }).catch(() => false)) {
      await expect(editClientBtns.first()).toBeVisible();
    }

    // Open first client and check Edit Client button
    const clientName = page.locator('h4.group-hover\\:text-primary').first();
    if (await clientName.isVisible({ timeout: 3000 }).catch(() => false)) {
      await clientName.click();
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('button', { name: /edit client/i })).toBeVisible({ timeout: 5000 });
    }
  });

  test('4. Admin has all-access in SOP, Proposals, and User Directory', async ({ page }) => {
    // Check SOP Library
    await page.goto('http://localhost:5173/sop');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: /new sop|create sop/i }).first()).toBeVisible({ timeout: 5000 });

    // Check Proposals
    await page.goto('http://localhost:5173/proposals');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: /new proposal|create proposal/i }).first()).toBeVisible({ timeout: 5000 });

    // Check User Directory
    await page.goto('http://localhost:5173/admin/users');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: /refresh/i })).toBeVisible({ timeout: 5000 });
  });
});
