import { blob, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  emailVerified: integer('emailVerified', { mode: 'boolean' }).notNull().default(false),
  image: text('image'),
  role: text('role', { enum: ['customer', 'agent', 'manager', 'owner'] })
    .notNull()
    .default('customer'),
  twoFactorEnabled: integer('twoFactorEnabled', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull(),
});

export const session = sqliteTable('session', {
  id: text('id').primaryKey(),
  expiresAt: integer('expiresAt', { mode: 'timestamp_ms' }).notNull(),
  token: text('token').notNull(),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
});

export const account = sqliteTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: integer('accessTokenExpiresAt', { mode: 'timestamp_ms' }),
  refreshTokenExpiresAt: integer('refreshTokenExpiresAt', { mode: 'timestamp_ms' }),
  scope: text('scope'),
  password: text('password'),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull(),
});

export const verification = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expiresAt', { mode: 'timestamp_ms' }).notNull(),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }),
});

export const twoFactor = sqliteTable('twoFactor', {
  id: text('id').primaryKey(),
  secret: text('secret').notNull(),
  backupCodes: text('backupCodes').notNull(),
  verified: integer('verified', { mode: 'boolean' }).notNull().default(false),
  failedVerificationCount: integer('failedVerificationCount').notNull().default(0),
  lockedUntil: integer('lockedUntil', { mode: 'timestamp_ms' }),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
});

export const userProfiles = sqliteTable('user_profiles', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  fullName: text('full_name').notNull(),
  phone: text('phone'),
  dateOfBirth: text('date_of_birth'),
  addressLine: text('address_line'),
  city: text('city'),
  postalCode: text('postal_code'),
  emergencyName: text('emergency_name'),
  emergencyPhone: text('emergency_phone'),
  isBlacklisted: integer('is_blacklisted').notNull().default(0),
  blacklistReason: text('blacklist_reason'),
  staffNotes: text('staff_notes'),
  locale: text('locale').notNull().default('en'),
});

export const driverLicences = sqliteTable('driver_licences', {
  id: integer('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id),
  licenceNoEnc: blob('licence_no_enc', { mode: 'buffer' }).notNull(),
  licenceNoLast4: text('licence_no_last4').notNull(),
  keyVersion: integer('key_version').notNull(),
  issuingRegion: text('issuing_region'),
  classCodes: text('class_codes'),
  issuedOn: text('issued_on'),
  expiresOn: text('expires_on').notNull(),
  frontFileKey: text('front_file_key').notNull(),
  backFileKey: text('back_file_key'),
  selfieFileKey: text('selfie_file_key'),
  status: text('status', { enum: ['pending', 'verified', 'rejected', 'expired'] })
    .notNull()
    .default('pending'),
  reviewedBy: text('reviewed_by').references(() => user.id),
  reviewedAt: integer('reviewed_at'),
  rejectReason: text('reject_reason'),
  createdAt: integer('created_at').notNull(),
});
