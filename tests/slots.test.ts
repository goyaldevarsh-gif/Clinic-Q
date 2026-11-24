import { describe, it, expect } from 'vitest';
import { slotTimes, slotInfos, validateBooking, makeAppt, nextToken, BookError, validateSchedule, sortQueue, waitEstimate, fmt12, addDays, ymd } from '../src/lib/slots';
import type { Appt, BookInput, Clinic, Schedule } from '../src/lib/types';

// Wed 2026-11-25 is a Wednesday
const WED = '2026-11-25';
const sch: Schedule = { days: { 3: [{ start: '16:00', end: '17:00' }] }, slotMinutes: 20, perSlot: 2, dressing: true };
const clinic: Clinic = { id: 'c1', name: 'C', area: '', city: '', doctors: [{ id: 'd1', name: 'Dr X', qualification: '', speciality: '', schedule: sch }] };
const morning = new Date(2026, 10, 25, 9, 0);
const input = (o: Partial<BookInput> = {}): BookInput => ({ clinicId: 'c1', doctorId: 'd1', date: WED, time: '16:20', type: 'OPD', name: 'Amit', age: '34', phone: '9829012345', ...o });
let n = 0;
const add = (appts: Appt[], i: BookInput, now = morning) => { const a = makeAppt(appts, i, 'a' + n++, now); validateBooking([clinic], appts, i, now); return [...appts, a]; };

describe('slot generation', () => {
  it('splits a session into slots that fit fully', () => {
    expect(slotTimes(sch, WED)).toEqual(['16:00', '16:20', '16:40']);
    expect(slotTimes({ ...sch, slotMinutes: 25 }, WED)).toEqual(['16:00', '16:25']);
  });
  it('closed day has no slots', () => expect(slotTimes(sch, '2026-11-26')).toEqual([]));
  it('formats 12h', () => { expect(fmt12('16:05')).toBe('4:05 PM'); expect(fmt12('00:00')).toBe('12:00 AM'); expect(fmt12('12:30')).toBe('12:30 PM'); });
});

describe('booking rules', () => {
  it('books and assigns running tokens per doctor per day', () => {
    let a: Appt[] = [];
    a = add(a, input()); a = add(a, input({ name: 'B', phone: '9000000001' }));
    expect(a.map((x) => x.token)).toEqual([1, 2]);
    expect(nextToken(a, 'c1', 'd1', WED)).toBe(3);
    expect(nextToken(a, 'c1', 'd1', '2026-12-02')).toBe(1);
  });
  it('blocks a full slot', () => {
    let a: Appt[] = [];
    a = add(a, input()); a = add(a, input({ name: 'B', phone: '9000000001' }));
    expect(() => validateBooking([clinic], a, input({ name: 'C', phone: '9000000002' }), morning)).toThrow(BookError);
    try { validateBooking([clinic], a, input({ name: 'C', phone: '9000000002' }), morning); } catch (e) { expect((e as BookError).code).toBe('FULL'); }
  });
  it('cancelled bookings free the slot but never reuse their token', () => {
    let a: Appt[] = [];
    a = add(a, input()); a = add(a, input({ name: 'B', phone: '9000000001' }));
    a[0] = { ...a[0], status: 'cancelled' };
    expect(() => validateBooking([clinic], a, input({ name: 'C', phone: '9000000002' }), morning)).not.toThrow();
    expect(nextToken(a, 'c1', 'd1', WED)).toBe(3);
  });
  it('blocks the same person twice on the same day with the same doctor', () => {
    const a = add([], input());
    try { validateBooking([clinic], a, input({ time: '16:40' }), morning); throw new Error('no'); } catch (e) { expect((e as BookError).code).toBe('DUPLICATE'); }
  });
  it('lets a family member book on the same phone', () => {
    const a = add([], input({ memberId: 'm1' }));
    expect(() => validateBooking([clinic], a, input({ memberId: 'm2', name: 'Pooja', time: '16:40' }), morning)).not.toThrow();
  });
  it('rejects past slots, unknown slots, far dates, dressing when off', () => {
    const code = (i: BookInput, now = morning) => { try { validateBooking([clinic], [], i, now); return 'ok'; } catch (e) { return (e as BookError).code; } };
    expect(code(input(), new Date(2026, 10, 25, 16, 30))).toBe('PAST');
    expect(code(input({ date: '2026-11-18' }))).toBe('PAST');
    expect(code(input({ time: '16:10' }))).toBe('NO_SLOT');
    expect(code(input({ date: '2027-01-06' }))).toBe('TOO_FAR');
    expect(code(input({ name: ' ' }))).toBe('NAME');
    const noDress = { ...clinic, doctors: [{ ...clinic.doctors[0], schedule: { ...sch, dressing: false } }] };
    expect(() => validateBooking([noDress], [], input({ type: 'Dressing' }), morning)).toThrow(BookError);
  });
  it('reschedule ignores the appointment being moved', () => {
    const a = add([], input());
    expect(() => validateBooking([clinic], a, input(), morning)).toThrow(); // duplicate
    expect(() => validateBooking([clinic], a, input(), morning, a[0].id)).not.toThrow();
  });
  it('walk-ins do not use up slot capacity', () => {
    const w: Appt = { ...makeAppt([], input({ time: '16:20' }), 'w', morning), walkIn: true };
    const info = slotInfos(sch, [w], { clinicId: 'c1', doctorId: 'd1' }, WED, morning).find((s) => s.time === '16:20')!;
    expect(info.left).toBe(2);
  });
  it('marks past slots only for today', () => {
    const i = slotInfos(sch, [], { clinicId: 'c1', doctorId: 'd1' }, WED, new Date(2026, 10, 25, 16, 20));
    expect(i.map((s) => s.past)).toEqual([true, true, false]);
  });
});

