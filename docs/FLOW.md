# One flow: ClinicQ + MedScript + OrthoVault

Reception works in **MedScript's desk** (its UI is unchanged). ClinicQ is the **patient-facing** side (booking, own records).

```
Patient books (ClinicQ)  ->  MedScript desk > Bookings  ->  Arrived  ->  Waiting list  ->  Doctor writes Rx (MedScript)
Walk-in               ->  MedScript desk form (as before)  ----------^
Rx authorised  ->  patient's ClinicQ Records (auto, opt-in)      Rx authorised  ->  OrthoVault (only patients the doctor chose)
```

## Stages
1. **Book** - patient picks clinic/doctor/slot in ClinicQ. Token Q-nn.
2. **Arrive** - reception opens desk > Bookings and taps **Arrived** (one tap). The patient joins the waiting list (reason `ClinicQ 4:15 PM · OPD`). WhatsApp reminder and cancel are on the same row.
3. **Consult** - doctor works from the desk waiting list as before; Rx prefilled.
4. **Seen** - doctor marks Seen on the desk list; the ClinicQ booking follows automatically (the desk is the source of truth once linked). Also publishes "who is checked in" so patient phones show how many are ahead.
5. **Rx to patient** - on authorise, the Rx text (diagnosis, medicines, advice, follow-up; no examination or allergy lines) is written to ClinicQ Records for that phone. Per device opt-in; manual phone icon on each Rx. Patient sees it only if the clinic enabled "Share prescriptions".
6. **OrthoVault** - unchanged: patients the doctor sends (checkbox / patient page) follow automatically. ClinicQ never writes to OrthoVault.

## Data ownership
- Desk link (secret id) and ClinicQ staff sign-in stay on the staff devices. Patient phones never receive either.
- Patient identity across apps = phone number; a patient sees only their own bookings and records.
- Three separate Firebase projects: ClinicQ (clinic-q-e9460), MedScript desk/OrthoVault (orthovault02, per-doctor paths). No cross-doctor mixing.

## Open items
Real clinic setup (clinic id, staff login), privacy notice review + CONTACT, Blaze plan for real SMS OTP, WhatsApp automation, Cloud Function to harden slot counters, Play Store after own clinic.
