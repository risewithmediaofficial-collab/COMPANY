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

test.describe('Dynamic Objectives & Destination Selector E2E', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('1. Campaigns drawer supports Page Engagement, Awareness, Leads, and dynamic destinations', async ({ page }) => {
    await page.goto('http://localhost:5173/smm/campaigns');
    await page.waitForLoadState('networkidle');

    // Click Create Campaign button
    const createBtn = page.getByRole('button', { name: 'Create Campaign' }).first();
    await expect(createBtn).toBeVisible({ timeout: 5000 });
    await createBtn.click();

    // Drawer should open
    await expect(page.getByRole('heading', { name: 'Create Campaign' })).toBeVisible({ timeout: 5000 });

    // Objective select should contain all 6 objectives
    const objectiveSelect = page.locator('select').filter({ hasText: 'Awareness' });
    await expect(objectiveSelect).toBeVisible();

    // Verify option values
    const options = await objectiveSelect.locator('option').allTextContents();
    expect(options).toContain('Awareness');
    expect(options).toContain('Traffic');
    expect(options).toContain('Leads');
    expect(options).toContain('App Promotion');
    expect(options).toContain('Sales');
    expect(options).toContain('Page Engagement');

    // Select Awareness -> Social destinations should be active with IG & FB buttons
    await objectiveSelect.selectOption('Awareness');
    await expect(page.getByRole('button', { name: 'Instagram', exact: false })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Facebook', exact: false })).toBeVisible();

    // Quick select Only IG
    await page.getByRole('button', { name: 'Only IG' }).click();
    await expect(page.getByText('Active Destination: Instagram')).toBeVisible();

    // Quick select Both (IG & FB)
    await page.getByRole('button', { name: 'Both (IG & FB)' }).click();
    await expect(page.getByText('Active Destination: Instagram & Facebook')).toBeVisible();

    // Switch Objective to Leads -> Should hide social buttons and show Instant Forms / Message
    await objectiveSelect.selectOption('Leads');
    await expect(page.getByRole('button', { name: 'Only IG' })).not.toBeVisible();
    await expect(page.getByText(/Active Destination: (Instant Forms|Message)/)).toBeVisible();

    // Switch Objective to Page Engagement -> Should show social buttons again
    await objectiveSelect.selectOption('Page Engagement');
    await expect(page.getByRole('button', { name: 'Only FB' })).toBeVisible();
    await page.getByRole('button', { name: 'Only FB' }).click();
    await expect(page.getByText('Active Destination: Facebook')).toBeVisible();
  });

  test('2. Ad Sets drawer dynamically reacts to selected campaign objective', async ({ page }) => {
    await page.goto('http://localhost:5173/smm/adsets');
    await page.waitForLoadState('networkidle');

    // Click Create Ad Set button
    const createBtn = page.getByRole('button', { name: /create ad set/i }).first();
    await expect(createBtn).toBeVisible({ timeout: 5000 });
    await createBtn.click();

    // Drawer should open
    await expect(page.getByRole('heading', { name: /create ad set/i })).toBeVisible({ timeout: 5000 });

    // Destination selector is rendered
    await expect(page.getByText(/Form Type \/ Destination \*/i)).toBeVisible();
  });
});
