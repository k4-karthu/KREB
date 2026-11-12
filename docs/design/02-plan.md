# Step D2 (v3): Two-Pass Design Plan

## Pass 1 — Draft

- **Palette (v3 Part 1 §4.5)**:
  - **Light theme**: Cool-grey canvas (`--canvas: #F3F4F6`, `--surface: #FFFFFF`, `--surface-sunken: #EBEDF1`), primary ink (`--text-1: #0E1116`), secondary ink (`--text-2: #444C59`, `--text-3: #6A7380`), hairline borders (`--border-subtle: #E6E8EC`, `--border: #D5D9DF`, `--border-strong: #AEB5C0`).
  - **Dark theme**: Graphite canvas (`--canvas: #0C0D10`, `--surface: #14161A`, `--surface-raised: #1B1E23`, `--surface-sunken: #101216`), primary ink (`--text-1: #F3F4F6`), secondary ink (`--text-2: #B4BAC5`, `--text-3: #8A92A0`), hairline borders (`--border-subtle: #22262C`, `--border: #2E333B`).
  - **Accent**: Cobalt (`--accent: #2250F4` light / `#6F8DFF` dark, `--on-accent: #FFFFFF` / `#0B0F24`); semantic status tokens (`--success`, `--warning`, `--danger`).
  - **Receipt exception**: `src/ui/components/receipt/**` uses dedicated thermal-paper tokens (`#FBFBF9` paper, `#14161A` ink, `IBM Plex Mono` / `Courier Prime`) strictly scoped to the slip surface.
- **Typography (v3 Part 1 §5.3 — see `docs/design/font-decision.md`)**:
  - **Display**: `Bricolage Grotesque` (variable `wght` + `wdth` + `opsz`) — `display-xl` 76/76 desktop hero scale down to `h4` 20/28.
  - **UI / Body / Tables**: `Albert Sans` (variable `wght`) — clean geometric legibility at 12–14px (`body-s` 14/22, `caption` 13/18) with `tabular-nums` everywhere.
  - **Plate**: `Archivo` (width 75, weight 700) for registration plates and booking codes.
  - **Receipt**: `IBM Plex Mono` / `Courier Prime` scoped strictly to `src/ui/components/receipt/**`.
- **Motion (v3 Part 1 §9.2)**:
  - Unified tokens in `src/ui/tokens/motion.ts`: `dur-instant`, `dur-fast`, `dur-base`, `dur-slow`, `dur-hero`, `ease-out`, `ease-in-out`, `spring-ui`, `spring-soft`, `spring-drag`.
- **Page & Surface Concepts**:
  - **Home (`/`)**: Left-aligned 76px display headline paired with an editorial vehicle frame, integrated search bar, live `AvailabilityLane` for the next free weekend, asymmetric fleet-by-use showcase (no tracked all-caps eyebrows, no 4-card icon grid), numbered pick-up sequence, branch hours, and plain-language cost accordion.
  - **Catalog (`/cars`)**: Sticky search summary chip, clean filter rail (drawer on mobile) replacing harsh native `<select>` boxes, 2-column `VehicleTile` grid with whole-rupee total first and clean single-line metadata (no squeezed hub pills).
  - **Vehicle Detail (`/cars/[slug]`)**: Full-width 3:2 gallery, hairline spec sheet, interactive availability calendar, sticky `QuotePanel` + itemized `ReceiptSlip` preview.
  - **Checkout (`/checkout`) & Confirmation**: 3-step `Stepper` (`Trip` → `You` → `Pay`), persistent quote summary with 15-min hold countdown, and tactile `ReceiptSlip` (`quote` / `booking` / `invoice`).
  - **Admin (`/admin`) & Staff (`/staff`)**: Left rail + `⌘K` bar, exceptions-first Today desk, single-line tabular fleet/booking tables (no double-space metadata gaps, no wrapped `₹/day` cells), and `ReceiptSlip` for `handover_out` / `handover_in`.

## Pass 2 — Slop Review

1. *Would an unconstrained agent produce this?* No — cool-grey + cobalt editorial precision, 76px Bricolage Grotesque display scale, whole-rupee headline pricing, and a physical `ReceiptSlip` grounded in rental paperwork.
2. *Any v3 slop-check tells present?* None: zero gradients, zero purple/indigo, zero `rounded-2xl` card soup, zero hover lifts, zero tracked all-caps eyebrows, zero exposed Next.js dev indicator (`devIndicators: false` in `next.config.ts`).
3. *Single bold moment per screen*: `AvailabilityLane` + 76px hero on `/`; `QuotePanel` + `ReceiptSlip` on detail/checkout/handover; exceptions-first `Today` queue on `/admin`.
4. *Copy & data integrity*: Sentence case everywhere, zero invented customer counts, zero grocery/shopping words in `ReceiptSlip`, exact action labels (`Show cars`, `Continue to booking`, `Pay ₹...`).
5. *Verification*: `pnpm exec vitest run tests/contrast.test.ts tests/slop-check.test.ts`, `pnpm check`, and Playwright 375/768/1440 light/dark visual audit.
