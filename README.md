# ClinicQ

Appointments, queue tokens and (later) records for small clinics. Patient app + clinic dashboard in one PWA.

**Status: demo build.** Everything runs on the device; see `docs/BACKEND.md` for what is needed before real use.

- Patient: phone OTP login (demo OTP `123456`), book OPD/dressing, token + QR, reschedule/cancel, family members, English/हिन्दी.
- Clinic: today's queue (Waiting/Seen/Cancelled), walk-ins, daily slots, booking QR. Demo staff PIN `1234`.

```
npm install --legacy-peer-deps
npm run dev      # develop
npm test         # booking/slot/token rules
npm run build
npm run icons    # regenerate app icons
```
Stack: Vite · React 18 · TypeScript · Tailwind · vite-plugin-pwa.
