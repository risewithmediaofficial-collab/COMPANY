import { test, expect } from '@playwright/test';

const CORE_VIEWPORTS = [
  { name: '320px Mobile Minimum', width: 320, height: 640 },
  { name: '375px Mobile Standard', width: 375, height: 667 },
  { name: '768px Tablet Portrait', width: 768, height: 1024 },
  { name: '1440px Desktop', width: 1440, height: 900 },
];

async function checkNoHorizontalOverflow(page, routeName, viewport) {
  const overflow = await page.evaluate(() => {
    const docWidth = document.documentElement.scrollWidth;
    const winWidth = window.innerWidth;
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

test.describe('Responsive Extended Suite (Proposals, SOP, HR, Admin, Portal)', () => {
  test.describe.configure({ mode: 'serial' });

  for (const vp of CORE_VIEWPORTS) {
    test.describe(`Viewport: ${vp.name} (${vp.width}x${vp.height})`, () => {
      test.use({ viewport: { width: vp.width, height: vp.height } });

      test(`Proposals & SOP`, async ({ page }) => {
        await loginAdmin(page);
        await page.goto('/proposals');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(600);
        await checkNoHorizontalOverflow(page, '/proposals', vp);

        await page.goto('/sop');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(600);
        await checkNoHorizontalOverflow(page, '/sop', vp);
      });

      test(`Attendance & Assets & Reports`, async ({ page }) => {
        await loginAdmin(page);
        await page.goto('/attendance');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(600);
        await checkNoHorizontalOverflow(page, '/attendance', vp);

        await page.goto('/assets');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(600);
        await checkNoHorizontalOverflow(page, '/assets', vp);

        await page.goto('/reports');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(600);
        await checkNoHorizontalOverflow(page, '/reports', vp);
      });

      test(`Domain Renewals & Referral & Admin Users`, async ({ page }) => {
        await loginAdmin(page);
        await page.goto('/domain-renewals');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(600);
        await checkNoHorizontalOverflow(page, '/domain-renewals', vp);

        await page.goto('/referral');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(600);
        await checkNoHorizontalOverflow(page, '/referral', vp);

        await page.goto('/admin/users');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(600);
        await checkNoHorizontalOverflow(page, '/admin/users', vp);
      });

      test(`Development Sprints, QA & Reviews`, async ({ page }) => {
        await loginAdmin(page);
        await page.goto('/development/sprints');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(600);
        await checkNoHorizontalOverflow(page, '/development/sprints', vp);

        await page.goto('/development/qa');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(600);
        await checkNoHorizontalOverflow(page, '/development/qa', vp);

        await page.goto('/development/reviews');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(600);
        await checkNoHorizontalOverflow(page, '/development/reviews', vp);
      });

      test(`Client Portal Views`, async ({ page }) => {
        await loginAdmin(page);
        await page.goto('/portal/tasks');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(600);
        await checkNoHorizontalOverflow(page, '/portal/tasks', vp);

        await page.goto('/portal/invoices');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(600);
        await checkNoHorizontalOverflow(page, '/portal/invoices', vp);

        await page.goto('/portal/tracker');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(600);
        await checkNoHorizontalOverflow(page, '/portal/tracker', vp);

        await page.goto('/portal/ad-budget');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(600);
        await checkNoHorizontalOverflow(page, '/portal/ad-budget', vp);
      });
    });
  }
});
