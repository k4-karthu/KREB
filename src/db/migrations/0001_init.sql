-- Kerb v2 Initial Schema (STRICT SQLite)

CREATE TABLE IF NOT EXISTS _migrations (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  applied_at INTEGER NOT NULL
) STRICT;

-- Better Auth core tables
CREATE TABLE IF NOT EXISTS user (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  emailVerified INTEGER NOT NULL DEFAULT 0 CHECK (emailVerified IN (0,1)),
  image TEXT,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','agent','manager','owner')),
  twoFactorEnabled INTEGER NOT NULL DEFAULT 0 CHECK (twoFactorEnabled IN (0,1)),
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS session (
  id TEXT PRIMARY KEY,
  expiresAt INTEGER NOT NULL,
  token TEXT NOT NULL UNIQUE,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  ipAddress TEXT,
  userAgent TEXT,
  userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE
) STRICT;

CREATE TABLE IF NOT EXISTS account (
  id TEXT PRIMARY KEY,
  accountId TEXT NOT NULL,
  providerId TEXT NOT NULL,
  userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  accessToken TEXT,
  refreshToken TEXT,
  idToken TEXT,
  accessTokenExpiresAt INTEGER,
  refreshTokenExpiresAt INTEGER,
  scope TEXT,
  password TEXT,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS verification (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expiresAt INTEGER NOT NULL,
  createdAt INTEGER,
  updatedAt INTEGER
) STRICT;

CREATE TABLE IF NOT EXISTS twoFactor (
  id TEXT PRIMARY KEY,
  secret TEXT NOT NULL,
  backupCodes TEXT NOT NULL,
  verified INTEGER NOT NULL DEFAULT 0,
  failedVerificationCount INTEGER NOT NULL DEFAULT 0,
  lockedUntil INTEGER,
  userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE
) STRICT;

-- Customer profile & KYC
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id TEXT PRIMARY KEY REFERENCES user(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  date_of_birth TEXT,
  address_line TEXT,
  city TEXT,
  postal_code TEXT,
  emergency_name TEXT,
  emergency_phone TEXT,
  is_blacklisted INTEGER NOT NULL DEFAULT 0 CHECK (is_blacklisted IN (0,1)),
  blacklist_reason TEXT,
  staff_notes TEXT,
  locale TEXT NOT NULL DEFAULT 'en'
) STRICT;

CREATE TABLE IF NOT EXISTS driver_licences (
  id INTEGER PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES user(id),
  licence_no_enc BLOB NOT NULL,
  licence_no_last4 TEXT NOT NULL,
  key_version INTEGER NOT NULL,
  issuing_region TEXT,
  class_codes TEXT,
  issued_on TEXT,
  expires_on TEXT NOT NULL,
  front_file_key TEXT NOT NULL,
  back_file_key TEXT,
  selfie_file_key TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','rejected','expired')),
  reviewed_by TEXT REFERENCES user(id),
  reviewed_at INTEGER,
  reject_reason TEXT,
  created_at INTEGER NOT NULL
) STRICT;

-- Branches & Hours
CREATE TABLE IF NOT EXISTS branches (
  id INTEGER PRIMARY KEY,
  public_id TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT NOT NULL,
  lat REAL,
  lng REAL,
  timezone TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  allows_after_hours INTEGER NOT NULL DEFAULT 0 CHECK (allows_after_hours IN (0,1)),
  after_hours_fee_minor INTEGER NOT NULL DEFAULT 0 CHECK (after_hours_fee_minor >= 0),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
) STRICT;

CREATE TABLE IF NOT EXISTS branch_hours (
  branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  weekday INTEGER NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  opens_minute INTEGER NOT NULL CHECK (opens_minute BETWEEN 0 AND 1440),
  closes_minute INTEGER NOT NULL CHECK (closes_minute BETWEEN 0 AND 1440),
  PRIMARY KEY (branch_id, weekday)
) STRICT;

CREATE TABLE IF NOT EXISTS branch_closures (
  id INTEGER PRIMARY KEY,
  branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  starts_on TEXT NOT NULL,
  ends_on TEXT NOT NULL,
  reason TEXT
) STRICT;

CREATE TABLE IF NOT EXISTS one_way_fees (
  from_branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  to_branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  fee_minor INTEGER NOT NULL CHECK (fee_minor >= 0),
  PRIMARY KEY (from_branch_id, to_branch_id)
) STRICT;

-- Rate plans & pricing rules
CREATE TABLE IF NOT EXISTS rate_plans (
  id INTEGER PRIMARY KEY,
  public_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  base_daily_minor INTEGER NOT NULL CHECK (base_daily_minor > 0),
  min_duration_minutes INTEGER NOT NULL DEFAULT 240,
  max_duration_minutes INTEGER NOT NULL DEFAULT 43200,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS rate_tiers (
  id INTEGER PRIMARY KEY,
  rate_plan_id INTEGER NOT NULL REFERENCES rate_plans(id) ON DELETE CASCADE,
  from_days INTEGER NOT NULL CHECK (from_days >= 2),
  discount_bp INTEGER NOT NULL CHECK (discount_bp BETWEEN 1 AND 9000),
  UNIQUE (rate_plan_id, from_days)
) STRICT;

CREATE TABLE IF NOT EXISTS pricing_rules (
  id INTEGER PRIMARY KEY,
  rate_plan_id INTEGER REFERENCES rate_plans(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('weekday_multiplier','date_range_multiplier','date_range_flat_add')),
  weekdays_mask INTEGER,
  starts_on TEXT,
  ends_on TEXT,
  multiplier_bp INTEGER,
  flat_add_minor INTEGER,
  priority INTEGER NOT NULL DEFAULT 100,
  label TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1))
) STRICT;

-- Vehicles, images, features, compliance documents
CREATE TABLE IF NOT EXISTS vehicles (
  id INTEGER PRIMARY KEY,
  public_id TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  home_branch_id INTEGER NOT NULL REFERENCES branches(id),
  current_branch_id INTEGER NOT NULL REFERENCES branches(id),
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  variant TEXT,
  year INTEGER NOT NULL CHECK (year BETWEEN 1990 AND 2100),
  plate TEXT NOT NULL UNIQUE,
  vin TEXT UNIQUE,
  category TEXT NOT NULL CHECK (category IN ('hatchback','sedan','suv','muv','luxury','ev','van')),
  transmission TEXT NOT NULL CHECK (transmission IN ('manual','automatic')),
  fuel_type TEXT NOT NULL CHECK (fuel_type IN ('petrol','diesel','hybrid','electric','cng')),
  seats INTEGER NOT NULL CHECK (seats BETWEEN 1 AND 15),
  doors INTEGER,
  luggage_liters INTEGER,
  engine_cc INTEGER,
  battery_kwh REAL,
  range_km INTEGER,
  paint_name TEXT NOT NULL,
  paint_hex TEXT NOT NULL CHECK (length(paint_hex) = 7 AND substr(paint_hex,1,1) = '#'),
  rate_plan_id INTEGER NOT NULL REFERENCES rate_plans(id),
  deposit_minor INTEGER NOT NULL DEFAULT 0 CHECK (deposit_minor >= 0),
  km_per_day INTEGER,
  extra_km_minor INTEGER NOT NULL DEFAULT 0 CHECK (extra_km_minor >= 0),
  min_driver_age INTEGER NOT NULL DEFAULT 21,
  min_licence_years INTEGER NOT NULL DEFAULT 1,
  odometer_km INTEGER NOT NULL DEFAULT 0 CHECK (odometer_km >= 0),
  lifecycle TEXT NOT NULL DEFAULT 'draft' CHECK (lifecycle IN ('draft','active','retired')),
  ops_state TEXT NOT NULL DEFAULT 'ready' CHECK (ops_state IN ('ready','cleaning','inspection','hold')),
  description TEXT,
  specs_json TEXT CHECK (specs_json IS NULL OR json_valid(specs_json)),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
) STRICT;
CREATE INDEX IF NOT EXISTS idx_vehicles_browse ON vehicles(lifecycle, category, current_branch_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS vehicle_images (
  id INTEGER PRIMARY KEY,
  public_id TEXT NOT NULL UNIQUE,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  file_key TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  thumbhash TEXT NOT NULL,
  alt_text TEXT NOT NULL,
  shot_type TEXT CHECK (shot_type IN ('front34','side','rear34','interior','dashboard','boot','detail','other')),
  is_primary INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0,1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
) STRICT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_vehicle_primary_image ON vehicle_images(vehicle_id) WHERE is_primary = 1;

CREATE TABLE IF NOT EXISTS features (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  icon_key TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
) STRICT;

CREATE TABLE IF NOT EXISTS vehicle_features (
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  feature_id INTEGER NOT NULL REFERENCES features(id) ON DELETE RESTRICT,
  PRIMARY KEY (vehicle_id, feature_id)
) STRICT;

CREATE TABLE IF NOT EXISTS vehicle_documents (
  id INTEGER PRIMARY KEY,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('registration','insurance','road_tax','emissions','permit','other')),
  reference_no TEXT,
  file_key TEXT,
  issued_on TEXT,
  expires_on TEXT,
  created_at INTEGER NOT NULL
) STRICT;

-- Add-ons, protection plans, promo codes, quotes, bookings
CREATE TABLE IF NOT EXISTS addons (
  id INTEGER PRIMARY KEY,
  public_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  price_type TEXT NOT NULL CHECK (price_type IN ('per_day','flat')),
  price_minor INTEGER NOT NULL CHECK (price_minor >= 0),
  max_qty INTEGER NOT NULL DEFAULT 1,
  is_refundable INTEGER NOT NULL DEFAULT 1 CHECK (is_refundable IN (0,1)),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  deleted_at INTEGER
) STRICT;

CREATE TABLE IF NOT EXISTS protection_plans (
  id INTEGER PRIMARY KEY,
  public_id TEXT NOT NULL UNIQUE,
  tier INTEGER NOT NULL,
  name TEXT NOT NULL,
  summary TEXT NOT NULL,
  covered TEXT NOT NULL,
  not_covered TEXT NOT NULL,
  per_day_minor INTEGER NOT NULL CHECK (per_day_minor >= 0),
  excess_minor INTEGER NOT NULL CHECK (excess_minor >= 0),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1))
) STRICT;

