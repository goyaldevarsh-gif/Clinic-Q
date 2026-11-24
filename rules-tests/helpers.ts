import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import * as F from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import type { Clinic } from '../src/lib/types';
import { addDays, ymd } from '../src/lib/slots';

export const C = 'myclinic', D = 'dg';
export const TODAY = ymd(new Date());
export const TOMORROW = addDays(TODAY, 1);
const allDay = () => { const d: Record<number, { start: string; end: string }[]> = {}; for (let i = 0; i < 7; i++) d[i] = [{ start: '08:00', end: '20:00' }]; return d; };
export const CLINIC: Clinic = { id: C, name: 'My Clinic', area: '', city: 'Jaipur', doctors: [{ id: D, name: 'Dr G', qualification: 'MS', speciality: '', schedule: { days: allDay(), slotMinutes: 15, perSlot: 2, dressing: true } }] };

export const makeEnv = () => initializeTestEnvironment({ projectId: 'demo-cq', firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 } });
export async function seedClinic(env: RulesTestEnvironment) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await F.setDoc(F.doc(db, 'clinics', C), { ...CLINIC, caps: { [D]: 2 } });
    await F.setDoc(F.doc(db, 'staff', 'staffU'), { clinicId: C });
  });
}
/** the object createFbStore expects instead of the lazily loaded Firebase SDK */
export const sdkFor = (db: unknown) => async () => ({ db, auth: {}, A: { onAuthStateChanged: () => () => {} }, F }) as never;
export async function until(cond: () => boolean, ms = 10000) {
  const t0 = Date.now();
  while (!cond()) { if (Date.now() - t0 > ms) throw new Error('timed out waiting for: ' + cond.toString()); await new Promise((r) => setTimeout(r, 50)); }
}

/** withSecurityRulesDisabled returns nothing, so the value is captured in a variable */
export async function adminRead(env: RulesTestEnvironment, path: string[]) {
  let out: Record<string, any> | undefined;
  await env.withSecurityRulesDisabled(async (ctx) => { out = (await F.getDoc(F.doc(ctx.firestore(), path[0], ...path.slice(1)))).data(); });
  return out;
}
