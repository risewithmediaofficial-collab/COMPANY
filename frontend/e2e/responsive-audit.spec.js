import { test, expect } from '@playwright/test';

const VIEWPORTS = [
  { name: '320px Mobile Minimum', width: 320, height: 640 },
  { name: '375px Mobile Standard', width: 375, height: 667 },
  { name: '390px Modern iPhone', width: 390, height: 844 },
  { name: '768px Tablet Portrait', width: 768, height: 1024 },
  { name: '1024px Tablet / Small Laptop', width: 1024, height: 768 },
  { name: '1440px Desktop', width: 1440, height: 900 },
];

async function checkNoHorizontalOverflow(page, routeName, viewport) {
  const overflow = await page.evaluate(() => {
    const docWidth = document.documentElement.scrollWidth;
    const winWidth = window.innerWidth;
    // Allow maximum 1px tolerance for subpixel browser rendering
    const hasOverflow = docWidth > winWidth + 1;
    
    let offendingElements = [];
    if (hasOverflow) {
      document.querySelectorAll('*').forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.right > winWidth + 1) {
          offendingElements.push({
            tag: el.tagName,
            id: el.id,
            className: el.className ? String(el.className).substring(0, 80) : '',
            right: rect.right,
            width: rect.width,
          });
        }
      });
    }

    return {
      docWidth,
      winWidth,
      hasOverflow,
      offendingCount: offendingElements.length,
      sampleOffenders: offendingElements.slice(0, 5),
    };
  });

  expect(
    overflow.hasOverflow,
    `Horizontal overflow detected on ${routeName} at viewport ${viewport.name} (${viewport.width}x${viewport.height}). docWidth: ${overflow.docWidth}, winWidth: ${overflow.winWidth}. Offenders: ${JSON.stringify(overflow.sampleOffenders)}`
  ).toBe(false);
}

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
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 12000 });
  }
}

test.describe('Responsive Design Viewport & Overflow Audit', () => {
  test.describe.configure({ mode: 'serial' });

  for (const vp of VIEWPORTS) {
    test.describe(`Viewport: ${vp.name} (${vp.width}x${vp.height})`, () => {
      test.use({ viewport: { width: vp.width, height: vp.height } });

      test(`Auth Pages: /login, /register, /forgot-password`, async ({ page }) => {
        // Test /login
        await page.goto('/login');
        await page.waitForLoadState('networkidle');
        await checkNoHorizontalOverflow(page, '/login', vp);

        // Test /register
        await page.goto('/register');
        await page.waitForLoadState('networkidle');
        await checkNoHorizontalOverflow(page, '/register', vp);

        // Test /forgot-password
        await page.goto('/forgot-password');
        await page.waitForLoadState('networkidle');
        await checkNoHorizontalOverflow(page, '/forgot-password', vp);
      });

      test(`Dashboard & Command Center`, async ({ page }) => {
        await loginAdmin(page);
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(600);
        await checkNoHorizontalOverflow(page, '/', vp);
      });

      test(`Tasks Kanban & Table View`, async ({ page }) => {
        await loginAdmin(page);
        await page.goto('/tasks');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(600);
        await checkNoHorizontalOverflow(page, '/tasks', vp);
      });

      test(`CRM Leads & Pipeline`, async ({ page }) => {
        await loginAdmin(page);
        await page.goto('/crm/leads');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(600);
        await checkNoHorizontalOverflow(page, '/crm/leads', vp);
      });

      test(`SMM Dashboard & 31-Day Tracker`, async ({ page }) => {
        await loginAdmin(page);
        await page.goto('/smm');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(600);
        await checkNoHorizontalOverflow(page, '/smm', vp);

        await page.goto('/smm/tracker');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(600);
        await checkNoHorizontalOverflow(page, '/smm/tracker', vp);
      });

      test(`Finance OS & Overview`, async ({ page }) => {
        await loginAdmin(page);
        await page.goto('/finance');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(600);
        await checkNoHorizontalOverflow(page, '/finance', vp);
      });

      test(`Development Module Board & Dashboard`, async ({ page }) => {
        await loginAdmin(page);
        await page.goto('/development');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(600);
        await checkNoHorizontalOverflow(page, '/development', vp);

        await page.goto('/development/board');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(600);
        await checkNoHorizontalOverflow(page, '/development/board', vp);
      });

      test(`Projects & Clients`, async ({ page }) => {
        await loginAdmin(page);
        await page.goto('/projects');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(600);
        await checkNoHorizontalOverflow(page, '/projects', vp);

        await page.goto('/clients');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(600);
        await checkNoHorizontalOverflow(page, '/clients', vp);
      });

      test(`Settings & HR`, async ({ page }) => {
        await loginAdmin(page);
        await page.goto('/settings');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(600);
        await checkNoHorizontalOverflow(page, '/settings', vp);

        await page.goto('/hr');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(600);
        await checkNoHorizontalOverflow(page, '/hr', vp);
      });
    });
  }
});
