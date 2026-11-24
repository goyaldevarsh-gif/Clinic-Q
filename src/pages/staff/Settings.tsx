import { useState } from 'react';
import { Check, Link2, LogOut, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { store } from '../../lib/store';
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
