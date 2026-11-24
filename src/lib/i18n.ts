import { createContext, useContext, useSyncExternalStore } from 'react';

export type Lang = 'en' | 'hi';
const KEY = 'cq.lang';
let lang: Lang = (typeof localStorage !== 'undefined' && localStorage.getItem(KEY) === 'hi') ? 'hi' : 'en';
const subs = new Set<() => void>();
export function setLang(l: Lang) { lang = l; try { localStorage.setItem(KEY, l); } catch { /* ignore */ } if (typeof document !== 'undefined') document.body.dataset.lang = l; subs.forEach((f) => f()); }
if (typeof document !== 'undefined') document.body.dataset.lang = lang;
export const useLang = () => useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => lang);

/** English text is the key; anything missing here simply stays English. */
const HI: Record<string, string> = {
  'Your Clinic, Always With You': 'आपका क्लिनिक, हमेशा आपके साथ',
  'Mobile number': 'मोबाइल नंबर',
  'Send OTP': 'OTP भेजें',
  'Enter OTP': 'OTP डालें',
  'Verify': 'वेरीफाई करें',
  'Change number': 'नंबर बदलें',
  'Clinic staff? Sign in here': 'क्लिनिक स्टाफ? यहाँ साइन इन करें',
  'Namaste': 'नमस्ते',
  'Upcoming appointment': 'आने वाली अपॉइंटमेंट',
  'No upcoming appointment': 'कोई आने वाली अपॉइंटमेंट नहीं',
  'Book appointment': 'अपॉइंटमेंट बुक करें',
  'View details': 'विवरण देखें',
  'Reschedule': 'समय बदलें',
  'Cancel': 'रद्द करें',
  'Home': 'होम',
  'Book': 'बुक करें',
  'Visits': 'विज़िट',
  'Records': 'रिकॉर्ड',
  'Profile': 'प्रोफाइल',
  'Select clinic': 'क्लिनिक चुनें',
  'Select doctor': 'डॉक्टर चुनें',
  'Visit type': 'विज़िट का प्रकार',
  'OPD consultation': 'OPD परामर्श',
  'Dressing / procedure': 'ड्रेसिंग / प्रक्रिया',
  'Select date': 'तारीख चुनें',
  'Select time slot': 'समय स्लॉट चुनें',
  'No slots on this day': 'इस दिन कोई स्लॉट नहीं',
  'Continue': 'आगे बढ़ें',
  'Confirm booking': 'बुकिंग कन्फर्म करें',
  'Appointment confirmed!': 'अपॉइंटमेंट कन्फर्म हो गई!',
  'Your token': 'आपका टोकन',
  'Show this QR at the clinic': 'क्लिनिक पर यह QR दिखाएँ',
  'Add to calendar': 'कैलेंडर में जोड़ें',
  'Share': 'शेयर करें',
  'Now serving': 'अभी चल रहा है',
  'Waiting': 'प्रतीक्षा में',
  'Seen': 'देख लिया गया',
  'Cancelled': 'रद्द',
  'Upcoming': 'आने वाली',
  'Past': 'पुरानी',
  'Who is this for?': 'यह किसके लिए है?',
  'Reason for visit (optional)': 'आने का कारण (वैकल्पिक)',
  'Family members': 'परिवार के सदस्य',
  'Add family member': 'परिवार का सदस्य जोड़ें',
  'Name': 'नाम',
  'Age': 'उम्र',
  'Save': 'सेव करें',
  'Language': 'भाषा',
  'Log out': 'लॉग आउट',
  "Today's queue": 'आज की कतार',
  'Total': 'कुल',
  'Slots': 'स्लॉट',
  'Settings': 'सेटिंग्स',
  'Queue': 'कतार',
  'Add walk-in': 'वॉक-इन जोड़ें',
  'Set daily slots': 'दैनिक स्लॉट सेट करें',
  'Patients per slot': 'प्रति स्लॉट मरीज़',
  'Slot length': 'स्लॉट की अवधि',
  'Allow dressing slots': 'ड्रेसिंग स्लॉट चालू करें',
  'Add timing': 'समय जोड़ें',
  'Copy to other days': 'बाकी दिनों में कॉपी करें',
  'Closed': 'बंद',
  'Your medical records': 'आपके मेडिकल रिकॉर्ड',
  'Coming soon': 'जल्द आ रहा है',
};
export const tr = (s: string, l: Lang = lang) => (l === 'hi' ? HI[s] ?? s : s);
export function useT() { const l = useLang(); return (s: string) => tr(s, l); }
export const LangCtx = createContext<Lang>('en');
export const useLangCtx = () => useContext(LangCtx);
