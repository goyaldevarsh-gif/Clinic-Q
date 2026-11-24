import { useParams, Link } from 'react-router-dom';
import { CalendarDays, CheckCircle2, Clock, MapPin, Share2 } from 'lucide-react';
import { useStore } from '../../lib/store';
import { useT } from '../../lib/i18n';
import { fmt12, fmtToken, ymd } from '../../lib/slots';
import { downloadIcs, shareAppt } from '../../lib/share';
import { Header, StatusChip } from '../../components/ui';
import { Qr } from '../../components/Qr';
import { findClinic, findDoctor, queueInfo, usePhone } from './shared';
import { dayLabel } from './Home';

export function Confirmed() {
  const { id } = useParams(); const t = useT(); const st = useStore(); const phone = usePhone();
  const a = st.appts.find((x) => x.id === id && x.phone === phone);
  if (!a) return (<><Header title="Appointment" back="/" /><div className="p-8 text-center text-ink-2">Appointment not found.</div></>);
  const clinic = findClinic(st, a.clinicId)!; const doc = findDoctor(clinic, a.doctorId);
  const today = a.date === ymd(new Date()) && a.status === 'waiting';
  const q = today ? queueInfo(st, a) : null;
  return (<>
    <Header title="Appointment" back="/" />
    <div className="px-4 pt-6 text-center">
      {a.status === 'waiting' && <CheckCircle2 className="mx-auto text-ok" size={52} />}
      <h2 className="mt-2 text-xl font-extrabold">{a.status === 'cancelled' ? 'Appointment cancelled' : a.status === 'seen' ? 'Visit completed' : t('Appointment confirmed!')}</h2>
      <div className="card mx-auto mt-5 max-w-xs overflow-hidden">
        <div className="bg-gradient-to-br from-primary to-primary-dark px-5 py-5 text-white">
          <div className="text-xs font-bold uppercase tracking-wide text-white/75">{t('Your token')}</div>
          <div className="mt-1 text-6xl font-extrabold tracking-tight">{fmtToken(a.token)}</div>
        </div>
        <div className="p-5"><div className="flex justify-center"><Qr text={`CQ|${a.clinicId}|${a.doctorId}|${a.date}|${fmtToken(a.token)}`} size={150} /></div>
        <div className="mt-1 text-[11px] text-ink-2">{t('Show this QR at the clinic')}</div>
        <div className="mt-3"><StatusChip s={a.status} /></div></div>
      </div>
      <div className="card mt-4 space-y-2 p-4 text-left text-sm">
        <div className="font-bold">{a.name} <span className="font-medium text-ink-2">· {a.type}</span></div>
        <div className="flex items-center gap-2"><CalendarDays size={16} className="text-primary" />{dayLabel(a.date)}</div>
        <div className="flex items-center gap-2"><Clock size={16} className="text-primary" />{fmt12(a.time)} · {doc?.name}</div>
        <div className="flex items-center gap-2"><MapPin size={16} className="text-primary" />{clinic.name}, {clinic.area}, {clinic.city}</div>
        {a.reason && <div className="text-ink-2">Reason: {a.reason}</div>}
      </div>
      {q?.serving && <div className="mt-4 rounded-2xl bg-primary-50 px-4 py-3 text-sm"><b>{t('Now serving')}:</b> {fmtToken(q.serving.token)}<br />{q.ahead === 0 ? 'You are next' : `${q.ahead} before you · about ${q.minutes} min (estimate)`}</div>}
      {a.status === 'waiting' && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button className="btn-soft" onClick={() => downloadIcs(a, clinic, doc?.name ?? '')}><CalendarDays size={16} />{t('Add to calendar')}</button>
          <button className="btn-soft" onClick={() => shareAppt(a, clinic, doc?.name ?? '')}><Share2 size={16} />{t('Share')}</button>
        </div>)}
      <Link to="/visits" className="mt-4 block text-sm font-semibold text-primary-dark">{t('Visits')} →</Link>
    </div>
  </>);
}
