import fs from 'node:fs';
import path from 'node:path';
import {
  DEFAULT_SHOWROOM_VEHICLES,
  formatRupees,
  SHOWROOM_CATEGORIES,
  ShowroomHall,
  TYRE_BASELINE_FLOOR,
  TYRE_BASELINE_PERCENT,
  VehicleCard,
} from '../src/ui/components/collection';
import { LightSweep } from '../src/ui/components/collection/LightSweep';
import { scanTextForSlop } from './slop-check';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

function main(): void {
  console.log('Running Showroom Collection Hall CI check (Part 3 §8)...');

  // 1. Verify files exist
  const files = [
    'src/ui/components/collection/LightSweep.tsx',
    'src/ui/components/collection/ShowroomHall.tsx',
    'src/ui/components/collection/index.ts',
  ];

  for (const file of files) {
    assert(fs.existsSync(file), `Expected file "${file}" to exist on disk`);
  }
  console.log('PASS: All collection files exist.');

  // 2. LightSweep verification
  const lightSweepPath = path.resolve('src/ui/components/collection/LightSweep.tsx');
  const lightSweepCode = fs.readFileSync(lightSweepPath, 'utf8');

  // The ONE allowed gradient in the app
  assert(
    lightSweepCode.includes('linear-gradient('),
    'LightSweep.tsx must contain the allowed linear-gradient shine',
  );

  // Mask on car alpha silhouette
  assert(
    lightSweepCode.includes('maskImage') && lightSweepCode.includes('WebkitMaskImage'),
    'LightSweep.tsx must support maskImage on car alpha silhouette',
  );

  // Reduced motion support
  assert(
    lightSweepCode.includes('useReducedMotionSafe') || lightSweepCode.includes('reducedMotion'),
    'LightSweep.tsx must support reduced motion',
  );

  // Slop firewall check on LightSweep
  const sweepSlopHits = scanTextForSlop(
    'src/ui/components/collection/LightSweep.tsx',
    lightSweepCode,
  );
  assert(
    sweepSlopHits.length === 0,
    `LightSweep.tsx contains ${sweepSlopHits.length} slop violation(s): ${JSON.stringify(sweepSlopHits)}`,
  );
  console.log(
    'PASS: LightSweep.tsx verified (allowed gradient, alpha mask, reduced motion, 0 slop hits).',
  );

  // 3. ShowroomHall layout rules verification
  const hallPath = path.resolve('src/ui/components/collection/ShowroomHall.tsx');
  const hallCode = fs.readFileSync(hallPath, 'utf8');

  // Gradient quarantine: No gradients in ShowroomHall (R5: only in LightSweep.tsx)
  assert(
    !hallCode.includes('linear-gradient(') && !hallCode.includes('radial-gradient('),
    'ShowroomHall.tsx must NOT contain gradients. Gradients are quarantined strictly to LightSweep.tsx per R5.',
  );

  // Desktop view (>= 1024px): Pinned stage with 74% tyre baseline floor line
  assert(
    TYRE_BASELINE_PERCENT === 74,
    `Expected TYRE_BASELINE_PERCENT to be 74, got ${TYRE_BASELINE_PERCENT}`,
  );
  assert(
    TYRE_BASELINE_FLOOR === '74%',
    `Expected TYRE_BASELINE_FLOOR to be '74%', got ${TYRE_BASELINE_FLOOR}`,
  );
  assert(
    hallCode.includes('74%') || hallCode.includes('TYRE_BASELINE_FLOOR'),
    'ShowroomHall.tsx must declare and position the 74% tyre baseline floor line',
  );
  assert(
    hallCode.includes('data-testid="stage-floor-line"'),
    'ShowroomHall.tsx must render data-testid="stage-floor-line" on the pinned stage',
  );
  assert(
    hallCode.includes('data-testid="stage-floor-plane"'),
    'ShowroomHall.tsx must render data-testid="stage-floor-plane" for the floor plane',
  );
  assert(
    hallCode.includes('lg:block') || hallCode.includes('hidden lg:block'),
    'ShowroomHall.tsx must render desktop pinned stage at >= 1024px breakpoint (lg:)',
  );

  // Category rail: EV, Luxury, SUV, Sedan, Hatchback
  const requiredCategories = ['ev', 'luxury', 'suv', 'sedan', 'hatchback'];
  const categoryIds = SHOWROOM_CATEGORIES.map((c) => c.id.toLowerCase());
  for (const cat of requiredCategories) {
    assert(
      categoryIds.includes(cat),
      `SHOWROOM_CATEGORIES must include required category "${cat}"`,
    );
  }
  assert(
    hallCode.includes('CategoryRail') || hallCode.includes('SHOWROOM_CATEGORIES'),
    'ShowroomHall.tsx must render category rail for fleet switching',
  );

  // Animated 2D spawn transition between selected cars
  assert(
    hallCode.includes('AnimatePresence') && hallCode.includes('spawn-transition'),
    'ShowroomHall.tsx must use AnimatePresence and spawn transition for selected car switching',
  );
  assert(
    hallCode.includes('initial={{ opacity: 0') || hallCode.includes('animate={{ opacity: 1'),
    'ShowroomHall.tsx must declare 2D opacity/transform spawn transitions',
  );

  // Mobile view (< 1024px): Embla carousel fallback
  assert(
    hallCode.includes('useEmblaCarousel') || hallCode.includes('embla-carousel-react'),
    'ShowroomHall.tsx must use Embla carousel for mobile fallback',
  );
  assert(
    hallCode.includes('lg:hidden') || hallCode.includes('block lg:hidden'),
    'ShowroomHall.tsx must target < 1024px viewport (lg:hidden) for mobile carousel',
  );
  assert(
    hallCode.includes('embla-viewport') || hallCode.includes('embla-container'),
    'ShowroomHall.tsx must render embla viewport/container for touch carousel',
  );

  // Zero-JS / reduced motion fallback: clean responsive grid
  assert(
    hallCode.includes('<noscript>') && hallCode.includes('showroom-noscript-grid'),
    'ShowroomHall.tsx must render zero-JS <noscript> responsive grid fallback',
  );
  assert(
    hallCode.includes('isReduced') || hallCode.includes('useReducedMotionSafe'),
    'ShowroomHall.tsx must detect and respect prefers-reduced-motion',
  );
  assert(
    hallCode.includes('showroom-grid') || hallCode.includes('grid-cols-1'),
    'ShowroomHall.tsx must render clean responsive grid for reduced-motion and noscript states',
  );

  // Vehicle cards: price/day, quick specs, and CTA button to reserve
  assert(
    hallCode.includes('/ day'),
    'ShowroomHall.tsx must display price/day on vehicle cards and stage',
  );
  assert(
    hallCode.includes('tabular-nums'),
    'ShowroomHall.tsx must render prices with tabular-nums',
  );
  assert(
    hallCode.includes('seats') && hallCode.includes('transmission'),
    'ShowroomHall.tsx must render quick specs (seats, transmission, fuel/range)',
  );
  assert(
    hallCode.includes('Reserve') &&
      !hallCode.includes('>Get Started<') &&
      !hallCode.includes('>Learn More<'),
    'ShowroomHall.tsx must provide specific "Reserve" action CTAs and zero generic CTA slop',
  );

  // Slop firewall check on ShowroomHall
  const hallSlopHits = scanTextForSlop('src/ui/components/collection/ShowroomHall.tsx', hallCode);
  assert(
    hallSlopHits.length === 0,
    `ShowroomHall.tsx contains ${hallSlopHits.length} slop violation(s): ${JSON.stringify(hallSlopHits)}`,
  );
  console.log(
    'PASS: ShowroomHall.tsx verified (74% floor line, category rail, 2D spawn, Embla, responsive grid, 0 slop hits).',
  );

  // 4. Runtime & Component Export Checks
  assert(typeof LightSweep === 'function', 'Expected LightSweep component export');
  assert(typeof ShowroomHall === 'function', 'Expected ShowroomHall component export');
  assert(typeof VehicleCard === 'function', 'Expected VehicleCard component export');
  assert(DEFAULT_SHOWROOM_VEHICLES.length >= 8, 'Expected at least 8 default showroom vehicles');

  // Test category filtering across default fleet
  for (const cat of requiredCategories) {
    const inCat = DEFAULT_SHOWROOM_VEHICLES.filter((v) => v.category.toLowerCase() === cat);
    assert(
      inCat.length >= 1,
      `Expected default fleet to contain at least 1 vehicle in category "${cat}", found ${inCat.length}`,
    );
  }

  // Test currency formatting helper
  assert(
    formatRupees(360000) === '₹3,600',
    `Expected formatRupees(360000) === '₹3,600', got '${formatRupees(360000)}'`,
  );
  assert(
    formatRupees(950000) === '₹9,500',
    `Expected formatRupees(950000) === '₹9,500', got '${formatRupees(950000)}'`,
  );
  assert(
    formatRupees(190000) === '₹1,900',
    `Expected formatRupees(190000) === '₹1,900', got '${formatRupees(190000)}'`,
  );
  console.log('PASS: Runtime logic & formatRupees tests passed.');

  console.log('\n=== ALL SHOWROOM COLLECTION HALL CHECKS PASSED ===\n');
}

main();
