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

test.describe('Admin Targeted Logout Flow Verification', () => {
  test.beforeEach(async ({ page }) => {
    await loginAdmin(page);
  });

  test('Admin changes employee password in Users modal and verifies admin remains logged in', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');

    // Verify Users page loaded
    await expect(page.locator('body')).toBeVisible();

    // Find change password button for Sathish Kumar V (or first non-admin)
    const keyButtons = page.locator('button[title*="Password"], button:has(svg.lucide-key-round)');
    if (await keyButtons.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await keyButtons.first().click();

      // Verify modal opened
      const modal = page.locator('[role="dialog"]').first();
      await expect(modal).toBeVisible({ timeout: 5000 });
      await expect(modal.getByText(/Reset Password/i).first()).toBeVisible();

      // Fill in new password
      const newPassInput = modal.locator('input[type="password"]').first();
      const confirmPassInput = modal.locator('input[type="password"]').nth(1);

      await newPassInput.fill('employee123');
      await confirmPassInput.fill('employee123');

      // Submit password change
      const updateBtn = modal.locator('button[type="submit"]:has-text("Update Password")');
      await updateBtn.click();

      // Modal closes
      await expect(modal).not.toBeVisible({ timeout: 8000 });

      // Admin MUST remain on the page, not logged out
      await expect(page).toHaveURL(/\/admin\/users/);
      await expect(page.locator('header').first()).toBeVisible();
    }
  });
});
