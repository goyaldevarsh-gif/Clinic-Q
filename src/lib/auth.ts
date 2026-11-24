import { USE_FB } from './backend';
import { setSession } from './session';

/** Real login (Firebase). Demo mode never calls these. */
let confirmation: import('firebase/auth').ConfirmationResult | null = null;
let verifier: import('firebase/auth').RecaptchaVerifier | null = null;

export async function sendOtp(phone10: string, holderId = 'recaptcha') {
  if (!USE_FB) throw new Error('demo');
  const { auth, A } = await import('./fbsdk');
  if (!verifier) verifier = new A.RecaptchaVerifier(auth, holderId, { size: 'invisible' });
  try { confirmation = await A.signInWithPhoneNumber(auth, `+91${phone10}`, verifier); }
  catch (e) { try { verifier.clear(); } catch { /* ignore */ } verifier = null; throw e; }
}
export async function confirmOtp(code: string) {
  if (!confirmation) throw new Error('no-otp');
  await confirmation.confirm(code);
}
export async function staffSignIn(email: string, password: string): Promise<string> {
  const { auth, db, A, F } = await import('./fbsdk');
  const cred = await A.signInWithEmailAndPassword(auth, email.trim(), password);
  const snap = await F.getDoc(F.doc(db, 'staff', cred.user.uid));
  const clinicId = snap.exists() ? (snap.data().clinicId as string) : '';
  if (!clinicId) { await A.signOut(auth); throw new Error('not-staff'); }
  setSession({ role: 'staff', clinicId });
  return clinicId;
}
export async function signOutAll() {
  setSession(null);
  if (!USE_FB) return;
  const { auth, A } = await import('./fbsdk');
  await A.signOut(auth);
}

export async function hasSelfProfile(phone10: string) {
  const { db, F } = await import('./fbsdk');
  const snap = await F.getDocs(F.collection(db, 'patients', phone10, 'members'));
  return snap.docs.some((d) => d.data().relation === 'self');
}
