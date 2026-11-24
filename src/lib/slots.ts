import type { Appt, BookInput, Clinic, Schedule, Session } from './types';

export const HORIZON_DAYS = 14;

export const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
export const fromMin = (n: number) => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
export function fmt12(t: string) {
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

export const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const parseYmd = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d, 12); };
export const addDays = (s: string, n: number) => { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); };
export const weekdayOf = (s: string) => parseYmd(s).getDay();
export const nowHM = (now: Date) => fromMin(now.getHours() * 60 + now.getMinutes());

export const fmtToken = (n: number) => `Q-${String(n).padStart(2, '0')}`;

export function sessionsFor(sch: Schedule, date: string): Session[] {
  return (sch.days[weekdayOf(date)] ?? []).filter((s) => toMin(s.end) > toMin(s.start));
}

/** All slot start times of a day, e.g. ['16:00','16:15',…]. A slot must fit fully inside a session. */
export function slotTimes(sch: Schedule, date: string): string[] {
  const out: string[] = [];
  for (const s of sessionsFor(sch, date)) {
    for (let t = toMin(s.start); t + sch.slotMinutes <= toMin(s.end); t += sch.slotMinutes) out.push(fromMin(t));
  }
  return [...new Set(out)].sort();
}

export interface SlotInfo { time: string; booked: number; capacity: number; left: number; past: boolean }

const countsToCapacity = (a: Appt) => a.status !== 'cancelled' && !a.walkIn;

export function slotInfos(sch: Schedule, appts: Appt[], key: { clinicId: string; doctorId: string }, date: string, now: Date, ignoreId?: string): SlotInfo[] {
  const today = ymd(now);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  return slotTimes(sch, date).map((time) => {
    const booked = appts.filter((a) => a.id !== ignoreId && a.clinicId === key.clinicId && a.doctorId === key.doctorId && a.date === date && a.time === time && countsToCapacity(a)).length;
    const past = date < today || (date === today && toMin(time) <= nowMin);
    return { time, booked, capacity: sch.perSlot, left: Math.max(0, sch.perSlot - booked), past };
  });
}

/** Queue order: by time, then token. Walk-ins carry their arrival time. */
export const sortQueue = (a: Appt, b: Appt) => a.time.localeCompare(b.time) || a.token - b.token;

export function nextToken(appts: Appt[], clinicId: string, doctorId: string, date: string) {
  const mine = appts.filter((a) => a.clinicId === clinicId && a.doctorId === doctorId && a.date === date);
  return mine.reduce((mx, a) => Math.max(mx, a.token), 0) + 1;
}

export type BookErrorCode = 'NO_CLINIC' | 'NO_DOCTOR' | 'NAME' | 'PAST' | 'TOO_FAR' | 'NO_SLOT' | 'FULL' | 'DUPLICATE' | 'NO_DRESSING' | 'NOT_FOUND';
export class BookError extends Error {
  constructor(public code: BookErrorCode, msg?: string) { super(msg ?? code); }
}

const sameMember = (a: Appt, i: BookInput) => (i.memberId && a.memberId ? a.memberId === i.memberId : a.name.trim().toLowerCase() === i.name.trim().toLowerCase()) && a.phone === i.phone;

/** Throws BookError if the booking is not allowed. `ignoreId` = appointment being rescheduled. */
export function validateBooking(clinics: Clinic[], appts: Appt[], input: BookInput, now: Date, ignoreId?: string) {
  const clinic = clinics.find((c) => c.id === input.clinicId);
  if (!clinic) throw new BookError('NO_CLINIC');
  const doctor = clinic.doctors.find((d) => d.id === input.doctorId);
  if (!doctor) throw new BookError('NO_DOCTOR');
  if (!input.name.trim()) throw new BookError('NAME');
  if (input.type === 'Dressing' && !doctor.schedule.dressing) throw new BookError('NO_DRESSING');
  const today = ymd(now);
  if (input.date < today) throw new BookError('PAST');
  if (input.date > addDays(today, HORIZON_DAYS)) throw new BookError('TOO_FAR');
  const slot = slotInfos(doctor.schedule, appts, input, input.date, now, ignoreId).find((s) => s.time === input.time);
  if (!slot) throw new BookError('NO_SLOT');
  if (slot.past) throw new BookError('PAST');
  if (slot.left <= 0) throw new BookError('FULL');
  const dup = appts.some((a) => a.id !== ignoreId && a.clinicId === input.clinicId && a.doctorId === input.doctorId && a.date === input.date && a.status !== 'cancelled' && sameMember(a, input));
  if (dup) throw new BookError('DUPLICATE');
}

export function makeAppt(appts: Appt[], input: BookInput, id: string, now: Date): Appt {
  return { ...input, id, token: nextToken(appts, input.clinicId, input.doctorId, input.date), status: 'waiting', createdAt: now.getTime() };
}

/** People who are physically at the clinic (Arrived), still waiting, and ahead of this patient. null = not waiting or not arrived yet. */
export function waitEstimate(appts: Appt[], me: Appt): number | null {
  if (me.status !== 'waiting' || !me.arrivedAt) return null;
  return appts.filter((a) => a.clinicId === me.clinicId && a.doctorId === me.doctorId && a.date === me.date && a.status === 'waiting' && !!a.arrivedAt && a.id !== me.id && sortQueue(a, me) < 0).length;
}

export function validateSchedule(s: Schedule): string | null {
  if (s.slotMinutes < 5 || s.slotMinutes > 120) return 'Slot length must be 5–120 minutes';
  if (s.perSlot < 1 || s.perSlot > 50) return 'Patients per slot must be 1–50';
  for (const [d, list] of Object.entries(s.days)) {
    const sorted = [...list].sort((a, b) => toMin(a.start) - toMin(b.start));
    for (let i = 0; i < sorted.length; i++) {
      if (toMin(sorted[i].end) <= toMin(sorted[i].start)) return `${DAY[+d]}: end time must be after start time`;
      if (i > 0 && toMin(sorted[i].start) < toMin(sorted[i - 1].end)) return `${DAY[+d]}: timings overlap`;
    }
  }
  return null;
}

export const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
