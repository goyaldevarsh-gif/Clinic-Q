import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { CalendarPlus, FileText, Home as HomeIcon, ListChecks, User } from 'lucide-react';
import { useSession } from '../../lib/session';
import { DemoBanner, TabBar } from '../../components/ui';
import type { Appt, Clinic, State } from '../../lib/types';
import { slotTimes, sortQueue, ymd } from '../../lib/slots';

export function usePhone() { const s = useSession(); return s?.role === 'patient' ? s.phone : ''; }

export function PatientLayout() {
  const s = useSession();
  const loc = useLocation();
  if (s?.role !== 'patient') return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  return (
    <div className="mx-auto min-h-screen max-w-xl bg-surface pb-24">
      <DemoBanner />
      <Outlet />
      <TabBar items={[
        { to: '/', label: 'Home', icon: <HomeIcon size={22} />, end: true },
        { to: '/book', label: 'Book', icon: <CalendarPlus size={22} /> },
        { to: '/visits', label: 'Visits', icon: <ListChecks size={22} /> },
        { to: '/records', label: 'Records', icon: <FileText size={22} /> },
        { to: '/profile', label: 'Profile', icon: <User size={22} /> },
      ]} />
    </div>
  );
}

/** "2 before you · about 10 min" in the current language */
export function aheadText(t: (s: string) => string, ahead: number, minutes: number) {
  return ahead === 0 ? t('You are next') : `${ahead} ${t('before you')} · ${t('about')} ${minutes} ${t('min')}`;
}

export const findClinic = (st: State, id: string): Clinic | undefined => st.clinics.find((c) => c.id === id);
export const findDoctor = (c: Clinic | undefined, id: string) => c?.doctors.find((d) => d.id === id);

export function myAppts(st: State, phone: string) { return st.appts.filter((a) => a.phone === phone); }

export const isUpcoming = (a: Appt, now = new Date()) => a.status === 'waiting' && a.date >= ymd(now);

/** Live queue facts for a waiting appointment on its day. */
export function queueInfo(st: State, a: Appt) {
  const day = st.appts.filter((x) => x.clinicId === a.clinicId && x.doctorId === a.doctorId && x.date === a.date && x.status !== 'cancelled').sort(sortQueue);
  const waiting = day.filter((x) => x.status === 'waiting');
  const serving = waiting[0];
  const ahead = waiting.findIndex((x) => x.id === a.id);
  const doc = findDoctor(findClinic(st, a.clinicId), a.doctorId);
  const avg = doc ? doc.schedule.slotMinutes / Math.max(1, doc.schedule.perSlot) : 10;
  return { serving, ahead: Math.max(0, ahead), minutes: Math.round((Math.max(0, ahead) * avg) / 5) * 5, hasSlots: doc ? slotTimes(doc.schedule, a.date).length > 0 : true };
}
