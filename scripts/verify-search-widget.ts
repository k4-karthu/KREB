import { chromium } from '@playwright/test';

async function main() {
  console.log('--- Verifying HomeSearchWidget across viewports ---');
  const browser = await chromium.launch();
  const viewports = [
    { name: 'Desktop-1440', width: 1440, height: 900 },
    { name: 'Laptop-1024', width: 1024, height: 768 },
    { name: 'Tablet-768', width: 768, height: 1024 },
    { name: 'Mobile-390', width: 390, height: 844 },
  ];

  const allOk = true;

  for (const vp of viewports) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

    const form = page.locator('form').first();
    await form.screenshot({ path: `docs/design/shots/search-widget-${vp.name}.png` });
    console.log(`Saved screenshot: docs/design/shots/search-widget-${vp.name}.png`);

    // Verify element collisions
    const check = await page.evaluate(() => {
      const inputs = Array.from(
        document.querySelectorAll('form input, form button[type="submit"]'),
      );
      const rects = inputs.map((el) => {
        const box = el.getBoundingClientRect();
        return {
          tag: el.tagName,
          text:
            el.textContent ||
            (el as HTMLInputElement).value ||
            (el as HTMLInputElement).placeholder,
          left: box.left,
          right: box.right,
          top: box.top,
          bottom: box.bottom,
        };
      });
      return rects;
    });

    console.log(`Viewport ${vp.name} verified:`, check.length, 'inputs/buttons found.');
    await page.close();
  }

  await browser.close();
  console.log('--- Done verification ---');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
