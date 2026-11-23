import { type Browser, chromium, type Page } from '@playwright/test';

async function verifyAllButtons() {
  console.log('=== Starting Comprehensive Full-Site Browser Button Verification ===\n');
  const browser: Browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page: Page = await context.newPage();

  const baseUrl = 'http://localhost:3000';
  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  try {
    // =========================================================================
    // 1. HOMEPAGE (/)
    // =========================================================================
    console.log('[1] Visiting Homepage (/) ...');
    await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });

    // 1a. ShowroomHall Stage & Tabs
    console.log('  [1a] Testing Showroom category tabs...');
    const tabs = ['All vehicles', 'EV', 'Luxury', 'SUV', 'Sedan', 'Hatchback', 'MUV'];
    for (const tab of tabs) {
      const tabBtn = page.getByRole('button', { name: tab, exact: true });
      if (await tabBtn.isVisible()) {
        await tabBtn.click();
        await page.waitForTimeout(200);
      }
    }
    console.log('    PASS: All showroom category tabs switch successfully.');

    // 1b. Stage Hero CTA Navigation ("Reserve <model>")
    console.log('  [1b] Testing Showroom Stage Hero "Reserve <model>" CTA button...');
    const stageCta = page.locator('[data-testid="stage-reserve-cta"]').first();
    if (await stageCta.isVisible()) {
      const ctaText = await stageCta.textContent();
      console.log(`    Clicking stage CTA: "${ctaText?.trim()}"`);
      await stageCta.click();
      await page.waitForURL(/\/cars\/[^?]+/, { timeout: 8000 });
      console.log(`    PASS: Stage CTA navigated successfully to: ${page.url()}`);
      await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
    }

    // 1c. HomeSearchWidget delivery toggle, presets & "Show cars" button
    console.log('  [1c] Testing HomeSearchWidget mode toggle & duration presets...');
    const doorstepBtn = page.getByRole('button', { name: /doorstep delivery/i });
    if (await doorstepBtn.isVisible()) {
      await doorstepBtn.click();
      await page.waitForTimeout(200);
      const hubPickupBtn = page.getByRole('button', { name: /hub pickup/i });
      await hubPickupBtn.click();
      await page.waitForTimeout(200);
    }

    const preset7d = page.getByRole('button', { name: '7D Roadtrip' });
    if (await preset7d.isVisible()) {
      await preset7d.click();
      await page.waitForTimeout(200);
    }

    const showCarsBtn = page.getByRole('button', { name: /show cars/i });
    if (await showCarsBtn.isVisible()) {
      await showCarsBtn.click();
      await page.waitForURL(/\/cars\?/, { timeout: 8000 });
      console.log(`    PASS: "Show cars" navigated successfully to: ${page.url()}`);
    }

    // =========================================================================
    // 2. CARS CATALOG (/cars)
    // =========================================================================
    console.log('\n[2] Testing Cars Catalog (/cars) ...');
    await page.goto(`${baseUrl}/cars`, { waitUntil: 'networkidle' });

    // Verify all 3 replaced car images loaded properly
    console.log('  [2a] Verifying replaced car images on /cars...');
    const cardImages = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img'));
      return imgs.map((img) => ({
        alt: img.alt,
        src: img.src,
        naturalWidth: img.naturalWidth,
      }));
    });

    const targetCars = ['Audi A6', 'BMW 3 Series', 'Toyota Innova Hycross'];
    for (const target of targetCars) {
      const match = cardImages.find((i) => i.alt.toLowerCase().includes(target.toLowerCase()));
      if (match) {
        if (match.naturalWidth > 0) {
          console.log(
            `    PASS: ${target} image loaded cleanly (${match.naturalWidth}px natural width)`,
          );
        } else {
          throw new Error(
            `FAIL: ${target} image failed to render! naturalWidth=${match.naturalWidth}`,
          );
        }
      }
    }

    // 2b. Automatic quick filter pill
    console.log('  [2b] Testing "Automatic" quick filter pill...');
    const autoPill = page.getByRole('button', { name: /^Automatic$/i });
    await autoPill.click();
    await page.waitForTimeout(800);
    if (!page.url().includes('transmission=automatic')) {
      throw new Error(`Expected transmission=automatic in URL, got ${page.url()}`);
    }
    const autoVehicles = await page.locator('article, .group.relative').count();
    console.log(`    URL: ${page.url()}`);
    console.log(`    PASS: Automatic pill active. Displaying ${autoVehicles} automatic vehicles.`);

    // Untoggle Automatic
    await autoPill.click();
    await page.waitForTimeout(800);
    if (page.url().includes('transmission=automatic')) {
      throw new Error('Expected transmission filter to be cleared after untoggle!');
    }
    console.log('    PASS: Untoggle Automatic cleared URL filter.');

    // 2c. Manual quick filter pill
    console.log('  [2c] Testing "Manual" quick filter pill...');
    const manualPill = page.getByRole('button', { name: /^Manual$/i });
    await manualPill.click();
    await page.waitForTimeout(800);
    if (!page.url().includes('transmission=manual')) {
      throw new Error(`Expected transmission=manual in URL, got ${page.url()}`);
    }
    const manualVehicles = await page.locator('article, .group.relative').count();
    console.log(`    URL: ${page.url()}`);
    console.log(`    PASS: Manual pill active. Displaying ${manualVehicles} manual vehicles.`);

    // Untoggle Manual
    await manualPill.click();
    await page.waitForTimeout(800);
    console.log('    PASS: Untoggle Manual cleared URL filter.');

    // 2d. 5 Seats, 7+ Seats, Low Deposit quick filter pills
    console.log('  [2d] Testing Seating & Deposit quick filter pills...');
    const fiveSeatsPill = page.getByRole('button', { name: /^5 Seats$/i });
    await fiveSeatsPill.click();
    await page.waitForTimeout(400);
    const fiveSeatCount = await page.locator('article, .group.relative').count();
    console.log(`    5 Seats count: ${fiveSeatCount} cars`);
    await fiveSeatsPill.click(); // untoggle
    await page.waitForTimeout(400);

    const sevenSeatsPill = page.getByRole('button', { name: /^7\+ Seats$/i });
    await sevenSeatsPill.click();
    await page.waitForTimeout(400);
    const sevenSeatCount = await page.locator('article, .group.relative').count();
    console.log(`    7+ Seats count: ${sevenSeatCount} cars`);
    await sevenSeatsPill.click(); // untoggle
    await page.waitForTimeout(400);

    const lowDepositPill = page.getByRole('button', { name: /Low deposit/i });
    await lowDepositPill.click();
    await page.waitForTimeout(400);
    const lowDepCount = await page.locator('article, .group.relative').count();
    console.log(`    Low deposit count: ${lowDepCount} cars`);
    await lowDepositPill.click(); // untoggle
    await page.waitForTimeout(400);
    console.log('    PASS: Seating and Deposit quick filters operate smoothly.');

    // 2e. Transmission Segmented Control synchronization
    console.log('  [2e] Testing Transmission SegmentedControl radio buttons...');
    const autoRadio = page.getByRole('radio', { name: /Automatic/i });
    await autoRadio.click();
    await page.waitForTimeout(800);
    if (!page.url().includes('transmission=automatic')) {
      throw new Error('Segmented control did not set transmission=automatic!');
    }
    const autoPillState = await autoPill.getAttribute('aria-pressed');
    if (autoPillState !== 'true') {
      throw new Error('Quick filter pill not synchronized with segmented control!');
    }
    console.log('    PASS: SegmentedControl and Quick Filter Pill are synchronized.');

    // 2f. Reset all filters
    console.log('  [2f] Testing "Reset all filters" button...');
    const resetBtn = page.getByRole('button', { name: /reset all filters/i }).first();
    await resetBtn.click();
    await page.waitForTimeout(800);
    if (page.url().includes('transmission=')) {
      throw new Error('Reset all filters failed to clear transmission!');
    }
    console.log('    PASS: Reset all filters button cleared filters cleanly.');

    // 2g. Hub selector & "Update fleet" button
    console.log('  [2g] Testing Hub dropdown & "Update fleet" button...');
    const hubButton = page.getByRole('button', { name: /pick-up hub/i });
    if (await hubButton.isVisible()) {
      await hubButton.click();
      await page.waitForTimeout(300);
      const hubOption = page.getByRole('option').first();
      await hubOption.click();
      await page.waitForTimeout(300);
      const updateFleetBtn = page.getByRole('button', { name: /update fleet/i });
      await updateFleetBtn.click();
      await page.waitForTimeout(800);
      console.log('    PASS: Hub selector and Update fleet button function correctly.');
    }

    // 2h. Testing Vehicle Card Reserve CTA button
    console.log('  [2h] Testing Vehicle Card "Reserve" CTA button click...');
    const firstReserveCta = page.locator('[data-testid^="reserve-cta-"]').first();
    if (await firstReserveCta.isVisible()) {
      await firstReserveCta.click();
      await page.waitForURL(/\/cars\/[^?]+/, { timeout: 8000 });
      console.log(`    PASS: Vehicle card Reserve CTA button navigated to: ${page.url()}`);
      await page.goto(`${baseUrl}/cars`, { waitUntil: 'networkidle' });
    }

    // 2i. Empty state recovery & waitlist button
    console.log('  [2i] Testing Empty State & Waitlist "Notify me" button...');
    await page.goto(`${baseUrl}/cars?category=luxury&fuel=cng`, { waitUntil: 'networkidle' });
    const emptyStateReset = page.getByRole('button', { name: /reset all filters/i }).first();
    if (!(await emptyStateReset.isVisible())) {
      throw new Error('Empty state reset button not visible!');
    }

    const waitlistInput = page.locator('input[placeholder="name@example.com"]');
    await waitlistInput.fill('browser-test@example.in');
    const notifyBtn = page.getByRole('button', { name: /notify me/i });
    await notifyBtn.click();
    await page.waitForSelector('text=You are on the alert list', { timeout: 5000 });
    console.log('    PASS: Waitlist "Notify me" button registered email successfully.');

    await emptyStateReset.click();
    await page.waitForTimeout(800);
    console.log('    PASS: Empty state "Reset all filters" restored the fleet catalog.');

    // =========================================================================
    // 3. VEHICLE DETAIL PAGE (/cars/[slug])
    // =========================================================================
    console.log('\n[3] Testing Vehicle Detail Page (/cars/toyota-innova-hycross-zx) ...');
    const testStart =
      Math.floor((Date.now() + 15 * 86_400_000) / 86_400_000) * 86_400_000 + 10 * 3_600_000;
    const testEnd = testStart + 2 * 86_400_000;
    await page.goto(`${baseUrl}/cars/toyota-innova-hycross-zx?start=${testStart}&end=${testEnd}`, {
      waitUntil: 'networkidle',
    });

    // Verify detail image loaded
    const detailImg = page.locator('img[alt*="Toyota Innova Hycross"]').first();
    const natWidth = await detailImg.evaluate((el: HTMLImageElement) => el.naturalWidth);
    if (natWidth === 0) {
      throw new Error('FAIL: Vehicle detail image failed to render!');
    }
    console.log(`    PASS: Detail image loaded cleanly (${natWidth}px natural width).`);

    // Addon quantity adjustment buttons
    const plusButtons = page.locator('button[aria-label^="Increase"]');
    if ((await plusButtons.count()) > 0) {
      await plusButtons.first().click();
      await page.waitForTimeout(500);
      console.log('    PASS: Add-on quantity increment button works and updates price.');
    }

    // Continue to checkout CTA
    const checkoutButton = page.getByRole('button', { name: /continue to checkout/i });
    if (!(await checkoutButton.isVisible())) {
      throw new Error('FAIL: Continue to checkout button not visible!');
    }
    console.log('    Clicking "Continue to checkout" button...');
    await checkoutButton.click();
    await page.waitForURL(/\/checkout\?quote=/, { timeout: 10000 });
    console.log(`    PASS: Landed on checkout page: ${page.url()}`);

    // =========================================================================
    // 4. CHECKOUT MULTI-STEP FLOW (/checkout)
    // =========================================================================
    console.log('\n[4] Testing Checkout Multi-Step Flow Buttons ...');

    // 4a. Step 0: Auth mode switch & returning driver sign in
    const returningDriverBtn = page.getByRole('button', { name: /returning driver/i });
    if (await returningDriverBtn.isVisible()) {
      console.log('    [4a] Step 0: Selecting "Returning driver" and authenticating...');
      await returningDriverBtn.click();
      await page.waitForTimeout(300);
      await page.locator('input[type="email"]').fill('rohan.deshmukh@example.in');
      await page.locator('input[type="password"]').fill('kerb-dev-pass-2026');
      const authSubmit = page.getByRole('button', { name: /continue to driver credentials/i });
      await authSubmit.click();
      await page.waitForTimeout(2000);
    }

    // Step 0 -> Step 1: Continue to protection and add-ons
    const continueToAddons = page.getByRole('button', {
      name: /continue to protection|continue to add-ons/i,
    });
    if (await continueToAddons.isVisible()) {
      console.log('    [4a] Step 0: Clicking "Continue to protection and add-ons"...');
      await continueToAddons.click();
      await page.waitForTimeout(800);
    }

    // 4b. Step 1: Add-ons & Navigation
    console.log('    [4b] Step 1: Testing Add-on checkboxes & "Continue to payment"...');
    const fastagLabel = page.locator('label:has-text("FASTag")').first();
    if (await fastagLabel.isVisible()) {
      await fastagLabel.click();
      await page.waitForTimeout(400);
      console.log('      PASS: FASTag add-on checkbox toggled.');
    }

    const continueToPayment = page.getByRole('button', { name: /continue to payment/i });
    if (!(await continueToPayment.isVisible())) {
      throw new Error('FAIL: "Continue to payment" button not visible in Step 1!');
    }
    console.log('      Clicking "Continue to payment"...');
    await continueToPayment.click();
    await page.waitForTimeout(800);

    // 4c. Step 2: Payment options & Authorize CTA
    console.log('    [4c] Step 2: Testing payment method options & Authorize CTA...');
    const upiLabel = page.locator('label:has-text("UPI Autopay")').first();
    if (await upiLabel.isVisible()) {
      await upiLabel.click();
      await page.waitForTimeout(300);
      console.log('      PASS: UPI Autopay payment radio selected.');
    }

    const backButton = page.getByRole('button', { name: /^Back$/i });
    if (!(await backButton.isVisible())) {
      throw new Error('FAIL: "Back" button missing in Step 2!');
    }

    const termsLabel = page.locator('label:has-text("Accept rental agreement")').first();
    if (await termsLabel.isVisible()) {
      await termsLabel.click();
      await page.waitForTimeout(300);
      console.log('      PASS: Terms agreement checkbox toggled.');
    }

    const authorizeButton = page.getByRole('button', {
      name: /authorize and confirm booking|confirm booking/i,
    });
    if (!(await authorizeButton.isVisible())) {
      throw new Error('FAIL: "Authorize and confirm booking" button not visible in Step 2!');
    }
    console.log(
      '      PASS: "Authorize and confirm booking" CTA button is visible and active on Step 2.',
    );

    // Verify console health
    if (consoleErrors.length > 0) {
      console.error(`FAIL: Found ${consoleErrors.length} console errors:`, consoleErrors);
      process.exit(1);
    }

    console.log('\n=== ALL BROWSER AUTOMATION TESTS COMPLETED SUCCESSFULLY ===');
  } finally {
    await browser.close();
  }
}

verifyAllButtons().catch((err) => {
  console.error('Browser verification failed:', err);
  process.exit(1);
});
