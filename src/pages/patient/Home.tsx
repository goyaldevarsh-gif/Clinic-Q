import { Link, useNavigate } from 'react-router-dom';
import { CalendarPlus, Clock, FileText, MapPin, Users } from 'lucide-react';
import { useStore } from '../../lib/store';
import { useT } from '../../lib/i18n';
import { fmt12, fmtToken, parseYmd, ymd } from '../../lib/slots';
import { Header, LangToggle, Logo, TokenBadge } from '../../components/ui';
import { findClinic, findDoctor, isUpcoming, myAppts, queueInfo, usePhone } from './shared';

export const dayLabel = (d: string) => parseYmd(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

export function Home() {
  const t = useT(); const st = useStore(); const phone = usePhone(); const nav = useNavigate();
  const me = (st.members[phone] ?? []).find((m) => m.relation === 'self');
  const up = myAppts(st, phone).filter((a) => isUpcoming(a)).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))[0];
  const clinic = up && findClinic(st, up.clinicId); const doc = up && findDoctor(clinic, up.doctorId);
  const q = up && up.date === ymd(new Date()) ? queueInfo(st, up) : null;
  return (<>
    <Header title={<Logo size={26} />} right={<LangToggle />} />
    <div className="px-4 pt-6">
      <div className="text-2xl font-extrabold">{t('Namaste')}, {me?.name.split(' ')[0] ?? ''} 👋</div>
      <div className="mt-4">
        <div className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-2">{t('Upcoming appointment')}</div>
        {up && clinic && doc ? (
          <div className="card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-bold">{doc.name}</div>
                <div className="text-sm text-ink-2">{up.type} · {up.name}</div>
              </div>
              <TokenBadge n={up.token} />
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm font-medium"><span className="inline-flex items-center gap-1.5"><Clock size={15} className="text-primary" />{dayLabel(up.date)} · {fmt12(up.time)}</span><span className="inline-flex items-center gap-1.5"><MapPin size={15} className="text-primary" />{clinic.name}, {clinic.area}</span></div>
            {q?.serving && (
              <div className="mt-3 rounded-xl bg-primary-50 px-3 py-2 text-sm"><b>{t('Now serving')}:</b> {fmtToken(q.serving.token)} · {q.ahead === 0 ? 'You are next' : `${q.ahead} before you · about ${q.minutes} min`}</div>
            )}
            <div className="mt-3 flex gap-2"><button className="btn-soft flex-1" onClick={() => nav(`/confirmed/${up.id}`)}>{t('View details')}</button><button className="btn-line flex-1" onClick={() => nav(`/book?reschedule=${up.id}`)}>{t('Reschedule')}</button></div>
          </div>
        ) : (
          <div className="card p-5 text-center text-sm text-ink-2">{t('No upcoming appointment')}</div>
        )}
      </div>
      <Link to="/book" className="btn-primary mt-4 w-full"><CalendarPlus size={18} />{t('Book appointment')}</Link>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Link to="/records" className="card flex items-center gap-3 p-4 text-sm font-bold"><FileText className="text-primary" />{t('Records')}</Link>
        <Link to="/profile" className="card flex items-center gap-3 p-4 text-sm font-bold"><Users className="text-primary" />{t('Family members')}</Link>
      </div>
    </div>
  </>);
}
