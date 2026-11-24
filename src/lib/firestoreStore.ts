import type { Appt, BookInput, Clinic, ClinicRecord, Member, State, Status } from './types';
import { BookError, nowHM, validateBooking, ymd } from './slots';
import { getSession, setSession, subscribeSession } from './session';
import { SEED_CLINICS } from './seed';

/**
 * Firestore-backed store (same interface as the demo store). See firestore.rules for the data model:
 *   clinics/{c}                      public: name, doctors, schedule, caps
 *   clinics/{c}/days/{doctor_date}   public counters {last, slots}  → tokens and slot capacity (no personal data)
 *   clinics/{c}/days/{..}/people/{phone_member}  one booking per person per doctor per day
 *   clinics/{c}/appts/{id}           private appointment
 *   clinics/{c}/live/{doctor_date}   public "who is checked in" list, written by staff, so patients get a queue count
 * A patient can only read their own appointments, so other people's bookings reach the app only as anonymous "placeholder"
 * entries (no name, no phone) built from the public counters. They exist only so the slot picker shows the right free places.
 */
type Sdk = typeof import('./fbsdk');
const sdk = (): Promise<Sdk> => import('./fbsdk');
const uid = () => globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36);
const clean = <T extends object>(o: T): T => JSON.parse(JSON.stringify(o));
const memberKey = (i: { memberId?: string; name: string }) => i.memberId || 'x' + i.name.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
type DayDoc = { last: number; slots: Record<string, number> };
type LiveRow = { t: number; time: string };

