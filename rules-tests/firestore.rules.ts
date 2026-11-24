import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, getDocs, collection, query, where, setDoc, updateDoc, writeBatch, deleteDoc } from 'firebase/firestore';
import { readFileSync } from 'node:fs';

let env: RulesTestEnvironment;
const C = 'mittal', D = 'dr1', DATE = '2026-12-01', DAY = `${D}_${DATE}`;
const A = '9829012345', B = '9876543210';

beforeAll(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-cq', firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 } });
});
afterAll(async () => { await env.cleanup(); });
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'clinics', C), { name: 'Mittal', caps: { [D]: 2 } });
    await setDoc(doc(db, 'clinics', 'other'), { name: 'Other', caps: {} });
    await setDoc(doc(db, 'staff', 'staffMittal'), { clinicId: C });
    await setDoc(doc(db, 'staff', 'staffOther'), { clinicId: 'other' });
  });
});

const patient = (p: string) => env.authenticatedContext(`u${p}`, { phone_number: `+91${p}` }).firestore();
const staff = (uid: string) => env.authenticatedContext(uid, { email: `${uid}@x.in` }).firestore();
const anon = () => env.unauthenticatedContext().firestore();

const apptData = (phone: string, over: Record<string, unknown> = {}) => ({ clinicId: C, doctorId: D, date: DATE, time: '16:00', type: 'OPD', memberId: 'm1', name: 'Amit', age: '34', phone, token: 1, status: 'waiting', createdAt: 1, ...over });

/** the booking batch the app performs */
async function book(db: ReturnType<typeof patient>, phone: string, id: string, over: Record<string, unknown> = {}, last = 0, slotCount = 0) {
  const b = writeBatch(db);
  const a = apptData(phone, { token: last + 1, ...over });
  b.set(doc(db, 'clinics', C, 'days', DAY), { last: last + 1, slots: { [String(a.time)]: slotCount + 1 } });
  b.set(doc(db, 'clinics', C, 'days', DAY, 'people', `${phone}_${a.memberId}`), { apptId: id });
  b.set(doc(db, 'clinics', C, 'appts', id), a);
  return b.commit();
}
const seed = async (phone: string, id: string, over: Record<string, unknown> = {}) => env.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  await setDoc(doc(db, 'clinics', C, 'days', DAY), { last: 1, slots: { '16:00': 1 } });
  await setDoc(doc(db, 'clinics', C, 'days', DAY, 'people', `${phone}_m1`), { apptId: id });
  await setDoc(doc(db, 'clinics', C, 'appts', id), apptData(phone, over));
});

describe('public data', () => {
  it('anyone can read a clinic and its counters', async () => {
    await assertSucceeds(getDoc(doc(anon(), 'clinics', C)));
    await assertSucceeds(getDoc(doc(anon(), 'clinics', C, 'days', DAY)));
  });
  it('patients cannot edit a clinic', async () => { await assertFails(setDoc(doc(patient(A), 'clinics', C), { name: 'Hacked' })); });
  it('staff can edit only their own clinic', async () => {
    await assertSucceeds(setDoc(doc(staff('staffMittal'), 'clinics', C), { name: 'Mittal 2', caps: { [D]: 3 } }));
    await assertFails(setDoc(doc(staff('staffMittal'), 'clinics', 'other'), { name: 'x' }));
  });
  it('nobody can make themselves staff', async () => {
    await assertFails(setDoc(doc(patient(A), 'staff', `u${A}`), { clinicId: C }));
    await assertFails(setDoc(doc(staff('rando'), 'staff', 'rando'), { clinicId: C }));
  });
});