CREATE TABLE IF NOT EXISTS promo_codes (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE COLLATE NOCASE,
  kind TEXT NOT NULL CHECK (kind IN ('percent','flat')),
  value INTEGER NOT NULL CHECK (value > 0),
  valid_from INTEGER,
  valid_to INTEGER,
  min_days INTEGER NOT NULL DEFAULT 1,
  categories_json TEXT CHECK (categories_json IS NULL OR json_valid(categories_json)),
  max_uses INTEGER,
  used_count INTEGER NOT NULL DEFAULT 0,
  per_user_limit INTEGER NOT NULL DEFAULT 1,
  applies_to TEXT NOT NULL DEFAULT 'base' CHECK (applies_to IN ('base','subtotal')),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1))
) STRICT;

CREATE TABLE IF NOT EXISTS quotes (
  id INTEGER PRIMARY KEY,
  public_id TEXT NOT NULL UNIQUE,
  user_id TEXT REFERENCES user(id),
  session_key TEXT,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),
  pickup_branch_id INTEGER NOT NULL REFERENCES branches(id),
  return_branch_id INTEGER NOT NULL REFERENCES branches(id),
  start_at INTEGER NOT NULL,
  end_at INTEGER NOT NULL,
  inputs_json TEXT NOT NULL CHECK (json_valid(inputs_json)),
  lines_json TEXT NOT NULL CHECK (json_valid(lines_json)),
  total_minor INTEGER NOT NULL,
  deposit_minor INTEGER NOT NULL,
  engine_version TEXT NOT NULL,
  signature TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY,
  public_id TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL REFERENCES user(id),
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),
  pickup_branch_id INTEGER NOT NULL REFERENCES branches(id),
  return_branch_id INTEGER NOT NULL REFERENCES branches(id),
  start_at INTEGER NOT NULL,
  end_at INTEGER NOT NULL,
  actual_start_at INTEGER,
  actual_end_at INTEGER,
  status TEXT NOT NULL CHECK (status IN (
    'pending_payment','pending_approval','confirmed','active','returned','completed',
    'cancelled','no_show','expired','rejected')),
  quote_id INTEGER REFERENCES quotes(id),
  currency TEXT NOT NULL,
  subtotal_minor INTEGER NOT NULL,
  discount_minor INTEGER NOT NULL DEFAULT 0,
  tax_minor INTEGER NOT NULL,
  total_minor INTEGER NOT NULL,
  deposit_minor INTEGER NOT NULL DEFAULT 0,
  tax_rate_bp_snapshot INTEGER NOT NULL,
  daily_rate_minor_snapshot INTEGER NOT NULL,
  protection_plan_id INTEGER REFERENCES protection_plans(id),
  promo_code_id INTEGER REFERENCES promo_codes(id),
  policy_snapshot_json TEXT NOT NULL CHECK (json_valid(policy_snapshot_json)),
  source TEXT NOT NULL DEFAULT 'web' CHECK (source IN ('web','counter','phone','admin')),
  cancel_reason TEXT,
  cancelled_at INTEGER,
  created_by TEXT REFERENCES user(id),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
) STRICT;
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id, start_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_vehicle ON bookings(vehicle_id, start_at);
CREATE INDEX IF NOT EXISTS idx_bookings_status_start ON bookings(status, start_at);

