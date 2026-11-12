import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

import { hash as argon2Hash } from '@node-rs/argon2';
import sharp from 'sharp';
import { DEFAULT_RENTAL_SETTINGS } from '@/config/settings';
import { getWriteConnection } from '@/db/client';
import { runMigrations } from '@/db/migrate';
import { encryptLicenceNumber } from '@/server/crypto-licence';
import { processAndSaveVehicleImage, savePrivateFile } from '@/server/files';

if (process.env.NODE_ENV === 'production') {
  console.error('Refusing to run seed script in NODE_ENV=production');
  process.exit(1);
}

const isBenchmark = process.argv.includes('--benchmark');

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function escapeXml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

async function generateStudioCarImage(
  paintHex: string,
  title: string,
  category: string,
): Promise<Buffer> {
  const safeTitle = escapeXml(title);
  const safeCat = escapeXml(category.toUpperCase());
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
      <rect width="1200" height="800" fill="#F1EFEA"/>
      <rect x="0" y="560" width="1200" height="240" fill="#E6E3DC"/>
      <line x1="0" y1="560" x2="1200" y2="560" stroke="#D1CDC3" stroke-width="2"/>
      <ellipse cx="600" cy="568" rx="370" ry="26" fill="#181715" fill-opacity="0.16"/>
      <!-- Clean geometric studio profile -->
      <path d="M 230 490 L 250 420 Q 340 330 470 315 L 740 315 Q 870 335 955 420 L 985 485 Q 988 518 955 524 L 250 524 Q 225 518 230 490 Z" fill="${paintHex}" stroke="#181715" stroke-width="4"/>
      <path d="M 380 412 L 455 342 L 710 342 L 820 412 Z" fill="#181715" fill-opacity="0.22" stroke="#181715" stroke-width="2.5"/>
      <line x1="585" y1="342" x2="585" y2="412" stroke="#181715" stroke-width="2.5"/>
      <circle cx="375" cy="524" r="64" fill="#181715"/>
      <circle cx="375" cy="524" r="34" fill="#D7DCE2"/>
      <circle cx="835" cy="524" r="64" fill="#181715"/>
      <circle cx="835" cy="524" r="34" fill="#D7DCE2"/>
      <rect x="52" y="48" width="14" height="56" fill="${paintHex}"/>
      <text x="82" y="78" font-family="sans-serif" font-size="22" font-weight="700" fill="#5D5B55">${safeCat}</text>
      <text x="82" y="114" font-family="sans-serif" font-size="34" font-weight="700" fill="#181715">${safeTitle}</text>
    </svg>
  `;
  return sharp(Buffer.from(svg)).jpeg({ quality: 88 }).toBuffer();
}

async function loadSeedCarImage(
  slug: string,
  paintHex: string,
  title: string,
  category: string,
): Promise<Buffer> {
  const assetPath = path.resolve(process.cwd(), 'scripts', 'seed-assets', 'cars', `${slug}.jpg`);
  if (existsSync(assetPath)) {
    return readFileSync(assetPath);
  }
  return generateStudioCarImage(paintHex, title, category);
}

async function createDetailCropBuffer(sourceBuffer: Buffer): Promise<Buffer> {
  const meta = await sharp(sourceBuffer).metadata();
  const w = meta.width ?? 1200;
  const h = meta.height ?? 800;
  const cropW = Math.max(400, Math.round(w * 0.76));
  const cropH = Math.max(266, Math.round(h * 0.76));
  const left = Math.max(0, Math.round((w - cropW) * 0.65));
  const top = Math.max(0, Math.round((h - cropH) * 0.55));
  return sharp(sourceBuffer)
    .extract({ left, top, width: Math.min(cropW, w - left), height: Math.min(cropH, h - top) })
    .resize(1200, 800, { fit: 'cover' })
    .jpeg({ quality: 88 })
    .toBuffer();
}

async function generateDummyDocBuffer(label: string): Promise<Buffer> {
  const safe = escapeXml(label);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
      <rect width="800" height="500" fill="#FAF9F6"/>
      <rect x="24" y="24" width="752" height="452" fill="none" stroke="#181715" stroke-width="3"/>
      <text x="60" y="96" font-family="sans-serif" font-size="28" font-weight="700" fill="#181715">DRIVER LICENCE SPECIMEN</text>
      <text x="60" y="150" font-family="sans-serif" font-size="22" fill="#5D5B55">${safe}</text>
      <rect x="60" y="200" width="180" height="210" fill="#E6E3DC" stroke="#181715" stroke-width="2"/>
      <text x="280" y="240" font-family="monospace" font-size="20" fill="#181715">CLASS: LMV-NT</text>
      <text x="280" y="280" font-family="monospace" font-size="20" fill="#181715">REGION: KA-03 BENGALURU</text>
      <text x="280" y="320" font-family="monospace" font-size="20" fill="#181715">VALID: 2022 - 2036</text>
    </svg>
  `;
  return sharp(Buffer.from(svg)).jpeg({ quality: 85 }).toBuffer();
}

function daysFromNowMs(days: number, hourUtc = 4): number {
  const now = new Date();
  const base = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + days,
    hourUtc,
    30,
    0,
    0,
  );
  return base;
}

function isoDateOffset(days: number): string {
  const d = new Date(Date.now() + days * 86_400_000);
  return d.toISOString().slice(0, 10);
}

