import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Bandage, Check, MapPin, Stethoscope } from 'lucide-react';
import { useStore, store } from '../../lib/store';
import { locale, useT } from '../../lib/i18n';
import { BookError, HORIZON_DAYS, addDays, fmt12, parseYmd, slotInfos, ymd } from '../../lib/slots';
import type { ApptType } from '../../lib/types';
import { Avatar, Header, Stepper } from '../../components/ui';
import { findClinic, findDoctor, usePhone } from './shared';
import { dayLabel } from './Home';

const MSG: Record<string, string> = {
  FULL: 'That slot was just taken. Please pick another one.',
  NO_SLOT: 'That slot is no longer available. Please pick another one.',
  PAST: 'That time has already passed. Please pick another slot.',
  DUPLICATE: 'This person already has an appointment with this doctor on that day.',
  TOO_FAR: 'Bookings open only for the next two weeks.',
  NO_DRESSING: 'This doctor does not take dressing appointments.',
  NAME: 'Please select who the appointment is for.',
};

export function Book() {
  const t = useT(); const nav = useNavigate(); const [sp] = useSearchParams();
  const st = useStore(); const phone = usePhone();
  const old = st.appts.find((a) => a.id === sp.get('reschedule') && a.phone === phone && a.status === 'waiting');
  const members = st.members[phone] ?? [];
  const preClinic = st.clinics.find((c) => c.id === sp.get('clinic'))?.id;

  const [step, setStep] = useState(old ? 2 : 1);
  const [clinicId, setClinicId] = useState(old?.clinicId ?? preClinic ?? (st.clinics.length === 1 ? st.clinics[0].id : ''));
  const clinic = findClinic(st, clinicId);
  const [doctorId, setDoctorId] = useState(old?.doctorId ?? '');
  const docId = doctorId || (clinic?.doctors.length === 1 ? clinic.doctors[0].id : '');
  const doctor = findDoctor(clinic, docId);
  const [type, setType] = useState<ApptType>(old?.type ?? 'OPD');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [memberId, setMemberId] = useState(old?.memberId ?? members.find((m) => m.relation === 'self')?.id ?? '');
  const [reason, setReason] = useState(old?.reason ?? '');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const now = new Date();
  const today = ymd(now);

  const days = useMemo(() => Array.from({ length: HORIZON_DAYS + 1 }, (_, i) => addDays(today, i)), [today]);
  useEffect(() => (clinicId && docId ? store.watchDoctor(clinicId, docId) : undefined), [clinicId, docId]);
  const infoFor = (d: string) => (doctor ? slotInfos(doctor.schedule, st.appts, { clinicId, doctorId: docId }, d, now, old?.id) : []);
  const dayOpen = (d: string) => infoFor(d).some((s) => !s.past && s.left > 0);
  const slots = date ? infoFor(date) : [];
  const member = members.find((m) => m.id === memberId);

  const confirm = async () => {
    if (!member || !doctor) return setErr(t(MSG.NAME));
    setBusy(true); setErr('');
    const input = { clinicId, doctorId: docId, date, time, type, memberId: member.id, name: member.name, age: member.age, phone, reason: reason.trim() || undefined };
    try {
      const a = old ? await store.reschedule(old.id, input) : await store.book(input);
      nav(`/confirmed/${a.id}`, { replace: true });
    } catch (e) {
      const code = e instanceof BookError ? e.code : '';
      setErr(t(MSG[code] ?? 'Something went wrong. Please try again.'));
      if (code === 'FULL' || code === 'NO_SLOT' || code === 'PAST') { setTime(''); setStep(2); }
    } finally { setBusy(false); }
  };

  return (<>
    <Header title={old ? t('Reschedule') : t('Book appointment')} back />
    <Stepper step={step} labels={[t('Clinic'), t('Date & time'), t('Confirm')]} />
    <div className="px-4 pt-4">
      {step === 1 && (<>
        <div className="lbl">{t('Select clinic')}</div>
        <div className="space-y-2">
          {st.clinics.map((c) => (
            <button key={c.id} onClick={() => { setClinicId(c.id); setDoctorId(c.doctors.length === 1 ? c.doctors[0].id : ''); }} className={`card flex w-full items-center gap-3 p-4 text-left ${clinicId === c.id ? '!border-primary ring-2 ring-primary/20' : ''}`}>
              <MapPin className="shrink-0 text-primary" size={20} />
              <div className="flex-1"><div className="font-bold">{c.name}</div><div className="text-sm text-ink-2">{c.area}, {c.city}</div></div>
              {clinicId === c.id && <Check className="text-primary-dark" size={20} />}
            </button>
          ))}
        </div>
        {clinic && clinic.doctors.length > 1 && (<>
          <div className="lbl mt-5">{t('Select doctor')}</div>
          <div className="space-y-2">{clinic.doctors.map((d) => (
            <button key={d.id} onClick={() => setDoctorId(d.id)} className={`card flex w-full items-center gap-3 p-4 text-left ${docId === d.id ? '!border-primary ring-2 ring-primary/20' : ''}`}><Avatar name={d.name} size={40} /><div><div className="font-bold">{d.name}</div><div className="text-sm text-ink-2">{d.qualification}</div></div></button>
          ))}</div>
        </>)}
        {doctor && (<>
          {clinic && clinic.doctors.length === 1 && <div className="card mt-4 flex items-center gap-3 p-4"><Avatar name={doctor.name} size={44} /><div><div className="font-bold">{doctor.name}</div><div className="text-sm text-ink-2">{doctor.qualification} · {doctor.speciality}</div></div></div>}
          <div className="lbl mt-5">{t('Visit type')}</div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setType('OPD')} className={`card flex items-center gap-2 p-3 text-sm font-bold ${type === 'OPD' ? '!border-primary bg-primary-50' : ''}`}><Stethoscope size={18} className="text-primary" />{t('OPD consultation')}</button>
            <button disabled={!doctor.schedule.dressing} onClick={() => setType('Dressing')} className={`card flex items-center gap-2 p-3 text-sm font-bold disabled:opacity-40 ${type === 'Dressing' ? '!border-primary bg-primary-50' : ''}`}><Bandage size={18} className="text-primary" />{t('Dressing / procedure')}</button>
          </div>
        </>)}
        <button className="btn-primary mt-6 w-full" disabled={!clinic || !doctor} onClick={() => { setStep(2); setDate(''); setTime(''); }}>{t('Continue')}</button>
      </>)}

      {step === 2 && doctor && (<>
        {old && <div className="mb-3 rounded-xl bg-primary-50 px-3 py-2 text-sm">{t('Changing')}: <b>{dayLabel(old.date)} · {fmt12(old.time)}</b> at {clinic?.name}</div>}
        <div className="lbl">{t('Select date')}</div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2">
          {days.map((d) => { const p = parseYmd(d); const open = dayOpen(d); return (
            <button key={d} disabled={!open} onClick={() => { setDate(d); setTime(''); }} className={`flex w-14 shrink-0 flex-col items-center rounded-2xl border py-2 ${date === d ? 'border-primary-dark bg-primary-dark text-white' : 'border-line bg-white'} disabled:opacity-35`}>
              <span className="text-[11px] font-semibold">{p.toLocaleDateString(locale(), { weekday: 'short' })}</span><span className="text-lg font-extrabold">{p.getDate()}</span><span className="text-[10px]">{p.toLocaleDateString(locale(), { month: 'short' })}</span>
            </button>); })}
        </div>
        {date && (<>
          <div className="lbl mt-4">{t('Select time slot')}</div>
          {slots.length === 0 ? <div className="text-sm text-ink-2">{t('No slots on this day')}</div> : (
            <div className="grid grid-cols-3 gap-2">{slots.map((s) => { const off = s.past || s.left <= 0; return (
              <button key={s.time} disabled={off} onClick={() => setTime(s.time)} className={`rounded-xl border px-2 py-2.5 text-sm font-semibold ${time === s.time ? 'border-primary-dark bg-primary-dark text-white' : 'border-line bg-white'} disabled:bg-slate-50 disabled:text-slate-400 disabled:line-through`}>
                {fmt12(s.time)}{!off && s.capacity > 1 && <div className={`text-[10px] font-medium ${time === s.time ? 'text-white/80' : 'text-ink-2'}`}>{s.left} {t('left')}</div>}
              </button>); })}</div>)}
        </>)}
        <div className="mt-6 flex gap-2">{!old && <button className="btn-line" onClick={() => setStep(1)}>{t('Back')}</button>}<button className="btn-primary flex-1" disabled={!date || !time} onClick={() => setStep(3)}>{t('Continue')}</button></div>
      </>)}

      {step === 3 && clinic && doctor && (<>
        <div className="card p-4">
          <div className="font-bold">{doctor.name}</div><div className="text-sm text-ink-2">{t(type)} · {clinic.name}, {clinic.area}</div>
          <div className="mt-2 text-lg font-extrabold text-primary-dark">{dayLabel(date)} · {fmt12(time)}</div>
        </div>
        <div className="lbl mt-5">{t('Who is this for?')}</div>
        <div className="space-y-2">{members.map((m) => (
          <button key={m.id} onClick={() => setMemberId(m.id)} className={`card flex w-full items-center gap-3 p-3 text-left ${memberId === m.id ? '!border-primary ring-2 ring-primary/20' : ''}`}>
            <Avatar name={m.name} size={36} tone={m.relation === 'self' ? 'blue' : 'teal'} />
            <div className="flex-1"><div className="font-semibold">{m.name}</div><div className="text-xs capitalize text-ink-2">{m.relation === 'self' ? t('You') : t(m.relation)}{m.age ? ` · ${m.age}` : ''}</div></div>
            {memberId === m.id && <Check className="text-primary-dark" size={18} />}
          </button>))}</div>
        <label className="lbl mt-5" htmlFor="rs">{t('Reason for visit (optional)')}</label>
        <input id="rs" className="field" maxLength={120} placeholder="e.g. Follow-up after knee surgery" value={reason} onChange={(e) => setReason(e.target.value)} />
        {err && <div className="mt-4 rounded-xl bg-bad-50 px-3 py-2 text-sm font-medium text-bad" role="alert">{err}</div>}
        <div className="mt-6 flex gap-2"><button className="btn-line" onClick={() => setStep(2)}>{t('Back')}</button><button className="btn-primary flex-1" disabled={busy || !member} onClick={confirm}>{t('Confirm booking')}</button></div>
      </>)}
      {step !== 3 && err && <div className="mt-4 rounded-xl bg-bad-50 px-3 py-2 text-sm font-medium text-bad" role="alert">{err}</div>}
    </div>
  </>);
}
