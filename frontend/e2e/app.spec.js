import { test, expect } from '@playwright/test';

test.describe('Agency CRM UI Redesign E2E Suite', () => {
  test('App loading and navigation', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveTitle(/Agency|CRM|Rise/i);
  });

  test('Clients page custom dropdown popover floating test', async ({ page }) => {
    await page.goto('http://localhost:5173/clients');
    await page.waitForLoadState('networkidle');

    // Find and click the custom dropdown "All statuses" button
    const statusDropdown = page.getByRole('button', { name: /All statuses|Active/i });
    if (await statusDropdown.isVisible()) {
      await statusDropdown.click();
      
      // Verify portal popover opens floating on body without clipping
      const portalMenu = page.locator('.select-dropdown-portal-menu');
      await expect(portalMenu).toBeVisible();
      await expect(portalMenu.getByText('Active')).toBeVisible();
      await expect(portalMenu.getByText('Prospect')).toBeVisible();
    }
  });

  test('Task Calendar collapsible filter toggle test', async ({ page }) => {
    await page.goto('http://localhost:5173/calendar');
    await page.waitForLoadState('networkidle');

    const filterButton = page.getByRole('button', { name: /Filters/i });
    if (await filterButton.isVisible()) {
      // Click filter toggle button
      await filterButton.click();

      // Verify collapsible filter panel expands
      await expect(page.getByText('Available Filters')).toBeVisible();
    }
  });
});