async function main() {
  const { sqlite } = getWriteConnection();
  runMigrations(sqlite);

  const existingBranches = sqlite.prepare('SELECT COUNT(*) AS cnt FROM branches').get() as {
    cnt: number;
  };
  if (existingBranches.cnt > 0) {
    console.log('Database already seeded. Run `pnpm db:reset` first if you want a clean reseed.');
    return;
  }

  const rand = mulberry32(20261112);
  const now = Date.now();

  // 1. Settings
  sqlite
    .prepare('INSERT INTO settings (key, value_json, updated_at, updated_by) VALUES (?, ?, ?, ?)')
    .run('rental_settings', JSON.stringify(DEFAULT_RENTAL_SETTINGS), now, 'seed');

  const flags = [
    ['enable_instant_checkout', 1, 'Allow verified customers instant booking confirmation'],
    ['enable_after_hours_airport', 1, 'Allow BLR airport after-hours pickup/drop'],
    ['enable_waitlist', 1, 'Show waitlist signup on sold-out dates'],
  ] as const;
  const insertFlag = sqlite.prepare(
    'INSERT INTO feature_flags (key, enabled, note) VALUES (?, ?, ?)',
  );
  for (const [k, en, note] of flags) {
    insertFlag.run(k, en, note);
  }

  // 2. Branches
  const branchData = [
    {
      publicId: 'br_indiranagar',
      slug: 'indiranagar-hub',
      name: 'Indiranagar Hub',
      city: 'Bengaluru',
      address: '100 Feet Road, HAL 2nd Stage, Indiranagar, Bengaluru 560038',
      lat: 12.9784,
      lng: 77.6408,
      phone: '+91 80 4120 1101',
      email: 'indiranagar@kerb.in',
      allowsAfterHours: 0,
      afterHoursFeeMinor: 0,
    },
    {
      publicId: 'br_airport',
      slug: 'kempegowda-airport-blr',
      name: 'Kempegowda Airport (BLR)',
      city: 'Bengaluru',
      address: 'P4 Multi-Level Parking Bay 12, Kempegowda International Airport, Bengaluru 560300',
      lat: 13.1986,
      lng: 77.7066,
      phone: '+91 80 4120 1102',
      email: 'airport@kerb.in',
      allowsAfterHours: 1,
      afterHoursFeeMinor: 49900,
    },
    {
      publicId: 'br_whitefield',
      slug: 'whitefield-tech-corridor',
      name: 'Whitefield Tech Corridor',
      city: 'Bengaluru',
      address: 'ITPL Main Road, Brookefield, Bengaluru 560066',
      lat: 12.9698,
      lng: 77.7499,
      phone: '+91 80 4120 1103',
      email: 'whitefield@kerb.in',
      allowsAfterHours: 0,
      afterHoursFeeMinor: 0,
    },
  ];

  const insertBranch = sqlite.prepare(`
    INSERT INTO branches (public_id, slug, name, city, address, lat, lng, timezone, phone, email, allows_after_hours, after_hours_fee_minor, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'Asia/Kolkata', ?, ?, ?, ?, 1, ?, ?)
  `);
  const insertHours = sqlite.prepare(
    'INSERT INTO branch_hours (branch_id, weekday, opens_minute, closes_minute) VALUES (?, ?, ?, ?)',
  );

  const branchIds: number[] = [];
  for (const b of branchData) {
    const res = insertBranch.run(
      b.publicId,
      b.slug,
      b.name,
      b.city,
      b.address,
      b.lat,
      b.lng,
      b.phone,
      b.email,
      b.allowsAfterHours,
      b.afterHoursFeeMinor,
      now,
      now,
    );
    const id = Number(res.lastInsertRowid);
    branchIds.push(id);
    for (let weekday = 0; weekday < 7; weekday++) {
      // 06:00 to 23:00 (360 to 1380) for Airport, 07:00 to 22:00 (420 to 1320) for hubs
      const opens = b.allowsAfterHours ? 360 : 420;
      const closes = b.allowsAfterHours ? 1380 : 1320;
      insertHours.run(id, weekday, opens, closes);
    }
  }

  // 1 upcoming branch closure on Whitefield
  sqlite
    .prepare(
      'INSERT INTO branch_closures (branch_id, starts_on, ends_on, reason) VALUES (?, ?, ?, ?)',
    )
    .run(branchIds[2], isoDateOffset(25), isoDateOffset(26), 'Annual bay resurfacing');

  // One-way fees
  const insertOneWay = sqlite.prepare(
    'INSERT INTO one_way_fees (from_branch_id, to_branch_id, fee_minor) VALUES (?, ?, ?)',
  );
  insertOneWay.run(branchIds[0], branchIds[1], 75000);
  insertOneWay.run(branchIds[1], branchIds[0], 75000);
  insertOneWay.run(branchIds[0], branchIds[2], 50000);
  insertOneWay.run(branchIds[2], branchIds[0], 50000);
  insertOneWay.run(branchIds[1], branchIds[2], 90000);
  insertOneWay.run(branchIds[2], branchIds[1], 90000);

  // 3. Rate plans, tiers & rules
  const plans = [
    { publicId: 'rp_city', name: 'City Compact', baseDailyMinor: 249900 },
    { publicId: 'rp_tourer', name: 'Highway Tourer', baseDailyMinor: 399900 },
    { publicId: 'rp_electric', name: 'Electric Quiet', baseDailyMinor: 449900 },
    { publicId: 'rp_executive', name: 'Executive Grand', baseDailyMinor: 699900 },
  ];
  const insertPlan = sqlite.prepare(
    'INSERT INTO rate_plans (public_id, name, base_daily_minor, min_duration_minutes, max_duration_minutes, is_active, created_at, updated_at) VALUES (?, ?, ?, 240, 43200, 1, ?, ?)',
  );
  const insertTier = sqlite.prepare(
    'INSERT INTO rate_tiers (rate_plan_id, from_days, discount_bp) VALUES (?, ?, ?)',
  );
  const ratePlanIds: number[] = [];
  for (const p of plans) {
    const r = insertPlan.run(p.publicId, p.name, p.baseDailyMinor, now, now);
    const rpId = Number(r.lastInsertRowid);
    ratePlanIds.push(rpId);
    insertTier.run(rpId, 3, 800);
    insertTier.run(rpId, 7, 1800);
  }

  // Weekend multiplier (Sat=64, Sun=1 => mask 65) + upcoming festival rule
  sqlite
    .prepare(
      'INSERT INTO pricing_rules (rate_plan_id, kind, weekdays_mask, multiplier_bp, priority, label, is_active) VALUES (NULL, ?, ?, ?, 10, ?, 1)',
    )
    .run('weekday_multiplier', 65, 11500, 'Weekend demand (+15%)');
  sqlite
    .prepare(
      'INSERT INTO pricing_rules (rate_plan_id, kind, starts_on, ends_on, multiplier_bp, priority, label, is_active) VALUES (NULL, ?, ?, ?, ?, 5, ?, 1)',
    )
    .run(
      'date_range_multiplier',
      isoDateOffset(14),
      isoDateOffset(18),
      12000,
      'Peak holiday window (+20%)',
    );

  // 4. Addons, Protection Plans, Promos, Features
  const addonRows = [
    [
      'ad_child_seat',
      'Isofix Child Seat',
      'Forward or rear-facing seat (9-36 kg)',
      'per_day',
      35000,
      2,
    ],
    [
      'ad_additional_driver',
      'Additional Verified Driver',
      'Second named driver on the rental agreement',
      'flat',
      60000,
      1,
    ],
    [
      'ad_dashcam',
      'Dual-Channel Dashcam',
      'Pre-mounted 1080p front and cabin recorder',
      'per_day',
      25000,
      1,
    ],
    [
      'ad_fastag_topup',
      'Preloaded Toll Pass',
      '500 INR FASTag balance with zero convenience fee',
      'flat',
      50000,
      1,
    ],
    [
      'ad_roof_box',
      'Thule 400L Roof Box',
      'Weather-sealed luggage carrier for highway trips',
      'per_day',
      65000,
      1,
    ],
    [
      'ad_ev_charger',
      'Portable EV Fast-Charge Kit',
      '3.3kW/7.2kW Type-2 travel charger & CCS adapter',
      'flat',
      45000,
      1,
    ],
    [
      'ad_wifi_gps',
      'In-Car 5G Hotspot & GPS',
      'Unlimited data Wi-Fi puck with offline hill-station maps',
      'per_day',
      20000,
      1,
    ],
    [
      'ad_bike_rack',
      'Tow-Hitch Bike Carrier',
      'Carries 2 road or mountain bikes safely',
      'per_day',
      55000,
      1,
    ],
  ] as const;
  const insertAddon = sqlite.prepare(
    'INSERT INTO addons (public_id, name, description, price_type, price_minor, max_qty, is_refundable, is_active) VALUES (?, ?, ?, ?, ?, ?, 1, 1)',
  );
  const addonIds: number[] = [];
  for (const a of addonRows) {
    const r = insertAddon.run(...a);
    addonIds.push(Number(r.lastInsertRowid));
  }

  const protRows = [
    [
      'pp_basic',
      0,
      'Basic Cover',
      'Included statutory third-party & collision cover with standard excess.',
      JSON.stringify(['Third-party liability', 'Fire & theft', '24x7 roadside breakdown']),
      JSON.stringify(['Tyres & windscreen', 'Undercarriage', 'Interior stains']),
      0,
      1500000,
    ],
    [
      'pp_standard',
      1,
      'Smart Shield',
      'Halves your damage excess and adds windscreen & tyre protection.',
      JSON.stringify(['Reduced excess', 'Windscreen & glass', 'Tyre puncture/burst']),
      JSON.stringify(['Off-road use', 'Key loss']),
      49900,
      500000,
    ],
    [
      'pp_zero',
      2,
      'Zero Excess',
      'Zero deductible on body, glass, tyres, and key replacement.',
      JSON.stringify([
        'Zero damage excess',
        'Glass & tyres',
        'Key replacement',
        'Priority replacement car',
      ]),
      JSON.stringify(['Gross negligence or DUI']),
      99900,
      0,
    ],
  ] as const;
  const insertProt = sqlite.prepare(
    'INSERT INTO protection_plans (public_id, tier, name, summary, covered, not_covered, per_day_minor, excess_minor, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)',
  );
  const protIds: number[] = [];
  for (const p of protRows) {
    const r = insertProt.run(...p);
    protIds.push(Number(r.lastInsertRowid));
  }

  sqlite
    .prepare(
      'INSERT INTO promo_codes (code, kind, value, valid_from, valid_to, min_days, max_uses, used_count, per_user_limit, applies_to, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1, ?, 1)',
    )
    .run(
      'WELCOME10',
      'percent',
      1000,
      now - 86_400_000 * 30,
      now + 86_400_000 * 180,
      1,
      500,
      'base',
    );
  sqlite
    .prepare(
      'INSERT INTO promo_codes (code, kind, value, valid_from, valid_to, min_days, max_uses, used_count, per_user_limit, applies_to, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 2, ?, 1)',
    )
    .run(
      'WEEKEND500',
      'flat',
      50000,
      now - 86_400_000 * 15,
      now + 86_400_000 * 90,
      2,
      250,
      'subtotal',
    );
  sqlite
    .prepare(
      'INSERT INTO promo_codes (code, kind, value, valid_from, valid_to, min_days, max_uses, used_count, per_user_limit, applies_to, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1, ?, 0)',
    )
    .run(
      'EXPIRED25',
      'percent',
      2500,
      now - 86_400_000 * 90,
      now - 86_400_000 * 10,
      1,
      100,
      'base',
    );

  const featureList = [
    ['carplay', 'Apple CarPlay', 'smartphone', 1],
    ['android-auto', 'Android Auto', 'smartphone', 2],
    ['cruise-control', 'Cruise Control', 'gauge', 3],
    ['reverse-camera', 'Reverse Camera', 'camera', 4],
    ['isofix', 'ISOFIX Mounts', 'shield', 5],
    ['sunroof', 'Panoramic Sunroof', 'sun', 6],
    ['fastag', 'Active FASTag', 'tag', 7],
    ['ventilated-seats', 'Ventilated Seats', 'wind', 8],
    ['360-camera', '360 Surround Camera', 'eye', 9],
    ['adas', 'Level-2 ADAS', 'radar', 10],
  ] as const;
  const insertFeature = sqlite.prepare(
    'INSERT INTO features (slug, label, icon_key, sort_order) VALUES (?, ?, ?, ?)',
  );
  const featureIds: number[] = [];
  for (const f of featureList) {
    const r = insertFeature.run(...f);
    featureIds.push(Number(r.lastInsertRowid));
  }

  // 5. Users (4 Staff + 25 Customers)
  const devPasswordHash = await argon2Hash('kerb-dev-pass-2026');
  const insertUser = sqlite.prepare(
    'INSERT INTO user (id, name, email, emailVerified, role, twoFactorEnabled, createdAt, updatedAt) VALUES (?, ?, ?, 1, ?, 0, ?, ?)',
  );
  const insertAccount = sqlite.prepare(
    'INSERT INTO account (id, accountId, providerId, userId, password, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
  );
  const insertProfile = sqlite.prepare(
    'INSERT INTO user_profiles (user_id, full_name, phone, date_of_birth, address_line, city, postal_code, emergency_name, emergency_phone, is_blacklisted, blacklist_reason, staff_notes, locale) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  );

  const staffSpecs = [
    {
      id: 'usr_owner_dev',
      name: 'Arjun Menon',
      email: 'dev@kerb.local',
      role: 'owner',
      phone: '+91 98450 10001',
    },
    {
      id: 'usr_mgr_anita',
      name: 'Anita Rao',
      email: 'anita@kerb.local',
      role: 'manager',
      phone: '+91 98450 10002',
    },
    {
      id: 'usr_agent_ravi',
      name: 'Ravi Kulkarni',
      email: 'ravi@kerb.local',
      role: 'agent',
      phone: '+91 98450 10003',
    },
    {
      id: 'usr_agent_kavya',
      name: 'Kavya Nair',
      email: 'kavya@kerb.local',
      role: 'agent',
      phone: '+91 98450 10004',
    },
  ];
  for (const s of staffSpecs) {
    insertUser.run(s.id, s.name, s.email, s.role, now, now);
    insertAccount.run(`acc_${s.id}`, s.id, 'credential', s.id, devPasswordHash, now, now);
    insertProfile.run(
      s.id,
      s.name,
      s.phone,
      '1990-05-14',
      'Kerb Operations Desk, Indiranagar',
      'Bengaluru',
      '560038',
      'Operations Duty',
      '+91 80 4120 1100',
      0,
      null,
      'Core operations team',
      'en',
    );
  }

  const customerNames = [
    'Rohan Deshmukh',
    'Meera Krishnan',
    'Siddharth Iyer',
    'Priya Subramanian',
    'Vikramaditya Joshi',
    'Neha Agarwal',
    'Karthik Hegde',
    'Divya Shetty',
    'Aditya Nambiar',
    'Sneha Chatterjee',
    'Pranav Bhat',
    'Ishita Sengupta',
    'Varun Reddy',
    'Tanvi Kulkarni',
    'Nikhil Varma',
    'Shruti Pai',
    'Abhishek Kapoor',
    'Ananya Das',
    'Gaurav Malhotra',
    'Pooja Menon',
    'Deepak Gowda',
    'Riya Bansal',
    'Suresh Venkatesh',
    'Nandini Murthy',
    'Kiran Hegde',
  ];

  const dummyFront = await generateDummyDocBuffer('KA03 20220048192');
  const dummyBack = await generateDummyDocBuffer('ENDORSED LMV-NT');
  const dummyFrontKey = await savePrivateFile(dummyFront, 'licences');
  const dummyBackKey = await savePrivateFile(dummyBack, 'licences');

  const insertLicence = sqlite.prepare(`
    INSERT INTO driver_licences (user_id, licence_no_enc, licence_no_last4, key_version, issuing_region, class_codes, issued_on, expires_on, front_file_key, back_file_key, status, reviewed_by, reviewed_at, reject_reason, created_at)
    VALUES (?, ?, ?, ?, 'KA-03', 'LMV-NT', '2021-04-12', ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const customerIds: string[] = [];
  for (let i = 0; i < customerNames.length; i++) {
    const uid = `usr_cust_${String(i + 1).padStart(2, '0')}`;
    const fullName = customerNames[i]!;
    const email = `${fullName.toLowerCase().replace(/\s+/g, '.')}@example.in`;
    const isBlacklisted = i >= 23 ? 1 : 0;
    const dobYear = 1984 + (i % 16);
    insertUser.run(uid, fullName, email, 'customer', now - i * 86_400_000, now);
    insertAccount.run(`acc_${uid}`, uid, 'credential', uid, devPasswordHash, now, now);
    insertProfile.run(
      uid,
      fullName,
      `+91 98451 ${String(10100 + i * 37)}`,
      `${dobYear}-0${(i % 9) + 1}-1${i % 9}`,
      `${14 + i}, 12th Main Road, HAL 2nd Stage`,
      'Bengaluru',
      '560038',
      'Emergency Contact',
      '+91 98450 99000',
      isBlacklisted,
      isBlacklisted ? 'Unresolved toll & late-return balance from previous rental' : null,
      i === 0 ? 'Frequent airport traveller, prefers automatic' : null,
      'en',
    );
    customerIds.push(uid);

    // Mixed KYC statuses: 14 verified, 5 pending, 3 rejected, 2 expired, 1 no licence
    if (i < 24) {
      const status = i < 14 ? 'verified' : i < 19 ? 'pending' : i < 22 ? 'rejected' : 'expired';
      const expiresOn = status === 'expired' ? isoDateOffset(-40) : '2035-08-20';
      const plainNo = `KA03202100${String(4100 + i)}`;
      const enc = encryptLicenceNumber(plainNo);
      insertLicence.run(
        uid,
        enc.ciphertext,
        enc.last4,
        enc.keyVersion,
        expiresOn,
        dummyFrontKey,
        dummyBackKey,
        status,
        status === 'pending' ? null : 'usr_mgr_anita',
        status === 'pending' ? null : now - 86_400_000 * 3,
        status === 'rejected'
          ? 'Blurry glare across expiry date; please re-upload in daylight'
          : null,
        now - 86_400_000 * 5,
      );
    }
  }

  // 6. 18 Realistic Vehicles across all 7 categories
  interface SeedVehicle {
    slug: string;
    make: string;
    model: string;
    variant: string;
    year: number;
    plate: string;
    category: 'hatchback' | 'sedan' | 'suv' | 'muv' | 'luxury' | 'ev' | 'van';
    transmission: 'manual' | 'automatic';
    fuelType: 'petrol' | 'diesel' | 'hybrid' | 'electric' | 'cng';
    seats: number;
    doors: number;
    luggageLiters: number;
    engineCc: number | null;
    batteryKwh: number | null;
    rangeKm: number | null;
    paintName: string;
    paintHex: string;
    ratePlanIdx: number;
    depositMinor: number;
    kmPerDay: number | null;
    extraKmMinor: number;
    homeBranchIdx: number;
    opsState: 'ready' | 'cleaning' | 'inspection' | 'hold';
    hasImages: boolean;
    description: string;
  }

  const vehicleSpecs: SeedVehicle[] = [
    {
      slug: 'maruti-swift-zxi-plus',
      make: 'Maruti Suzuki',
      model: 'Swift',
      variant: 'ZXi+ AMT',
      year: 2025,
      plate: 'KA03NC4120',
      category: 'hatchback',
      transmission: 'automatic',
      fuelType: 'petrol',
      seats: 5,
      doors: 5,
      luggageLiters: 268,
      engineCc: 1197,
      batteryKwh: null,
      rangeKm: null,
      paintName: 'Pearl Arctic White',
      paintHex: '#EAECEF',
      ratePlanIdx: 0,
      depositMinor: 500000,
      kmPerDay: 240,
      extraKmMinor: 1200,
      homeBranchIdx: 0,
      opsState: 'ready',
      hasImages: true,
      description:
        'Nimble city hatchback with crisp AMT shifts, wireless CarPlay, and effortless parking.',
    },
    {
      slug: 'hyundai-i20-asta-o',
      make: 'Hyundai',
      model: 'i20',
      variant: 'Asta (O) IVT',
      year: 2024,
      plate: 'KA01MX7781',
      category: 'hatchback',
      transmission: 'automatic',
      fuelType: 'petrol',
      seats: 5,
      doors: 5,
      luggageLiters: 311,
      engineCc: 1197,
      batteryKwh: null,
      rangeKm: null,
      paintName: 'Starry Night',
      paintHex: '#1F4A8A',
      ratePlanIdx: 0,
      depositMinor: 500000,
      kmPerDay: 240,
      extraKmMinor: 1200,
      homeBranchIdx: 2,
      opsState: 'ready',
      hasImages: true,
      description:
        'Refined CVT hatchback tuned for Outer Ring Road traffic with Bose audio and sunroof.',
    },
    {
      slug: 'tata-altroz-xz-plus',
      make: 'Tata',
      model: 'Altroz',
      variant: 'XZ+ Diesel',
      year: 2024,
      plate: 'KA05MN3304',
      category: 'hatchback',
      transmission: 'manual',
      fuelType: 'diesel',
      seats: 5,
      doors: 5,
      luggageLiters: 345,
      engineCc: 1497,
      batteryKwh: null,
      rangeKm: null,
      paintName: 'Arcade Grey',
      paintHex: '#63686E',
      ratePlanIdx: 0,
      depositMinor: 500000,
      kmPerDay: 300,
      extraKmMinor: 1100,
      homeBranchIdx: 0,
      opsState: 'ready',
      hasImages: true,
      description:
        '5-star rated diesel hatchback with flat floor comfort and long-range highway economy.',
    },
    {
      slug: 'honda-city-ehev-zx',
      make: 'Honda',
      model: 'City e:HEV',
      variant: 'ZX Hybrid',
      year: 2025,
      plate: 'KA03ND9012',
      category: 'sedan',
      transmission: 'automatic',
      fuelType: 'hybrid',
      seats: 5,
      doors: 4,
      luggageLiters: 410,
      engineCc: 1498,
      batteryKwh: null,
      rangeKm: null,
      paintName: 'Obsidian Blue',
      paintHex: '#233B5D',
      ratePlanIdx: 1,
      depositMinor: 750000,
      kmPerDay: 300,
      extraKmMinor: 1500,
      homeBranchIdx: 1,
      opsState: 'ready',
      hasImages: true,
      description:
        'Self-charging strong hybrid delivering 27 km/l in city traffic with Honda Sensing ADAS.',
    },
    {
      slug: 'skoda-slavia-style-15',
      make: 'Skoda',
      model: 'Slavia',
      variant: '1.5 TSI DSG',
      year: 2025,
      plate: 'KA01NA5518',
      category: 'sedan',
      transmission: 'automatic',
      fuelType: 'petrol',
      seats: 5,
      doors: 4,
      luggageLiters: 521,
      engineCc: 1498,
      batteryKwh: null,
      rangeKm: null,
      paintName: 'Tornado Red',
      paintHex: '#C83E2B',
      ratePlanIdx: 1,
      depositMinor: 800000,
      kmPerDay: 300,
      extraKmMinor: 1600,
      homeBranchIdx: 0,
      opsState: 'ready',
      hasImages: true,
      description:
        'Enthusiast turbo-petrol sedan with cavernous 521L boot for weekend runs to Coorg.',
    },
    {
      slug: 'volkswagen-virtus-gt',
      make: 'Volkswagen',
      model: 'Virtus',
      variant: 'GT Plus 1.5 DSG',
      year: 2024,
      plate: 'KA03MZ1844',
      category: 'sedan',
      transmission: 'automatic',
      fuelType: 'petrol',
      seats: 5,
      doors: 4,
      luggageLiters: 521,
      engineCc: 1498,
      batteryKwh: null,
      rangeKm: null,
      paintName: 'Carbon Steel',
      paintHex: '#3B3F46',
      ratePlanIdx: 1,
      depositMinor: 800000,
      kmPerDay: 300,
      extraKmMinor: 1600,
      homeBranchIdx: 2,
      opsState: 'cleaning',
      hasImages: true,
      description:
        'Composed German highway sedan with ventilated front seats and crisp dual-clutch gearbox.',
    },
    {
      slug: 'hyundai-creta-sx-o-diesel',
      make: 'Hyundai',
      model: 'Creta',
      variant: 'SX(O) Diesel AT',
      year: 2025,
      plate: 'KA03NE6201',
      category: 'suv',
      transmission: 'automatic',
      fuelType: 'diesel',
      seats: 5,
      doors: 5,
      luggageLiters: 433,
      engineCc: 1493,
      batteryKwh: null,
      rangeKm: null,
      paintName: 'Ranger Khaki',
      paintHex: '#4B5645',
      ratePlanIdx: 1,
      depositMinor: 800000,
      kmPerDay: 300,
      extraKmMinor: 1600,
      homeBranchIdx: 1,
      opsState: 'ready',
      hasImages: true,
      description:
        'Effortless diesel automatic crossover with 360 camera, ADAS, and panoramic roof.',
    },
    {
      slug: 'mahindra-xuv700-ax7l',
      make: 'Mahindra',
      model: 'XUV700',
      variant: 'AX7L AWD Diesel',
      year: 2025,
      plate: 'KA01NB8890',
      category: 'suv',
      transmission: 'automatic',
      fuelType: 'diesel',
      seats: 7,
      doors: 5,
      luggageLiters: 240,
      engineCc: 2198,
      batteryKwh: null,
      rangeKm: null,
      paintName: 'Everest White',
      paintHex: '#F3F4F6',
      ratePlanIdx: 2,
      depositMinor: 1000000,
      kmPerDay: 300,
      extraKmMinor: 1800,
      homeBranchIdx: 0,
      opsState: 'ready',
      hasImages: true,
      description:
        '7-seat all-wheel-drive tourer built for Western Ghats climbs and family road trips.',
    },
    {
      slug: 'toyota-urban-cruiser-hyryder',
      make: 'Toyota',
      model: 'Hyryder',
      variant: 'V Strong Hybrid',
      year: 2024,
      plate: 'KA05MP4421',
      category: 'suv',
      transmission: 'automatic',
      fuelType: 'hybrid',
      seats: 5,
      doors: 5,
      luggageLiters: 373,
      engineCc: 1490,
      batteryKwh: null,
      rangeKm: null,
      paintName: 'Cave Black',
      paintHex: '#2B2A28',
      ratePlanIdx: 1,
      depositMinor: 800000,
      kmPerDay: 300,
      extraKmMinor: 1500,
      homeBranchIdx: 1,
      opsState: 'ready',
      hasImages: true,
      description:
        'Quiet hybrid SUV that glides on electric power in city traffic and cruises cleanly.',
    },
    {
      slug: 'mahindra-thar-4x4-at',
      make: 'Mahindra',
      model: 'Thar',
      variant: 'LX Hard Top 4x4 AT',
      year: 2024,
      plate: 'KA03MY2049',
      category: 'suv',
      transmission: 'automatic',
      fuelType: 'diesel',
      seats: 4,
      doors: 3,
      luggageLiters: 200,
      engineCc: 2184,
      batteryKwh: null,
      rangeKm: null,
      paintName: 'Deep Forest',
      paintHex: '#2F6A4A',
      ratePlanIdx: 1,
      depositMinor: 1000000,
      kmPerDay: 250,
      extraKmMinor: 1800,
      homeBranchIdx: 0,
      opsState: 'ready',
      hasImages: true,
      description: 'True 4x4 hardtop with low-range transfer case for coffee-estate trails.',
    },
    {
      slug: 'toyota-innova-hycross-zx',
      make: 'Toyota',
      model: 'Innova Hycross',
      variant: 'ZX (O) Hybrid 7S',
      year: 2025,
      plate: 'KA01NC7100',
      category: 'muv',
      transmission: 'automatic',
      fuelType: 'hybrid',
      seats: 7,
      doors: 5,
      luggageLiters: 300,
      engineCc: 1987,
      batteryKwh: null,
      rangeKm: null,
      paintName: 'Platinum White',
      paintHex: '#EDEFF2',
      ratePlanIdx: 2,
      depositMinor: 1000000,
      kmPerDay: 300,
      extraKmMinor: 1800,
      homeBranchIdx: 1,
      opsState: 'ready',
      hasImages: true,
      description:
        'Ottoman captain seats, monocoque ride comfort, and strong hybrid economy for 7.',
    },
    {
      slug: 'kia-carens-luxury-plus',
      make: 'Kia',
      model: 'Carens',
      variant: 'Luxury Plus 6S',
      year: 2024,
      plate: 'KA05MQ1192',
      category: 'muv',
      transmission: 'automatic',
      fuelType: 'diesel',
      seats: 6,
      doors: 5,
      luggageLiters: 216,
      engineCc: 1493,
      batteryKwh: null,
      rangeKm: null,
      paintName: 'Imperial Blue',
      paintHex: '#1D3557',
      ratePlanIdx: 1,
      depositMinor: 800000,
      kmPerDay: 300,
      extraKmMinor: 1500,
      homeBranchIdx: 2,
      opsState: 'ready',
      hasImages: true,
      description:
        'Three-row family mover with roof-mounted AC vents for every row and one-touch tumble.',
    },
    {
      slug: 'bmw-330li-m-sport',
      make: 'BMW',
      model: '3 Series Gran Limousine',
      variant: '330Li M Sport',
      year: 2025,
      plate: 'KA01ND0099',
      category: 'luxury',
      transmission: 'automatic',
      fuelType: 'petrol',
      seats: 5,
      doors: 4,
      luggageLiters: 480,
      engineCc: 1998,
      batteryKwh: null,
      rangeKm: null,
      paintName: 'Mineral White',
      paintHex: '#F0F1F3',
      ratePlanIdx: 3,
      depositMinor: 2500000,
      kmPerDay: 250,
      extraKmMinor: 3500,
      homeBranchIdx: 1,
      opsState: 'ready',
      hasImages: true,
      description:
        'Long-wheelbase executive saloon with 258 hp, Harman Kardon audio, and rear legroom.',
    },
    {
      slug: 'mercedes-gla-220d-4matic',
      make: 'Mercedes-Benz',
      model: 'GLA',
      variant: '220d 4MATIC AMG Line',
      year: 2024,
      plate: 'KA03NA3344',
      category: 'luxury',
      transmission: 'automatic',
      fuelType: 'diesel',
      seats: 5,
      doors: 5,
      luggageLiters: 435,
      engineCc: 1950,
      batteryKwh: null,
      rangeKm: null,
      paintName: 'Mountain Grey',
      paintHex: '#5A6068',
      ratePlanIdx: 3,
      depositMinor: 2500000,
      kmPerDay: 250,
      extraKmMinor: 3500,
      homeBranchIdx: 0,
      opsState: 'inspection',
      hasImages: true,
      description:
        'All-wheel-drive luxury compact SUV with MBUX dual displays and effortless torque.',
    },
    {
      slug: 'byd-atto-3-extended',
      make: 'BYD',
      model: 'Atto 3',
      variant: 'Extended Range',
      year: 2025,
      plate: 'KA03EV0104',
      category: 'ev',
      transmission: 'automatic',
      fuelType: 'electric',
      seats: 5,
      doors: 5,
      luggageLiters: 440,
      engineCc: null,
      batteryKwh: 60.5,
      rangeKm: 420,
      paintName: 'Surf Blue',
      paintHex: '#3A7CA5',
      ratePlanIdx: 2,
      depositMinor: 1000000,
      kmPerDay: null,
      extraKmMinor: 0,
      homeBranchIdx: 1,
      opsState: 'ready',
      hasImages: true,
      description:
        'Unlimited km electric SUV with 420 km real-world range and DC fast-charge cable included.',
    },
    {
      slug: 'tata-nexon-ev-lr',
      make: 'Tata',
      model: 'Nexon.ev',
      variant: 'Empowered+ LR',
      year: 2025,
      plate: 'KA01EV0218',
      category: 'ev',
      transmission: 'automatic',
      fuelType: 'electric',
      seats: 5,
      doors: 5,
      luggageLiters: 350,
      engineCc: null,
      batteryKwh: 45,
      rangeKm: 340,
      paintName: 'Pristine White',
      paintHex: '#F2F4F5',
      ratePlanIdx: 2,
      depositMinor: 800000,
      kmPerDay: null,
      extraKmMinor: 0,
      homeBranchIdx: 0,
      opsState: 'ready',
      hasImages: true,
      description:
        'Zero-tailpipe city and Mysuru expressway EV with ventilated seats and V2L outlet.',
    },
    {
      slug: 'hyundai-ioniq-5-rwd',
      make: 'Hyundai',
      model: 'IONIQ 5',
      variant: 'Long Range RWD',
      year: 2024,
      plate: 'KA03EV0088',
      category: 'ev',
      transmission: 'automatic',
      fuelType: 'electric',
      seats: 5,
      doors: 5,
      luggageLiters: 527,
      engineCc: null,
      batteryKwh: 72.6,
      rangeKm: 480,
      paintName: 'Gravity Gold Matte',
      paintHex: '#A79E8B',
      ratePlanIdx: 3,
      depositMinor: 1500000,
      kmPerDay: null,
      extraKmMinor: 0,
      homeBranchIdx: 2,
      opsState: 'ready',
      hasImages: true,
      description:
        '800V ultra-fast charging grand tourer with flat floor lounge seats and 480 km range.',
    },
    {
      slug: 'tata-punch-icng',
      make: 'Tata',
      model: 'Punch',
      variant: 'Accomplished iCNG MT',
      year: 2025,
      plate: 'KA05NC2210',
      category: 'hatchback',
      transmission: 'manual',
      fuelType: 'cng',
      seats: 5,
      doors: 5,
      luggageLiters: 210,
      engineCc: 1199,
      batteryKwh: null,
      rangeKm: null,
      paintName: 'Foliage Green',
      paintHex: '#5C6F58',
      ratePlanIdx: 0,
      depositMinor: 500000,
      kmPerDay: 280,
      extraKmMinor: 1000,
      homeBranchIdx: 0,
      opsState: 'ready',
      hasImages: true,
      description:
        'Twin-cylinder iCNG micro-SUV with high ground clearance and ultra-low city running cost.',
    },
    {
      slug: 'mahindra-thar-4x4-mt',
      make: 'Mahindra',
      model: 'Thar',
      variant: 'LX 4x4 Petrol MT',
      year: 2024,
      plate: 'KA03MX4092',
      category: 'suv',
      transmission: 'manual',
      fuelType: 'petrol',
      seats: 4,
      doors: 3,
      luggageLiters: 200,
      engineCc: 1997,
      batteryKwh: null,
      rangeKm: null,
      paintName: 'Napoli Black',
      paintHex: '#1F2124',
      ratePlanIdx: 1,
      depositMinor: 1000000,
      kmPerDay: 250,
      extraKmMinor: 1800,
      homeBranchIdx: 2,
      opsState: 'ready',
      hasImages: true,
      description:
        'Enthusiast 6-speed manual 4x4 petrol hardtop with mechanical locking differential.',
    },
    {
      slug: 'kia-seltos-gtx-plus',
      make: 'Kia',
      model: 'Seltos',
      variant: 'GTX+ 1.5 Turbo DCT',
      year: 2025,
      plate: 'KA01NE3381',
      category: 'suv',
      transmission: 'automatic',
      fuelType: 'petrol',
      seats: 5,
      doors: 5,
      luggageLiters: 433,
      engineCc: 1482,
      batteryKwh: null,
      rangeKm: null,
      paintName: 'Matte Graphite',
      paintHex: '#4C5056',
      ratePlanIdx: 1,
      depositMinor: 850000,
      kmPerDay: 300,
      extraKmMinor: 1600,
      homeBranchIdx: 1,
      opsState: 'ready',
      hasImages: true,
      description:
        '160 PS turbo-petrol DCT SUV with dual 10.25-inch displays, Bose 8-speaker audio, and ADAS.',
    },
    {
      slug: 'audi-a6-technology',
      make: 'Audi',
      model: 'A6',
      variant: '45 TFSI Technology',
      year: 2025,
      plate: 'KA01ND0108',
      category: 'luxury',
      transmission: 'automatic',
      fuelType: 'petrol',
      seats: 5,
      doors: 4,
      luggageLiters: 530,
      engineCc: 1984,
      batteryKwh: null,
      rangeKm: null,
      paintName: 'Firmament Blue',
      paintHex: '#1D344E',
      ratePlanIdx: 3,
      depositMinor: 2500000,
      kmPerDay: 250,
      extraKmMinor: 3500,
      homeBranchIdx: 0,
      opsState: 'ready',
      hasImages: true,
      description:
        'Executive mild-hybrid saloon with four-zone climate control, Matrix LED lamps, and B&O sound.',
    },
    {
      slug: 'force-traveller-executive-9s',
      make: 'Force',
      model: 'Urbania',
      variant: 'Executive 9-Seater',
      year: 2025,
      plate: 'KA01VA9001',
      category: 'van',
      transmission: 'manual',
      fuelType: 'diesel',
      seats: 9,
      doors: 4,
      luggageLiters: 900,
      engineCc: 2596,
      batteryKwh: null,
      rangeKm: null,
      paintName: 'Arctic Silver',
      paintHex: '#C5CAD0',
      ratePlanIdx: 3,
      depositMinor: 1500000,
      kmPerDay: 300,
      extraKmMinor: 2400,
      homeBranchIdx: 1,
      opsState: 'ready',
      hasImages: true,
      description:
        'High-roof monocoque tourer van with reclining individual seats and huge luggage bay.',
    },
  ];

  const insertVehicle = sqlite.prepare(`
    INSERT INTO vehicles (
      public_id, slug, home_branch_id, current_branch_id, make, model, variant, year, plate, vin,
      category, transmission, fuel_type, seats, doors, luggage_liters, engine_cc, battery_kwh, range_km,
      paint_name, paint_hex, rate_plan_id, deposit_minor, km_per_day, extra_km_minor,
      min_driver_age, min_licence_years, odometer_km, lifecycle, ops_state, description, specs_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?)
  `);
  const insertVehicleImage = sqlite.prepare(`
    INSERT INTO vehicle_images (public_id, vehicle_id, file_key, width, height, thumbhash, alt_text, shot_type, is_primary, sort_order, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertVehicleFeature = sqlite.prepare(
    'INSERT INTO vehicle_features (vehicle_id, feature_id) VALUES (?, ?)',
  );
  const insertVehicleDoc = sqlite.prepare(`
    INSERT INTO vehicle_documents (vehicle_id, kind, reference_no, issued_on, expires_on, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const vehicleIds: number[] = [];
  for (let i = 0; i < vehicleSpecs.length; i++) {
    const v = vehicleSpecs[i]!;
    const branchId = branchIds[v.homeBranchIdx]!;
    const ratePlanId = ratePlanIds[v.ratePlanIdx]!;
    const res = insertVehicle.run(
      `veh_${String(i + 1).padStart(2, '0')}`,
      v.slug,
      branchId,
      branchId,
      v.make,
      v.model,
      v.variant,
      v.year,
      v.plate,
      `MAK${v.year}KERB${String(10000 + i)}`,
      v.category,
      v.transmission,
      v.fuelType,
      v.seats,
      v.doors,
      v.luggageLiters,
      v.engineCc,
      v.batteryKwh,
      v.rangeKm,
      v.paintName,
      v.paintHex,
      ratePlanId,
      v.depositMinor,
      v.kmPerDay,
      v.extraKmMinor,
      v.category === 'luxury' ? 25 : 21,
      v.category === 'luxury' ? 3 : 1,
      8500 + i * 2400,
      v.opsState,
      v.description,
      JSON.stringify({ groundClearanceMm: v.category === 'suv' ? 205 : 170 }),
      now - 86_400_000 * 60,
      now,
    );
    const vid = Number(res.lastInsertRowid);
    vehicleIds.push(vid);

    if (v.hasImages) {
      const imgBuf = await loadSeedCarImage(v.slug, v.paintHex, `${v.make} ${v.model}`, v.category);
      const saved = await processAndSaveVehicleImage(imgBuf);
      insertVehicleImage.run(
        `img_${vid}_1`,
        vid,
        saved.fileKey,
        saved.width,
        saved.height,
        saved.thumbhash,
        `${v.year} ${v.make} ${v.model} ${v.variant} in ${v.paintName}, front three-quarter view`,
        'front34',
        1,
        0,
        now,
      );
      const detailBuf = await createDetailCropBuffer(imgBuf);
      const savedDetail = await processAndSaveVehicleImage(detailBuf);
      insertVehicleImage.run(
        `img_${vid}_2`,
        vid,
        savedDetail.fileKey,
        savedDetail.width,
        savedDetail.height,
        savedDetail.thumbhash,
        `${v.year} ${v.make} ${v.model} exterior detail`,
        'detail',
        0,
        1,
        now,
      );
    }

    // Assign 4-6 features per vehicle
    for (let fIdx = 0; fIdx < featureIds.length; fIdx++) {
      if ((i + fIdx) % 2 === 0 || fIdx < 3) {
        insertVehicleFeature.run(vid, featureIds[fIdx]);
      }
    }

    // Documents: vehicle 0 has insurance expiring in 5 days, vehicle 2 has expired emissions cert
    insertVehicleDoc.run(vid, 'registration', `RC-${v.plate}`, '2024-01-10', '2039-01-09', now);
    insertVehicleDoc.run(
      vid,
      'insurance',
      `INS-${v.plate}`,
      isoDateOffset(-350),
      i === 0 ? isoDateOffset(5) : isoDateOffset(180 + i * 5),
      now,
    );
    insertVehicleDoc.run(
      vid,
      'emissions',
      `PUC-${v.plate}`,
      isoDateOffset(-190),
      i === 2 ? isoDateOffset(-4) : isoDateOffset(90 + i * 3),
      now,
    );
  }

  // 7. Realistic Bookings across statuses + vehicle_blocks + inspections + payments + maintenance + fines + claims + reviews
  const insertBooking = sqlite.prepare(`
    INSERT INTO bookings (
      public_id, code, user_id, vehicle_id, pickup_branch_id, return_branch_id,
      start_at, end_at, actual_start_at, actual_end_at, status, currency,
      subtotal_minor, discount_minor, tax_minor, total_minor, deposit_minor,
      tax_rate_bp_snapshot, daily_rate_minor_snapshot, protection_plan_id,
      policy_snapshot_json, source, created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'INR', ?, ?, ?, ?, ?, 1800, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertLineItem = sqlite.prepare(`
    INSERT INTO booking_line_items (booking_id, kind, label, quantity, unit_minor, amount_minor, taxable, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertBookingEvent = sqlite.prepare(`
    INSERT INTO booking_events (booking_id, type, from_status, to_status, actor_user_id, actor_kind, payload_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertInvoice = sqlite.prepare(`
    INSERT INTO invoices (booking_id, series, fiscal_year, number, kind, snapshot_json, total_minor, issued_at)
    VALUES (?, 'KB', 2026, ?, 'invoice', ?, ?, ?)
  `);
  const insertBlock = sqlite.prepare(`
    INSERT INTO vehicle_blocks (vehicle_id, kind, booking_id, start_at, end_at, buffer_end_at, expires_at, released_at, note, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertPayment = sqlite.prepare(`
    INSERT INTO payments (public_id, booking_id, kind, status, amount_minor, provider, provider_ref, method, idempotency_key, reason, created_by, created_at)
    VALUES (?, ?, ?, 'succeeded', ?, 'fake', ?, 'card', ?, ?, ?, ?)
  `);
  const insertInspection = sqlite.prepare(`
    INSERT INTO inspections (public_id, booking_id, type, odometer_km, fuel_kind, fuel_level, cleanliness, notes, inspected_by, inspected_at)
    VALUES (?, ?, ?, ?, 'eighths', ?, 'clean', ?, 'usr_agent_ravi', ?)
  `);

  const bookingCount = isBenchmark ? 120 : 48;
  let bookingSeq = 1001;
  let invoiceNoSeq = 1;
  const completedBookingsForReviews: Array<{
    bookingId: number;
    vehicleId: number;
    userId: string;
  }> = [];

  for (let i = 0; i < bookingCount; i++) {
    const vehicleIdx = i % vehicleIds.length;
    const vid = vehicleIds[vehicleIdx];
    const vSpec = vehicleSpecs[vehicleIdx];
    if (!vid || !vSpec) continue;

    // Ensure dev@kerb.local has trips in each lifecycle state for easy inspection
    const uid =
      i === 0 || i === 8 || i === 12 || i === 16
        ? 'usr_owner_dev'
        : (customerIds[i % 20] ?? 'usr_cust_01');
    const pickupBranchId = branchIds[vSpec.homeBranchIdx] ?? branchIds[0] ?? 1;
    // Give ~35% of bookings a one-way return branch so routes are visible across the app
    const returnBranchIdx =
      i % 3 === 1 ? (vSpec.homeBranchIdx + 1) % branchIds.length : vSpec.homeBranchIdx;
    const returnBranchId = branchIds[returnBranchIdx] ?? pickupBranchId;

    const slot = Math.floor(i / vehicleIds.length);
    const days = slot === 0 && i >= 16 && i <= 19 ? 3 : 2;
    let startAt: number;
    let endAt: number;
    let status:
      | 'completed'
      | 'returned'
      | 'active'
      | 'confirmed'
      | 'pending_approval'
      | 'cancelled'
      | 'no_show';
    let actualStartAt: number | null = null;
    let actualEndAt: number | null = null;

    if (slot === 0 && i < 6) {
      // Recent completed trips (-28 to -10 days)
      startAt = daysFromNowMs(-28 + i * 2);
      endAt = startAt + days * 86_400_000;
      status = 'completed';
      actualStartAt = startAt;
      actualEndAt = endAt;
    } else if (slot === 0 && i < 12) {
      // Currently active trips: i=6,7 are overdue; i=8..11 are taken & on-route!
      const isOverdue = i < 8;
      startAt = daysFromNowMs(isOverdue ? -3 : -1);
      endAt = daysFromNowMs(isOverdue ? -1 : 2);
      status = 'active';
      actualStartAt = startAt + 15 * 60_000;
    } else if (slot === 0 && i < 16) {
      // Today / tomorrow confirmed pickups
      startAt = daysFromNowMs(i === 12 || i === 13 ? 0 : 1, 5);
      endAt = startAt + days * 86_400_000;
      status = 'confirmed';
    } else if (slot === 0 && i < 20) {
      // Requested / Pending approval (KYC pending)
      startAt = daysFromNowMs(3 + (i - 16));
      endAt = startAt + days * 86_400_000;
      status = 'pending_approval';
    } else if (slot === 0) {
      // Cancelled / no-show (blocks released)
      startAt = daysFromNowMs(-6);
      endAt = startAt + days * 86_400_000;
      status = i === 20 ? 'cancelled' : 'no_show';
    } else {
      const dayOffset = slot * 7 + (i % 3);
      startAt = daysFromNowMs(12 + dayOffset);
      endAt = startAt + days * 86_400_000;
      status = slot % 3 === 1 ? 'confirmed' : 'completed';
      if (status === 'completed') {
        actualStartAt = startAt;
        actualEndAt = endAt;
      }
    }

    const dailyRate = plans[vSpec.ratePlanIdx]?.baseDailyMinor ?? 249900;
    const baseAmount = dailyRate * days;
    const protIdx = i % 3;
    const protSpec = protRows[protIdx];
    const protAmount = protSpec ? protSpec[6] * days : 0;

    // Select 1-2 realistic addons for varied itemized receipts
    const chosenAddon = addonRows[i % addonRows.length];
    const hasAddon = i % 2 === 0 && chosenAddon;
    const addonAmount = hasAddon
      ? chosenAddon[3] === 'per_day'
        ? chosenAddon[4] * days
        : chosenAddon[4]
      : 0;

    const oneWayFeeMinor = pickupBranchId !== returnBranchId ? 75000 : 0;
    const promoDiscountMinor = i % 4 === 0 ? Math.round(baseAmount * 0.1) : 0;

    const taxableSubtotal =
      baseAmount + protAmount + addonAmount + oneWayFeeMinor - promoDiscountMinor;
    const tax = Math.round((taxableSubtotal * 1800) / 10000);
    const total = taxableSubtotal + tax;
    const code = `KRB-${bookingSeq++}`;
    const publicId = `bkg_${code.toLowerCase()}`;

    const res = insertBooking.run(
      publicId,
      code,
      uid,
      vid,
      pickupBranchId,
      returnBranchId,
      startAt,
      endAt,
      actualStartAt,
      actualEndAt,
      status,
      taxableSubtotal,
      promoDiscountMinor,
      tax,
      total,
      vSpec.depositMinor,
      dailyRate,
      protIds[protIdx],
      JSON.stringify({
        freeCancelHoursBeforePickup: 24,
        partialRefundHoursBeforePickup: 6,
        partialRefundPct: 50,
      }),
      i % 5 === 0 ? 'counter' : 'web',
      uid,
      startAt - 86_400_000,
      now,
    );
    const bookingId = Number(res.lastInsertRowid);

    const lineItemsForSnapshot: Array<{
      kind: string;
      label: string;
      quantity: number;
      unitMinor: number;
      amountMinor: number;
    }> = [];
    let sortOrd = 0;

    const pushLine = (
      kind: string,
      label: string,
      quantity: number,
      unitMinor: number,
      amountMinor: number,
      taxable: number,
    ) => {
      insertLineItem.run(
        bookingId,
        kind,
        label,
        quantity,
        unitMinor,
        amountMinor,
        taxable,
        sortOrd++,
      );
      lineItemsForSnapshot.push({ kind, label, quantity, unitMinor, amountMinor });
    };

    pushLine(
      'base',
      `${days} rental days · ${vSpec.make} ${vSpec.model}`,
      days,
      dailyRate,
      baseAmount,
      1,
    );
    if (protAmount > 0 && protSpec) {
      pushLine('protection', `Protection · ${protSpec[2]}`, days, protSpec[6], protAmount, 1);
    }
    if (hasAddon && chosenAddon) {
      const qty = chosenAddon[3] === 'per_day' ? days : 1;
      pushLine('addon', `Add-on · ${chosenAddon[1]}`, qty, chosenAddon[4], addonAmount, 1);
    }
    if (oneWayFeeMinor > 0) {
      pushLine('fee', 'One-way inter-hub return fee', 1, oneWayFeeMinor, oneWayFeeMinor, 1);
    }
    if (promoDiscountMinor > 0) {
      pushLine(
        'promo',
        'Promo code WELCOME10 (10% off base)',
        1,
        -promoDiscountMinor,
        -promoDiscountMinor,
        1,
      );
    }
    pushLine('tax', 'GST (18%)', 1, tax, tax, 0);

    // Booking lifecycle events
    insertBookingEvent.run(
      bookingId,
      'booking.created',
      null,
      status === 'pending_approval' ? 'pending_approval' : 'confirmed',
      uid,
      'customer',
      JSON.stringify({ source: i % 5 === 0 ? 'counter' : 'web' }),
      startAt - 86_400_000,
    );
    if (status === 'active' || status === 'completed') {
      insertBookingEvent.run(
        bookingId,
        'status.active',
        'confirmed',
        'active',
        'usr_agent_ravi',
        'staff',
        JSON.stringify({ note: 'Handover completed; vehicle on route' }),
        actualStartAt ?? startAt,
      );
    }
    if (status === 'completed') {
      insertBookingEvent.run(
        bookingId,
        'status.completed',
        'active',
        'completed',
        'usr_agent_ravi',
        'staff',
        JSON.stringify({ note: 'Vehicle checked in and deposit released' }),
        actualEndAt ?? endAt,
      );
    }

    // Seed official Tax Invoice for confirmed, active, and completed bookings
    if (status === 'confirmed' || status === 'active' || status === 'completed') {
      const invNo = invoiceNoSeq++;
      const pickupName = branchData[vSpec.homeBranchIdx]?.name ?? 'Indiranagar Hub';
      const returnName = branchData[returnBranchIdx]?.name ?? pickupName;
      insertInvoice.run(
        bookingId,
        invNo,
        JSON.stringify({
          invoiceNumber: `KB-2026-${String(invNo).padStart(4, '0')}`,
          bookingCode: code,
          vehicle: `${vSpec.year} ${vSpec.make} ${vSpec.model} ${vSpec.variant}`,
          plate: vSpec.plate,
          route: `${pickupName} -> ${returnName}`,
          subtotalMinor: taxableSubtotal,
          discountMinor: promoDiscountMinor,
          taxMinor: tax,
          totalMinor: total,
          depositMinor: vSpec.depositMinor,
          lineItems: lineItemsForSnapshot,
        }),
        total,
        startAt - 86_400_000,
      );
    }

    const isReleased = status === 'cancelled' || status === 'no_show' || status === 'completed';
    insertBlock.run(
      vid,
      'booking',
      bookingId,
      startAt,
      endAt,
      endAt + 90 * 60_000,
      null,
      isReleased ? now : null,
      `Seeded ${status} booking ${code}`,
      uid,
      startAt - 86_400_000,
    );

    insertPayment.run(
      `pay_${bookingId}_chg`,
      bookingId,
      'charge',
      total,
      `fake_ch_${code}`,
      `seed-chg-${code}`,
      'Booking payment',
      uid,
      startAt - 86_400_000,
    );
    if (status === 'active' || status === 'confirmed') {
      insertPayment.run(
        `pay_${bookingId}_dep`,
        bookingId,
        'deposit_hold',
        vSpec.depositMinor,
        `fake_dep_${code}`,
        `seed-dep-${code}`,
        'Security deposit hold',
        uid,
        startAt - 86_400_000,
      );
    } else if (status === 'completed') {
      insertPayment.run(
        `pay_${bookingId}_dep_rel`,
        bookingId,
        'deposit_release',
        vSpec.depositMinor,
        `fake_rel_${code}`,
        `seed-rel-${code}`,
        'Security deposit released on return',
        'usr_agent_ravi',
        actualEndAt ?? endAt,
      );
    }

    if (status === 'active' || status === 'completed') {
      insertInspection.run(
        `insp_${bookingId}_out`,
        bookingId,
        'checkout',
        8500 + vehicleIdx * 2400,
        8,
        'All panels clean, spare tyre and FASTag verified',
        startAt,
      );
    }
    if (status === 'completed') {
      insertInspection.run(
        `insp_${bookingId}_in`,
        bookingId,
        'checkin',
        8780 + vehicleIdx * 2400,
        8,
        'Returned on time in clean condition',
        endAt,
      );
      if (completedBookingsForReviews.length < 10) {
        completedBookingsForReviews.push({ bookingId, vehicleId: vid, userId: uid });
      }
    }
  }

  sqlite
    .prepare('INSERT INTO invoice_sequences (series, fiscal_year, next_no) VALUES (?, ?, ?)')
    .run('KB', 2026, invoiceNoSeq);

  // Maintenance logs + blocks (placed cleanly in future slots without collision)
  const maintStart = daysFromNowMs(38);
  const maintEnd = maintStart + 86_400_000;
  const maintBlockRes = insertBlock.run(
    vehicleIds[13],
    'maintenance',
    null,
    maintStart,
    maintEnd,
    maintEnd,
    null,
    null,
    '30,000 km scheduled brake pad & fluid service',
    'usr_mgr_anita',
    now,
  );
  sqlite
    .prepare(
      'INSERT INTO maintenance_logs (vehicle_id, kind, title, notes, garage, cost_minor, starts_at, ends_at, odometer_km, next_due_on, next_due_km, status, block_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    )
    .run(
      vehicleIds[13],
      'service',
      '30,000 km Periodic Service',
      'Engine oil, cabin filter, brake pad inspection',
      'Sundaram Motors Indiranagar',
      1450000,
      maintStart,
      maintEnd,
      29800,
      isoDateOffset(180),
      40000,
      'scheduled',
      Number(maintBlockRes.lastInsertRowid),
    );

  // Fines & Damage claim
  sqlite
    .prepare(
      'INSERT INTO fines (vehicle_id, booking_id, reference_no, occurred_at, place, amount_minor, admin_fee_minor, status, created_at) VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?)',
    )
    .run(
      vehicleIds[0],
      'BTP-2026-88412',
      daysFromNowMs(-20),
      'Outer Ring Road, Bellandur',
      100000,
      25000,
      'open',
      now,
    );

  sqlite
    .prepare(
      'INSERT INTO damage_claims (booking_id, description, estimate_minor, final_minor, status, opened_by, opened_at) VALUES (2, ?, ?, NULL, ?, ?, ?)',
    )
    .run(
      '3 cm scuff on rear bumper corner during parking',
      350000,
      'customer_notified',
      'usr_agent_ravi',
      now - 86_400_000 * 2,
    );

  // Reviews
  const reviewComments = [
    'Spotless cabin and five-minute airport handover. Exactly as quoted.',
    'Smooth hybrid drive up to Nandi Hills and quick deposit release on return.',
    'Clear pricing with no surprises at the counter. Will book again.',
    'Car felt factory fresh and the FASTag worked through every toll.',
    'Friendly staff at Indiranagar hub, took 3 minutes to verify and hand over keys.',
  ];
  const insertReview = sqlite.prepare(
    'INSERT INTO reviews (booking_id, vehicle_id, user_id, rating_condition, rating_clean, rating_pickup, comment, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
  );
  for (let i = 0; i < completedBookingsForReviews.length; i++) {
    const rb = completedBookingsForReviews[i]!;
    insertReview.run(
      rb.bookingId,
      rb.vehicleId,
      rb.userId,
      5,
      i % 4 === 0 ? 4 : 5,
      5,
      reviewComments[i % reviewComments.length],
      'published',
      now - (i + 1) * 86_400_000,
    );
  }

  // Benchmark mode: extra synthetic vehicles + blocks
  if (isBenchmark) {
    console.log('Running --benchmark expansion (500 vehicles, 20,000 blocks)...');
    const txn = sqlite.transaction(() => {
      const baseVidCount = vehicleIds.length;
      for (let v = baseVidCount; v < 500; v++) {
        const res = insertVehicle.run(
          `veh_bm_${v}`,
          `benchmark-car-${v}`,
          branchIds[v % branchIds.length],
          branchIds[v % branchIds.length],
          'Maruti Suzuki',
          `Swift BM-${v}`,
          'ZXi',
          2024,
          `KA03BM${String(1000 + v)}`,
          `BMVIN${String(100000 + v)}`,
          'hatchback',
          'automatic',
          'petrol',
          5,
          5,
          268,
          1197,
          null,
          null,
          'Arctic White',
          '#EAECEF',
          ratePlanIds[0],
          500000,
          240,
          1200,
          21,
          1,
          10000,
          'ready',
          'Benchmark fleet unit',
          '{}',
          now,
          now,
        );
        const vid = Number(res.lastInsertRowid);
        for (let b = 0; b < 40; b++) {
          const s = daysFromNowMs(60 + b * 4);
          const e = s + 2 * 86_400_000;
          insertBlock.run(
            vid,
            'manual',
            null,
            s,
            e,
            e + 90 * 60_000,
            null,
            null,
            'bm',
            'seed',
            now,
          );
        }
      }
    });
    txn();
  }

  // Keep lint happy on unused rand if needed
  void rand();

  console.log(
    `Seeded Kerb DB: ${branchIds.length} branches, ${vehicleIds.length} vehicles (${isBenchmark ? '500 total in benchmark' : 'standard'}), ${customerIds.length} customers, ${bookingCount} bookings.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
