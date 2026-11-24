import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { DEMO_OTP, DEMO_PIN, setSession, validPhone } from '../lib/session';
import { newId, store, useStore } from '../lib/store';
import { USE_FB } from '../lib/backend';
import { confirmOtp, hasSelfProfile, sendOtp as fbSendOtp, staffSignIn } from '../lib/auth';
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
  const [agree, setAgree] = useState(false);
  const next = sp.get('next') || '/';

  const [busy, setBusy] = useState(false);
  const sendOtp = async () => {
    if (!validPhone(phone)) return setErr(t('Enter a valid 10-digit mobile number'));
    setErr('');
    if (USE_FB) { setBusy(true); try { await fbSendOtp(phone); } catch (e) { setBusy(false); return setErr(`${t('Could not send the OTP. Please try again.')} (${(e as { code?: string })?.code ?? 'unknown'})`); } setBusy(false); }
    setStep('otp');
  };
  const verify = async () => {
    if (USE_FB) { setBusy(true); try { await confirmOtp(otp); } catch { setBusy(false); return setErr(t('Wrong OTP')); } }
    else if (otp !== DEMO_OTP) return setErr(t('Wrong OTP'));
    setErr('');
    let hasSelf = (st.members[phone] ?? []).some((m) => m.relation === 'self');
    if (USE_FB) { try { hasSelf = await hasSelfProfile(phone); } catch { hasSelf = false; } setBusy(false); }
    if (hasSelf) { setSession({ role: 'patient', phone }); nav(next, { replace: true }); } else setStep('profile');
  };
  const finish = async () => {
    if (!name.trim()) return setErr(t('Please enter your name'));
    if (!agree) return setErr(t('Please accept the privacy notice to continue'));
    await store.saveMember(phone, { id: newId(), name: name.trim(), age: age.trim(), relation: 'self', consentAt: Date.now() });
    setSession({ role: 'patient', phone }); nav(next, { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white">
      <DemoBanner />
      <div className="mx-auto flex max-w-md flex-col px-6 pb-10 pt-8">
        <div className="mb-4 flex items-center justify-between"><Logo size={32} /><LangToggle /></div>
        <ClinicIllustration className="mx-auto mb-4 w-full max-w-[300px]" />
        <h1 className="text-center text-[28px] font-extrabold leading-tight text-primary-dark">{t('Your Clinic, Always With You')}</h1>
        <p className="mt-2 text-center text-sm text-ink-2">{t('Book appointments · Track your token · Keep your visits in one place')}</p>

        <div id="recaptcha" />
        <div className="card mt-6 p-5">
          {step === 'phone' && (<>
            <label className="lbl" htmlFor="ph">{t('Mobile number')}</label>
            <div className="flex gap-2">
              <span className="field !w-16 text-center">+91</span>
              <input id="ph" className="field" inputMode="numeric" maxLength={10} placeholder="98765 43210" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} onKeyDown={(e) => e.key === 'Enter' && sendOtp()} />
            </div>
            <button className="btn-primary mt-4 w-full" disabled={busy} onClick={sendOtp}>{t('Send OTP')}</button>
          </>)}
          {step === 'otp' && (<>
            <div className="mb-3 text-sm text-ink-2">{t('OTP sent to')} +91 {phone}</div>
            <label className="lbl" htmlFor="otp">{t('Enter OTP')}</label>
            <input id="otp" className="field text-center text-xl tracking-[.5em]" inputMode="numeric" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} onKeyDown={(e) => e.key === 'Enter' && verify()} autoFocus />
            <button className="btn-primary mt-4 w-full" disabled={busy} onClick={verify}>{t('Verify')}</button>
            <button className="mt-3 w-full text-sm font-semibold text-primary-dark" onClick={() => { setStep('phone'); setOtp(''); setErr(''); }}>{t('Change number')}</button>
          </>)}
          {step === 'profile' && (<>
            <div className="mb-3 font-bold">{t('Create your profile')}</div>
            <label className="lbl" htmlFor="nm">{t('Name')}</label>
            <input id="nm" className="field" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            <label className="lbl mt-3" htmlFor="ag">{t('Age')}</label>
            <input id="ag" className="field" inputMode="numeric" placeholder="e.g. 34" value={age} onChange={(e) => setAge(e.target.value)} />
            <label className="mt-4 flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={agree} onChange={(e) => setAgree(e.target.checked)} /><span>{t('I have read and accept the')} <Link to="/privacy" className="font-semibold text-primary-dark underline">{t('Privacy notice')}</Link></span></label>
            <button className="btn-primary mt-4 w-full" onClick={finish}>{t('Continue')}</button>
          </>)}
          {err && <div className="mt-3 rounded-lg bg-bad-50 px-3 py-2 text-sm font-medium text-bad" role="alert">{err}</div>}
        </div>

        <Link to="/privacy" className="mt-4 block text-center text-xs font-semibold text-ink-2 underline">{t('Privacy notice')}</Link>
        <Link to="/staff-login" className="mt-6 inline-flex items-center justify-center gap-2 text-sm font-semibold text-primary-dark"><Stethoscope size={16} />{t('Clinic staff? Sign in here')}</Link>
      </div>
    </div>
  );
}

