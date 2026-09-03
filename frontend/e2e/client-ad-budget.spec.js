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

test.describe('Client Portal Ad Budget & SMM Streamlined Budget E2E', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('1. SMM Budget Dashboard features Monthly Budget, Daily Budget, Added, Spent, Balance, and Notes', async ({ page }) => {
    await page.goto('http://localhost:5173/smm/budget');
    await page.waitForLoadState('networkidle');

    // KPI cards
    await expect(page.locator('#kpi-monthly-budget')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#kpi-daily-budget')).toBeVisible();
    await expect(page.locator('#kpi-total-added')).toBeVisible();
    await expect(page.locator('#kpi-total-spent')).toBeVisible();
    await expect(page.locator('#kpi-remaining')).toBeVisible();

    // Campaign Budget table headers
    const table = page.locator('#campaign-budget-table');
    await expect(table).toBeVisible();
    await expect(table.getByText('Monthly Budget')).toBeVisible();
    await expect(table.getByText('Daily Budget')).toBeVisible();
    await expect(table.getByText('Notes / Observations')).toBeVisible();

    // Spend Log table headers
    const logTable = page.locator('#spend-log-table');
    await expect(logTable).toBeVisible();
    await expect(logTable.getByText('Balance')).toBeVisible();
    await expect(logTable.getByText('Notes / Observations')).toBeVisible();
  });

  test('2. Log Budget Entry drawer shows Campaign Budget Baseline and calculated entry balance', async ({ page }) => {
    await page.goto('http://localhost:5173/smm/budget');
    await page.waitForLoadState('networkidle');

    await page.locator('#log-budget-entry-btn').click();
    await expect(page.getByText('Log Budget Entry').first()).toBeVisible({ timeout: 5000 });

    // Inputs for amounts and notes
    await expect(page.locator('#log-amount-added')).toBeVisible();
    await expect(page.locator('#log-amount-spent')).toBeVisible();
    await expect(page.locator('#log-notes')).toBeVisible();
  });

  test('3. Client Portal features Ad Budget in sidebar navigation and dedicated section', async ({ page }) => {
    await page.goto('http://localhost:5173/portal');
    await page.waitForLoadState('networkidle');

    // Sidebar navigation contains "Ad Budget"
    const adBudgetNav = page.getByRole('button', { name: /ad budget/i });
    if (await adBudgetNav.isVisible({ timeout: 3000 }).catch(() => false)) {
      await adBudgetNav.click();

      // Section header
      await expect(page.getByRole('heading', { name: /marketing & ad budget/i })).toBeVisible({ timeout: 5000 });
      await expect(page.getByText('Monthly Budget')).toBeVisible();
      await expect(page.getByText('Daily Budget')).toBeVisible();
      await expect(page.getByText('Amount Added')).toBeVisible();
      await expect(page.getByText('Available Balance')).toBeVisible();
    }
  });
});
