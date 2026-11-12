import { expect, test } from '@playwright/test';

test.describe('Dataset, images, receipts, and lifecycle views', () => {
  test('catalog shows diverse categories, CNG filter, and sibling variant links', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/cars');
    await expect(page.getByRole('heading', { name: 'Available fleet' })).toBeVisible();

    // Verify all rendered car images actually loaded (naturalWidth > 0)
    const images = page.locator('main img');
    const imgCount = await images.count();
    expect(imgCount).toBeGreaterThan(0);
    for (let i = 0; i < imgCount; i++) {
      const img = images.nth(i);
      const naturalWidth = await img.evaluate((el: HTMLImageElement) => el.naturalWidth);
      expect(naturalWidth, `Image ${i} failed to load`).toBeGreaterThan(0);
    }

    // Filter by petrol on default window
    await page.goto('/cars?fuel=petrol');
    await expect(page.getByText('Volkswagen Virtus').first()).toBeVisible();

    // Filter by CNG on open window
    await page.goto('/cars?start=1795200000000&end=1795372800000&fuel=cng');
    await expect(page.getByText('Tata Punch').first()).toBeVisible();

    // Visit a vehicle with sibling variants (Mahindra Thar AT -> MT)
    await page.goto('/cars/mahindra-thar-4x4-at');
    await expect(page.getByText('Available trims')).toBeVisible();
    await page.getByRole('link', { name: /LX 4x4 Petrol MT/i }).click();
    await page.waitForURL(/\/cars\/mahindra-thar-4x4-mt/);
    await expect(page.getByRole('heading', { name: /Mahindra Thar/i, level: 1 })).toBeVisible();
  });

  test('customer trips and itemized tax receipt render all lifecycle states', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/login');
    await page.getByLabel('Email').fill('dev@kerb.local');
    await page.getByLabel('Password').fill('kerb-dev-pass-2026');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL((url) => !url.pathname.startsWith('/login'));

    await page.goto('/trips');
    await expect(page.getByRole('heading', { name: 'My trips' })).toBeVisible();
    await expect(page.getByText('KRB-1009')).toBeVisible();
    await expect(page.getByText(/On route/i).first()).toBeVisible();
    await expect(page.getByText(/Requested/i).first()).toBeVisible();

    // Verify trip card thumbnails loaded
    const tripImgs = page.locator('main img');
    const tripImgCount = await tripImgs.count();
    expect(tripImgCount).toBeGreaterThan(0);
    for (let i = 0; i < tripImgCount; i++) {
      const naturalWidth = await tripImgs
        .nth(i)
        .evaluate((el: HTMLImageElement) => el.naturalWidth);
      expect(naturalWidth, `Trip image ${i} failed to load`).toBeGreaterThan(0);
    }

    // Open active on-route receipt
    await page.goto('/trips/KRB-1009');
    await expect(page.getByText('Itemized breakdown')).toBeVisible();
    await expect(page.getByText('Payment & deposit transaction ledger')).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Print \/ export thermal receipt/i }).first(),
    ).toBeVisible();
    await expect(page.getByText('GST (18%)').first()).toBeVisible();

    // Open requested (pending_approval) booking summary
    await page.goto('/trips/KRB-1017');
    await expect(page.getByText(/Requested/i).first()).toBeVisible();
    await expect(page.getByText('Itemized breakdown')).toBeVisible();
  });

  test('admin operations desk and bookings lifecycle filters work', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/admin/login');
    await page.getByLabel(/Email/i).fill('dev@kerb.local');
    await page.getByLabel('Password').fill('kerb-dev-pass-2026');
    await page.getByRole('button', { name: /Sign in to operations/i }).click();
    await page.waitForURL(/\/admin$/);

    // Today operations desk shows Active on Route (Checked Out)
    await expect(page.getByRole('heading', { name: /Active on Route/i })).toBeVisible();
    await expect(page.getByText(/active/i).first()).toBeVisible();

    // Bookings desk lifecycle tabs
    await page.goto('/admin/bookings');
    await expect(page.getByRole('heading', { name: 'Bookings Desk' })).toBeVisible();
    await page.getByRole('button', { name: /On Route/i }).click();
    await expect(page.locator('tbody tr').first()).toBeVisible();

    await page.getByRole('button', { name: /Requested/i }).click();
    await expect(page.locator('tbody tr').first()).toBeVisible();
  });
});
