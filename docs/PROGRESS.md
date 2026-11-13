# Kerb — Milestone Progress (§16)

- [x] **M0**: Foundations (Repo, pnpm, TypeScript strict, Next.js, Biome, lefthook, Vitest, Playwright, Env/Brand/Settings, DB client + WAL/pragmas, Drizzle schema + SQLite triggers + FTS5 + snapshot test, Shared domain helpers, Logger/Health/Ready, `slop-check`, Docker/Caddy/Litestream)
- [x] **M1**: Design System & Kit (D0–D2 design docs, §11.13 Tailwind v4 stripped theme, fonts, dark theme, token contrast test, primitives & components, motion primitives, `/_kit` living style guide, Playwright 375/1440 light/dark screenshots & critique)
- [x] **M2**: Identity, Roles & Admin Shell (Better Auth + Argon2id + TOTP 2FA, `can()` matrix + tests, Admin login, Audit logs + immutable triggers, Admin shell + command palette scaffold, Customer auth pages)
- [x] **M3**: Fleet Management & Image Pipeline (Branches/hours, features, rate plans, add-ons, protection plans, Vehicle CRUD + archive, `sharp` + `file-type` + `thumbhash` pipeline + `ImageManager`, vehicle documents, Settings, Seed v1)
- [x] **M4**: Availability Engine, Catalog & Vehicle Detail (Availability query, `DateTimeRange`, `AvailabilityLane`, `/cars`, `/cars/[slug]`, `/`, `/branches`, `/policies/[slug]`, SEO/sitemap/robots)
- [x] **M5**: Pricing, Quotes, Checkout & Payments (Pricing engine + worked example + property tests, signed quotes, eligibility, 3-step `/checkout`, `FakePaymentProvider`, confirmation + `.ics` download + outbox)
- [x] **M6**: Customer Account (Profile, Encrypted licence uploader + KYC, `/trips` + `/trips/[code]`, cancellation preview + refund, extensions, DPDP JSON export)
- [x] **M7**: Admin Operations (Today exceptions-first desk, Bookings list + walk-in + approve/cancel/reassign, Timeline Gantt, KYC queue + audited licence reveal, Customers + blacklist, `⌘K` global search)
- [x] **M8**: Handover & Post-Rental Money (Staff bay queue `/staff`, Check-out/in wizards `/staff/handover/[code]/out|in`, auto late/fuel charges, clean-return deposit release, fines & damage claims ledger `/admin/finance`)
- [x] **M9**: Maintenance, Turnaround & Audit (Turnaround readiness board `/admin/turnaround`, maintenance blocks `/admin/maintenance`, immutable audit log viewer `/admin/audit`, policy settings `/admin/settings`)
- [ ] **M10**: Differentiators (P2 behind feature flags — optional post-launch enhancements)
- [x] **M11**: Hardening & Launch Verification (`pnpm check` across 150 files, `pnpm build`, Playwright E2E + `@axe-core/playwright` + 375/768/1440 px screenshots)


---

# Kerb v3 — Showroom UI & Thermal Receipt Redesign

- [x] **R0**: Reset, Research & Font Bake-off (devIndicators: false, Set A Bricolage Grotesque + Albert Sans).
- [x] **R1 / P0**: Master Tokens, Typography, Motion & Anti-Slop Gates (Cobalt palette, slop-check.ts, 34/34 contrast tests).
- [x] **R2**: Font Installation & Vehicle Studio Pipeline (CarStudioImage 3:2 plate, check:images passing 22/22).
- [x] **R3**: Custom UI Kit Primitives (17 React Aria & Radix headless primitives with ZERO native inputs).
- [x] **R4**: Overlay & Data UI Kit (Dialog, Drawer, Tooltip, Popover, Sonner Toast, CommandPalette, StatusBadge 6px dot, Skeleton, TanStack Table, Price, VehicleTile, TripTicket, Timeline, Indian Plate, Tabs, Accordion, QuotePanel, ProtectionCards, Stepper, Embla Gallery).
- [x] **P1 - P3**: Thermal Receipt Engine & Machine Visuals (Pure deterministic state machine receipt-sim.ts, ReceiptPrinter.tsx, zigzag tear edge ReceiptPaper.tsx with 5 SlipKinds and zero grocery words, check:receipt passing <=2400ms cap).
- [x] **P6**: Showroom Collection Hall (Pinned desktop stage with 74% tyre baseline floor line, category rail, 2D spawn transition, single allowed gradient LightSweep.tsx alpha silhouette mask, check:collection passing).
- [x] **R6 + P4**: Home Page Rebuild (12-column showroom layout, display-xl headline, custom search widget, ShowroomHall, live interactive thermal quote simulator).
- [x] **R7**: Catalog & Vehicle Detail (/cars filter bar, VehicleTile grid; /cars/[slug] Embla Gallery, SpecSheet, sticky QuotePanel, interactive receipt slip, protection cards).
- [x] **R8**: Checkout & Booking Lifecycle (/checkout 4-step Stepper, custom inputs, QuotePanel, animated thermal receipt printer ReceiptAnimation on confirmation, /trips TripTicket list, /trips/[code] vertical Timeline).
- [x] **R9**: Admin Shell & Operational Desk (AdminShell with CommandPalette Cmd+K, breadcrumbs, high-density toggle, FleetClient TanStack table with CarStudioImage thumbnails, BookingsClient operational table + drawer + thermal invoice generator, KycClient verification desk).
- [x] **R10 / P8**: Launch Verification & Quality Gates (6/6 Playwright E2E passing, 71/71 Vitest passing, 0 typecheck errors, 0 Biome errors, 0 slop check violations, production build verified).


