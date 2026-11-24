// Loaded lazily (dynamic import) so demo mode never downloads the Firebase SDK.
import { initializeApp } from 'firebase/app';
import * as A from 'firebase/auth';
import * as F from 'firebase/firestore';
import { FB_CONFIG } from './backend';

export const app = initializeApp(FB_CONFIG!);
export const auth = A.getAuth(app);
export const db = F.getFirestore(app);
export { A, F };
