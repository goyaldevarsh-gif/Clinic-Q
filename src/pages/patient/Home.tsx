import { Link, useNavigate } from 'react-router-dom';
import { CalendarPlus, Clock, FileText, ListChecks, MapPin, Users } from 'lucide-react';
import { useStore } from '../../lib/store';
import { locale, useT } from '../../lib/i18n';
import { fmt12, fmtToken, parseYmd, ymd } from '../../lib/slots';
import { Avatar, Header, LangToggle, Logo } from '../../components/ui';
import { ClinicIllustration } from '../../components/Illustration';
import { findClinic, findDoctor, isUpcoming, myAppts, usePhone } from './shared';
import { QueueStatus } from '../../components/QueueStatus';

export const dayLabel = (d: string) => parseYmd(d).toLocaleDateString(locale(), { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

export function Home() {
  const t = useT(); const st = useStore(); const phone = usePhone(); const nav = useNavigate();
  const me = (st.members[phone] ?? []).find((m) => m.relation === 'self');
  const up = myAppts(st, phone).filter((a) => isUpcoming(a)).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))[0];
  const clinic = up && findClinic(st, up.clinicId); const doc = up && findDoctor(clinic, up.doctorId);
  const today = !!up && up.date === ymd(new Date());
  const tiles = [
    { to: '/book', label: 'Book', icon: <CalendarPlus size={22} />, bg: 'bg-primary-100 text-primary-dark' },
    { to: '/visits', label: 'Visits', icon: <ListChecks size={22} />, bg: 'bg-accent-50 text-[#14867B]' },
    { to: '/records', label: 'Records', icon: <FileText size={22} />, bg: 'bg-warn-50 text-warn' },
    { to: '/profile', label: 'Family', icon: <Users size={22} />, bg: 'bg-ok-50 text-ok' },
  ];
  return (<>
    <Header title={<Logo size={26} />} right={<LangToggle />} />
    <div className="px-4 pt-5">
      <div className="text-[26px] font-extrabold leading-tight">{t('Namaste')}, {me?.name.split(' ')[0] ?? ''} 👋</div>
      <div className="text-sm text-ink-2">{parseYmd(ymd(new Date())).toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long' })}</div>

      {up && clinic && doc ? (
        <div className="mt-5 overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary-dark p-5 text-white shadow-card">
          <div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wide text-white/75">{t('Upcoming appointment')}</span><span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold">{t(up.type)}</span></div>
          <div className="mt-3 flex items-center gap-3">
            <Avatar name={doc.name} size={48} tone="white" />
            <div className="min-w-0 flex-1"><div className="truncate text-lg font-bold">{doc.name}</div><div className="truncate text-sm text-white/80">{t('For')} {up.name}</div></div>
            <div className="text-right"><div className="text-[10px] font-bold uppercase text-white/70">{t('Token')}</div><div className="text-3xl font-extrabold leading-none">{fmtToken(up.token)}</div></div>
          </div>
          <div className="mt-4 space-y-1.5 text-sm font-medium"><div className="flex items-center gap-2"><Clock size={15} className="text-white/80" />{dayLabel(up.date)} · {fmt12(up.time)}</div><div className="flex items-center gap-2"><MapPin size={15} className="text-white/80" />{clinic.name}, {clinic.area}</div></div>
          {today && <QueueStatus st={st} a={up} tone="dark" />}
          <div className="mt-4 grid grid-cols-2 gap-2"><button className="rounded-xl bg-white py-2.5 text-sm font-bold text-primary-dark" onClick={() => nav(`/confirmed/${up.id}`)}>{t('View details')}</button><button className="rounded-xl border border-white/40 py-2.5 text-sm font-bold text-white" onClick={() => nav(`/book?reschedule=${up.id}`)}>{t('Reschedule')}</button></div>
        </div>
      ) : (
        <div className="card mt-5 overflow-hidden p-5 text-center">
          <ClinicIllustration className="mx-auto w-48" />
          <div className="mt-2 font-bold">{t('No upcoming appointment')}</div>
          <Link to="/book" className="btn-primary mt-3 w-full"><CalendarPlus size={18} />{t('Book appointment')}</Link>
        </div>
      )}
      {up && <Link to="/book" className="btn-soft mt-3 w-full"><CalendarPlus size={18} />{t('Book appointment')}</Link>}

      <div className="mt-5 grid grid-cols-4 gap-2.5">
        {tiles.map((x) => (
          <Link key={x.to} to={x.to} className="flex flex-col items-center gap-2 rounded-2xl border border-line bg-white px-1 py-3 text-center shadow-card">
            <span className={`grid h-11 w-11 place-items-center rounded-2xl ${x.bg}`}>{x.icon}</span>
            <span className="text-[11px] font-bold leading-tight">{t(x.label)}</span>
          </Link>))}
      </div>
    </div>
  </>);
}