CREATE TABLE IF NOT EXISTS booking_line_items (
  id INTEGER PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('base','rule','tier_discount','addon','protection','fee','promo','tax','post_rental')),
  label TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_minor INTEGER NOT NULL,
  amount_minor INTEGER NOT NULL,
  taxable INTEGER NOT NULL DEFAULT 1 CHECK (taxable IN (0,1)),
  meta_json TEXT CHECK (meta_json IS NULL OR json_valid(meta_json)),
  sort_order INTEGER NOT NULL DEFAULT 0
) STRICT;

CREATE TABLE IF NOT EXISTS booking_events (
  id INTEGER PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  actor_user_id TEXT,
  actor_kind TEXT NOT NULL CHECK (actor_kind IN ('customer','staff','system','provider')),
  payload_json TEXT CHECK (payload_json IS NULL OR json_valid(payload_json)),
  created_at INTEGER NOT NULL
) STRICT;

-- Unified availability table & overlap triggers (§7.4)
CREATE TABLE IF NOT EXISTS vehicle_blocks (
  id INTEGER PRIMARY KEY,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),
  kind TEXT NOT NULL CHECK (kind IN ('booking','hold','maintenance','manual')),
  booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
  start_at INTEGER NOT NULL,
  end_at INTEGER NOT NULL,
  buffer_end_at INTEGER NOT NULL,
  expires_at INTEGER,
  released_at INTEGER,
  note TEXT,
  created_by TEXT,
  created_at INTEGER NOT NULL,
  CHECK (end_at > start_at AND buffer_end_at >= end_at),
  CHECK ((kind = 'hold') = (expires_at IS NOT NULL))
) STRICT;
CREATE INDEX IF NOT EXISTS idx_blocks_lookup ON vehicle_blocks(vehicle_id, start_at, buffer_end_at) WHERE released_at IS NULL;

