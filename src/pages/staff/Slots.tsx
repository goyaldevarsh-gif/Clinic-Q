import { useState } from 'react';
import { Copy, Minus, Plus, Trash2 } from 'lucide-react';
import { store } from '../../lib/store';
import { dayName, useLang, useT } from '../../lib/i18n';
import { validateSchedule } from '../../lib/slots';
import { Header } from '../../components/ui';
import type { Schedule, Session } from '../../lib/types';
import { useStaffClinic } from './shared';

const ORDER = [1, 2, 3, 4, 5, 6, 0];

export function Slots() {
  const t = useT(); const lang = useLang(); const clinic = useStaffClinic()!;
  const [doctorId, setDoctorId] = useState(clinic.doctors[0].id);
  const doctor = clinic.doctors.find((d) => d.id === doctorId) ?? clinic.doctors[0];
  const [sch, setSch] = useState<Schedule>(() => structuredClone(doctor.schedule));
  const [day, setDay] = useState(new Date().getDay());
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const pick = (id: string) => { setDoctorId(id); setSch(structuredClone(clinic.doctors.find((d) => d.id === id)!.schedule)); setMsg(null); };
  const list = sch.days[day] ?? [];
  const setList = (l: Session[]) => { setSch({ ...sch, days: { ...sch.days, [day]: l } }); setMsg(null); };
  const patch = (i: number, p: Partial<Session>) => setList(list.map((s, j) => (j === i ? { ...s, ...p } : s)));
  const errText = (e: string) => [['end time must be after start time', 'समाप्ति समय शुरू के बाद होना चाहिए'], ['timings overlap', 'समय आपस में टकरा रहे हैं'], ['Slot length must be 5–120 minutes', 'स्लॉट की अवधि 5–120 मिनट होनी चाहिए'], ['Patients per slot must be 1–50', 'प्रति स्लॉट मरीज़ 1–50 होने चाहिए']].reduce((x, [a, b]) => (lang === 'hi' ? x.replace(a, b) : x), e);
  const save = async () => {
    const e = validateSchedule(sch);
    if (e) return setMsg({ ok: false, text: errText(e) });
    await store.saveClinic({ ...clinic, doctors: clinic.doctors.map((d) => (d.id === doctor.id ? { ...d, schedule: sch } : d)) });
    setMsg({ ok: true, text: t('Saved. Patients now see the new slots.') });
  };
  const copyAll = () => { const days: Schedule['days'] = {}; for (const d of ORDER) if (d !== 0) days[d] = structuredClone(list); days[0] = sch.days[0] ?? []; setSch({ ...sch, days }); setMsg(null); };
  const num = (k: 'slotMinutes' | 'perSlot', v: number) => setSch({ ...sch, [k]: v });
  return (<>
    <Header title={t('Set daily slots')} />
    <div className="px-4 pt-4">
      {clinic.doctors.length > 1 && <select className="field mb-3" value={doctor.id} onChange={(e) => pick(e.target.value)} aria-label="Doctor">{clinic.doctors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>}
      <div className="grid grid-cols-7 gap-1.5">{ORDER.map((d) => { const open = (sch.days[d] ?? []).length > 0; return (
        <button key={d} onClick={() => setDay(d)} className={`rounded-xl border py-2 text-xs font-bold ${day === d ? 'border-primary-dark bg-primary-dark text-white' : 'border-line bg-white'}`}>{dayName(d)}<div className={`mx-auto mt-1 h-1.5 w-1.5 rounded-full ${open ? (day === d ? 'bg-accent' : 'bg-ok') : 'bg-transparent'}`} /></button>); })}</div>
      <div className="card mt-4 p-4">
        <div className="mb-2 flex items-center justify-between"><div className="font-bold">{dayName(day)} · {list.length === 0 ? t('Closed') : `${list.length} ${t(list.length > 1 ? 'timings' : 'timing')}`}</div>{list.length > 0 && <button className="inline-flex items-center gap-1 text-xs font-bold text-primary-dark" onClick={copyAll}><Copy size={13} />{t('Copy to other days')}</button>}</div>
        <div className="space-y-2">{list.map((s, i) => (
          <div key={i} className="flex items-center gap-2"><input type="time" aria-label="Start" className="field !py-2" value={s.start} onChange={(e) => patch(i, { start: e.target.value })} /><span className="text-ink-2">{t('to')}</span><input type="time" aria-label="End" className="field !py-2" value={s.end} onChange={(e) => patch(i, { end: e.target.value })} /><button aria-label="Remove timing" className="rounded-full p-2 text-bad hover:bg-bad-50" onClick={() => setList(list.filter((_, j) => j !== i))}><Trash2 size={16} /></button></div>))}</div>
        <button className="btn-soft mt-3 w-full !py-2 text-sm" onClick={() => setList([...list, { start: list.length ? list[list.length - 1].end : '10:00', end: list.length ? '20:00' : '13:00' }])}><Plus size={16} />{t('Add timing')}</button>
      </div>
      <div className="card mt-4 space-y-4 p-4">
        <div className="flex items-center justify-between"><div className="font-semibold">{t('Slot length')}</div><select className="field !w-auto !py-2" value={sch.slotMinutes} onChange={(e) => num('slotMinutes', +e.target.value)} aria-label="Slot length">{[5, 10, 15, 20, 30, 45, 60].map((m) => <option key={m} value={m}>{m} {t('min')}</option>)}</select></div>
        <div className="flex items-center justify-between"><div className="font-semibold">{t('Patients per slot')}</div><div className="flex items-center gap-3"><button aria-label="Fewer" className="rounded-full border border-line p-2" onClick={() => num('perSlot', Math.max(1, sch.perSlot - 1))}><Minus size={16} /></button><span className="w-6 text-center text-lg font-extrabold">{sch.perSlot}</span><button aria-label="More" className="rounded-full border border-line p-2" onClick={() => num('perSlot', Math.min(50, sch.perSlot + 1))}><Plus size={16} /></button></div></div>
        <label className="flex items-center justify-between font-semibold">{t('Allow dressing slots')}<input type="checkbox" className="h-5 w-5 accent-primary-dark" checked={sch.dressing} onChange={(e) => setSch({ ...sch, dressing: e.target.checked })} /></label>
      </div>
      {msg && <div role="status" className={`mt-4 rounded-xl px-3 py-2 text-sm font-medium ${msg.ok ? 'bg-ok-50 text-ok' : 'bg-bad-50 text-bad'}`}>{msg.text}</div>}
      <button className="btn-primary mt-4 w-full" onClick={save}>{t('Save')}</button>
      <p className="mt-3 text-xs text-ink-2">{t('Changing slots does not cancel existing bookings. Patients who already booked keep their tokens.')}</p>
    </div>
  </>);
}
