// Runs the REAL store code (src/lib/firestoreStore.ts) as a patient against the emulator with the real rules.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { createFbStore } from '../src/lib/firestoreStore';
import { setSession } from '../src/lib/session';
import { C, D, TOMORROW, adminRead, makeEnv, sdkFor, seedClinic, until } from './helpers';

let env: RulesTestEnvironment;
const A = '9829012345', B = '9876543210', X = '9811111111';
const input = (phone: string, memberId: string, time: string, name = 'Amit') => ({ clinicId: C, doctorId: D, date: TOMORROW, time, type: 'OPD' as const, memberId, name, age: '34', phone });
const patientStore = (p: string) => createFbStore(sdkFor(env.authenticatedContext('u' + p, { phone_number: '+91' + p }).firestore()));

beforeAll(async () => { env = await makeEnv(); await env.clearFirestore(); await seedClinic(env); setSession({ role: 'patient', phone: A }); });
afterAll(async () => { await env.cleanup(); });

describe('patient flow through the real store', () => {
  it('profile, booking, token, capacity, duplicate, cancel, reschedule', async () => {
    const sa = patientStore(A);
    await until(() => sa.getState().clinics.length === 1);
    await sa.saveMember(A, { id: 'm1', name: 'Amit', age: '34', relation: 'self' });

    const a1 = await sa.book(input(A, 'm1', '10:00'));
    expect(a1.token).toBe(1);
    await expect(sa.book(input(A, 'm1', '10:15'))).rejects.toMatchObject({ code: 'DUPLICATE' });

    const sb = patientStore(B); await until(() => sb.getState().clinics.length === 1);
    const b1 = await sb.book(input(B, 'mb', '10:00', 'Bina'));
    expect(b1.token).toBe(2);

    const sx = patientStore(X); await until(() => sx.getState().clinics.length === 1);
    sx.watchDoctor(C, D);
    await expect(sx.book(input(X, 'mx', '10:00', 'Xavier'))).rejects.toBeTruthy(); // slot has 2 of 2

    await until(() => sa.getState().appts.some((a) => a.id === a1.id));
    await sa.cancel(a1.id, 'patient');
    await until(() => sa.getState().appts.find((a) => a.id === a1.id)?.status === 'cancelled');
    const x1 = await sx.book(input(X, 'mx', '10:00', 'Xavier'));        // freed place can be taken
    expect(x1.token).toBe(3);                                           // cancelled tokens are never reused

    const a2 = await sa.book(input(A, 'm1', '11:00'));                  // same person may book again after cancelling
    await until(() => sa.getState().appts.some((a) => a.id === a2.id));
    const a3 = await sa.reschedule(a2.id, input(A, 'm1', '11:15'));
    await until(() => sa.getState().appts.find((a) => a.id === a2.id)?.status === 'cancelled');
    expect(a3.status).toBe('waiting');

    // privacy through the store: B's store must never see A's appointments
    expect(sb.getState().appts.filter((a) => a.phone === A)).toHaveLength(0);

    const day = await adminRead(env, ['clinics', C, 'days', `${D}_${TOMORROW}`]);
    expect(day?.slots['10:00']).toBe(2);   // B + X
    expect(day?.slots['11:00']).toBe(0);
    expect(day?.slots['11:15']).toBe(1);
  });
});
