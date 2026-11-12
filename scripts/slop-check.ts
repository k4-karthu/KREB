import fs from 'node:fs';
import path from 'node:path';

export interface SlopViolation {
  file: string;
  line: number;
  rule: string;
  fix: string;
  snippet: string;
}

export interface SlopRule {
  id: string;
  test: RegExp | ((line: string, filePath: string) => boolean);
  fix: string;
  /** If set, rule only fires for files matching one of these patterns */
  onlyInFiles?: RegExp[];
  /** If set, rule is skipped for files matching any of these patterns */
  allowInFiles?: RegExp[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const RECEIPT_GLOB = /src[\\/]ui[\\/]components[\\/]receipt[\\/]/;
const PLATE_FILE = /Plate\.tsx$/;
const THEME_CSS = /src[\\/]ui[\\/]tokens[\\/]theme\.css$/;
const LIGHT_SWEEP_FILE = /src[\\/]ui[\\/]components[\\/]collection[\\/]LightSweep\.tsx$/;

// ─── Part 2 §15 — SLOP_RULES (23 rules) ──────────────────────────────────────

export const SLOP_RULES: SlopRule[] = [
  // 1. gradient-utility
  {
    id: 'gradient',
    test: /\b(bg-gradient-to-|bg-linear-to-|from-\w+|via-\w+|to-\w+)\b|linear-gradient\(|radial-gradient\(|conic-gradient\(/,
    fix: 'No gradients in UI. Use flat tokens from §4.5.',
    allowInFiles: [LIGHT_SWEEP_FILE],
  },

  // 2. gradient-text
  {
    id: 'gradient-text',
    test: /bg-clip-text|text-transparent|-webkit-background-clip:\s*text/,
    fix: 'No gradient text.',
  },

  // 3. violet-drift — purple/indigo/violet/fuchsia family
  {
    id: 'violet-drift',
    test: /\b(purple|violet|indigo|fuchsia|pink)-\d{2,3}\b|#(667eea|764ba2|7F5AF0|6366f1|8b5cf6|a855f7)/i,
    fix: 'Purple/violet/indigo family banned (§4.5). Use Cobalt accent tokens.',
  },

  // 4. green-surface — raw green surface classes (not semantic tokens)
  {
    id: 'green-surface',
    test: /\b(bg|text|border)-(green|emerald|teal|lime)-\d{2,3}\b/,
    fix: 'Use semantic success/success-subtle tokens instead of raw green classes (§4.5).',
  },

  // 5. raw-hex — raw hex values in JSX/TSX/CSS outside allowed files
  {
    id: 'raw-hex',
    test: /#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})\b/,
    fix: 'No raw hex in source. Reference CSS custom properties or token constants (§4.5).',
    allowInFiles: [THEME_CSS, RECEIPT_GLOB],
  },

  // 6. banned-font — forbidden font-family values
  {
    id: 'banned-font',
    test: /font-family:[^;]*\b(Inter|Roboto|Arial|Open Sans|Helvetica|Geist|Space Grotesk|Montserrat|Poppins|Archivo)(?!\s*Variable)\b/i,
    fix: 'Use Bricolage Grotesque (display) / Albert Sans (UI) (§5.3).',
    allowInFiles: [THEME_CSS, PLATE_FILE],
  },

  // 7. mono-leak — monospace font outside receipt
  {
    id: 'mono-leak',
    test: /\b(font-mono|IBM Plex Mono|Courier Prime|font-family:[^;]*monospace)\b/,
    fix: 'Mono fonts belong only in receipt components (§5.3).',
    allowInFiles: [RECEIPT_GLOB, THEME_CSS, /src[\\/]ui[\\/]tokens[\\/]type\.ts$/, PLATE_FILE],
  },

  // 8. default-radius — raw Tailwind radius utilities (use our concentric radii)
  {
    id: 'default-radius',
    test: /\brounded-(sm|md|lg|xl|2xl|3xl)\b/,
    fix: 'Use rounded-xs / rounded-s / rounded-m / rounded-l / rounded-xl by role (§4.5).',
  },

  // 9. default-shadow — raw Tailwind shadow utilities or magic RGBA box-shadows
  {
    id: 'default-shadow',
    test: /\bshadow-(sm|md|lg|xl|2xl)\b|box-shadow:\s*0\s+\d+px\s+\d+px\s+rgba\(0,\s*0,\s*0/,
    fix: 'Only shadow-e1/e2/e3, only on elevated surfaces (§4.5).',
  },

  // 10. glass — glassmorphism
  {
    id: 'glass',
    test: /\bbackdrop-blur|backdrop-filter\s*:\s*blur/,
    fix: 'No glassmorphism (§4.5).',
  },

  // 11. caps-eyebrow — tracked ALL-CAPS eyebrow labels
  {
    id: 'caps-eyebrow',
    test: /\buppercase\b[^"'`\n]*\btracking-(wide|wider|widest)\b|\btracking-(wide|wider|widest)\b[^"'`\n]*\buppercase\b/,
    fix: 'No tracked ALL-CAPS eyebrow labels (§5.3). Sentence case only.',
    allowInFiles: [PLATE_FILE],
  },

  // 12. uppercase-any — any text-transform uppercase (except Plate)
  {
    id: 'uppercase-any',
    test: /\buppercase\b|text-transform:\s*uppercase/,
    fix: 'Sentence case only. Allowlist: Plate component only.',
    allowInFiles: [PLATE_FILE],
  },

  // 13. arrow-glyph
  {
    id: 'arrow-glyph',
    test: />[ \t]*[^<>{}\n]*(→|->|&rarr;)[ \t]*</,
    fix: 'No arrow glyphs on links/buttons (§11.12).',
  },

  // 14. emoji — emoji in UI strings
  {
    id: 'emoji',
    test: /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u,
    fix: 'No emoji in UI strings (§11.12).',
  },

  // 15. middot — A · B · C meta strings
  {
    id: 'middot',
    test: /\s·\s[^<\n]*\s·\s/,
    fix: 'No A · B · C meta strings. Use separate elements or a sentence.',
  },

  // 16. banned-copy — SaaS buzzwords
  {
    id: 'banned-copy',
    test: /\b(seamless(ly)?|elevate|unlock|empower|supercharge|revolutioni[sz]e|cutting-edge|next-gen|game-changer|effortless|hassle-free|world-class|lorem ipsum|John Doe|Acme)\b/i,
    fix: 'See §11.12 banned copy list.',
  },

  // 17. generic-cta
  {
    id: 'generic-cta',
    test: />\s*(Get Started|Learn More|Submit|Click Here)\s*</i,
    fix: 'Name the exact action (§11.12).',
  },

  // 18. hover-lift — card hover lifts
  {
    id: 'hover-lift',
    test: /hover:(-translate-y|scale-10[5-9]|scale-1[1-9]\d)/,
    fix: 'No hover lift on cards (§9.2).',
  },

  // 19. scroll-reveal — whileInView / AOS / ScrollReveal
  {
    id: 'scroll-reveal',
    test: /whileInView|animate-fade-in|data-aos|ScrollReveal/,
    fix: 'No scroll-reveal on sections. Only listed motion moments (§9.2).',
  },

  // 20. bounce — bouncy spring / animate-bounce
  {
    id: 'bounce',
    test: /\banimate-bounce\b|type:\s*['"]spring['"].*bounce|bounce:\s*[1-9]/,
    fix: 'No bounce animations. Use SPRING tokens from motion.ts (§9.2).',
  },

  // 21. arbitrary — arbitrary Tailwind values
  {
    id: 'arbitrary',
    test: /\b(w|h|p|m|gap|text|rounded|top|left|right|bottom)-\[[^\]]+\]/,
    fix: 'No arbitrary Tailwind values; add a token via ADR (§4.5).',
  },

  // 22. outline-all — outline / ring on every element indiscriminately
  {
    id: 'outline-all',
    test: /\*\s*\{[^}]*(?:outline|ring)/,
    fix: 'Do not reset focus outlines globally. Keep :focus-visible ring (§4.5).',
  },

  // 23. img-no-alt
  {
    id: 'img-no-alt',
    test: /<img(?![^>]*\balt=)[^>]*>/,
    fix: 'Every image has meaningful alt text.',
  },

  // 24. dev-badge — Next.js dev badge / dev indicators left in
  {
    id: 'dev-badge',
    test: /devIndicators\s*:\s*true|__NEXT_DATA__|__nextjs_original-stack-trace/,
    fix: 'Remove dev-only indicators and noise before launch (§4.5).',
  },

  // 25. default-title
  {
    id: 'default-title',
    test: /<title>(Create Next App|Document|React App)<\/title>/,
    fix: 'Real page titles required.',
  },
];

// ─── Part 3 §11 — RECEIPT_RULES (5 rules) ────────────────────────────────────

export const RECEIPT_RULES: SlopRule[] = [
  // R1. grocery-words — grocery/shopping words in receipt components
  {
    id: 'grocery-words',
    test: /\b(cart|shopping|checkout|trolley|basket|item added|add to cart|wishlist|coupon code|promo code|discount code)\b/i,
    fix: 'No grocery/shopping words in receipt (§Part3 §11). Use booking/rental domain language.',
    onlyInFiles: [RECEIPT_GLOB],
  },

  // R2. mono-outside-receipt — mono font used outside receipt
  {
    id: 'mono-outside-receipt',
    test: /\b(font-mono|IBM Plex Mono|Courier Prime)\b/,
    fix: 'Mono fonts allowed only in src/ui/components/receipt/** (§Part3 §11).',
    allowInFiles: [RECEIPT_GLOB, THEME_CSS, /src[\\/]ui[\\/]tokens[\\/]type\.ts$/, PLATE_FILE],
  },

  // R3. receipt-colour — coloured backgrounds inside receipt (should be monochrome)
  {
    id: 'receipt-colour',
    test: /\b(bg|text|border)-(accent|success|warning|danger|canvas|surface)([-\w]*)?(?!-subtle)\b/,
    fix: 'Receipt must be monochrome: only #FBFBF9 / #14161A tones. No semantic colour tokens.',
    onlyInFiles: [RECEIPT_GLOB],
  },

  // R4. receipt-colour-ink — non-ink colours inside receipt
  {
    id: 'receipt-colour-ink',
    test: /color:\s*(#(?!FBFBF9|14161A|fbfbf9|14161a)[0-9A-Fa-f]{6}|var\(--(accent|success|warning|danger))/,
    fix: 'Receipt ink must be #14161A or #FBFBF9 only (§Part3 §11).',
    onlyInFiles: [RECEIPT_GLOB],
  },

  // R5. sweep-gradient — gradient sweep allowed ONLY in LightSweep.tsx
  {
    id: 'sweep-gradient',
    test: /linear-gradient\(|radial-gradient\(/,
    fix: 'Gradient sweep only allowed in LightSweep.tsx (§Part3 §11).',
    onlyInFiles: [/src[\\/]ui[\\/]components[\\/]collection[\\/]/],
    allowInFiles: [LIGHT_SWEEP_FILE],
  },
];

// ─── Scanner ──────────────────────────────────────────────────────────────────

export function scanTextForSlop(
  filePath: string,
  content: string,
  ruleSets: SlopRule[][] = [SLOP_RULES, RECEIPT_RULES],
): SlopViolation[] {
  const violations: SlopViolation[] = [];
  const lines = content.split(/\r?\n/);
  const allRules = ruleSets.flat();

  for (let i = 0; i < lines.length; i++) {
    const lineText = lines[i] ?? '';

    for (const rule of allRules) {
      // onlyInFiles: rule fires only for matching paths
      if (rule.onlyInFiles && !rule.onlyInFiles.some((re) => re.test(filePath))) continue;
      // allowInFiles: rule is skipped for matching paths
      if (rule.allowInFiles?.some((re) => re.test(filePath))) continue;

      const matched =
        typeof rule.test === 'function'
          ? rule.test(lineText, filePath)
          : rule.test.test(lineText);

      if (matched) {
        violations.push({
          file: filePath,
          line: i + 1,
          rule: rule.id,
          fix: rule.fix,
          snippet: lineText.trim().slice(0, 120),
        });
      }
    }
  }

  // Structural: at most 1 em dash per JSX text line
  for (let i = 0; i < lines.length; i++) {
    const lineText = lines[i] ?? '';
    if (lineText.includes('—')) {
      const emDashes = lineText.match(/—/g)?.length ?? 0;
      if (emDashes > 1 && !lineText.includes('//')) {
        violations.push({
          file: filePath,
          line: i + 1,
          rule: 'em-dash-confetti',
          fix: 'At most one em dash per screen/line (§11.12).',
          snippet: lineText.trim().slice(0, 120),
        });
      }
    }
  }

  return violations;
}

// ─── File walker ──────────────────────────────────────────────────────────────

function walkFiles(dir: string, exts: Set<string>, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next') continue;
      walkFiles(full, exts, out);
    } else if (exts.has(path.extname(entry.name))) {
      out.push(full);
    }
  }
  return out;
}

// ─── Full project scan ────────────────────────────────────────────────────────

export function runSlopCheck(rootDir = process.cwd()): SlopViolation[] {
  const srcDir = path.join(rootDir, 'src');
  const files = walkFiles(srcDir, new Set(['.ts', '.tsx', '.css', '.md', '.json']));
  const all: SlopViolation[] = [];

  for (const file of files) {
    const rel = path.relative(rootDir, file).replace(/\\/g, '/');
    const content = fs.readFileSync(file, 'utf8');
    all.push(...scanTextForSlop(rel, content));
  }

  // Check package.json for banned packages
  const pkgPath = path.join(rootDir, 'package.json');
  if (fs.existsSync(pkgPath)) {
    const pkgText = fs.readFileSync(pkgPath, 'utf8');
    if (/"(tailwindcss-animate|@shadcn\/ui|aos)"/.test(pkgText)) {
      all.push({
        file: 'package.json',
        line: 1,
        rule: 'banned-package',
        fix: 'Remove banned template/animation package.',
        snippet: 'package.json',
      });
    }
  }

  return all;
}

// ─── CLI entry ────────────────────────────────────────────────────────────────

const isMain = process.argv[1]?.endsWith('slop-check.ts');
if (isMain) {
  const violations = runSlopCheck();
  if (violations.length > 0) {
    console.error(`Slop check failed with ${violations.length} violation(s):`);
    for (const v of violations) {
      console.error(`  ${v.file}:${v.line} [${v.rule}] ${v.fix}\n    ${v.snippet}`);
    }
    process.exit(1);
  }
  console.log('Slop check passed: 0 violations.');
}
