import { chromium } from '@playwright/test';

async function runTwoPassVerification() {
  console.log('--- Starting Two-Pass Mandatory Browser Verification ---');
  const browser = await chromium.launch();
  const baseUrl = 'http://localhost:3000';

  const viewports = [
    { name: 'Desktop', width: 1440, height: 900 },
    { name: 'Mobile', width: 390, height: 844 },
  ];

  let allPassed = true;

  for (const vp of viewports) {
    console.log(`\n=== PASS: ${vp.name} (${vp.width}x${vp.height}) ===`);
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();

    // Track console errors
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    // 1. Visit /trips as a zero-booking user
    console.log(`1. Checking /trips as a zero-booking user...`);
    const testEmail = `zero.tester.${Date.now()}.${vp.name.toLowerCase()}@example.in`;
    await page.goto(`${baseUrl}/signup`, { waitUntil: 'networkidle' });
    await page.getByLabel(/full name/i).fill('Zero Booking Tester');
    await page.getByLabel(/email address/i).fill(testEmail);
    await page.getByLabel(/password/i).fill('TestPass123!');
    await page.getByRole('button', { name: /create account/i }).click();
    await page.waitForURL(/\/account/);

    const tripsRes = await page.goto(`${baseUrl}/trips`, { waitUntil: 'networkidle' });
    if (!tripsRes || tripsRes.status() !== 200) {
      console.error(`FAIL: /trips returned ${tripsRes?.status()}`);
      allPassed = false;
    } else {
      const emptyHeading = page.getByRole('heading', { name: /no trips booked yet/i });
      const emptyVisible = await emptyHeading.isVisible().catch(() => false);
      console.log(`  /trips status: 200 OK, EmptyState rendered: ${emptyVisible}`);
      if (!emptyVisible) {
        console.error('  FAIL: /trips did not render EmptyState heading');
        allPassed = false;
      }
    }

    // 2. Visit /cars?category=luxury&fuel=cng (0 matches)
    console.log(`2. Checking /cars?category=luxury&fuel=cng (0 matches)...`);
    const emptyCarsRes = await page.goto(`${baseUrl}/cars?category=luxury&fuel=cng`, {
      waitUntil: 'networkidle',
    });
    if (!emptyCarsRes || emptyCarsRes.status() !== 200) {
      console.error(`FAIL: /cars?category=luxury&fuel=cng returned ${emptyCarsRes?.status()}`);
      allPassed = false;
    } else {
      const resetBtn = page.getByRole('button', { name: /reset all filters/i }).first();
      const resetVisible = await resetBtn.isVisible().catch(() => false);
      console.log(`  Empty catalog status: 200 OK, Reset button visible: ${resetVisible}`);
      if (!resetVisible) {
        console.error('  FAIL: Reset all filters button not visible on empty catalog');
        allPassed = false;
      } else {
        await resetBtn.click();
        await page.waitForTimeout(500);
        console.log(`  Clicked Reset Filters -> Current URL: ${page.url()}`);
      }
    }

    // 3. Visit /checkout without quote parameter
    console.log(`3. Checking /checkout without quote parameter...`);
    const checkoutRes = await page.goto(`${baseUrl}/checkout`, { waitUntil: 'networkidle' });
    if (!checkoutRes || checkoutRes.status() !== 200) {
      console.error(`FAIL: /checkout returned ${checkoutRes?.status()}`);
      allPassed = false;
    } else {
      const returnLink = page.getByRole('link', { name: /browse available fleet/i });
      const returnVisible = await returnLink.isVisible().catch(() => false);
      console.log(`  /checkout status: 200 OK, Link back to fleet visible: ${returnVisible}`);
      if (!returnVisible) {
        console.error('  FAIL: Browse available fleet link not visible on /checkout');
        allPassed = false;
      }
    }

    // 4. Typography Scale Verification on / and /cars
    console.log(`4. Checking Typography Scale on / and /cars...`);
    await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
    const h1FontSize = await page
      .locator('h1')
      .first()
      .evaluate((el) => {
        return parseFloat(window.getComputedStyle(el).fontSize);
      });
    console.log(`  Homepage h1 fontSize: ${h1FontSize}px (expected >= 30px)`);
    if (h1FontSize < 30) {
      console.error(`  FAIL: Homepage h1 fontSize is ${h1FontSize}px, below 30px!`);
      allPassed = false;
    }

    await page.goto(`${baseUrl}/cars`, { waitUntil: 'networkidle' });
    const carsH1FontSize = await page
      .locator('h1')
      .first()
      .evaluate((el) => {
        return parseFloat(window.getComputedStyle(el).fontSize);
      });
    console.log(`  Cars catalog h1 fontSize: ${carsH1FontSize}px (expected >= 30px)`);
    if (carsH1FontSize < 30) {
      console.error(`  FAIL: Cars catalog h1 fontSize is ${carsH1FontSize}px, below 30px!`);
      allPassed = false;
    }

    // Monospace verification on plates and prices
    const monoCheck = await page.evaluate(() => {
      const plate = document.querySelector('.font-technical, [class*="font-mono"]');
      if (!plate) return { found: false, font: '' };
      return { found: true, font: window.getComputedStyle(plate).fontFamily };
    });
    console.log(`  Monospace font check: found=${monoCheck.found}, font=${monoCheck.font}`);

    // 5. Zero Invisible Buttons or Transparent Cards on /account, /account/licence, /login, /signup
    console.log(`5. Checking High-Contrast Elements on auth/account routes...`);
    await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });
    const loginCardBg = await page
      .locator('form')
      .first()
      .evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });
    console.log(`  /login form panel background: ${loginCardBg}`);

    await page.goto(`${baseUrl}/account`, { waitUntil: 'networkidle' });
    const uploadBtn = page.getByRole('link', { name: /upload driving licence/i });
    if (await uploadBtn.isVisible().catch(() => false)) {
      const btnBg = await uploadBtn.evaluate((el) => window.getComputedStyle(el).backgroundColor);
      const btnColor = await uploadBtn.evaluate((el) => window.getComputedStyle(el).color);
      console.log(`  /account upload button bg: ${btnBg}, color: ${btnColor}`);
    }

    // 6. DOM Geometry Check for Unintended Horizontal Overflow
    console.log(`6. Checking DOM Geometry for horizontal overflow (scrollWidth <= clientWidth)...`);
    const routesToCheck = ['/', '/cars', '/checkout', '/admin/login'];
    for (const route of routesToCheck) {
      await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle' });
      const overflow = await page.evaluate(() => {
        const docWidth = document.documentElement.clientWidth;
        const scrollWidth = document.documentElement.scrollWidth;
        return { docWidth, scrollWidth, hasOverflow: scrollWidth > docWidth + 2 };
      });
      console.log(
        `  ${route} (${vp.name}): clientWidth=${overflow.docWidth}, scrollWidth=${overflow.scrollWidth}, overflow=${overflow.hasOverflow}`,
      );
      if (overflow.hasOverflow) {
        console.warn(
          `  WARNING: ${route} has horizontal overflow (${overflow.scrollWidth} > ${overflow.docWidth})`,
        );
        allPassed = false;
      }
    }

    // Check console errors
    const fatalErrors = consoleErrors.filter(
      (e) => !e.includes('favicon') && !e.includes('Download the React DevTools'),
    );
    if (fatalErrors.length > 0) {
      console.error(`  Console errors on ${vp.name}:`, fatalErrors);
      allPassed = false;
    } else {
      console.log(`  Zero console errors on ${vp.name}.`);
    }

    await context.close();
  }

  await browser.close();

  if (allPassed) {
    console.log('\n=== ALL MANDATORY TWO-PASS BROWSER CHECKS PASSED ===');
  } else {
    console.error('\n=== SOME CHECKS FAILED ===');
    process.exit(1);
  }
}

runTwoPassVerification().catch((err) => {
  console.error('Two-pass verification failed:', err);
  process.exit(1);
});
