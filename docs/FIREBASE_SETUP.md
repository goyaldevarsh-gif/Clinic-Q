# Going live on Firebase (owner steps)

Code is ready; this is what only the owner can do. Demo mode stays the default until the build variables below are set.

1. **Create project** "clinicq" at console.firebase.google.com (separate from orthovault02).
2. **Firestore Database** → create, production mode, region Mumbai/Delhi.
3. **Authentication → Sign-in method**: enable *Phone* and *Email/Password*. Under Phone → "Phone numbers for testing" add a test number + code (free, no SMS). Authorised domains: add `goyaldevarsh-gif.github.io`.
4. **Rules + indexes**: Firestore → Rules → paste `firestore.rules` → Publish. Indexes: create the one suggested in `firestore.indexes.json` (appts: clinicId ↑, date ↑); the app's console error also gives a one-click link.
5. **Staff account per clinic**: Authentication → Users → Add user (email + password). Copy its UID. Firestore → Start collection `staff` → document id = that UID → field `clinicId` (string) = `mittal` or `brij`.
6. **Web app config**: Project settings → Add web app → copy the config object.
7. **GitHub** repo → Settings → Secrets and variables → Actions → Variables: `VITE_BACKEND` = `firebase`, `VITE_FIREBASE_CONFIG` = the config as one-line JSON. (Config is public by design; rules are what protect data.)
8. Push → Pages redeploys in real mode. First staff sign-in creates the clinic document from the built-in template.

Phone OTP to real numbers (not test numbers) needs the Blaze plan (card required, free quota covers small clinics). Only switch it on after the privacy notice (`src/lib/legal.ts`) is reviewed and the contact line is filled.

Known limits: a signed-in patient could tamper with the public slot counters (never read others' data) → harden with a Cloud Function later. The adapter is covered by rule tests (CI job "rules") but has not yet run against a live Firebase project.