CREATE TRIGGER IF NOT EXISTS trg_blocks_no_overlap_insert
BEFORE INSERT ON vehicle_blocks
WHEN NEW.released_at IS NULL
BEGIN
  SELECT RAISE(ABORT, 'VEHICLE_UNAVAILABLE')
  WHERE EXISTS (
    SELECT 1 FROM vehicle_blocks b
    WHERE b.vehicle_id = NEW.vehicle_id
      AND b.released_at IS NULL
      AND (b.kind <> 'hold' OR b.expires_at > CAST(strftime('%s','now') AS INTEGER) * 1000)
      AND NEW.start_at < b.buffer_end_at
      AND NEW.buffer_end_at > b.start_at
  );
END;

CREATE TRIGGER IF NOT EXISTS trg_blocks_no_overlap_update
BEFORE UPDATE OF vehicle_id, start_at, buffer_end_at, released_at ON vehicle_blocks
WHEN NEW.released_at IS NULL
BEGIN
  SELECT RAISE(ABORT, 'VEHICLE_UNAVAILABLE')
  WHERE EXISTS (
    SELECT 1 FROM vehicle_blocks b
    WHERE b.id <> NEW.id
      AND b.vehicle_id = NEW.vehicle_id
      AND b.released_at IS NULL
      AND (b.kind <> 'hold' OR b.expires_at > CAST(strftime('%s','now') AS INTEGER) * 1000)
      AND NEW.start_at < b.buffer_end_at
      AND NEW.buffer_end_at > b.start_at
  );
END;

-- Inspections
CREATE TABLE IF NOT EXISTS inspections (
  id INTEGER PRIMARY KEY,
  public_id TEXT NOT NULL UNIQUE,
  booking_id INTEGER NOT NULL REFERENCES bookings(id),
  type TEXT NOT NULL CHECK (type IN ('checkout','checkin')),
  odometer_km INTEGER NOT NULL CHECK (odometer_km >= 0),
  fuel_kind TEXT NOT NULL CHECK (fuel_kind IN ('eighths','percent')),
  fuel_level INTEGER NOT NULL CHECK (fuel_level >= 0),
  cleanliness TEXT CHECK (cleanliness IN ('clean','acceptable','dirty')),
  notes TEXT,
  customer_signature_key TEXT,
  customer_signed_at INTEGER,
  inspected_by TEXT NOT NULL REFERENCES user(id),
  inspected_at INTEGER NOT NULL,
  UNIQUE (booking_id, type)
) STRICT;