---

# Phase 2 — Master UI/UX Architectural Overhaul & Swiss-Minimalist Redesign

- [x] **Stage 1: Dependency Cleanup & Dead Code Purge**: Removed `@react-pdf/renderer`, `maplibre-gl`, `gsap`, `lucide-react`, unused `@fontsource` packages (~6MB pruned); installed `@fontsource/ibm-plex-mono`; standardized 100% on `@phosphor-icons/react`; purged all duplicate legacy M1 primitives and components; migrated `_kit` to `/kit`.
- [x] **Stage 2: P0 Runtime Crash Fixes**: Refactored `EmptyState.tsx` to safely handle React 19 `forwardRef` icon objects and string keys; fixed RSC serialization crashes on `/trips` and `/checkout`; added `suppressHydrationWarning` on `<DateSegment>` to eliminate locale whitespace hydration mismatches in `TimePicker` and `DateRangePicker`.
- [x] **Stage 3: Typography Scale & Zombie Token Purge**: Bridged all 14 `TYPE_SCALE` variables (`text-display-xl` down to `text-label-s`) in `theme.css`; eliminated 100% of zombie tokens (`bg-ink`, `text-ink`, `bg-sheet`, `border-stone-200`, `text-petrol`, `bg-go`); fixed white-on-white invisible button on `/account` (`bg-accent text-white`); upgraded KYC file dropzone on `/account/licence`; styled `/login` and `/signup` auth panels (`bg-surface border border-border shadow-e2`).
- [x] **Stage 4: Storefront (`/`) Redesign**: Implemented Swiss Automotive Atelier layout; dynamic active fleet query (`22 active units // BLR`); Command Booking Console with Hub vs Doorstep tabs and quick duration presets (`24h Sprint`, `Weekend 3D`, `7D Roadtrip`, `Monthly`); optimized `ShowroomHall` (eliminated concurrent mobile shimmer loops, restricted to active/hovered vehicle); 4-step dispatch protocol and 3 Bengaluru Hub cards.
- [x] **Stage 5: Catalog (`/cars`), Detail (`/cars/[slug]`), and Checkout (`/checkout`)**: Added `van` (Force Traveller) and quick filters for seating capacity (`5 Seats`, `7+ Seats`) and low deposit (`<= ₹10k`); stabilized vehicle quote sidebar on `/cars/[slug]` with `min-h-[540px]` to eliminate layout jumps; collapsed mobile stepper on `/checkout` (`Step 01 / 04`); separated payable charges from refundable pre-auth security deposit hold.
- [x] **Stage 6: Thermal Receipt Preservation & Wiring**: Strictly preserved receipt colors (`#FBFBF9`/`#14161A`), zigzag teeth SVG, barcode/QR generators, and <= 2400ms state machine timing (`check:receipt` passes); wired `onDownloadPdf` via dedicated `@media print` isolation and `onShare` via Web Share API with clipboard fallback toast.
- [x] **Stage 7: Admin Panel Overhaul**: Widened `/admin/timeline` sticky vehicle column from 220px to 280px with stacked 2-line layout to eliminate text clipping on long vehicle names; added `muv` and `van` to fleet filters and creation modal, and `cng` to fuel types; replaced registration plate misuse for role tags with monospace badge in `audit/page.tsx`; fixed booking code table overflow with `overflow-x-auto` wrappers and `shrink-0 whitespace-nowrap font-technical`.
- [x] **Stage 8: Minimalist Motion & Micro-Interactions**: Architectural hairline grid background; refined `scale(1.02)` 250ms cubic-bezier vehicle card hover physics; animated `NumberFlow` prices on summary panels and checkout ledgers; `shrink-0 whitespace-nowrap` on all registration plates.
- [x] **Definition of Done — Mandatory Two-Pass Browser Verification**:
  - `pnpm typecheck`: 0 errors
  - `pnpm lint`: 0 errors (Biome)
  - `pnpm check:slop`: 0 violations
  - `pnpm test`: 71/71 passed (9/9 suites)
  - `pnpm check:receipt`: PASS (<= 2400ms, 9/9 fixtures clean)
  - `pnpm check:collection`: PASS (all showroom hall checks clean)
  - `pnpm check:images`: 22/22 vehicles passed
  - `pnpm build`: Next.js Turbopack compiled successfully (37 static/dynamic routes)
  - `pnpm test:e2e`: 6/6 Playwright E2E tests passed (including Axe accessibility audit)
  - `scripts/two-pass-verification.ts`: PASS across Desktop (1440x900) & Mobile (390x844) with zero 500/React 19 crashes, h1 fontSize >= 30px, high-contrast elements, zero horizontal overflow, and zero console errors.
