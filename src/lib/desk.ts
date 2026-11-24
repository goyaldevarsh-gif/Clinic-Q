import type { Appt, Clinic } from './types';
import { fmt12, ymd } from './slots';

/**
 * Link from ClinicQ to the doctor's MedScript reception desk ("waiting list").
 * The entry format and security rules are MedScript's (src/lib/desk.ts there); this file only speaks that format.
 * The desk id is a secret: it opens the whole day's queue. It is kept on the clinic staff's device only, never in shared data.
 */
export interface DeskIn { name: string; age: string; ageUnit: 'Y' | 'M'; sex: string; phone: string; weight: string; allergies: string; reason: string; bp: string; sugar: string; followUp?: boolean; toOv?: boolean }
export interface DeskRow { docId: string; token: number; status: 'waiting' | 'seen' }

/** the only keys MedScript's rules accept – the mapping below must never produce anything else */
export const DESK_KEYS = ['name', 'age', 'ageUnit', 'sex', 'phone', 'weight', 'allergies', 'reason', 'bp', 'sugar', 'followUp', 'toOv', 'token', 'day', 'createdAt', 'status'] as const;

/** ClinicQ booking → desk entry. Fields ClinicQ does not collect stay empty on purpose (no guessing sex, allergies, vitals). */
export function toDeskIn(a: Appt, clinic?: Pick<Clinic, 'name'>): DeskIn {
  const tag = `ClinicQ ${a.walkIn ? 'walk-in' : fmt12(a.time)} · ${a.type}${clinic ? ' · ' + clinic.name : ''}`;
  return {
    name: a.name.trim().slice(0, 99), age: (a.age || '').trim().slice(0, 20), ageUnit: 'Y', sex: '', phone: a.phone.replace(/\D/g, '').slice(-10),
    weight: '', allergies: '', bp: '', sugar: '', reason: a.reason ? `${tag} — ${a.reason}` : tag, followUp: false, toOv: false,
  };
}

