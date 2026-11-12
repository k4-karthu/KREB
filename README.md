# Kerb — Self-Drive Car Rental Platform & Digital Showroom

Kerb is a high-craft self-drive car rental web application and digital showroom built with Next.js 16, TypeScript, Tailwind CSS v4, and SQLite. Designed as a calm, luxury automotive showroom rather than a generic form, Kerb pairs an editorial design language with a deterministic thermal receipt simulation, custom headless UI primitives, and operational desk tooling.

---

## Highlights

- **Editorial Showroom Experience**: Pinned desktop collection hall with a 74% tyre baseline floor line, dynamic 2D vehicle spawn transitions, silhouette light sweep sheen, and responsive mobile carousel fallback.
- **Interactive Thermal Receipt Printer**: Realistic receipt simulation machine with thermal stepper motor pacing, vibration settle, tear physics (drag, button, or keyboard), QR code / barcode generation, and PDF export.
- **Zero Native Controls**: Every visible input is custom-built on accessible headless primitives (React Aria Components & Radix UI) — custom DateRangePicker, TimePicker, ComboBox, Select, SegmentedControl, Dropzone, and SignaturePad.
- **Strict Domain Precision**:
  - **Money as Integers**: All currency amounts stored as minor units (paise/cents) — strictly zero floats for money.
  - **Time as Integers**: All timestamps stored as UTC epoch milliseconds.
  - **Full Audit Trail**: Every vehicle status change, handover inspection, and payment event logged with immutable triggers.
- **Comprehensive Operational Desk**: Administrative command center (`/admin`) with Cmd+K Command Palette, real-time fleet management, interactive booking drawers, KYC verification desk, pricing engine, and handover inspection flows.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router, Turbopack, React 19) |
| **Language** | TypeScript (Strict mode, zero `any`) |
| **Styling & Tokens** | Tailwind CSS v4, CSS Variables, Theme System (Cobalt accent `#2250F4` / `#6F8DFF`) |
| **Typography** | Bricolage Grotesque (Display) & Albert Sans (UI & Tabular Numerics) |
| **Database** | SQLite via `better-sqlite3` and Drizzle ORM (WAL mode, foreign keys enforced) |
| **Authentication** | Better Auth with Argon2 password hashing and session tokens |
| **Headless UI** | React Aria Components, Radix UI Primitives, Vaul, Sonner, cmdk |
| **Motion & Animation** | Motion (`motion/react`), GSAP, FormKit AutoAnimate, Number Flow |
| **Media Pipeline** | Sharp (3:2 studio normalization, WebP multi-resolution generation) & Thumbhash |
| **Testing & CI** | Vitest, Playwright, Biome, and custom compliance check gates |

---

## Fleet & Seed Dataset

The platform is pre-seeded with 22 authentic Indian-market vehicles across 7 categories:

- **Electric (EV)**: BYD Atto 3, Tata Nexon.ev, Hyundai IONIQ 5
- **Luxury**: BMW 3 Series Gran Limousine, Mercedes-Benz GLA, Audi A6
- **SUV**: Mahindra Thar 4x4, Mahindra XUV700, Hyundai Creta, Tata Safari, Kia Seltos, Maruti Brezza
- **Sedan**: Honda City V, Hyundai Verna Turbo, Skoda Slavia
- **Hatchback**: Tata Tiago, Hyundai i20 N Line, Maruti Swift, Tata Punch
- **MUV**: Toyota Innova Crysta, Maruti Ertiga ZXi
- **Van / Crew**: Force Urbania

Includes **3 branch hubs** (Bengaluru Indiranagar, Kempegowda Airport, and Whitefield Hub), **25 customers**, and **48 bookings** spanning all lifecycle states (active, confirmed, completed, cancelled).

---

## Quick Start

### Prerequisites
- Node.js 20+ (Node.js 22 or 24 recommended)
- `pnpm` (v10+ or v11+)

### Installation

1. **Clone repository**:
   ```bash
   git clone https://github.com/k4-karthu/KREB.git
   cd KREB
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Set up environment variables**:
   Create a `.env` file in the root directory:
   ```env
   APP_URL=http://localhost:3000
   DATABASE_PATH=data/kerb.db
   AUTH_SECRET=kerb-production-secret-min-32-chars-random-key-here
   AUTH_TRUSTED_ORIGINS=http://localhost:3000
   NEXT_TELEMETRY_DISABLED=1
   ```

4. **Initialize database & seed data**:
   ```bash
   pnpm db:reset
   pnpm db:seed
   ```

5. **Start development server**:
   ```bash
   pnpm dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## Default Credentials

### Staff / Admin Portal
- **URL**: `http://localhost:3000/admin`
- **Email**: `dev@kerb.local`
- **Password**: `kerb-dev-pass-2026`

### Customer Accounts
- **Sample Customer**: `customer1@kerb.local` / `kerb-customer-pass-2026`

---

## Available Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Starts Turbopack development server on port 3000 |
| `pnpm build` | Compiles optimized production build with static generation |
| `pnpm start` | Starts Next.js production server |
| `pnpm typecheck` | Validates TypeScript types across the entire project (`tsc --noEmit`) |
| `pnpm test` | Runs all Vitest test suites (contracts, permissions, pricing, slop checks) |
| `pnpm lint` | Runs Biome code formatting and linting check |
| `pnpm format` | Formats all source files with Biome |
| `pnpm check:images` | Validates studio vehicle photography and WebP resolution assets |
| `pnpm check:receipt` | Validates thermal receipt simulation determinism and 2.4s cap |
| `pnpm check:collection` | Validates Showroom Collection Hall layout, floor baseline, and fallbacks |
| `pnpm db:seed` | Seeds database with 22 vehicles, branches, and sample bookings |
| `pnpm db:reset` | Wipes and resets SQLite database with schema migrations |

---

## Architecture Overview

```
src/
├── app/                       # Next.js App Router
│   ├── (auth)/                # Customer login and signup routes
│   ├── admin/                 # Operational Desk & Staff Management
│   │   └── (desk)/            # Fleet, Bookings, KYC, Pricing, Timeline, Finance
│   ├── cars/                  # Vehicle Catalog & Slug Detail Showroom
│   ├── checkout/              # 4-Stage Stepper Checkout & Confirmation Slip
│   ├── trips/                 # Driver Trip History & Interactive Receipts
│   ├── staff/                 # Ground Handover Inspection PWA (Check-in/out)
│   └── page.tsx               # Home Showroom Hall with Live Quote Receipt
├── config/                    # Brand tokens, environment schemas, and constants
├── db/                        # SQLite Drizzle schema, migrations, and seed scripts
├── domain/                    # Pure business logic engines
│   ├── availability/          # Vehicle scheduling and conflict detection
│   ├── booking/               # Lifecycle state machines, cancellation rules
│   ├── pricing/               # Quote computation, protection plans, 18% GST
│   └── shared/                # Money (minor units) and timestamp math
├── server/                    # Better Auth, Argon2 hashing, permission actors
└── ui/                        # Showroom Design System
    ├── components/
    │   ├── collection/        # ShowroomHall, LightSweep, VehicleCard
    │   └── receipt/           # ReceiptPrinter, ReceiptPaper, useReceiptSim
    ├── data/                  # Table, Price, SpecSheet, Plate, StatusBadge
    ├── overlays/              # Dialog, Drawer, Tooltip, Popover, Toast, CommandPalette
    ├── primitives/            # Custom Button, TextField, Select, DateRangePicker, etc.
    └── tokens/                # Cobalt & graphite design tokens, typography, motion curves
```

---

## License

MIT License. Designed and built for Kerb.
