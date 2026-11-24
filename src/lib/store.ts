import { useSyncExternalStore } from 'react';
import type { Appt, BookInput, Clinic, Member, State, Status } from './types';
import { BookError, makeAppt, nowHM, validateBooking, ymd } from './slots';
import { SEED_CLINICS } from './seed';

/**
 * DEMO store: everything lives in this browser's localStorage.
 * The shape (getState / subscribe / async actions) is what a Firestore adapter will implement later,
 * so no screen needs to change when the real backend is plugged in.
 */
const KEY = 'cq.demo.v1';
const fresh = (): State => ({ clinics: structuredClone(SEED_CLINICS), members: {}, appts: [] });

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { const s = JSON.parse(raw) as State; if (s.clinics?.length) return s; }
  } catch { /* corrupted → start fresh */ }
  return fresh();
}

let state: State = load();
const subs = new Set<() => void>();
function commit(next: State) {
  state = next;
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage full/blocked: keep in memory */ }
  subs.forEach((f) => f());
}
if (typeof window !== 'undefined') window.addEventListener('storage', (e) => { if (e.key === KEY) { state = load(); subs.forEach((f) => f()); } });

const uid = () => (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36));

export const store = {
  getState: () => state,
  subscribe(fn: () => void) { subs.add(fn); return () => { subs.delete(fn); }; },

  async book(input: BookInput, now = new Date()): Promise<Appt> {
    validateBooking(state.clinics, state.appts, input, now);
    const a = makeAppt(state.appts, input, uid(), now);
    commit({ ...state, appts: [...state.appts, a] });
    return a;
  },

  /** Move to a new slot: validated first, the old booking is only released if the new one is valid. */
  async reschedule(oldId: string, input: BookInput, now = new Date()): Promise<Appt> {
    const old = state.appts.find((a) => a.id === oldId);
    if (!old) throw new BookError('NOT_FOUND');
    validateBooking(state.clinics, state.appts, input, now, oldId);
    const a = makeAppt(state.appts, input, uid(), now);
    commit({ ...state, appts: [...state.appts.map((x) => (x.id === oldId ? { ...x, status: 'cancelled' as Status, cancelledBy: 'rescheduled' as const } : x)), a] });
    return a;
  },

  async cancel(id: string, by: 'patient' | 'clinic') {
    commit({ ...state, appts: state.appts.map((a) => (a.id === id && a.status !== 'seen' ? { ...a, status: 'cancelled', cancelledBy: by } : a)) });
  },

  async setStatus(id: string, status: Exclude<Status, 'cancelled'>) {
    commit({ ...state, appts: state.appts.map((a) => (a.id === id && a.status !== 'cancelled' ? { ...a, status } : a)) });
  },

  async addWalkIn(w: { clinicId: string; doctorId: string; name: string; age: string; phone: string; type: Appt['type'] }, now = new Date()): Promise<Appt> {
    if (!w.name.trim()) throw new BookError('NAME');
    const base: BookInput = { ...w, date: ymd(now), time: nowHM(now) };
    const a = { ...makeAppt(state.appts, base, uid(), now), walkIn: true };
    commit({ ...state, appts: [...state.appts, a] });
    return a;
  },

  async saveClinic(c: Clinic) { commit({ ...state, clinics: state.clinics.map((x) => (x.id === c.id ? c : x)) }); },

  async saveMember(phone: string, m: Member) {
    const list = state.members[phone] ?? [];
    const next = list.some((x) => x.id === m.id) ? list.map((x) => (x.id === m.id ? m : x)) : [...list, m];
    commit({ ...state, members: { ...state.members, [phone]: next } });
  },
  async removeMember(phone: string, id: string) {
    commit({ ...state, members: { ...state.members, [phone]: (state.members[phone] ?? []).filter((m) => m.id !== id || m.relation === 'self') } });
  },

  async resetDemo() { commit(fresh()); },
};

export const newId = uid;
export const useStore = () => useSyncExternalStore(store.subscribe, store.getState);