describe('booking', () => {
  it('a signed-in patient can book on their own number', async () => { await assertSucceeds(book(patient(A), A, 'a1')); });
  it('signed-out users cannot book', async () => { await assertFails(book(anon(), A, 'a1')); });
  it('cannot book on someone else\'s number', async () => { await assertFails(book(patient(A), B, 'a1')); });
  it('the token must be the next one (no duplicates)', async () => {
    await seed(B, 'b1');
    await assertFails(book(patient(A), A, 'a1', { token: 1 }, 1, 1)); // batch bumps last to 2 but appt claims token 1
  });
  it('second booking gets token 2', async () => {
    await seed(B, 'b1');
    await assertSucceeds(book(patient(A), A, 'a2', { time: '16:00' }, 1, 1));
  });
  it('cannot go over slot capacity (cap = 2)', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => { await setDoc(doc(ctx.firestore(), 'clinics', C, 'days', DAY), { last: 2, slots: { '16:00': 2 } }); });
    await assertFails(book(patient(A), A, 'a3', {}, 2, 2));
  });
  it('an appointment without its people entry is rejected', async () => {
    const db = patient(A); const b = writeBatch(db);
    b.set(doc(db, 'clinics', C, 'days', DAY), { last: 1, slots: { '16:00': 1 } });
    b.set(doc(db, 'clinics', C, 'appts', 'a1'), apptData(A));
    await assertFails(b.commit());
  });
  it('a patient cannot write a people entry for another number', async () => {
    await assertFails(setDoc(doc(patient(A), 'clinics', C, 'days', DAY, 'people', `${B}_m1`), { apptId: 'x' }));
  });
  it('a patient cannot rewrite counters wildly', async () => {
    await assertFails(setDoc(doc(patient(A), 'clinics', C, 'days', DAY), { last: 50, slots: {} }));
    await assertFails(setDoc(doc(patient(A), 'clinics', C, 'days', DAY), { last: 1, slots: {}, extra: 1 }));
  });
  it('a booking must start as waiting', async () => { await assertFails(book(patient(A), A, 'a1', { status: 'seen' })); });
  it('staff can add a walk-in without a phone', async () => {
    const db = staff('staffMittal'); const b = writeBatch(db);
    b.set(doc(db, 'clinics', C, 'days', DAY), { last: 1, slots: {} });
    b.set(doc(db, 'clinics', C, 'appts', 'w1'), (({ memberId, ...r }) => r)(apptData('', { walkIn: true })));
    await assertSucceeds(b.commit());
  });
  it('staff of another clinic cannot add appointments here', async () => {
    const db = staff('staffOther'); const b = writeBatch(db);
    b.set(doc(db, 'clinics', C, 'days', DAY), { last: 1, slots: {} });
    b.set(doc(db, 'clinics', C, 'appts', 'w1'), apptData('', { walkIn: true }));
    await assertFails(b.commit());
  });
});

describe('live queue list', () => {
  it('public read, only own staff write', async () => {
    await assertSucceeds(setDoc(doc(staff('staffMittal'), 'clinics', C, 'live', DAY), { arrived: [] }));
    await assertSucceeds(getDoc(doc(anon(), 'clinics', C, 'live', DAY)));
    await assertFails(setDoc(doc(patient(A), 'clinics', C, 'live', DAY), { arrived: [] }));
    await assertFails(setDoc(doc(staff('staffOther'), 'clinics', C, 'live', DAY), { arrived: [] }));
  });
});

describe('shared records', () => {
  const rec = { clinicId: C, phone: A, name: 'Amit', title: 'Prescription', body: 'x', date: DATE, doctorName: 'Dr', createdAt: 1 };
  beforeEach(async () => { await env.withSecurityRulesDisabled(async (ctx) => { await setDoc(doc(ctx.firestore(), 'clinics', C, 'records', 'r1'), rec); }); });
  it('hidden while the clinic has sharing off', async () => { await assertFails(getDoc(doc(patient(A), 'clinics', C, 'records', 'r1'))); });
  it('visible to the owner only once sharing is on', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => { await setDoc(doc(ctx.firestore(), 'clinics', C), { name: 'Mittal', caps: {}, shareRecords: true }); });
    await assertSucceeds(getDoc(doc(patient(A), 'clinics', C, 'records', 'r1')));
    await assertFails(getDoc(doc(patient(B), 'clinics', C, 'records', 'r1')));
    await assertFails(getDoc(doc(anon(), 'clinics', C, 'records', 'r1')));
  });
  it('only own clinic staff can publish', async () => {
    await assertSucceeds(setDoc(doc(staff('staffMittal'), 'clinics', C, 'records', 'r2'), rec));
    await assertFails(setDoc(doc(staff('staffOther'), 'clinics', C, 'records', 'r3'), rec));
    await assertFails(setDoc(doc(patient(A), 'clinics', C, 'records', 'r4'), rec));
  });
});

