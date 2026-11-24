# One flow: ClinicQ + MedScript + OrthoVault

```
Patient books (ClinicQ)  ->  Arrives, staff taps Arrived  ->  Desk queue (MedScript)  ->  Doctor sees, writes Rx  ->  Seen  ->  OrthoVault (doctor's own databook)
```

## Stages
1. **Book** - patient picks clinic/doctor/slot in ClinicQ. Token Q-nn. WhatsApp reminder is click-to-send by staff.
2. **Arrive** - staff taps Arrived. Patient enters the queue; entry goes to the clinic's MedScript desk (reason prefixed `ClinicQ ...`). Patient app shows queue no.
3. **Consult** - doctor opens the desk queue in MedScript, prescription prefilled with name/age/phone/reason.
4. **Seen** - doctor marks Seen in MedScript; ClinicQ staff screen follows (one direction, so a slow update never undoes a Seen).
5. **Record** - the doctor's own OrthoVault entry stays his personal databook. Nothing is written to it by ClinicQ.

## Data ownership
- Each doctor's data stays in that doctor's own desk/profile. No cross-doctor mixing. Desk link (secret id) is stored on the staff device only; patient phones never receive it.
- Patient identity across apps = phone number. A patient sees only their own bookings.
- OrthoVault and MedScript are not modified by ClinicQ. Any change there only after the doctor has seen the code and agreed.

## Who sees what
- Patient: own bookings, token, queue no., own records (later, doctor opt-in).
- Staff: that clinic's queue and slots.
- Doctor: desk queue + own prescriptions + OrthoVault.

## Sequencing
Done: demo store, arrival, desk adapter, UI. Next: ClinicQ Firebase project (own, not orthovault02), tested rules, privacy/consent (DPDP), Records tab (default off), WhatsApp automation, Play Store after own clinic.