export function createFbStore() {
  let clinics: Clinic[] = [];
  let members: Record<string, Member[]> = {};
  const realBy: Record<string, Appt[]> = {};
  const recBy: Record<string, ClinicRecord[]> = {};
  const days: Record<string, DayDoc> = {};
  const live: Record<string, LiveRow[]> = {};
  let state: State = { clinics: [], members: {}, appts: [] };
  const subs = new Set<() => void>();
  let lastLive = '';

  const allReal = () => Object.values(realBy).flat();

  function recompute() {
    const real = allReal();
    const ghosts: Appt[] = [];
    if (getSession()?.role !== 'staff') {
      for (const [key, d] of Object.entries(days)) {
        const [clinicId, doctorId, date] = key.split('|');
        for (const [time, n] of Object.entries(d.slots)) {
          const mine = real.filter((a) => a.clinicId === clinicId && a.doctorId === doctorId && a.date === date && a.time === time && a.status !== 'cancelled' && !a.walkIn).length;
          for (let i = 0; i < n - mine; i++) ghosts.push({ id: `g|${key}|${time}|${i}`, clinicId, doctorId, date, time, type: 'OPD', name: '', age: '', phone: '', token: 0, status: 'waiting', createdAt: 0 });
        }
      }
      for (const [key, rows] of Object.entries(live)) {
        const [clinicId, doctorId, date] = key.split('|');
        for (const r of rows) {
          if (real.some((a) => a.clinicId === clinicId && a.doctorId === doctorId && a.date === date && a.token === r.t)) continue;
          ghosts.push({ id: `l|${key}|${r.t}`, clinicId, doctorId, date, time: r.time, type: 'OPD', name: '', age: '', phone: '', token: r.t, status: 'waiting', walkIn: true, arrivedAt: 1, createdAt: 0 });
        }
      }
    }
    state = { clinics, members, appts: [...real, ...ghosts], records: Object.values(recBy).flat() };
    subs.forEach((f) => f());
    publishLive();
  }

  /** staff device: keep the public "checked in" list of today up to date */
  async function publishLive() {
    const s = getSession();
    if (s?.role !== 'staff') return;
    const today = ymd(new Date());
    const out: Record<string, LiveRow[]> = {};
    for (const a of realBy[s.clinicId] ?? []) {
      if (a.date !== today) continue;
      const k = `${a.doctorId}_${a.date}`; (out[k] ??= []);
      if (a.status === 'waiting' && a.arrivedAt) out[k].push({ t: a.token, time: a.time });
    }
    for (const k of Object.keys(out)) out[k].sort((x, y) => x.time.localeCompare(y.time) || x.t - y.t);
    const sig = JSON.stringify(out); if (sig === lastLive) return; lastLive = sig;
    try { const { db, F } = await sdk(); await Promise.all(Object.entries(out).map(([k, rows]) => F.setDoc(F.doc(db, 'clinics', s.clinicId, 'live', k), { arrived: rows }))); } catch { lastLive = ''; }
  }

  /* ---- subscriptions ---- */
  let unsubs: (() => void)[] = [];
  let apptUnsubs: (() => void)[] = [];
  const watches = new Map<string, { n: number; off: () => void }>();

  async function bindAppts() {
    apptUnsubs.forEach((u) => u()); apptUnsubs = [];
    for (const k of Object.keys(realBy)) delete realBy[k];
    for (const k of Object.keys(recBy)) delete recBy[k];
    const s = getSession(); if (!s) { recompute(); return; }
    const { db, F } = await sdk();
    if (s.role === 'patient') {
      apptUnsubs.push(F.onSnapshot(F.collection(db, 'patients', s.phone, 'members'), (snap) => { members = { [s.phone]: snap.docs.map((d) => d.data() as Member) }; recompute(); }, () => {}));
      for (const c of clinics) {
        apptUnsubs.push(F.onSnapshot(F.query(F.collection(db, 'clinics', c.id, 'appts'), F.where('phone', '==', s.phone)), (snap) => {
          realBy[c.id] = snap.docs.map((d) => d.data() as Appt); autoWatch(); recompute();
        }, () => {}));
        if (c.shareRecords) apptUnsubs.push(F.onSnapshot(F.query(F.collection(db, 'clinics', c.id, 'records'), F.where('phone', '==', s.phone)), (snap) => { recBy[c.id] = snap.docs.map((d) => d.data() as ClinicRecord); recompute(); }, () => {}));
      }
    } else {
      const since = ymd(new Date(Date.now() - 30 * 864e5));
      apptUnsubs.push(F.onSnapshot(F.query(F.collection(db, 'clinics', s.clinicId, 'appts'), F.where('clinicId', '==', s.clinicId), F.where('date', '>=', since)), (snap) => {
        realBy[s.clinicId] = snap.docs.map((d) => d.data() as Appt); recompute();
      }, () => {}));
    }
  }

  async function init() {
    const { db, auth, A, F } = await sdk();
    unsubs.push(F.onSnapshot(F.collection(db, 'clinics'), (snap) => {
      const next = snap.docs.map((d) => ({ ...(d.data() as Clinic), id: d.id }));
      const sig = (l: Clinic[]) => l.map((c) => c.id + (c.shareRecords ? '+' : '')).join();
      const changed = sig(next) !== sig(clinics);
      clinics = next; recompute(); if (changed && getSession()?.role === 'patient') bindAppts();
    }, () => {}));
    A.onAuthStateChanged(auth, (u) => {
      const s = getSession();
      if (s && !u) setSession(null);
      else if (s?.role === 'patient' && u && u.phoneNumber !== `+91${s.phone}`) setSession(null);
    });
    subscribeSession(() => { bindAppts(); });
    bindAppts();
  }
  init().catch(() => {});

  const autoKeys = new Set<string>();
  function autoWatch() {
    for (const a of allReal()) {
      if (a.status === 'cancelled' || a.date < ymd(new Date())) continue;
      const k = `${a.clinicId}|${a.doctorId}|${a.date}`;
      if (!autoKeys.has(k)) { autoKeys.add(k); watchDay(a.clinicId, a.doctorId, a.date); }
    }
  }

  function watchDay(clinicId: string, doctorId: string, date: string) {
    const k = `${clinicId}|${doctorId}|${date}`;
    const cur = watches.get(k);
    if (cur) { cur.n++; return () => { cur.n--; }; }
    const entry = { n: 1, off: () => {} }; watches.set(k, entry);
    sdk().then(({ db, F }) => {
      const id = `${doctorId}_${date}`;
      const u1 = F.onSnapshot(F.doc(db, 'clinics', clinicId, 'days', id), (s) => { if (s.exists()) days[k] = s.data() as DayDoc; else delete days[k]; recompute(); }, () => {});
      const u2 = F.onSnapshot(F.doc(db, 'clinics', clinicId, 'live', id), (s) => { live[k] = s.exists() ? (s.data().arrived as LiveRow[]) : []; recompute(); }, () => {});
      entry.off = () => { u1(); u2(); };
    }).catch(() => {});
    return () => { entry.n--; };
  }

  /** slot picker: all counters of one doctor for the booking window (one listener) */
  function watchDoctor(clinicId: string, doctorId: string) {
    const k = `doc|${clinicId}|${doctorId}`;
    const cur = watches.get(k);
    if (cur) { cur.n++; return () => { cur.n--; }; }
    const entry = { n: 1, off: () => {} }; watches.set(k, entry);
    const from = ymd(new Date()); const to = ymd(new Date(Date.now() + 16 * 864e5));
    sdk().then(({ db, F }) => {
      entry.off = F.onSnapshot(F.query(F.collection(db, 'clinics', clinicId, 'days'), F.where(F.documentId(), '>=', `${doctorId}_${from}`), F.where(F.documentId(), '<=', `${doctorId}_${to}`)), (snap) => {
        for (const key of Object.keys(days)) if (key.startsWith(`${clinicId}|${doctorId}|`)) delete days[key];
        for (const d of snap.docs) days[`${clinicId}|${doctorId}|${d.id.slice(doctorId.length + 1)}`] = d.data() as DayDoc;
        recompute();
      }, () => {});
    }).catch(() => {});
    return () => { entry.n--; };
  }

  /* ---- actions ---- */
  async function commitBooking(input: BookInput, now: Date, oldId?: string): Promise<Appt> {
    validateBooking(state.clinics, state.appts, input, now, oldId);
    const clinic = clinics.find((c) => c.id === input.clinicId)!;
    const cap = clinic.doctors.find((d) => d.id === input.doctorId)!.schedule.perSlot;
    const old = oldId ? allReal().find((a) => a.id === oldId) : undefined;
    const id = uid(); const mk = memberKey(input);
    const { db, F } = await sdk();
    const col = (...p: string[]) => F.doc(db, 'clinics', input.clinicId, ...(p as [string, ...string[]]));
    const dayRef = col('days', `${input.doctorId}_${input.date}`);
    const peopleRef = F.doc(dayRef, 'people', `${input.phone}_${mk}`);
    const apptRef = col('appts', id);
    const oldDayRef = old ? col('days', `${old.doctorId}_${old.date}`) : null;
    const sameDay = !!oldDayRef && oldDayRef.path === dayRef.path;
    const oldPid = old && old.memberId ? `${old.phone}_${old.memberId}` : '';
    try {
      return await F.runTransaction(db, async (tx) => {
        const daySnap = await tx.get(dayRef);
        const pSnap = await tx.get(peopleRef);
        const oldSnap = oldDayRef && !sameDay ? await tx.get(oldDayRef) : null;
        const day: DayDoc = daySnap.exists() ? (daySnap.data() as DayDoc) : { last: 0, slots: {} };
        const slots = { ...day.slots };
        if (old && !old.walkIn) {
          if (sameDay) slots[old.time] = Math.max(0, (slots[old.time] ?? 0) - 1);
          else if (oldSnap?.exists() && oldDayRef) { const od = oldSnap.data() as DayDoc; tx.set(oldDayRef, { last: od.last, slots: { ...od.slots, [old.time]: Math.max(0, (od.slots[old.time] ?? 0) - 1) } }); }
        }
        if (pSnap.exists() && pSnap.data().apptId !== oldId) throw new BookError('DUPLICATE');
        if ((slots[input.time] ?? 0) >= cap) throw new BookError('FULL');
        const token = day.last + 1;
        slots[input.time] = (slots[input.time] ?? 0) + 1;
        const appt: Appt = clean({ ...input, memberId: mk, id, token, status: 'waiting' as Status, createdAt: now.getTime() });
        tx.set(dayRef, { last: token, slots });
        tx.set(peopleRef, { apptId: id });
        tx.set(apptRef, appt);
        if (old) {
          tx.update(col('appts', old.id), { status: 'cancelled', cancelledBy: 'rescheduled' });
          if (oldPid && oldPid !== `${input.phone}_${mk}`) tx.delete(F.doc(oldDayRef!, 'people', oldPid));
        }
        return appt;
      });
    } catch (e) { throw e instanceof BookError ? e : new Error('network'); }
  }

  const upd = async (a: Appt, p: Record<string, unknown>) => {
    const { db, F } = await sdk();
    await F.updateDoc(F.doc(db, 'clinics', a.clinicId, 'appts', a.id), p);
  };
  const find = (id: string) => allReal().find((a) => a.id === id);

  return {
    getState: () => state,
    subscribe(fn: () => void) { subs.add(fn); return () => { subs.delete(fn); }; },
    watchDay,
    watchDoctor,

    async book(input: BookInput, now = new Date()) { return commitBooking(input, now); },
    async reschedule(oldId: string, input: BookInput, now = new Date()) {
      if (!find(oldId)) throw new BookError('NOT_FOUND');
      return commitBooking(input, now, oldId);
    },

    async cancel(id: string, by: 'patient' | 'clinic') {
      const a = find(id); if (!a || a.status === 'seen' || a.status === 'cancelled') return;
      const { db, F } = await sdk();
      const dayRef = F.doc(db, 'clinics', a.clinicId, 'days', `${a.doctorId}_${a.date}`);
      await F.runTransaction(db, async (tx) => {
        const snap = a.walkIn ? null : await tx.get(dayRef);
        tx.update(F.doc(db, 'clinics', a.clinicId, 'appts', a.id), { status: 'cancelled', cancelledBy: by });
        if (snap?.exists()) { const d = snap.data() as DayDoc; tx.set(dayRef, { last: d.last, slots: { ...d.slots, [a.time]: Math.max(0, (d.slots[a.time] ?? 0) - 1) } }); }
        if (!a.walkIn && a.phone && a.memberId) tx.delete(F.doc(dayRef, 'people', `${a.phone}_${a.memberId}`));
      });
    },

    async arrive(id: string, now = new Date()) { const a = find(id); if (a && a.status === 'waiting' && !a.arrivedAt) await upd(a, { arrivedAt: now.getTime() }); },
    async patchAppt(id: string, p: Partial<Pick<Appt, 'deskDocId' | 'deskToken' | 'deskErr'>>) { const a = find(id); if (a) await upd(a, clean(p)); },
    async setStatus(id: string, status: Exclude<Status, 'cancelled'>) { const a = find(id); if (a && a.status !== 'cancelled') await upd(a, { status }); },

    async addWalkIn(w: { clinicId: string; doctorId: string; name: string; age: string; phone: string; type: Appt['type'] }, now = new Date()): Promise<Appt> {
      if (!w.name.trim()) throw new BookError('NAME');
      const { db, F } = await sdk(); const date = ymd(now); const id = uid();
      const dayRef = F.doc(db, 'clinics', w.clinicId, 'days', `${w.doctorId}_${date}`);
      return F.runTransaction(db, async (tx) => {
        const snap = await tx.get(dayRef);
        const d: DayDoc = snap.exists() ? (snap.data() as DayDoc) : { last: 0, slots: {} };
        const appt: Appt = clean({ ...w, id, date, time: nowHM(now), token: d.last + 1, status: 'waiting' as Status, walkIn: true, arrivedAt: now.getTime(), createdAt: now.getTime() });
        tx.set(dayRef, { last: d.last + 1, slots: d.slots });
        tx.set(F.doc(db, 'clinics', w.clinicId, 'appts', id), appt);
        return appt;
      });
    },

    async saveClinic(c: Clinic) {
      const { db, F } = await sdk();
      const caps = Object.fromEntries(c.doctors.map((d) => [d.id, d.schedule.perSlot]));
      await F.setDoc(F.doc(db, 'clinics', c.id), clean({ ...c, caps }));
    },
    /** first staff sign-in: create the clinic document from the built-in template if it does not exist yet */
    async ensureClinic(clinicId: string) {
      const { db, F } = await sdk();
      const ref = F.doc(db, 'clinics', clinicId);
      if ((await F.getDoc(ref)).exists()) return;
      const seed = SEED_CLINICS.find((c) => c.id === clinicId);
      // any other id → a blank starter clinic; name, doctor and timings are edited in Settings / Slots
      const days: Record<number, { start: string; end: string }[]> = {};
      for (let d = 1; d <= 6; d++) days[d] = [{ start: '10:00', end: '13:00' }];
      await this.saveClinic(seed ?? { id: clinicId, name: 'My Clinic', area: '', city: 'Jaipur', doctors: [{ id: 'dg', name: 'Dr. Devarsh Goyal', qualification: 'MS Orthopaedics', speciality: '', schedule: { days, slotMinutes: 15, perSlot: 2, dressing: true } }] });
    },

    async saveMember(phone: string, m: Member) { const { db, F } = await sdk(); await F.setDoc(F.doc(db, 'patients', phone, 'members', m.id), clean(m)); },
    async removeMember(phone: string, id: string) {
      const m = (members[phone] ?? []).find((x) => x.id === id); if (!m || m.relation === 'self') return;
      const { db, F } = await sdk(); await F.deleteDoc(F.doc(db, 'patients', phone, 'members', id));
    },
    async resetDemo() { /* not available on the real backend */ },
  };
}
