import { useState } from 'react';
import { Check, Link2, LogOut, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { store, useStore } from '../../lib/store';
import { DEMO_DESK, demoDoctorSees, getDeskId, parseDeskLink, setDeskId } from '../../lib/desk';
import { setSession } from '../../lib/session';
import { useT } from '../../lib/i18n';
import { Header, Modal } from '../../components/ui';
import { Qr } from '../../components/Qr';
import type { Clinic } from '../../lib/types';
import { useStaffClinic } from './shared';

export function Settings() {
  const t = useT(); const nav = useNavigate(); const c0 = useStaffClinic()!;
  const [c, setC] = useState<Clinic>(() => structuredClone(c0));
  const [saved, setSaved] = useState(false); const [copied, setCopied] = useState(false); const [reset, setReset] = useState(false);
  const link = `${location.href.split('#')[0]}#/c/${c0.id}`;
  const st = useStore();
  const [deskText, setDeskText] = useState(''); const [deskId, setDeskIdState] = useState(getDeskId(c0.id)); const [deskMsg, setDeskMsg] = useState('');
  const saveDesk = () => { const id = parseDeskLink(deskText); if (!id) return setDeskMsg(t('That does not look like a MedScript desk link.')); setDeskId(c0.id, id); setDeskIdState(id); setDeskText(''); setDeskMsg(''); };
  const clearDesk = () => { setDeskId(c0.id, ''); setDeskIdState(''); };
  const simulate = async () => { const a = st.appts.find((x) => x.clinicId === c0.id && x.deskDocId && x.status === 'waiting'); if (a?.deskDocId) await demoDoctorSees(a.deskDocId); };
  const doc = (i: number, p: Partial<Clinic['doctors'][0]>) => setC({ ...c, doctors: c.doctors.map((d, j) => (j === i ? { ...d, ...p } : d)) });
  const save = async () => { if (!c.name.trim()) return; await store.saveClinic({ ...c, name: c.name.trim() }); setSaved(true); setTimeout(() => setSaved(false), 2000); };
  return (<>
    <Header title={t('Settings')} />
    <div className="space-y-4 px-4 pt-4">
      <div className="card p-4">
        <div className="mb-3 font-bold">{t('Clinic details')}</div>
        <label className="lbl" htmlFor="cn">{t('Clinic name')}</label><input id="cn" className="field" value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} />
        <div className="mt-3 grid grid-cols-2 gap-3"><div><label className="lbl" htmlFor="ca">{t('Area')}</label><input id="ca" className="field" value={c.area} onChange={(e) => setC({ ...c, area: e.target.value })} /></div><div><label className="lbl" htmlFor="cc">{t('City')}</label><input id="cc" className="field" value={c.city} onChange={(e) => setC({ ...c, city: e.target.value })} /></div></div>
        {c.doctors.map((d, i) => (<div key={d.id} className="mt-4 border-t border-line pt-3">
          <label className="lbl" htmlFor={`dn${i}`}>{t('Doctor name')}</label><input id={`dn${i}`} className="field" value={d.name} onChange={(e) => doc(i, { name: e.target.value })} />
          <div className="mt-3 grid grid-cols-2 gap-3"><div><label className="lbl" htmlFor={`dq${i}`}>{t('Qualification')}</label><input id={`dq${i}`} className="field" value={d.qualification} onChange={(e) => doc(i, { qualification: e.target.value })} /></div><div><label className="lbl" htmlFor={`ds${i}`}>{t('Speciality')}</label><input id={`ds${i}`} className="field" value={d.speciality} onChange={(e) => doc(i, { speciality: e.target.value })} /></div></div>
        </div>))}
        <button className="btn-primary mt-4 w-full" onClick={save}>{saved ? <><Check size={16} />{t('Saved')}</> : t('Save')}</button>
      </div>
      <div className="card p-4">
        <div className="font-bold">{t('Reception desk (MedScript)')}</div>
        <p className="mt-1 text-xs text-ink-2">{t('When you tap Arrived, the patient goes into your MedScript waiting list. The desk link is saved on this device only.')}</p>
        {deskId ? (
          <div className="mt-3">
            <div className="rounded-xl bg-ok-50 px-3 py-2 text-sm font-semibold text-ok">✓ {deskId === DEMO_DESK ? t('Demo desk (no cloud)') : `${t('Connected')} · …${deskId.slice(-4)}`}</div>
            <div className="mt-2 flex gap-2"><button className="btn-line flex-1 !py-2 text-sm" onClick={clearDesk}>{t('Disconnect')}</button>{deskId === DEMO_DESK && <button className="btn-soft flex-1 !py-2 text-sm" onClick={simulate}>{t('Simulate: doctor taps Seen')}</button>}</div>
          </div>
        ) : (
          <div className="mt-3">
            <input className="field" aria-label={t('MedScript desk link')} placeholder={t('Paste the MedScript desk link')} value={deskText} onChange={(e) => setDeskText(e.target.value)} />
            {deskMsg && <div className="mt-2 text-xs font-medium text-bad" role="alert">{deskMsg}</div>}
            <div className="mt-2 flex gap-2"><button className="btn-primary flex-1 !py-2 text-sm" onClick={saveDesk}>{t('Connect')}</button><button className="btn-line flex-1 !py-2 text-sm" onClick={() => { setDeskId(c0.id, DEMO_DESK); setDeskIdState(DEMO_DESK); }}>{t('Try demo desk')}</button></div>
          </div>
        )}
      </div>
      <div className="card p-4 text-center">
        <div className="font-bold">{t('Booking QR for your clinic')}</div>
        <p className="mt-1 text-xs text-ink-2">{t('Print it for the reception desk. Patients scan it and land straight on your clinic.')}</p>
        <div className="mt-3 flex justify-center"><Qr text={link} size={170} /></div>
        <button className="btn-soft mt-3" onClick={async () => { try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ } }}><Link2 size={16} />{copied ? t('Copied') : t('Copy booking link')}</button>
      </div>
      <button className="btn-line w-full" onClick={() => { setSession(null); nav('/staff-login', { replace: true }); }}><LogOut size={16} />{t('Log out')}</button>
      <button className="btn-bad w-full" onClick={() => setReset(true)}><RotateCcw size={16} />{t('Reset demo data')}</button>
    </div>
    {reset && <Modal title={t('Reset demo data?')} onClose={() => setReset(false)}>
      <p className="text-sm text-ink-2">{t('This deletes every booking, family member and setting stored on this device and restores the sample clinics.')}</p>
      <div className="mt-4 flex gap-2"><button className="btn-line flex-1" onClick={() => setReset(false)}>{t('Keep data')}</button><button className="btn-bad flex-1" onClick={async () => { await store.resetDemo(); setSession(null); nav('/login', { replace: true }); }}>{t('Reset')}</button></div>
    </Modal>}
  </>);
}
