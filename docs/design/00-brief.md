# Step D0 (v3): Grounding the Subject & v2 Defect Audit

- **Subject**: Kerb — a self-drive car rental platform operating across Bengaluru hubs (Indiranagar Hub, Kempegowda Airport BLR, Whitefield Tech Corridor). Real physical inventory: numbered vehicles with real paint colours, registration plates (`KA01...`), branch opening hours, dated trips, security deposits, walkaround inspection photos, and human booking codes (`KB7-4Q2`).
- **Audience**:
  1. Renters on mobile phones comparing 2–3 cars for weekend or airport trips; sensitive to hidden fees, deposit clarity, and cancellation rules.
  2. Counter agents and fleet managers working desktop operations all day and mobile handovers in car parks.
- **Primary Job**: Turn "pick-up branch + dates + return branch" into genuinely free, fully priced vehicles in 3 interactions or fewer, and give staff an exception-first operations desk.

---

## 15 Defects Identified in v2 (v3 Part 1 §1 Audit)

Observed directly in the v2 build and screenshots (`docs/design/shots/`):

1. **Undersized hero headline**: The `/` hero headline (`Cars that are genuinely free on your dates...`) renders near body size rather than a true display scale (76px desktop target), leaving the hero flat and visually weak.
2. **Awkward hero asymmetry & empty canvas**: A boxed eyebrow pill (`Bengaluru self-drive fleet  18 inspected cars`) and a single isolated vehicle card on the right leave large dead space on the left.
3. **Warm-cream / amber / petrol palette fatigue**: The `#EEF0EC` paper, `#F8F9F6` sheet, `#F0A31B` amber, and `#14323B` petrol palette reads muddy rather than crisp, modern, and technical.
4. **Decorative dashed `LaneLine` divider**: On `/`, the dashed amber `LaneLine` sits across the full width as a static horizontal rule rather than a purposeful state/stepper indicator.
5. **Paise decimals on headline prices**: Vehicle tiles show `₹6,339.96 for 2 days` and `₹3,169.98 / day` instead of clean whole-rupee headline totals (with exact paise reserved for itemized receipts/invoices).
6. **Repetitive placeholder-looking totals**: Multiple distinct vehicles on `/` display identical `₹10,145.46 for 2 days` figures, undermining price differentiation.
7. **Cramped hub pill squeezing vehicle titles**: Green `✓ Kempegowda Airport (BLR)` pills wrap to two lines beside the car name, forcing titles like `Tata Punch Accomplished iCNG MT` onto three lines.
8. **Tracked all-caps category eyebrows**: The 2×2 fleet-by-use grid uses tracked uppercase eyebrow labels (`CITY COMPACTS`, `ELECTRIC`, `GHAT & HIGHWAY`, `LONG HAUL`) inside uniform bordered boxes.
9. **AI-slop 4-card process row**: `Four minutes from curb to ignition` renders as four equal boxed cards (`01`–`04`) in a 4-column grid instead of a tight editorial sequence.
10. **Stacked boxed hub & FAQ cards**: `Three Bengaluru hubs` and `Plain-language rules` repeat identical rounded-border card boxes with `After-hours ready` pills.
11. **Exposed Next.js dev indicator**: The floating `N` / `1 Issue` Next.js dev badge appears in the bottom-left of rendered pages (`home-1440.png`, `cars-1440.png`, `admin-fleet-1440.png`); `devIndicators: false` must be set in `next.config.ts`.
12. **Harsh native `<select>` filter bar on `/cars`**: Unstyled/high-contrast 1px dark borders on inline `<select>` controls (`All body styles`, `Any gearbox`, `Any fuel`) feel cramped and utilitarian.
13. **Double-space metadata artifacts in admin tables**: Stripped middots in `admin-fleet-1440.png` leave double spaces (`2025 Executive 9-Seater  manual  diesel`), and the `Daily base` column wraps `₹6,999 /day` onto two lines.
14. **Typography lacks display/table contrast**: `Archivo` + `Atkinson Hyperlegible Next` lacks optical-size display character at 76px and tight geometric authority in 12–14px dense tables.
15. **Missing tactile receipt/slip surface**: Checkout, booking confirmation, and handover lack a grounded thermal-paper receipt/slip component (`ReceiptSlip`) to anchor pricing, taxes, deposits, and inspection marks in real-world rental paperwork.

---

## Top 3 Slop Risks for Kerb v3

1. **Reskinning without restructuring**: Swapping `#EEF0EC`/`#F0A31B` for cool-grey/cobalt while keeping v2's boxed 4-card rows, tracked uppercase eyebrows, and flat hero proportions still reads as AI-generated (per `DesignSoul` structural rule).
2. **SaaS hero & marketing clichés**: Centered gradient heroes, dual "Get Started / Learn More" buttons, invented customer/trip counters, or decorative micro-badges (`After-hours ready`, `✓ Hub`) crowding vehicle titles.
3. **Card-shadow & border-soup proliferation**: Nesting bordered cards inside bordered containers with hover lifts and shimmer skeletons instead of crisp 1px hairlines, tabular numbers, real vehicle photography, and one intentional focal moment per screen.