describe('queue', () => {
  it('orders by time then token', () => {
    let a: Appt[] = [];
    a = add(a, input({ time: '16:40', name: 'Late', phone: '1' }));
    a = add(a, input({ time: '16:00', name: 'Early', phone: '2' }));
    a = add(a, input({ time: '16:00', name: 'Early2', phone: '3' }));
    expect([...a].sort(sortQueue).map((x) => x.name)).toEqual(['Early', 'Early2', 'Late']);
  });
  it('counts only patients who have arrived and are still waiting', () => {
    let a: Appt[] = [];
    a = add(a, input({ time: '16:40', name: 'Me', phone: '1' }));
    a = add(a, input({ time: '16:00', name: 'A', phone: '2' }));
    a = add(a, input({ time: '16:20', name: 'B', phone: '3' }));
    const [me, pa, pb] = a;
    expect(waitEstimate(a, me)).toBeNull(); // I have not arrived
    const meIn = { ...me, arrivedAt: 1 };
    expect(waitEstimate([meIn, pa, pb], meIn)).toBe(0); // nobody else is here
    expect(waitEstimate([meIn, { ...pa, arrivedAt: 2 }, pb], meIn)).toBe(1); // A is here, B has not come
    expect(waitEstimate([meIn, { ...pa, arrivedAt: 2, status: 'seen' }, { ...pb, arrivedAt: 3 }], meIn)).toBe(1); // A already seen
    expect(waitEstimate([{ ...meIn, status: 'seen' }], { ...meIn, status: 'seen' })).toBeNull();
  });
});

describe('schedule validation', () => {
  it('rejects overlap and bad ranges', () => {
    expect(validateSchedule(sch)).toBeNull();
    expect(validateSchedule({ ...sch, days: { 1: [{ start: '10:00', end: '12:00' }, { start: '11:00', end: '13:00' }] } })).toMatch(/overlap/);
    expect(validateSchedule({ ...sch, days: { 1: [{ start: '12:00', end: '10:00' }] } })).toMatch(/after start/);
    expect(validateSchedule({ ...sch, perSlot: 0 })).toBeTruthy();
  });
});

describe('dates', () => {
  it('adds days across months', () => expect(addDays('2026-11-30', 1)).toBe('2026-12-01'));
  it('ymd roundtrip', () => expect(ymd(new Date(2026, 0, 5))).toBe('2026-01-05'));
});
