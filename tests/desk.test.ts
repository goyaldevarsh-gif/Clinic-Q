import { describe, it, expect } from 'vitest';
import { DESK_KEYS, parseDeskLink, sendToDesk, toDeskIn, type DeskApi } from '../src/lib/desk';
import type { Appt } from '../src/lib/types';

const appt = (o: Partial<Appt> = {}): Appt => ({ id: 'a1', clinicId: 'c', doctorId: 'd', date: '2026-11-25', time: '16:15', type: 'OPD', name: 'Amit Sharma', age: '34', phone: '+91 98290-12345', token: 2, status: 'waiting', createdAt: 1, arrivedAt: 2, ...o });

describe('desk mapping', () => {
  it('only produces keys the desk rules accept, with safe sizes', () => {
    const e = toDeskIn(appt({ name: 'x'.repeat(300), reason: 'Follow-up after knee surgery' }), { name: 'Mittal Clinic' });
    const full = { ...e, token: 1, day: 'd', createdAt: 1, status: 'waiting' };
    for (const k of Object.keys(full)) expect(DESK_KEYS as readonly string[]).toContain(k);
    expect(e.name.length).toBeLessThan(100);
    expect(e.phone).toBe('9829012345');
  });
  it('marks the booking in reason and leaves unknown clinical fields empty', () => {
    const e = toDeskIn(appt({ reason: 'ACL follow up' }), { name: 'Mittal Clinic' });
    expect(e.reason).toContain('ClinicQ 4:15 PM · OPD');
    expect(e.reason).toContain('ACL follow up');
    expect([e.sex, e.weight, e.allergies, e.bp, e.sugar]).toEqual(['', '', '', '', '']);
    expect(e.followUp).toBe(false);
  });
  it('walk-ins say walk-in instead of a slot time', () => expect(toDeskIn(appt({ walkIn: true })).reason).toContain('walk-in'));
  it('keeps plain and mixed ages as written', () => { expect(toDeskIn(appt({ age: '5y 3m' })).age).toBe('5y 3m'); expect(toDeskIn(appt({ age: '34' })).age).toBe('34'); });
});

describe('desk link', () => {
  const id = 'abcd1234efgh5678ijkl9012mnop';
  it('reads the id from a full MedScript link or bare id', () => {
    expect(parseDeskLink(`https://x.github.io/medscript/#/desk?d=${id}&k=KEY`)).toBe(id);
    expect(parseDeskLink(id)).toBe(id);
    expect(parseDeskLink('hello')).toBeNull();
    expect(parseDeskLink('')).toBeNull();
  });
});

describe('sendToDesk', () => {
  const ok: DeskApi = { submit: async () => ({ docId: 'doc1', token: 3 }), watch: async () => () => {}, mark: async () => {} };
  const bad: DeskApi = { submit: async () => { throw { code: 'permission-denied' }; }, watch: async () => () => {}, mark: async () => {} };
  const run = async (api: DeskApi, a = appt()) => { const out: Partial<Appt>[] = []; await sendToDesk(a, { id: 'c', name: 'C', area: '', city: '', doctors: [] }, 'x'.repeat(24), api, async (_i, p) => { out.push(p); }); return out; };
  it('stores desk doc and token on success', async () => expect(await run(ok)).toEqual([{ deskDocId: 'doc1', deskToken: 3, deskErr: undefined }]));
  it('stores a readable error on failure so staff can retry, and does not throw', async () => expect((await run(bad))[0].deskErr).toMatch(/not set up/));
  it('never sends the same patient twice', async () => expect(await run(ok, appt({ deskDocId: 'already' }))).toEqual([]));
});
