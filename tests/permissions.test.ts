import { describe, expect, it } from 'vitest';
import { type AuthActor, can } from '../src/server/permissions';

const owner: AuthActor = { id: 'u1', email: 'o@kerb.local', name: 'Dev', role: 'owner' };
const manager: AuthActor = { id: 'u2', email: 'm@kerb.local', name: 'Anita', role: 'manager' };
const agent: AuthActor = { id: 'u3', email: 'a@kerb.local', name: 'Ravi', role: 'agent' };
const customer: AuthActor = { id: 'u4', email: 'c@kerb.local', name: 'Meera', role: 'customer' };

describe('permission matrix (§9.3)', () => {
  it('denies everything to unauthenticated actors', () => {
    expect(can(null, 'admin.access')).toBe(false);
    expect(can(null, 'bookings.view_own', 'u4')).toBe(false);
  });

  it('enforces customer isolation and blocks admin capabilities', () => {
    expect(can(customer, 'bookings.view_own', 'u4')).toBe(true);
    expect(can(customer, 'bookings.view_own', 'u999')).toBe(false);
    expect(can(customer, 'admin.access')).toBe(false);
    expect(can(customer, 'fleet.write')).toBe(false);
    expect(can(customer, 'kyc.review')).toBe(false);
  });

  it('enforces agent vs manager vs owner boundaries', () => {
    expect(can(agent, 'handover.perform')).toBe(true);
    expect(can(agent, 'kyc.review')).toBe(true);
    expect(can(agent, 'fleet.read')).toBe(true);
    expect(can(agent, 'fleet.write')).toBe(false);
    expect(can(agent, 'customers.blacklist')).toBe(false);
    expect(can(agent, 'reports.view')).toBe(false);
    expect(can(agent, 'audit.view')).toBe(false);

    expect(can(manager, 'fleet.write')).toBe(true);
    expect(can(manager, 'pricing.write')).toBe(true);
    expect(can(manager, 'reports.view')).toBe(true);
    expect(can(manager, 'audit.view')).toBe(true);
    expect(can(manager, 'settings.manage')).toBe(false);
    expect(can(manager, 'staff.manage')).toBe(false);

    expect(can(owner, 'settings.manage')).toBe(true);
    expect(can(owner, 'staff.manage')).toBe(true);
  });
});
