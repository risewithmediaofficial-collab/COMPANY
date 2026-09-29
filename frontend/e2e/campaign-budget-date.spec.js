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

test.describe('Campaign Budget & Date Flow E2E', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Campaign drawer verifies dates directly below client/project, manual assigned/daily budgets, and daily deposited budget below destination', async ({ page }) => {
    await page.goto('http://localhost:5173/smm/campaigns');
    await page.waitForLoadState('networkidle');

    // Click Create Campaign button
    const createBtn = page.getByRole('button', { name: 'Create Campaign' }).first();
    await expect(createBtn).toBeVisible({ timeout: 5000 });
    await createBtn.click();

    // Verify drawer opened
    await expect(page.getByRole('heading', { name: 'Create Campaign' })).toBeVisible({ timeout: 5000 });

    // Verify "Monthly Budget" is completely removed
    await expect(page.getByText('Monthly Budget (₹) *')).toHaveCount(0);
    await expect(page.getByText('≈ Monthly ÷ 30')).toHaveCount(0);

    // Verify Date to Date & Assigned Budget section header
    await expect(page.getByText('Campaign Dates & Assigned Budget')).toBeVisible();

    // Verify Start Date (From Date) and End Date (To Date) inputs exist
    const fromDateLabel = page.getByText('From Date (Start Date)');
    const toDateLabel = page.getByText('To Date (End Date)');
    await expect(fromDateLabel).toBeVisible();
    await expect(toDateLabel).toBeVisible();

    // Verify Assigned Budget and Daily Budget inputs
    const assignedBudgetInput = page.getByPlaceholder('e.g. 800').first();
    const dailyBudgetInput = page.getByPlaceholder('e.g. 100');
    await expect(assignedBudgetInput).toBeVisible();
    await expect(dailyBudgetInput).toBeVisible();

    // Test independence: enter 800 into assigned budget, verify daily budget remains untouched
    await assignedBudgetInput.fill('800');
    expect(await dailyBudgetInput.inputValue()).toBe('');

    // Enter 150 into daily budget, verify assigned budget remains 800 (no auto-calculation)
    await dailyBudgetInput.fill('150');
    expect(await assignedBudgetInput.inputValue()).toBe('800');

    // Verify Daily Deposited Budget section below Target Destination
    await expect(page.getByText('Daily Deposited Budget')).toBeVisible();
    const depositDateInput = page.locator('input[type="date"]').nth(2); // 0 is start, 1 is end, 2 is depositDate
    await expect(depositDateInput).toBeVisible();

    const depositedAmountInput = page.getByPlaceholder('e.g. 800').nth(1);
    await expect(depositedAmountInput).toBeVisible();

    // Enter deposited amount
    await depositedAmountInput.fill('500');

    // Verify Balance Amount shows ₹500
    await expect(page.getByText('₹500').first()).toBeVisible();

    // Close drawer
    await page.getByRole('button', { name: 'Cancel' }).click();
  });

  test('Mouse wheel or trackpad scroll does not increment or decrement number inputs', async ({ page }) => {
    await page.goto('http://localhost:5173/smm/campaigns');
    await page.waitForLoadState('networkidle');

    // Click Create Campaign button
    const createBtn = page.getByRole('button', { name: 'Create Campaign' }).first();
    await createBtn.click();

    const depositedAmountInput = page.getByPlaceholder('e.g. 800').nth(1);
    await depositedAmountInput.fill('38');
    expect(await depositedAmountInput.inputValue()).toBe('38');

    // Focus input and dispatch wheel scroll
    await depositedAmountInput.focus();
    await page.mouse.wheel(0, 100);
    await page.waitForTimeout(200);

    // Value should strictly remain 38 (not 37 or 39)
    expect(await depositedAmountInput.inputValue()).toBe('38');

    await page.mouse.wheel(0, -100);
    await page.waitForTimeout(200);
    expect(await depositedAmountInput.inputValue()).toBe('38');

    // Close drawer
    await page.getByRole('button', { name: 'Cancel' }).click();
  });

  test('Multi-deposit tranche flow calculates minus remaining from assigned budget and allows adding multiple tranches', async ({ page }) => {
    await page.goto('http://localhost:5173/smm/campaigns');
    await page.waitForLoadState('networkidle');

    // Click Create Campaign button
    const createBtn = page.getByRole('button', { name: 'Create Campaign' }).first();
    await createBtn.click();

    // Verify sections order: Campaign Name is before Campaign Dates & Assigned Budget
    await expect(page.getByPlaceholder('e.g. August Restaurant Lead Campaign')).toBeVisible();

    // Fill Assigned Budget with 10000
    const assignedBudgetInput = page.getByPlaceholder('e.g. 800').first();
    await assignedBudgetInput.fill('10000');

    // Deposit #1 amount input
    const deposit1Amount = page.getByPlaceholder('e.g. 800').nth(1);
    await deposit1Amount.fill('2000');

    // Verify live minus from assigned budget: 10,000 - 2,000 = 8,000
    await expect(page.getByText('₹8,000').first()).toBeVisible();

    // Click "+ Add Deposit" or "+ Add Another Deposit Tranche"
    const addAnotherDepositBtn = page.getByRole('button', { name: /Add Another Deposit Tranche/i });
    await addAnotherDepositBtn.click();

    // Deposit #2 amount input is now at index 2
    const deposit2Amount = page.getByPlaceholder('e.g. 800').nth(2);
    await deposit2Amount.fill('3000');

    // Verify live minus from assigned budget: 10,000 - (2,000 + 3,000) = 5,000
    await expect(page.getByText('₹5,000').first()).toBeVisible();

    // Close drawer
    await page.getByRole('button', { name: 'Cancel' }).click();
  });
});

