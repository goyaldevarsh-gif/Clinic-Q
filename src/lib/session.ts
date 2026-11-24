import { useSyncExternalStore } from 'react';

/** DEMO auth. Patient OTP is always DEMO_OTP, staff PIN is always DEMO_PIN. Real auth (Firebase phone OTP) replaces this. */
export const DEMO_OTP = '123456';
export const DEMO_PIN = '1234';

export type Session = { role: 'patient'; phone: string } | { role: 'staff'; clinicId: string } | null;
const KEY = 'cq.session';
const subs = new Set<() => void>();
let raw = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
let cache: Session = parse(raw);
function parse(r: string | null): Session { try { return r ? (JSON.parse(r) as Session) : null; } catch { return null; } }

export const getSession = () => cache;
export function setSession(s: Session) {
  raw = s ? JSON.stringify(s) : null;
  try { if (raw) localStorage.setItem(KEY, raw); else localStorage.removeItem(KEY); } catch { /* ignore */ }
  cache = s; subs.forEach((f) => f());
}
export const useSession = () => useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, getSession);

export const validPhone = (p: string) => /^[6-9]\d{9}$/.test(p);
