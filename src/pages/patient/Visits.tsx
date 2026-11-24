import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarX } from 'lucide-react';
import { store, useStore } from '../../lib/store';
import { useT } from '../../lib/i18n';
import { fmt12, ymd } from '../../lib/slots';
import { Empty, Header, Modal, StatusChip, TokenBadge } from '../../components/ui';
import type { Appt } from '../../lib/types';
import { findClinic, findDoctor, isUpcoming, myAppts, usePhone } from './shared';
import { dayLabel } from './Home';

export function Visits() {
  const t = useT(); const st = useStore(); const phone = usePhone(); const nav = useNavigate();
  const [tab, setTab] = useState<'up' | 'past'>('up');
  const [cancelling, setCancelling] = useState<Appt | null>(null);
  const all = myAppts(st, phone);
  const up = all.filter((a) => isUpcoming(a)).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const past = all.filter((a) => !isUpcoming(a)).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  const list = tab === 'up' ? up : past;
  const today = ymd(new Date());
  return (<>
    <Header title={t('Visits')} />
    <div className="px-4 pt-4">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-primary-50 p-1">
        {(['up', 'past'] as const).map((k) => <button key={k} onClick={() => setTab(k)} className={`rounded-lg py-2 text-sm font-bold ${tab === k ? 'bg-white text-primary-dark shadow-sm' : 'text-ink-2'}`}>{t(k === 'up' ? 'Upcoming' : 'Past')} ({k === 'up' ? up.length : past.length})</button>)}
      </div>
      {list.length === 0 ? <Empty icon={<CalendarX />} title={tab === 'up' ? t('No upcoming appointment') : t('No past visits yet')} /> : (
        <div className="mt-4 space-y-3">{list.map((a) => { const c = findClinic(st, a.clinicId); const d = findDoctor(c, a.doctorId); const missed = a.status === 'waiting' && a.date < today; return (
          <div key={a.id} className="card p-4">
            <div className="flex items-start justify-between gap-2"><div><div className="font-bold">{dayLabel(a.date)} · {fmt12(a.time)}</div><div className="text-sm text-ink-2">{d?.name} · {t(a.type)}</div><div className="text-sm text-ink-2">{c?.name}, {c?.area}</div><div className="mt-1 text-sm font-medium">{a.name}</div></div>
              <div className="flex flex-col items-end gap-1.5"><TokenBadge n={a.token} />{missed ? <span className="chip bg-slate-100 text-ink-2">{t('Missed')}</span> : <StatusChip s={a.status} />}</div></div>
            {tab === 'up' && <div className="mt-3 flex gap-2"><button className="btn-soft flex-1 !py-2" onClick={() => nav(`/confirmed/${a.id}`)}>{t('View details')}</button><button className="btn-line flex-1 !py-2" onClick={() => nav(`/book?reschedule=${a.id}`)}>{t('Reschedule')}</button><button className="btn-bad !py-2" onClick={() => setCancelling(a)}>{t('Cancel')}</button></div>}
          </div>); })}</div>)}
    </div>
    {cancelling && <Modal title={t('Cancel appointment?')} onClose={() => setCancelling(null)}>
      <p className="text-sm text-ink-2">{dayLabel(cancelling.date)} · {fmt12(cancelling.time)} {t('for')} {cancelling.name}. {t('The slot will be released for others.')}</p>
      <div className="mt-4 flex gap-2"><button className="btn-line flex-1" onClick={() => setCancelling(null)}>{t('Keep it')}</button><button className="btn-bad flex-1" onClick={async () => { await store.cancel(cancelling.id, 'patient'); setCancelling(null); }}>{t('Yes, cancel')}</button></div>
    </Modal>}
  </>);
}
