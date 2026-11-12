# Receipt Printer — P0 Port Audit

- **Source repository**: `https://github.com/aqkprogrammer/receipt-printer`
- **Local scratch clone**: `vendor-ref/receipt-printer/` (git-ignored)
- **Audited commit**: `6c608d7cf234c0227fde4561cc63e95293fdba4a` (`Wed Oct 7 23:26:17 2026 +0530`, `"Add MIT license"`)
- **Author / Copyright**: Abdul Qadir Khan (`37568283+aqkprogrammer@users.noreply.github.com`)
- **Licence**: **MIT License** (permissive)

## Verdict

**PORT (with domain re-implementation of data model and copy).**

The source repository is MIT-licensed with zero runtime dependencies. We will port the thermal paper feed mechanics, damped sway settle, `conic-gradient` zigzag torn-edge CSS masks, seeded LCG barcode generator, drag-to-tear interaction, and optional WebAudio synthesiser into React + TypeScript + Motion (`src/ui/components/receipt/`), while replacing the SaaS checkout/card form and all currency/copy with Kerb's car-rental `SlipData` contract (`quote` | `booking` | `handover_out` | `handover_in` | `invoice`) in INR (`paise` minor units).

Attribution notice to preserve in `src/ui/components/receipt/` header comment:
`Thermal receipt paper feed, torn-edge mask, and WebAudio mechanics adapted from aqkprogrammer/receipt-printer (MIT License, Copyright (c) 2026 Abdul Qadir Khan).`

---

## 1. File Inventory (`vendor-ref/receipt-printer/`)

| File | Lines | Purpose |
| --- | --- | --- |
| `LICENSE` | 21 | MIT License, Copyright (c) 2026 Abdul Qadir Khan |
| `README.md` | 166 | Architecture notes, animation math, tweaking knobs |
| `index.html` | 229 | Terminal shell, 3-step SaaS checkout (`plan`, `pay`, `done`), `.slot`, `.paper`, `.receipt`, `.controls` |
| `styles.css` | 795 | Dark terminal UI, 3D card tilt/flip, authorisation seal, `.slot` mouth + thermal head, `.paper` / `.receipt` stock, `conic-gradient` zigzag masks, barcode, `@media (prefers-reduced-motion: reduce)` |
| `script.js` | 809 | Pricing state, odometer tween, 3D card form + Luhn validation, async checklist, `renderReceipt()`, `drawBarcode()`, `feed()`, `settle()`, pointer drag-to-tear, WebAudio synthesiser |
| `.claude/launch.json` | — | Local preview server config (not ported) |

## 2. Dependency Inventory

- **Runtime dependencies**: None (zero npm packages, zero build step).
- **Browser APIs used**:
  - `requestAnimationFrame` / `performance.now()` (feed, settle, money tween)
  - `PointerEvent` (`pointerdown`, `pointermove`, `pointerup`, `pointercancel`, `setPointerCapture`)
  - `WebAudio` (`AudioContext`, `OscillatorNode`, `BiquadFilterNode`, `GainNode`, `AudioBufferSourceNode`)
  - `Intl.DateTimeFormat` (`en-GB` in reference; Kerb uses `en-IN` / IST)
  - `matchMedia('(prefers-reduced-motion: reduce)')`
  - CSS `mask` / `-webkit-mask` with `conic-gradient` and `filter: drop-shadow()`
- **Kerb target dependencies**: Uses existing `react`, `motion`, `lucide-react`, and `src/domain/shared/money.ts` (`formatMoney`). No new packages required.

## 3. Simulation & Physics Inventory

| Mechanism | Reference Parameters | Port Notes |
| --- | --- | --- |
| **Stepper paper feed** | `FEED_MS = 2600`, `STEP_PX = 3`, `easeOut(t) = 1 - (1 - t)^2.2`, stutter `+ sin(t * 42) * 0.004`, quantised `round(p * h / 3) * 3` | Port exact stepper feel; allow instant reveal when `prefers-reduced-motion: reduce` or in non-interactive/static summary mode |
| **Feed sway** | `sin(t * 26) * 0.35 * (1 - t)` deg around `transform-origin: top center` | Port directly |
| **Damped settle** | `1.1 * exp(-t * 4.2) * sin(t * 15)` deg over `1.2s` | Port directly |
| **Thermal head glow** | `.slot__head` 1.5px cyan gradient oscillating `translateX(-24%..24%)` at `0.42s` | Retint from `#78dcff` to Kerb Cobalt / subtle LED indicator |
| **Drag-to-tear** | `TEAR_PX = 70`, pull capped at `TEAR_PX * 1.6`, tilt `(pull / TEAR_PX) * 0.8` deg, armed tick at `> 70px`, springBack `cubic-bezier(.2, 1.4, .4, 1)`, tearOff `translateY(90vh) rotate(7deg)` + `.is-torn` top teeth | Port pointer drag + add keyboard-accessible tear/save button |
| **Seeded barcode** | LCG `seed = (seed * 1103515245 + 12345) & 0x7fffffff`, hashed from `order.id + order.auth`, bar widths `1..3px` with `2px` gap | Port as pure deterministic function returning bar widths for SVG/flex rendering |
| **WebAudio sound** | Off by default; unlocked on toggle; motor hum (`58Hz` sawtooth -> `320Hz` lowpass), per-4-step tick (`1100-1600Hz` square), rip (bandpass `1800->500Hz` noise) | Port as optional opt-in utility; keep muted by default |

