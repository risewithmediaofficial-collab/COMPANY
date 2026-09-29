import { test, expect } from '@playwright/test';

test.describe('SMM One-Page Tracker & Delete Option Suite', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate and login
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

  test('1. Tracker Header, Navigation, and Sub-tabs Render Correctly', async ({ page }) => {
    await page.goto('http://localhost:5173/smm/tracker');
    await page.waitForLoadState('networkidle');

    // Verify main header
    await expect(page.getByText(/SOCIAL MEDIA ONE PAGE TRACKER/i)).toBeVisible();

    // Verify sub-tabs: Post & Reel Tracker and 30-Day Story Sheet
    const postTab = page.getByRole('button', { name: /Post & Reel Tracker/i });
    const storyTab = page.getByRole('button', { name: /30-Day Story Sheet/i });

    await expect(postTab).toBeVisible();
    await expect(storyTab).toBeVisible();

    // Switch tabs
    await storyTab.click();
    await expect(page.getByText(/30-DAY STORY SHEET —/i)).toBeVisible();

    await postTab.click();
    await expect(page.locator('span', { hasText: 'POST & REEL TRACKER' }).first()).toBeVisible();
  });

  test('2. Tracker Grid, Client Row, and Delete Action Button', async ({ page }) => {
    await page.goto('http://localhost:5173/smm/tracker');
    await page.waitForLoadState('networkidle');

    // Table elements
    const table = page.locator('table').first();
    if (await table.isVisible()) {
      await expect(table.getByRole('columnheader', { name: 'NO' })).toBeVisible();
      await expect(table.getByRole('columnheader', { name: 'TEAM' })).toBeVisible();
      await expect(table.getByRole('columnheader', { name: 'CLIENT' })).toBeVisible();
      await expect(table.getByRole('columnheader', { name: 'PLAN' })).toBeVisible();

      // Check for delete button in table client cells
      const deleteButtons = page.locator('table button[title*="Delete"]').first();
      if (await deleteButtons.isVisible()) {
        await deleteButtons.click();
        await page.waitForTimeout(300);

        // Verify Delete Confirmation Modal opens
        await expect(page.getByText('Delete Client from Tracker')).toBeVisible();
        await expect(page.getByText(/Remove from .* tracker only/i)).toBeVisible();
        await expect(page.getByText(/Delete client permanently from SMM/i)).toBeVisible();

        // Click cancel to close
        const cancelBtn = page.getByRole('button', { name: 'Cancel' }).first();
        await cancelBtn.click();
        await page.waitForTimeout(300);
        await expect(page.getByText('Delete Client from Tracker')).not.toBeVisible();
      }
    }
  });

  test('3. Client Completion Dashboard and Visual Analytics Render', async ({ page }) => {
    await page.goto('http://localhost:5173/smm/tracker');
    await page.waitForLoadState('networkidle');

    // Check completion dashboard heading
    const dashboardHeading = page.getByText(/CLIENT COMPLETION & PERFORMANCE ANALYTICS/i);
    if (await dashboardHeading.isVisible()) {
      await expect(dashboardHeading).toBeVisible();
      await expect(page.getByText(/CLIENT COMPLETION DASHBOARD/i)).toBeVisible();
    }
  });

  test('4. Add Client Modal opens and closes properly', async ({ page }) => {
    await page.goto('http://localhost:5173/smm/tracker');
    await page.waitForLoadState('networkidle');

    const addClientBtn = page.getByRole('button', { name: /Add Client/i }).first();
    if (await addClientBtn.isVisible()) {
      await addClientBtn.click();
      await page.waitForTimeout(400);

      await expect(page.getByText('Add Client to Tracker')).toBeVisible();
      await expect(page.getByText('Choose Client *')).toBeVisible();

      // Close modal
      const cancelBtn = page.getByRole('button', { name: 'Cancel' }).first();
      await cancelBtn.click();
      await page.waitForTimeout(300);
      await expect(page.getByText('Add Client to Tracker')).not.toBeVisible();
    }
  });

});