CREATE TABLE IF NOT EXISTS inspection_photos (
  id INTEGER PRIMARY KEY,
  inspection_id INTEGER NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  shot TEXT NOT NULL,
  file_key TEXT NOT NULL,
  taken_at INTEGER NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS inspection_marks (
  id INTEGER PRIMARY KEY,
  inspection_id INTEGER NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  zone TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('scratch','dent','chip','crack','stain','missing','other')),
  severity INTEGER NOT NULL CHECK (severity BETWEEN 1 AND 3),
  x REAL,
  y REAL,
  note TEXT,
  photo_id INTEGER REFERENCES inspection_photos(id)
) STRICT;

-- Payments ledger & webhooks
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY,
  public_id TEXT NOT NULL UNIQUE,
  booking_id INTEGER NOT NULL REFERENCES bookings(id),
  kind TEXT NOT NULL CHECK (kind IN ('charge','deposit_hold','deposit_capture','deposit_release','refund','penalty','manual')),
  status TEXT NOT NULL CHECK (status IN ('pending','succeeded','failed','cancelled')),
  amount_minor INTEGER NOT NULL CHECK (amount_minor >= 0),
  provider TEXT NOT NULL,
  provider_ref TEXT,
  method TEXT,
  parent_payment_id INTEGER REFERENCES payments(id),
  idempotency_key TEXT NOT NULL UNIQUE,
  reason TEXT,
  created_by TEXT,
  created_at INTEGER NOT NULL
) STRICT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_provider_ref ON payments(provider, provider_ref) WHERE provider_ref IS NOT NULL;

CREATE TABLE IF NOT EXISTS provider_events (
  provider TEXT NOT NULL,
  event_id TEXT NOT NULL,
  received_at INTEGER NOT NULL,
  payload_json TEXT NOT NULL,
  PRIMARY KEY (provider, event_id)
) STRICT;

-- Invoices
CREATE TABLE IF NOT EXISTS invoice_sequences (
  series TEXT NOT NULL,
  fiscal_year INTEGER NOT NULL,
  next_no INTEGER NOT NULL,
  PRIMARY KEY (series, fiscal_year)
) STRICT;

CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id),
  series TEXT NOT NULL,
  fiscal_year INTEGER NOT NULL,
  number INTEGER NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('invoice','credit_note')),
  snapshot_json TEXT NOT NULL CHECK (json_valid(snapshot_json)),
  total_minor INTEGER NOT NULL,
  issued_at INTEGER NOT NULL,
  UNIQUE (series, fiscal_year, number)
) STRICT;

-- Maintenance, fines, claims, reviews, waitlist
CREATE TABLE IF NOT EXISTS maintenance_logs (
  id INTEGER PRIMARY KEY,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),
  kind TEXT NOT NULL CHECK (kind IN ('service','repair','tyres','inspection','body','other')),
  title TEXT NOT NULL,
  notes TEXT,
  garage TEXT,
  cost_minor INTEGER NOT NULL DEFAULT 0 CHECK (cost_minor >= 0),
  starts_at INTEGER NOT NULL,
  ends_at INTEGER,
  odometer_km INTEGER,
  next_due_on TEXT,
  next_due_km INTEGER,
  status TEXT NOT NULL CHECK (status IN ('scheduled','in_progress','done','cancelled')),
  block_id INTEGER REFERENCES vehicle_blocks(id)
) STRICT;