export function StaffLogin() {
  const t = useT();
  const nav = useNavigate();
  const st = useStore();
  const [clinicId, setClinicId] = useState(st.clinics[0]?.id ?? '');
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');
  const [email, setEmail] = useState(''); const [busy, setBusy] = useState(false);
  const go = async () => {
    if (USE_FB) {
      setBusy(true); setErr('');
      try { const id = await staffSignIn(email, pin); await store.ensureClinic(id); nav('/staff', { replace: true }); }
      catch { setErr(t('Could not sign in. Check email and password.')); }
      setBusy(false); return;
    }
    if (pin !== DEMO_PIN) return setErr(t('Wrong PIN')); setSession({ role: 'staff', clinicId }); nav('/staff', { replace: true });
  };
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white">
      <DemoBanner />
      <div className="mx-auto max-w-md px-6 pb-10 pt-8">
        <div className="mb-8 flex items-center justify-between"><Logo size={32} /><LangToggle /></div>
        <h1 className="text-2xl font-extrabold text-primary-dark">{t('Clinic sign in')}</h1>
        <div className="card mt-6 p-5">
          {USE_FB ? (<>
            <label className="lbl" htmlFor="em">{t('Email')}</label>
            <input id="em" type="email" autoComplete="username" className="field" value={email} onChange={(e) => setEmail(e.target.value)} />
            <label className="lbl mt-3" htmlFor="pin">{t('Password')}</label>
            <input id="pin" type="password" autoComplete="current-password" className="field" value={pin} onChange={(e) => setPin(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && go()} />
          </>) : (<>
          <label className="lbl" htmlFor="cl">{t('Clinic')}</label>
          <select id="cl" className="field" value={clinicId} onChange={(e) => setClinicId(e.target.value)}>{st.clinics.map((c) => <option key={c.id} value={c.id}>{c.name} – {c.area}</option>)}</select>
          <label className="lbl mt-3" htmlFor="pin">{t('PIN')}</label>
          <input id="pin" type="password" inputMode="numeric" className="field" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} onKeyDown={(e) => e.key === 'Enter' && go()} />
          </>)}
          <button className="btn-primary mt-4 w-full" disabled={busy} onClick={go}>{t('Sign in')}</button>
          {err && <div className="mt-3 rounded-lg bg-bad-50 px-3 py-2 text-sm font-medium text-bad" role="alert">{err}</div>}
        </div>
        <Link to="/login" className="mt-6 block text-center text-sm font-semibold text-primary-dark">← {t('Patient login')}</Link>
      </div>
    </div>
  );
}
