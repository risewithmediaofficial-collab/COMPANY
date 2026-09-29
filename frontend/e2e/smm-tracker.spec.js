import { test, expect } from '@playwright/test';

async function login(page) {
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');

  const emailInput = page.locator('form input[type="email"], #email, input[name="email"]').first();
  if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await emailInput.fill('admin@agencycrm.com');
    const passwordInput = page.locator('form input[type="password"], #password, input[name="password"]').first();
    await passwordInput.fill('password123');
    const submitBtn = page.locator('form button[type="submit"]').first();
    await submitBtn.click();
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 10000 });
  }
}

test.describe('SMM One-Page Tracker E2E', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Tracker displays active client row with full month columns and day cells', async ({ page }) => {
    await page.goto('http://localhost:5173/smm/tracker');
    await page.waitForLoadState('networkidle');

    // Verify title is visible
    await expect(page.getByText('SOCIAL MEDIA ONE PAGE TRACKER', { exact: false })).toBeVisible();

    // Verify "No Active Clients in Tracker" is NOT visible
    await expect(page.getByText('No Active Clients in Tracker')).toHaveCount(0);

    // Verify client "myhosurproperty" row is present in the table
    await expect(page.getByText('myhosurproperty').first()).toBeVisible();

    // Verify day status buttons exist
    const statusBadges = page.locator('button:has-text("PENDING"), button:has-text("DONE")');
    expect(await statusBadges.count()).toBeGreaterThan(0);
  });
});
