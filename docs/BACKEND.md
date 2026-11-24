# Going from demo to real

Today the app runs in **demo mode**: all data sits in the browser's localStorage, OTP is always `123456`, staff PIN is `1234`.
That is enough to try every screen, but nothing is private or shared between phones.

`src/lib/store.ts` exposes `getState / subscribe / book / reschedule / cancel / setStatus / addWalkIn / saveClinic / saveMember`.
The real backend replaces that file only; the screens stay as they are.

## What the backend must guarantee
1. **A patient only ever reads their own number's data.** (`firestore.rules`, phone-auth token)
2. **One clinic's staff never see another clinic's data.** (custom claim `clinicId`)
3. **Two phones cannot take the last place in a slot.** Booking needs a Firestore transaction (counter doc per slot).
4. Token numbers are unique per doctor per day (same transaction).

## Steps
1. Create a Firebase project (Blaze plan is needed for phone-OTP SMS beyond the free test numbers).
2. Enable Authentication → Phone. Add authorised domain `goyaldevarsh-gif.github.io`.
3. Create Firestore; review and publish `firestore.rules`; test it with the emulator first.
4. Write `src/lib/firestoreStore.ts` implementing the same interface; switch on `VITE_BACKEND=firebase`.
5. Staff accounts: a one-off admin script sets the `clinicId` claim.
6. Before real patients: privacy policy + consent screen (India DPDP Act), reviewed by someone qualified.

## Later (not built)
- Records tab: clinic chooses (setting, default OFF) to publish finished prescriptions to the patient's number.
- Link with the MedScript desk queue so booked patients appear at reception automatically.
- WhatsApp reminders (click-to-send first, API later).
- Play Store: wrap the PWA as a Trusted Web Activity once the above is stable.
