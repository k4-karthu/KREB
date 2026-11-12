import { ALL_SLIP_FIXTURES } from '../src/ui/components/receipt/fixtures';
import {
  createInitialSimState,
  MAX_PRINT_DURATION_MS,
  simReducer,
} from '../src/ui/components/receipt/receipt-sim';

const FORBIDDEN_GROCERY_WORDS = [
  'grocery',
  'groceries',
  'supermarket',
  'basket',
  'aisle',
  'produce',
  'milk',
  'bread',
  'eggs',
  'apples',
  'bananas',
  'cashier',
  'shopping',
  'trolley',
  'wishlist',
  'coupon',
  'loyalty',
  'gratuity',
  'merchandise',
  'change due',
  'pro plan',
  'launch10',
];

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

function main() {
  // 1. Deterministic 300-line slip simulation
  let state = createInitialSimState({ lineCount: 300, paperHeightPx: 900, reducedMotion: false });
  state = simReducer(state, { type: 'PRINT' }, 0);
  assert(state.phase === 'feeding', `Expected phase 'feeding', got '${state.phase}'`);

  let ticks = 0;
  let now = 0;
  while (state.phase === 'feeding' || state.phase === 'shaking') {
    now += 16;
    state = simReducer(state, { type: 'TICK', dtMs: 16 }, now);
    ticks++;
    assert(ticks < 500, 'Simulation exceeded 500 ticks without reaching ready');
  }

  assert(state.phase === 'ready', `Expected phase 'ready', got '${state.phase}'`);
  assert(
    state.totalPrintMs <= MAX_PRINT_DURATION_MS,
    `Total print duration ${state.totalPrintMs}ms exceeded ${MAX_PRINT_DURATION_MS}ms cap`,
  );

  // 2. TEAR transition -> 'torn'
  state = simReducer(state, { type: 'TEAR' }, now);
  assert(state.phase === 'tearing', `Expected phase 'tearing', got '${state.phase}'`);

  let tearTicks = 0;
  while (state.phase === 'tearing') {
    now += 16;
    state = simReducer(state, { type: 'TICK', dtMs: 16 }, now);
    tearTicks++;
    assert(tearTicks < 100, 'Tear animation exceeded 100 ticks');
  }

  assert(state.phase === 'torn', `Expected phase 'torn', got '${state.phase}'`);
  assert(state.tornAt !== null, 'Expected tornAt timestamp to be set');

  // 3. Zero grocery words in all fixtures
  const fixtureEntries = Object.entries(ALL_SLIP_FIXTURES);
  assert(fixtureEntries.length === 9, `Expected 9 fixtures, got ${fixtureEntries.length}`);
  for (const [name, slip] of fixtureEntries) {
    const json = JSON.stringify(slip).toLowerCase();
    for (const word of FORBIDDEN_GROCERY_WORDS) {
      assert(!json.includes(word), `Fixture "${name}" contains forbidden word "${word}"`);
    }
  }

  console.log(
    `PASS: 300-line receipt sim completed in ${state.totalPrintMs}ms (<= ${MAX_PRINT_DURATION_MS}ms), reached '${state.phase}', and 9/9 fixtures are clean.`,
  );
}

main();