## 4. Data-Model Inventory

- **Reference model**: Single SaaS subscription `state.order` (`cycle: 'monthly' | 'annual'`, `seats: number`, `promo`, `quote: { list, annual, promo, subtotal, tax, total }`, `rows: { k, v, credit, rk, rv }[]`, `brandLabel`, `last4`, `auth`).
- **Kerb replacement (`SlipData`)**:
  - 5 slip modes: `'quote' | 'booking' | 'handover_out' | 'handover_in' | 'invoice'`
  - Integer minor units (`paise`, `INR`) throughout; `lines` sum strictly to `totalMinor` (for `quote`, `booking`, `invoice`, and `handover_in` settlement; `handover_out` has `totalMinor = 0` or deposit hold metadata).
  - Pure adapters: `slipFromQuote`, `slipFromBooking`, `slipFromInspection`, `slipFromInvoice` in `src/ui/components/receipt/adapters.ts`.

## 5. Copy Inventory

- **Reference copy (discarded)**: `Pro plan`, `Annual subscription · 1 seat`, `Monthly`, `Seats`, `Promo code`, `LAUNCH10`, `VAT 20%`, `TOTAL PAID`, `Order`, `Paid with`, `Auth`, `Date`, `Drag down to tear off`, `Sound off`.
- **Kerb car-rental copy**: `KERB`, `PRICE QUOTE`, `BOOKING SLIP`, `CHECK-OUT SLIP`, `CHECK-IN SLIP`, `TAX INVOICE`, `CREDIT NOTE`, `GST (18%)`, `TOTAL`, `SECURITY DEPOSIT`, `BOOKING CODE`, `VEHICLE`, `PICK-UP`, `RETURN`, `ODOMETER`, `FUEL`, `DAMAGE MARKS`, `CANCEL DEADLINE`.

## 6. Styling Inventory

- **Terminal shell (`styles.css` lines 5–620)**: Dark `#0a0b0d` / `#17191d` / `#78dcff` SaaS terminal and 3D credit card form — **not ported** as app chrome. Kerb uses v3 cool-grey light + graphite dark + Cobalt tokens.
- **Paper & thermal receipt (`styles.css` lines 621–769)**:
  - `--paper: #f7f6f2`, `--ink: #2c2b28`, `--ink-soft: #6f6e69`, `--ink-faint: #a9a8a2`, `--paper-w: 300px`, `--tooth: 9px`.
  - Thermal scanlines: `repeating-linear-gradient(180deg, rgba(0,0,0,0.028) 0 1px, transparent 1px 3px)`.
  - Edge vignette: `linear-gradient(90deg, rgba(0,0,0,0.06), transparent 7%, transparent 93%, rgba(0,0,0,0.06))`.
  - Torn-edge mask: 2-layer `conic-gradient` bottom teeth; 3-layer when `.is-torn` adds top teeth.
  - Scoped strictly inside `src/ui/components/receipt/**` per `scripts/slop-check.ts`.

## 7. Accessibility (a11y) Inventory

- **Reference strengths**: `aria-pressed` on sound toggle, `aria-hidden="true"` on decorative SVGs and `.slot`, `@media (prefers-reduced-motion: reduce)` collapses all motion.
- **Gaps to fix in Kerb port**:
  1. Pointer drag-to-tear has no keyboard equivalent — add a visible/focusable `"Tear & save slip"` button (or `Enter`/`Space` handler on the paper region) so keyboard users can complete the action.
  2. `.barcode` is an empty `div` with `<i>` bars — add `role="img"` and `aria-label="Barcode for <reference>"`.
  3. Avoid `aria-live="polite"` on the entire `.paper` container while animating height; instead announce `"Receipt printed"` once feed completes.

## 8. Performance Inventory

- **Reference**: `feed()` mutates `.paper__window` `height` inside `rAF` (quantised to `3px` steps, `will-change: height`). `drawBarcode()` uses `DocumentFragment` and reads `clientWidth`.
- **Kerb port**: Isolate `.paper` with `contain: layout style` so height steps do not reflow surrounding page columns; compute barcode bars purely from `seed` without reading `clientWidth` during render.

## 9. Grocery & Retail Removal List

Zero grocery, supermarket, or retail-POS words may appear anywhere in `src/ui/components/receipt/**`, `tests/receipt/**`, or UI copy:

- **Forbidden grocery/retail words**: `grocery`, `groceries`, `supermarket`, `basket`, `aisle`, `produce`, `milk`, `bread`, `eggs`, `apples`, `bananas`, `cashier`, `register`, `shopping bag`, `items in bag`, `loyalty`, `coupon`, `tip`, `gratuity`, `sku`, `upc`, `change due`, `store #`, `merchandise`, `shopping cart`.
- **Forbidden reference SaaS words**: `Pro plan`, `seats`, `seat`, `Annual subscription`, `Monthly`, `Billing cycle`, `LAUNCH10`, `VAT`, `£`.
- **Approved Kerb replacements**: `rental`, `vehicle`, `day` / `days`, `promo`, `GST`, `₹` / `INR`, `booking`, `check-out`, `check-in`, `deposit`, `odometer`, `fuel`, `damage mark`.
