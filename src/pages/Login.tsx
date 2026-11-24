import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { DEMO_OTP, DEMO_PIN, setSession, validPhone } from '../lib/session';
import { newId, store, useStore } from '../lib/store';
import { useT } from '../lib/i18n';
import { DemoBanner, LangToggle, Logo } from '../components/ui';
import { Stethoscope } from 'lucide-react';
import { ClinicIllustration } from '../components/Illustration';

export function Login() {
  const t = useT();
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const st = useStore();
  const [step, setStep] = useState<'phone' | 'otp' | 'profile'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [err, setErr] = useState('');
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const next = sp.get('next') || '/';

  const sendOtp = () => { if (!validPhone(phone)) return setErr('Enter a valid 10-digit mobile number'); setErr(''); setStep('otp'); };
  const verify = () => {
    if (otp !== DEMO_OTP) return setErr('Wrong OTP');
    setErr('');
    const hasSelf = (st.members[phone] ?? []).some((m) => m.relation === 'self');
    if (hasSelf) { setSession({ role: 'patient', phone }); nav(next, { replace: true }); } else setStep('profile');
  };
  const finish = async () => {
    if (!name.trim()) return setErr('Please enter your name');
    await store.saveMember(phone, { id: newId(), name: name.trim(), age: age.trim(), relation: 'self' });
    setSession({ role: 'patient', phone }); nav(next, { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white">
      <DemoBanner />
      <div className="mx-auto flex max-w-md flex-col px-6 pb-10 pt-8">
        <div className="mb-4 flex items-center justify-between"><Logo size={32} /><LangToggle /></div>
        <ClinicIllustration className="mx-auto mb-4 w-full max-w-[300px]" />
        <h1 className="text-center text-[28px] font-extrabold leading-tight text-primary-dark">{t('Your Clinic, Always With You')}</h1>
        <p className="mt-2 text-center text-sm text-ink-2">Book appointments · Track your token · Keep your visits in one place</p>

        <div className="card mt-6 p-5">
          {step === 'phone' && (<>
            <label className="lbl" htmlFor="ph">{t('Mobile number')}</label>
            <div className="flex gap-2">
              <span className="field !w-16 text-center">+91</span>
              <input id="ph" className="field" inputMode="numeric" maxLength={10} placeholder="98765 43210" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} onKeyDown={(e) => e.key === 'Enter' && sendOtp()} />
            </div>
            <button className="btn-primary mt-4 w-full" onClick={sendOtp}>{t('Send OTP')}</button>
          </>)}
          {step === 'otp' && (<>
            <div className="mb-3 text-sm text-ink-2">OTP sent to +91 {phone}</div>
            <label className="lbl" htmlFor="otp">{t('Enter OTP')}</label>
            <input id="otp" className="field text-center text-xl tracking-[.5em]" inputMode="numeric" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} onKeyDown={(e) => e.key === 'Enter' && verify()} autoFocus />
            <button className="btn-primary mt-4 w-full" onClick={verify}>{t('Verify')}</button>
            <button className="mt-3 w-full text-sm font-semibold text-primary-dark" onClick={() => { setStep('phone'); setOtp(''); setErr(''); }}>{t('Change number')}</button>
          </>)}
          {step === 'profile' && (<>
            <div className="mb-3 font-bold">Create your profile</div>
            <label className="lbl" htmlFor="nm">{t('Name')}</label>
            <input id="nm" className="field" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            <label className="lbl mt-3" htmlFor="ag">{t('Age')}</label>
            <input id="ag" className="field" inputMode="numeric" placeholder="e.g. 34" value={age} onChange={(e) => setAge(e.target.value)} />
            <button className="btn-primary mt-4 w-full" onClick={finish}>{t('Continue')}</button>
          </>)}
          {err && <div className="mt-3 rounded-lg bg-bad-50 px-3 py-2 text-sm font-medium text-bad" role="alert">{err}</div>}
        </div>

        <Link to="/staff-login" className="mt-6 inline-flex items-center justify-center gap-2 text-sm font-semibold text-primary-dark"><Stethoscope size={16} />{t('Clinic staff? Sign in here')}</Link>
      </div>
    </div>
  );
}

export function StaffLogin() {
  const nav = useNavigate();
  const st = useStore();
  const [clinicId, setClinicId] = useState(st.clinics[0]?.id ?? '');
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');
  const go = () => { if (pin !== DEMO_PIN) return setErr('Wrong PIN'); setSession({ role: 'staff', clinicId }); nav('/staff', { replace: true }); };
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white">
      <DemoBanner />
      <div className="mx-auto max-w-md px-6 pb-10 pt-8">
        <div className="mb-8 flex items-center justify-between"><Logo size={32} /><LangToggle /></div>
        <h1 className="text-2xl font-extrabold text-primary-dark">Clinic sign in</h1>
        <div className="card mt-6 p-5">
          <label className="lbl" htmlFor="cl">Clinic</label>
          <select id="cl" className="field" value={clinicId} onChange={(e) => setClinicId(e.target.value)}>{st.clinics.map((c) => <option key={c.id} value={c.id}>{c.name} – {c.area}</option>)}</select>
          <label className="lbl mt-3" htmlFor="pin">PIN</label>
          <input id="pin" type="password" inputMode="numeric" className="field" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} onKeyDown={(e) => e.key === 'Enter' && go()} />
          <button className="btn-primary mt-4 w-full" onClick={go}>Sign in</button>
          {err && <div className="mt-3 rounded-lg bg-bad-50 px-3 py-2 text-sm font-medium text-bad" role="alert">{err}</div>}
        </div>
        <Link to="/login" className="mt-6 block text-center text-sm font-semibold text-primary-dark">← Patient login</Link>
      </div>
    </div>
  );
}
