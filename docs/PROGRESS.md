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
