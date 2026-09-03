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

test.describe('Project Edit Flow Verification', () => {
  test.beforeEach(async ({ page }) => {
    await loginAdmin(page);
  });

  test('Edit Project from Kanban board and verify persistence without page refresh', async ({ page }) => {
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    // Click Edit button on the first project card
    const editBtn = page.locator('button[title="Edit Project"]').first();
    await expect(editBtn).toBeVisible({ timeout: 6000 });
    await editBtn.click();

    // Verify modal is opened
    const modal = page.locator('[role="dialog"]').first();
    await expect(modal).toBeVisible({ timeout: 5000 });
    await expect(modal.getByText(/edit project/i).first()).toBeVisible();

    // Modify Project Name with a unique timestamp
    const timestamp = Date.now();
    const newName = `Tested Project ${timestamp}`;
    const nameInput = modal.locator('input[placeholder*="Website Redesign"], input[name="name"]').first();
    await nameInput.fill(newName);

    // Click Update Project button
    const submitBtn = modal.locator('button[type="submit"]:has-text("Update Project")');
    await submitBtn.click();

    // Modal should close upon successful update
    await expect(modal).not.toBeVisible({ timeout: 8000 });

    // Verify the updated project title appears on the page
    await expect(page.getByText(newName).first()).toBeVisible({ timeout: 6000 });
  });
});