describe('privacy of appointments', () => {
  beforeEach(async () => { await seed(A, 'a1'); });
  it('owner reads own appointment', async () => { await assertSucceeds(getDoc(doc(patient(A), 'clinics', C, 'appts', 'a1'))); });
  it('another patient cannot read it', async () => { await assertFails(getDoc(doc(patient(B), 'clinics', C, 'appts', 'a1'))); });
  it('signed-out cannot read it', async () => { await assertFails(getDoc(doc(anon(), 'clinics', C, 'appts', 'a1'))); });
  it('a patient can query only their own number', async () => {
    await assertSucceeds(getDocs(query(collection(patient(A), 'clinics', C, 'appts'), where('phone', '==', A))));
    await assertFails(getDocs(query(collection(patient(B), 'clinics', C, 'appts'), where('phone', '==', A))));
    await assertFails(getDocs(collection(patient(B), 'clinics', C, 'appts')));
  });
  it('own clinic staff reads, other clinic staff cannot', async () => {
    await assertSucceeds(getDocs(query(collection(staff('staffMittal'), 'clinics', C, 'appts'))));
    await assertFails(getDocs(query(collection(staff('staffOther'), 'clinics', C, 'appts'))));
  });
  it('people entries of others are unreadable', async () => {
    await assertSucceeds(getDoc(doc(patient(A), 'clinics', C, 'days', DAY, 'people', `${A}_m1`)));
    await assertFails(getDoc(doc(patient(B), 'clinics', C, 'days', DAY, 'people', `${A}_m1`)));
  });
  it('family members are private to the number', async () => {
    await assertSucceeds(setDoc(doc(patient(A), 'patients', A, 'members', 'm1'), { name: 'Amit' }));
    await assertFails(getDoc(doc(patient(B), 'patients', A, 'members', 'm1')));
  });
});

describe('changing appointments', () => {
  beforeEach(async () => { await seed(A, 'a1'); });
  it('owner can cancel', async () => { await assertSucceeds(updateDoc(doc(patient(A), 'clinics', C, 'appts', 'a1'), { status: 'cancelled', cancelledBy: 'patient' })); });
  it('owner cannot mark seen or change other fields', async () => {
    await assertFails(updateDoc(doc(patient(A), 'clinics', C, 'appts', 'a1'), { status: 'seen' }));
    await assertFails(updateDoc(doc(patient(A), 'clinics', C, 'appts', 'a1'), { status: 'cancelled', cancelledBy: 'patient', token: 99 }));
  });
  it('another patient cannot cancel it', async () => { await assertFails(updateDoc(doc(patient(B), 'clinics', C, 'appts', 'a1'), { status: 'cancelled', cancelledBy: 'patient' })); });
  it('own clinic staff can mark seen / arrived; other staff cannot', async () => {
    await assertSucceeds(updateDoc(doc(staff('staffMittal'), 'clinics', C, 'appts', 'a1'), { status: 'seen' }));
    await assertSucceeds(updateDoc(doc(staff('staffMittal'), 'clinics', C, 'appts', 'a1'), { arrivedAt: 5 }));
    await assertFails(updateDoc(doc(staff('staffOther'), 'clinics', C, 'appts', 'a1'), { status: 'seen' }));
  });
  it('nobody can delete an appointment', async () => {
    await assertFails(deleteDoc(doc(patient(A), 'clinics', C, 'appts', 'a1')));
    await assertFails(deleteDoc(doc(staff('staffMittal'), 'clinics', C, 'appts', 'a1')));
  });
});
