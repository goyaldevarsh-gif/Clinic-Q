// Runs the REAL store code as clinic staff against the emulator with the real rules.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import * as F from 'firebase/firestore';
import { createFbStore } from '../src/lib/firestoreStore';
import { setSession } from '../src/lib/session';
import { C, D, TODAY, makeEnv, sdkFor, seedClinic, until } from './helpers';

let env: RulesTestEnvironment;
const A = '9829012345';

beforeAll(async () => {
  env = await makeEnv(); await env.clearFirestore(); await seedClinic(env);
  // a booking made by a patient (same shape the patient store writes)
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await F.setDoc(F.doc(db, 'clinics', C, 'days', `${D}_${TODAY}`), { last: 1, slots: { '10:00': 1 } });
    await F.setDoc(F.doc(db, 'clinics', C, 'days', `${D}_${TODAY}`, 'people', `${A}_m1`), { apptId: 'a1' });
    await F.setDoc(F.doc(db, 'clinics', C, 'appts', 'a1'), { id: 'a1', clinicId: C, doctorId: D, date: TODAY, time: '10:00', type: 'OPD', memberId: 'm1', name: 'Amit', age: '34', phone: A, token: 1, status: 'waiting', createdAt: 1 });
  });
  setSession({ role: 'staff', clinicId: C });
});
afterAll(async () => { await env.cleanup(); });

const read = (path: string[]) => env.withSecurityRulesDisabled(async (ctx) => (await F.getDoc(F.doc(ctx.firestore(), path[0], ...path.slice(1)))).data());

describe('staff flow through the real store', () => {
  it('arrive, desk fields, seen, walk-in, live list, cancel, ensureClinic', async () => {
    const st = createFbStore(sdkFor(env.authenticatedContext('staffU', { email: 'a@b.in' }).firestore()));
    await until(() => st.getState().appts.some((a) => a.id === 'a1'));

    await st.arrive('a1');
    expect((await read(['clinics', C, 'appts', 'a1']))?.arrivedAt).toBeTruthy();
    await st.patchAppt('a1', { deskDocId: 'doc1', deskToken: 4, deskErr: undefined });
    expect((await read(['clinics', C, 'appts', 'a1']))?.deskToken).toBe(4);

    await until(() => st.getState().appts.find((a) => a.id === 'a1')?.arrivedAt !== undefined);
    await new Promise((r) => setTimeout(r, 800));
    const live = await read(['clinics', C, 'live', `${D}_${TODAY}`]);
    expect(live?.arrived).toEqual([{ t: 1, time: '10:00' }]);

    const w = await st.addWalkIn({ clinicId: C, doctorId: D, name: 'Walk In', age: '40', phone: '', type: 'OPD' });
    expect(w.token).toBe(2);
    expect(w.arrivedAt).toBeTruthy();

    await st.setStatus('a1', 'seen');
    expect((await read(['clinics', C, 'appts', 'a1']))?.status).toBe('seen');
    await st.setStatus('a1', 'waiting');

    await st.cancel('a1', 'clinic');
    const a1 = await read(['clinics', C, 'appts', 'a1']);
    expect(a1?.status).toBe('cancelled');
    expect((await read(['clinics', C, 'days', `${D}_${TODAY}`]))?.slots['10:00']).toBe(0);
    expect(await read(['clinics', C, 'days', `${D}_${TODAY}`, 'people', `${A}_m1`])).toBeUndefined();

    // first sign-in of a brand-new clinic id creates the starter clinic
    await env.withSecurityRulesDisabled(async (ctx) => { await F.setDoc(F.doc(ctx.firestore(), 'staff', 'staffNew'), { clinicId: 'newclinic' }); });
    const sn = createFbStore(sdkFor(env.authenticatedContext('staffNew', { email: 'n@b.in' }).firestore()));
    await sn.ensureClinic('newclinic');
    expect((await read(['clinics', 'newclinic']))?.name).toBe('My Clinic');
    expect((await read(['clinics', 'newclinic']))?.caps).toEqual({ dg: 2 });
  });
});