/** accepts the full desk link or just the id */
export function parseDeskLink(s: string): string | null {
  const t = s.trim(); if (!t) return null;
  const m = t.match(/[?&#]d=([a-z0-9]{20,40})/i) || t.match(/^([a-z0-9]{20,40})$/i);
  return m ? m[1].toLowerCase() : null;
}

export interface DeskApi {
  submit(id: string, e: DeskIn): Promise<{ docId: string; token: number }>;
  watch(id: string, cb: (rows: DeskRow[]) => void, onErr: (e: unknown) => void): Promise<() => void>;
  mark(id: string, docId: string, status: 'waiting' | 'seen'): Promise<void>;
}

export const DEMO_DESK = 'demo';
const KEYPFX = 'cq.desk.';
export const getDeskId = (clinicId: string) => { try { return localStorage.getItem(KEYPFX + clinicId) || ''; } catch { return ''; } };
export const setDeskId = (clinicId: string, id: string) => { try { if (id) localStorage.setItem(KEYPFX + clinicId, id); else localStorage.removeItem(KEYPFX + clinicId); } catch { /* ignore */ } };

/* ---------- in-memory demo desk (same behaviour, no cloud) ---------- */
const FK = 'cq.fakedesk';
type FakeRow = DeskRow & { day: string };
const fakeRead = (): FakeRow[] => { try { return JSON.parse(localStorage.getItem(FK) || '[]') as FakeRow[]; } catch { return []; } };
const fakeWrite = (r: FakeRow[]) => { try { localStorage.setItem(FK, JSON.stringify(r)); } catch { /* ignore */ } fakeSubs.forEach((f) => f()); };
const fakeSubs = new Set<() => void>();
export const fakeDesk: DeskApi = {
  async submit(_id, _e) {
    const day = ymd(new Date()); const rows = fakeRead();
    const token = rows.filter((r) => r.day === day).reduce((m, r) => Math.max(m, r.token), 0) + 1;
    const docId = 'f' + Math.random().toString(36).slice(2, 10);
    fakeWrite([...rows, { docId, token, status: 'waiting', day }]);
    return { docId, token };
  },
  async watch(_id, cb) {
    const push = () => cb(fakeRead().filter((r) => r.day === ymd(new Date())).map(({ docId, token, status }) => ({ docId, token, status })));
    fakeSubs.add(push); push();
    const onStorage = (e: StorageEvent) => e.key === FK && push(); window.addEventListener('storage', onStorage);
    return () => { fakeSubs.delete(push); window.removeEventListener('storage', onStorage); };
  },
  async mark(_id, docId, status) { fakeWrite(fakeRead().map((r) => (r.docId === docId ? { ...r, status } : r))); },
  };
/** demo helper: pretend the doctor pressed Seen in MedScript */
export const demoDoctorSees = (docId: string) => fakeDesk.mark(DEMO_DESK, docId, 'seen');

/* ---------- real desk (same calls MedScript's own desk page makes) ---------- */
// Public web config of MedScript's cloud project. Not a secret; access is controlled by the rules + the secret desk id.
const CFG = {
  apiKey: 'AIzaSyAehCjdYB6sHZN5Hdw7kTiy2L5dtOPfqWA', authDomain: 'orthovault02.firebaseapp.com', projectId: 'orthovault02',
  storageBucket: 'orthovault02.firebasestorage.app', messagingSenderId: '251974181391', appId: '1:251974181391:web:348e0e07d0e53ec672f97a',
};
let boot: Promise<{ fs: import('firebase/firestore').Firestore; F: typeof import('firebase/firestore') }> | null = null;
function load() {
  if (!boot) boot = (async () => {
    const [{ initializeApp, getApps, getApp }, F] = await Promise.all([import('firebase/app'), import('firebase/firestore')]);
    const app = getApps().some((a) => a.name === 'desk') ? getApp('desk') : initializeApp(CFG, 'desk');
    let fs: import('firebase/firestore').Firestore;
    try { fs = F.initializeFirestore(app, { experimentalAutoDetectLongPolling: true }); } catch { fs = F.getFirestore(app); }
    return { fs, F };
  })();
  return boot;
}
const okId = (id: string) => /^[a-z0-9]{20,40}$/.test(id);
export const realDesk: DeskApi = {
  async submit(id, e) {
    if (!okId(id)) throw new Error('This desk link is not valid.');
    const { fs, F } = await load(); const d = ymd(new Date());
    const cref = F.doc(fs, 'desks', id, 'counters', d); const qref = F.doc(F.collection(fs, 'desks', id, 'queue'));
    const run = F.runTransaction(fs, async (tx) => {
      const s = await tx.get(cref); const n = (s.exists() ? Number(s.data().n) || 0 : 0) + 1;
      tx.set(cref, { n }); tx.set(qref, { ...e, token: n, day: d, createdAt: Date.now(), status: 'waiting' });
      return n;
    });
    const token = await Promise.race([run, new Promise<number>((_, rej) => setTimeout(() => rej({ code: 'timeout' }), 15000))]);
    return { docId: qref.id, token };
  },
  async watch(id, cb, onErr) {
    if (!okId(id)) { onErr(new Error('This desk link is not valid.')); return () => {}; }
    const { fs, F } = await load();
    return F.onSnapshot(F.query(F.collection(fs, 'desks', id, 'queue'), F.where('day', '==', ymd(new Date()))),
      (snap) => cb(snap.docs.map((d) => ({ docId: d.id, token: Number(d.data().token) || 0, status: d.data().status === 'seen' ? 'seen' as const : 'waiting' as const }))), onErr);
  },
  async mark(id, docId, status) { const { fs, F } = await load(); await F.updateDoc(F.doc(fs, 'desks', id, 'queue', docId), { status }); },
};
export const deskFor = (id: string): DeskApi => (id === DEMO_DESK ? fakeDesk : realDesk);

export const deskErrText = (e: unknown) => {
  const c = (e as { code?: string })?.code || '';
  if (c.includes('permission-denied')) return 'Desk not set up in MedScript (cloud rules missing).';
  if (c.includes('timeout')) return 'Timed out. Check internet.';
  if (c.includes('unavailable') || c.includes('network')) return 'No internet.';
  return (e as Error)?.message || 'Could not reach the desk.';
};

/** Send one arrived patient to the desk and remember where it went. Never throws; the failure is stored so staff can retry. */
export async function sendToDesk(a: Appt, clinic: Clinic, id: string, api: DeskApi = deskFor(id), patch: (id: string, p: Pick<Partial<Appt>, 'deskDocId' | 'deskToken' | 'deskErr'>) => Promise<void>) {
  if (a.deskDocId) return;
  try { const r = await api.submit(id, toDeskIn(a, clinic)); await patch(a.id, { deskDocId: r.docId, deskToken: r.token, deskErr: undefined }); }
  catch (e) { await patch(a.id, { deskErr: deskErrText(e) }); }
}
