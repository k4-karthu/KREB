# Step D1 (v3): Reference Study & External Tooling Audit

## 1. External Repo & Skill Checks

### `https://github.com/greninja-op`
- **Status**: Reachable (`HTTP 200`, GitHub user `greninja-op` — Arjun Sabu, India, 29 public repos).
- **Relevant repository**: `greninja-op/DesignSoul` — a UI/UX skill for AI coding agents focused on eliminating generic AI-default interfaces.
- **What we borrow**:
  - **Restructure vs. reskin principle**: *"A reskin cannot make an AI layout look human-made. 'Looks AI-generated' is mostly a structural problem — generic layouts, uniform card grids, symmetric blocks, weak hierarchy, placeholder-ish content — not a color/glass/shadow problem."* Accordingly, v3 restructures the hero, fleet-by-use, and 4-step sequence rather than merely swapping v2's colour tokens.
  - **System-first refactoring**: Convert the token layer and shared primitives first, then page-by-page, verifying rendered pixels in a real browser.

### `pbakaus/impeccable`
- **Status**: Verified on GitHub (`Apache-2.0`) and via npm CLI (`npx --yes impeccable --help` → `impeccable@4.8.2`).
- **What we borrow**:
  - **Deterministic slop detection (`detect`)**: Encode anti-pattern rules directly in `scripts/slop-check.ts` so CI catches banned patterns (e.g., purple/indigo gradients, `rounded-2xl` card soup, tracked all-caps eyebrows, hover lifts, unapproved fonts) automatically.
  - **Targeted steering & review vocabulary**: Use `critique` (UX heuristic scoring), `audit` (a11y/perf/theming P0–P3), `distill` (remove unnecessary chrome), `typeset` (scale & hierarchy), and `harden` (overflow, i18n, edge cases) as structured pass criteria.

### `Leonxlnx/taste-skill`
- **Status**: Verified on GitHub (`MIT`, `tasteskill 2.5.1`, installable via `npx skills add https://github.com/Leonxlnx/taste-skill --skill "design-taste-frontend"`).
- **What we borrow**:
  - **Structural discipline**: Plain copy, one design system, one section per screen, equal left and right edges, real photographs, real product UI (no fake stats or decorative badges).
  - **Dealt moments**: One hero entrance + 1–2 intentional dealt moments per page (e.g., `AvailabilityLane` on `/`, `ReceiptSlip` at checkout/confirmation/handover), with quiet micro-interactions everywhere else.
  - **Browser-verified finish gate**: Verify light/dark and mobile/desktop viewports in Playwright before signing off.

---

## 2. Domain Mechanics (What We Borrow, Not Looks)

1. **Date-range & price-per-day pickers (airline/rail/stay search)**:
   - *Mechanism*: Two-month calendar on desktop, full-screen sheet on mobile, disabled past/blocked dates with explicit reason, 15-minute time slots aligned to branch opening hours.
   - *Avoid*: Floating multi-blur popovers or tiny unlabelled calendar cells.
2. **Transparent rental checkouts & thermal rental slips**:
   - *Mechanism*: Whole-rupee total price shown first on every vehicle tile with per-day rate secondary; itemized `ReceiptSlip` separating rental base, add-ons, GST, and refundable security deposit; explicit `"Free cancellation until <date>"` timestamp.
   - *Avoid*: Hidden tax/fee surprises at step 3 or grocery-style shopping-cart wording.
3. **Dense operational desks (dispatch & issue trackers)**:
   - *Mechanism*: Global `⌘K` command palette, saved booking filter views, slide-over record drawer without losing table scroll, exceptions-first Today desk, single-line tabular columns.
   - *Avoid*: Decorative KPI card walls that bury overdue returns and pending KYC items.
4. **Road signage & vehicle registration paperwork**:
   - *Mechanism*: Condensed `Plate` badge for registration plates (`KA01...`) and booking codes (`KB7-4Q2`), hairline label-value spec sheets, and thermal-paper `ReceiptSlip` for quotes, bookings, handovers, and invoices.
   - *Avoid*: Tracked all-caps eyebrow labels or decorative monospace tags outside `Plate` and `ReceiptSlip`.
