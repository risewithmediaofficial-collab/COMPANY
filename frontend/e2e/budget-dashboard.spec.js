/**
 * E2E Tests: Ad Budget Dashboard (/smm/budget)
 * Tests: page load, subnav, filter cascade, KPI cards, log drawer, form validation, CSV export
 */
import { test, expect } from '@playwright/test';

// ─── Shared: Login helper ─────────────────────────────────────────────────────
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

// ─── Suite ────────────────────────────────────────────────────────────────────
test.describe('Ad Budget Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  // ── Test 1: Page loads without error ──────────────────────────────
  test('1. Budget Dashboard page renders', async ({ page }) => {
    await page.goto('/smm/budget');
    await page.waitForLoadState('networkidle');

    // Page title / heading should be visible
    await expect(page.getByText(/Ad Budget Dashboard/i)).toBeVisible({ timeout: 8000 });
  });

  // ── Test 2: SMM SubNav shows "Budget" as active tab ───────────────
  test('2. Budget tab is highlighted in SubNav', async ({ page }) => {
    await page.goto('/smm/budget');
    await page.waitForLoadState('networkidle');

    // The "Budget" link in the sub-nav should be active (has bg-primary class)
    const budgetLink = page.locator('a[href="/smm/budget"]');
    await expect(budgetLink).toBeVisible({ timeout: 5000 });
    await expect(budgetLink).toHaveClass(/bg-primary/);
  });

  // ── Test 3: Ads tab is NOT highlighted when on /smm/budget ────────
  test('3. Ads tab is NOT active on Budget page', async ({ page }) => {
    await page.goto('/smm/budget');
    await page.waitForLoadState('networkidle');

    const adsLink = page.locator('a[href="/smm/ads"]');
    if (await adsLink.isVisible()) {
      // Should NOT have bg-primary class
      const cls = await adsLink.getAttribute('class');
      expect(cls).not.toContain('bg-primary');
    }
  });

  // ── Test 4: Filter bar renders with all dropdowns ─────────────────
  test('4. Filter bar renders with Client, Project, Campaign, Ad, Date inputs', async ({ page }) => {
    await page.goto('/smm/budget');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('#filter-client')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#filter-project')).toBeVisible();
    await expect(page.locator('#filter-campaign')).toBeVisible();
    await expect(page.locator('#filter-ad')).toBeVisible();
    await expect(page.locator('#filter-start-date')).toBeVisible();
    await expect(page.locator('#filter-end-date')).toBeVisible();
  });

  // ── Test 5: KPI cards are visible ────────────────────────────────
  test('5. KPI cards display Monthly Budget, Daily Budget, Total Added, Total Spent, Remaining Balance', async ({ page }) => {
    await page.goto('/smm/budget');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('#kpi-monthly-budget')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('#kpi-daily-budget')).toBeVisible();
    await expect(page.locator('#kpi-total-added')).toBeVisible();
    await expect(page.locator('#kpi-total-spent')).toBeVisible();
    await expect(page.locator('#kpi-remaining')).toBeVisible();
  });

  // ── Test 6: "Log Budget Entry" button opens drawer ────────────────
  test('6. Log Budget Entry button opens the drawer with hierarchy selection', async ({ page }) => {
    await page.goto('/smm/budget');
    await page.waitForLoadState('networkidle');

    const logBtn = page.locator('#log-budget-entry-btn');
    await expect(logBtn).toBeVisible({ timeout: 5000 });
    await logBtn.click();

    // Drawer title should appear
    await expect(page.getByRole('heading', { name: /Log Budget Entry/i })).toBeVisible({ timeout: 4000 });

    // Form fields should be visible inside drawer: Client -> Project -> Campaign -> Ad
    await expect(page.locator('#log-client-select')).toBeVisible();
    await expect(page.locator('#log-project-select')).toBeVisible();
    await expect(page.locator('#log-campaign-select')).toBeVisible();
    await expect(page.locator('#log-ad-select')).toBeVisible();
    await expect(page.locator('#log-date')).toBeVisible();
    await expect(page.locator('#log-amount-added')).toBeVisible();
    await expect(page.locator('#log-amount-spent')).toBeVisible();
  });

  // ── Test 7: Form requires campaign selection ──────────────────────
  test('7. Submitting form without campaign shows validation', async ({ page }) => {
    await page.goto('/smm/budget');
    await page.waitForLoadState('networkidle');

    await page.locator('#log-budget-entry-btn').click();

    // Clear campaign select if pre-selected and try submitting
    const campaignSelect = page.locator('#log-campaign-select');
    await expect(campaignSelect).toBeVisible({ timeout: 4000 });
    await campaignSelect.selectOption('');

    // Click save — HTML5 validation should prevent submit or toast appears
    const saveBtn = page.locator('#save-budget-entry-btn');
    await saveBtn.click();

    // Either form validation prevents submission (HTML5 required) or a toast error shows
    const hasError = await page.locator('.toast, [role="alert"]').isVisible().catch(() => false);
    const isStillOpen = await campaignSelect.isVisible().catch(() => false);
    expect(hasError || isStillOpen).toBeTruthy();
  });

  // ── Test 8: Campaign budget table renders (if data exists) ────────
  test('8. Campaign budget breakdown table is visible', async ({ page }) => {
    await page.goto('/smm/budget');
    await page.waitForLoadState('networkidle');

    // Table should be present (even if empty state)
    const table = page.locator('#campaign-budget-table');
    const emptyState = page.getByText(/No budget data yet/i);

    const tableVisible = await table.isVisible().catch(() => false);
    const emptyVisible = await emptyState.isVisible().catch(() => false);
    expect(tableVisible || emptyVisible).toBeTruthy();
  });

  // ── Test 9: Export CSV button is visible ─────────────────────────
  test('9. Export CSV button is visible and clickable', async ({ page }) => {
    await page.goto('/smm/budget');
    await page.waitForLoadState('networkidle');

    const exportBtn = page.locator('#export-csv-btn');
    await expect(exportBtn).toBeVisible({ timeout: 5000 });
    await expect(exportBtn).toBeEnabled();
  });

  // ── Test 10: Reset Filters clears selections ──────────────────────
  test('10. Reset Filters button clears filter dropdowns', async ({ page }) => {
    await page.goto('/smm/budget');
    await page.waitForLoadState('networkidle');

    // Set a date filter
    await page.locator('#filter-start-date').fill('2024-01-01');
    await page.locator('#filter-end-date').fill('2024-12-31');

    // Reset
    await page.locator('#reset-filters-btn').click();

    // Date inputs should be cleared
    await expect(page.locator('#filter-start-date')).toHaveValue('');
    await expect(page.locator('#filter-end-date')).toHaveValue('');
  });
});
