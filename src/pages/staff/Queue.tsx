import { useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Phone, RotateCcw, UserPlus, X } from 'lucide-react';
import { store, useStore } from '../../lib/store';
import { useT } from '../../lib/i18n';
import { addDays, fmt12, sortQueue, ymd, BookError } from '../../lib/slots';
import { Header, LangToggle, Modal, StatusChip, TokenBadge } from '../../components/ui';
import type { Appt, ApptType } from '../../lib/types';
import { useStaffClinic } from './shared';
import { dayLabel } from '../patient/Home';

export function Queue() {
  const t = useT(); const st = useStore(); const clinic = useStaffClinic()!;
  const [doctorId, setDoctorId] = useState(clinic.doctors[0].id);
  const doctor = clinic.doctors.find((d) => d.id === doctorId) ?? clinic.doctors[0];
  const [date, setDate] = useState(ymd(new Date()));
  const [filter, setFilter] = useState<'all' | 'waiting' | 'seen'>('all');
  const [cancel, setCancel] = useState<Appt | null>(null);
  const [walk, setWalk] = useState(false);
  const day = st.appts.filter((a) => a.clinicId === clinic.id && a.doctorId === doctor.id && a.date === date).sort(sortQueue);
  const count = (s: Appt['status']) => day.filter((a) => a.status === s).length;
  const rows = day.filter((a) => filter === 'all' || a.status === filter);
  const firstWaiting = day.find((a) => a.status === 'waiting');
  const isToday = date === ymd(new Date());
  return (<>
    <Header title={t("Today's queue")} right={<LangToggle />} />
    <div className="px-4 pt-4">
      <div className="text-sm font-semibold text-ink-2">{clinic.name} · {clinic.area}</div>
      {clinic.doctors.length > 1 && <select className="field mt-2" value={doctor.id} onChange={(e) => setDoctorId(e.target.value)} aria-label="Doctor">{clinic.doctors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>}
      <div className="mt-3 flex items-center justify-between rounded-2xl border border-line bg-white px-2 py-1.5">
        <button className="rounded-full p-2 hover:bg-slate-100" aria-label="Previous day" onClick={() => setDate(addDays(date, -1))}><ChevronLeft size={20} /></button>
        <button className="text-sm font-bold" onClick={() => setDate(ymd(new Date()))}>{isToday ? 'Today · ' : ''}{dayLabel(date)}</button>
        <button className="rounded-full p-2 hover:bg-slate-100" aria-label="Next day" onClick={() => setDate(addDays(date, 1))}><ChevronRight size={20} /></button>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2 text-center">
        {[['Total', day.filter((a) => a.status !== 'cancelled').length, 'text-primary-dark bg-primary-50'], ['Waiting', count('waiting'), 'text-warn bg-warn-50'], ['Seen', count('seen'), 'text-ok bg-ok-50'], ['Cancelled', count('cancelled'), 'text-bad bg-bad-50']].map(([l, n, c]) => (
          <div key={l as string} className={`rounded-2xl py-2.5 ${c}`}><div className="text-2xl font-extrabold leading-none">{n}</div><div className="mt-1 text-[11px] font-bold">{t(l as string)}</div></div>))}
      </div>
      {isToday && firstWaiting && <div className="mt-3 rounded-2xl bg-primary-dark px-4 py-3 text-white"><div className="text-[11px] font-bold uppercase tracking-wide text-white/70">{t('Now serving')}</div><div className="text-lg font-extrabold">Q-{String(firstWaiting.token).padStart(2, '0')} · {firstWaiting.name}</div></div>}
      <div className="mt-4 flex items-center gap-2">
        <div className="grid flex-1 grid-cols-3 gap-1 rounded-xl bg-primary-50 p-1">{(['all', 'waiting', 'seen'] as const).map((k) => <button key={k} onClick={() => setFilter(k)} className={`rounded-lg py-1.5 text-xs font-bold capitalize ${filter === k ? 'bg-white text-primary-dark shadow-sm' : 'text-ink-2'}`}>{k === 'all' ? 'All' : t(k === 'waiting' ? 'Waiting' : 'Seen')}</button>)}</div>
        <button className="btn-primary !px-3 !py-2 text-sm" onClick={() => setWalk(true)}><UserPlus size={16} />{t('Add walk-in')}</button>
      </div>
      <div className="mt-3 space-y-2">
        {rows.length === 0 && <div className="py-10 text-center text-sm text-ink-2">No patients here yet.</div>}
        {rows.map((a) => (
          <div key={a.id} className={`card flex items-center gap-3 p-3 ${a.status === 'seen' ? '!border-ok/30 bg-ok-50/40' : ''} ${a.status === 'cancelled' ? 'opacity-60' : ''}`}>
            <TokenBadge n={a.token} />
            <div className="min-w-0 flex-1">
              <div className="truncate font-bold">{a.name}{a.age ? <span className="font-medium text-ink-2"> · {a.age}</span> : ''}</div>
              <div className="text-xs text-ink-2">{a.walkIn ? 'Walk-in' : fmt12(a.time)} · {a.type}{a.reason ? ` · ${a.reason}` : ''}</div>
              <div className="mt-1 flex items-center gap-2"><StatusChip s={a.status} />{a.phone && <a href={`tel:${a.phone}`} className="inline-flex items-center gap-1 text-xs font-semibold text-primary-dark"><Phone size={12} />{a.phone}</a>}</div>
            </div>
            {a.status === 'waiting' && <div className="flex flex-col gap-1.5"><button className="btn-soft !px-3 !py-1.5 text-xs" onClick={() => store.setStatus(a.id, 'seen')}><Check size={14} />{t('Seen')}</button><button className="btn-bad !px-3 !py-1.5 text-xs" onClick={() => setCancel(a)}><X size={14} />{t('Cancel')}</button></div>}
            {a.status === 'seen' && <button className="rounded-full p-2 text-ink-2 hover:bg-slate-100" aria-label="Undo seen" onClick={() => store.setStatus(a.id, 'waiting')}><RotateCcw size={16} /></button>}
          </div>))}
      </div>
    </div>
    {cancel && <Modal title="Cancel this appointment?" onClose={() => setCancel(null)}>
      <p className="text-sm text-ink-2">{cancel.name} · {fmt12(cancel.time)}. The patient will see it as cancelled.</p>
      <div className="mt-4 flex gap-2"><button className="btn-line flex-1" onClick={() => setCancel(null)}>Keep it</button><button className="btn-bad flex-1" onClick={async () => { await store.cancel(cancel.id, 'clinic'); setCancel(null); }}>Yes, cancel</button></div>
    </Modal>}
    {walk && <WalkIn clinicId={clinic.id} doctorId={doctor.id} dressing={doctor.schedule.dressing} onClose={() => { setWalk(false); setDate(ymd(new Date())); }} />}
  </>);
}

function WalkIn({ clinicId, doctorId, dressing, onClose }: { clinicId: string; doctorId: string; dressing: boolean; onClose: () => void }) {
  const t = useT();
  const [name, setName] = useState(''); const [age, setAge] = useState(''); const [phone, setPhone] = useState(''); const [type, setType] = useState<ApptType>('OPD'); const [err, setErr] = useState('');
  const add = async () => {
    if (phone && !/^[6-9]\d{9}$/.test(phone)) return setErr('Mobile number should be 10 digits (or leave it empty)');
    try { await store.addWalkIn({ clinicId, doctorId, name, age: age.trim(), phone, type }); onClose(); } catch (e) { setErr(e instanceof BookError && e.code === 'NAME' ? 'Please enter the patient name' : 'Could not add'); }
  };
  return (
    <Modal title={t('Add walk-in')} onClose={onClose}>
      <label className="lbl" htmlFor="wn">{t('Name')}</label><input id="wn" className="field" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      <div className="mt-3 grid grid-cols-2 gap-3"><div><label className="lbl" htmlFor="wa">{t('Age')}</label><input id="wa" className="field" value={age} onChange={(e) => setAge(e.target.value)} placeholder="e.g. 45" /></div><div><label className="lbl" htmlFor="wp">Mobile (optional)</label><input id="wp" className="field" inputMode="numeric" maxLength={10} value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} /></div></div>
      <div className="mt-3 grid grid-cols-2 gap-2">{(['OPD', ...(dressing ? ['Dressing'] : [])] as ApptType[]).map((k) => <button key={k} onClick={() => setType(k)} className={`rounded-xl border py-2.5 text-sm font-bold ${type === k ? 'border-primary-dark bg-primary-50 text-primary-dark' : 'border-line'}`}>{k}</button>)}</div>
      {err && <div className="mt-3 rounded-lg bg-bad-50 px-3 py-2 text-sm font-medium text-bad" role="alert">{err}</div>}
      <button className="btn-primary mt-4 w-full" onClick={add}>{t('Add walk-in')}</button>
    </Modal>
  );
}
