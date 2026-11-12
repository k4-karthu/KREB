import { describe, expect, it } from 'vitest';
import { RECEIPT_RULES, SLOP_RULES, scanTextForSlop } from '../scripts/slop-check';

describe('slop-check firewall v3 (§Part2 §15 + §Part3 §11)', () => {
  it('catches all 23 v3 Part 2 §15 rules on dirty samples', () => {
    const dirtySamples: Array<[string, string]> = [
      ['gradient', '<div className="bg-gradient-to-r from-blue-500 to-sky-400" />'],
      ['gradient-text', '<h1 className="bg-clip-text text-transparent">Title</h1>'],
      ['violet-drift', '<button className="bg-indigo-600">Go</button>'],
      ['green-surface', '<div className="bg-green-100 text-emerald-700" />'],
      ['banned-font', 'body { font-family: Inter, sans-serif; }'],
      ['default-radius', '<div className="rounded-2xl" />'],
      ['default-shadow', '<div className="shadow-md" />'],
      ['glass', '<header className="backdrop-blur-md" />'],
      ['caps-eyebrow', '<span className="uppercase tracking-widest">Fleet</span>'],
      ['uppercase-any', '<span className="uppercase">Tag</span>'],
      ['arrow-glyph', '<a href="/cars">See cars →</a>'],
      ['emoji', '<span>🚗 Book now</span>'],
      ['middot', '<p>Petrol · Automatic · 5 seats</p>'],
      ['banned-copy', '<p>Seamless effortless next-gen rental.</p>'],
      ['generic-cta', '<button>Get Started</button>'],
      ['hover-lift', '<div className="hover:-translate-y-1" />'],
      ['scroll-reveal', '<motion.div whileInView={{ opacity: 1 }} />'],
      ['bounce', '<div className="animate-bounce" />'],
      ['arbitrary', '<div className="w-[347px]" />'],
      ['img-no-alt', '<img src="/car.jpg" />'],
      ['default-title', '<title>Create Next App</title>'],
    ];

    for (const [ruleId, sample] of dirtySamples) {
      const hits = scanTextForSlop('src/app/sample.tsx', sample);
      expect(
        hits.some((h) => h.rule === ruleId),
        `Expected rule "${ruleId}" to trigger on: ${sample}`,
      ).toBe(true);
    }
  });

  it('raw-hex catches hex in src files but allows theme.css', () => {
    const hexSample = 'const color = "#2250F4";';
    const hitsInSrc = scanTextForSlop('src/app/page.tsx', hexSample);
    expect(hitsInSrc.some((h) => h.rule === 'raw-hex')).toBe(true);

    const hitsInTheme = scanTextForSlop('src/ui/tokens/theme.css', hexSample);
    expect(hitsInTheme.some((h) => h.rule === 'raw-hex')).toBe(false);
  });

  it('mono-leak catches mono font outside receipt but allows in token files', () => {
    const monoSample = 'className="font-mono"';
    const hitsInPage = scanTextForSlop('src/app/page.tsx', monoSample);
    expect(hitsInPage.some((h) => h.rule === 'mono-leak')).toBe(true);

    const hitsInReceipt = scanTextForSlop('src/ui/components/receipt/Slip.tsx', monoSample);
    expect(hitsInReceipt.some((h) => h.rule === 'mono-leak')).toBe(false);
  });

  it('catches Part 3 §11 RECEIPT_RULES on dirty receipt samples', () => {
    const receiptDirty: Array<[string, string]> = [
      ['grocery-words', '<p>Add to cart</p>'],
      ['receipt-colour', '<div className="bg-accent text-success" />'],
    ];

    for (const [ruleId, sample] of receiptDirty) {
      const hits = scanTextForSlop('src/ui/components/receipt/Slip.tsx', sample);
      expect(
        hits.some((h) => h.rule === ruleId),
        `Expected receipt rule "${ruleId}" to trigger`,
      ).toBe(true);
    }
  });

  it('grocery-words only fires inside receipt path, not in app pages', () => {
    const sample = '<p>Add to cart</p>';
    const hitsInApp = scanTextForSlop('src/app/page.tsx', sample);
    expect(hitsInApp.some((h) => h.rule === 'grocery-words')).toBe(false);
  });

  it('passes clean Kerb-compliant code', () => {
    const clean = `
      export function SampleCard() {
        return (
          <article className="bg-surface border border-line rounded-m p-6">
            <img src="/cars/swift-640.webp" alt="Maruti Suzuki Swift ZXi+ in Pearl White" />
            <h2>Maruti Suzuki Swift ZXi+</h2>
            <p>5 seats, automatic, petrol</p>
            <button className="bg-accent text-on-accent rounded-s px-4 py-3">Show cars</button>
          </article>
        );
      }
    `;
    expect(scanTextForSlop('src/ui/components/SampleCard.tsx', clean)).toEqual([]);
  });

  it('allows uppercase in Plate component', () => {
    const plate = `<span className="uppercase rounded-s border border-line">KA 03 MN 4821</span>`;
    expect(scanTextForSlop('src/ui/primitives/Plate.tsx', plate)).toEqual([]);
  });

  it('SLOP_RULES has at least 24 rules (23 Part2 + 1 structural)', () => {
    expect(SLOP_RULES.length).toBeGreaterThanOrEqual(24);
  });

  it('RECEIPT_RULES has at least 5 rules (Part 3 §11)', () => {
    expect(RECEIPT_RULES.length).toBeGreaterThanOrEqual(5);
  });
});