CREATE TABLE IF NOT EXISTS fines (
  id INTEGER PRIMARY KEY,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),
  booking_id INTEGER REFERENCES bookings(id),
  reference_no TEXT,
  occurred_at INTEGER NOT NULL,
  place TEXT,
  amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
  admin_fee_minor INTEGER NOT NULL DEFAULT 0,
  doc_file_key TEXT,
  status TEXT NOT NULL CHECK (status IN ('open','charged','paid','disputed','waived')),
  created_at INTEGER NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS damage_claims (
  id INTEGER PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id),
  inspection_mark_id INTEGER REFERENCES inspection_marks(id),
  description TEXT NOT NULL,
  estimate_minor INTEGER NOT NULL,
  final_minor INTEGER,
  status TEXT NOT NULL CHECK (status IN ('open','customer_notified','accepted','disputed','charged','waived','closed')),
  evidence_json TEXT CHECK (evidence_json IS NULL OR json_valid(evidence_json)),
  opened_by TEXT NOT NULL,
  opened_at INTEGER NOT NULL,
  closed_at INTEGER
) STRICT;

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY,
  booking_id INTEGER NOT NULL UNIQUE REFERENCES bookings(id),
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),
  user_id TEXT NOT NULL REFERENCES user(id),
  rating_condition INTEGER NOT NULL CHECK (rating_condition BETWEEN 1 AND 5),
  rating_clean INTEGER NOT NULL CHECK (rating_clean BETWEEN 1 AND 5),
  rating_pickup INTEGER NOT NULL CHECK (rating_pickup BETWEEN 1 AND 5),
  comment TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','published','hidden')),
  created_at INTEGER NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS waitlist (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL,
  vehicle_id INTEGER REFERENCES vehicles(id),
  category TEXT,
  start_at INTEGER NOT NULL,
  end_at INTEGER NOT NULL,
  notified_at INTEGER,
  created_at INTEGER NOT NULL
) STRICT;

-- Outbox, immutable audit logs, settings, flags, jobs, rate limits, idempotency
CREATE TABLE IF NOT EXISTS outbox (
  id INTEGER PRIMARY KEY,
  kind TEXT NOT NULL,
  to_addr TEXT NOT NULL,
  template TEXT NOT NULL,
  payload_json TEXT NOT NULL CHECK (json_valid(payload_json)),
  dedupe_key TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sent','failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at INTEGER NOT NULL,
  last_error TEXT,
  sent_at INTEGER,
  created_at INTEGER NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY,
  at INTEGER NOT NULL,
  actor_user_id TEXT,
  actor_role TEXT,
  ip TEXT,
  user_agent TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  before_json TEXT,
  after_json TEXT,
  request_id TEXT
) STRICT;

CREATE TRIGGER IF NOT EXISTS trg_audit_no_update BEFORE UPDATE ON audit_logs BEGIN SELECT RAISE(ABORT,'AUDIT_IMMUTABLE'); END;
CREATE TRIGGER IF NOT EXISTS trg_audit_no_delete BEFORE DELETE ON audit_logs BEGIN SELECT RAISE(ABORT,'AUDIT_IMMUTABLE'); END;

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL CHECK (json_valid(value_json)),
  updated_at INTEGER NOT NULL,
  updated_by TEXT
) STRICT;

CREATE TABLE IF NOT EXISTS feature_flags (
  key TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL CHECK (enabled IN (0,1)),
  note TEXT
) STRICT;

CREATE TABLE IF NOT EXISTS jobs (
  name TEXT PRIMARY KEY,
  locked_until INTEGER,
  last_run_at INTEGER,
  last_status TEXT,
  last_error TEXT
) STRICT;

CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL,
  PRIMARY KEY (key, window_start)
) STRICT;

CREATE TABLE IF NOT EXISTS idempotency_keys (
  key TEXT PRIMARY KEY,
  scope TEXT NOT NULL,
  response_json TEXT,
  created_at INTEGER NOT NULL
) STRICT;

-- FTS5 for vehicles
CREATE VIRTUAL TABLE IF NOT EXISTS vehicles_fts USING fts5(
  make, model, variant, description,
  content='vehicles',
  content_rowid='id',
  tokenize='unicode61 remove_diacritics 2'
);

CREATE TRIGGER IF NOT EXISTS trg_vehicles_fts_insert AFTER INSERT ON vehicles BEGIN
  INSERT INTO vehicles_fts(rowid, make, model, variant, description)
  VALUES (new.id, new.make, new.model, coalesce(new.variant,''), coalesce(new.description,''));
END;

CREATE TRIGGER IF NOT EXISTS trg_vehicles_fts_delete AFTER DELETE ON vehicles BEGIN
  INSERT INTO vehicles_fts(vehicles_fts, rowid, make, model, variant, description)
  VALUES('delete', old.id, old.make, old.model, coalesce(old.variant,''), coalesce(old.description,''));
END;

CREATE TRIGGER IF NOT EXISTS trg_vehicles_fts_update AFTER UPDATE ON vehicles BEGIN
  INSERT INTO vehicles_fts(vehicles_fts, rowid, make, model, variant, description)
  VALUES('delete', old.id, old.make, old.model, coalesce(old.variant,''), coalesce(old.description,''));
  INSERT INTO vehicles_fts(rowid, make, model, variant, description)
  VALUES (new.id, new.make, new.model, coalesce(new.variant,''), coalesce(new.description,''));
END;

