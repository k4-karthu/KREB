import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const SHOTS_DIR = 'docs/design/shots';

test.describe('Kerb end-to-end verification', () => {
  test('guest search, vehicle detail, checkout, and admin desk + screenshots & axe', async ({
    page,
  }) => {
    // 1. Home page at 1440px + axe + screenshot
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('genuinely free');
    await page.screenshot({ path: `${SHOTS_DIR}/home-1440.png`, fullPage: true });

    const homeAxe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(homeAxe.violations).toEqual([]);

    // 2. Responsive screenshots at 375px and 768px
    await page.setViewportSize({ width: 375, height: 812 });
    await page.screenshot({ path: `${SHOTS_DIR}/home-375.png`, fullPage: false });
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.screenshot({ path: `${SHOTS_DIR}/home-768.png`, fullPage: false });

    // 3. Catalog /cars at 1440px
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.getByRole('button', { name: 'Show free cars' }).click();
    await page.waitForURL(/\/cars/);
    await expect(page.getByRole('heading', { name: 'Available fleet' })).toBeVisible();
    await page.screenshot({ path: `${SHOTS_DIR}/cars-1440.png`, fullPage: false });

    // 4. Open first vehicle detail & lock quote -> checkout
    await page.locator('main a[href^="/cars/"]').first().click();
    await page.waitForURL(/\/cars\/.+/);
    await expect(page.getByText('Guaranteed trip total')).toBeVisible();
    await page.screenshot({ path: `${SHOTS_DIR}/vehicle-detail-1440.png`, fullPage: false });

    await page.getByRole('button', { name: 'Continue to checkout' }).click();
    await page.waitForURL(/\/checkout\?quote=/);
    await expect(page.getByText('Total due now')).toBeVisible();

    // 5. Complete checkout as new driver
    await page.getByRole('button', { name: 'Continue to driver details' }).click();
    await page.getByLabel('Full name (as on driving licence)').fill('Playwright Test Driver');
    const uniqueEmail = `pw.driver.${Date.now()}@example.in`;
    await page.getByLabel('Email address').fill(uniqueEmail);
    await page.getByLabel('Password (min 8 characters)').fill('TestPass2026!');
    await page.getByRole('button', { name: 'Continue' }).click();

    await expect(page.getByRole('button', { name: 'Pay & confirm booking' })).toBeVisible();
    await page.getByRole('button', { name: 'Pay & confirm booking' }).click();
    await page.waitForURL(/\/checkout\/confirmed\/KB/);
    await expect(page.getByText('Reservation recorded')).toBeVisible();
    await page.screenshot({ path: `${SHOTS_DIR}/confirmed-1440.png`, fullPage: false });
  });

  test('admin login, fleet desk, and KYC review', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/admin/login');
    await page.getByLabel('Email').fill('dev@kerb.local');
    await page.getByLabel('Password').fill('kerb-dev-pass-2026');
    await page.getByRole('button', { name: 'Sign in to operations' }).click();

    await page.waitForURL(/\/admin$/);
    await expect(page.getByRole('heading', { name: 'Today operations desk' })).toBeVisible();
    await page.screenshot({ path: `${SHOTS_DIR}/admin-today-1440.png`, fullPage: false });

    await page.goto('/admin/fleet');
    await expect(page.getByRole('heading', { name: 'Fleet inventory' })).toBeVisible();
    await page.screenshot({ path: `${SHOTS_DIR}/admin-fleet-1440.png`, fullPage: false });

    await page.goto('/admin/kyc');
    await expect(page.getByRole('heading', { name: 'Driver licence KYC queue' })).toBeVisible();
  });
});
