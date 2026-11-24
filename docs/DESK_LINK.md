# ClinicQ ↔ MedScript reception desk (plan, no code yet)

Goal: a patient who booked in ClinicQ appears in the doctor's MedScript waiting list without the receptionist retyping anything.

## What MedScript's desk really is (read from its code)
- The desk lives in **OrthoVault's Firebase project (`orthovault02`)**, under `desks/{deskId}/queue`.
- Security is a **secret link**: whoever knows `deskId` can **read, add and delete** that day's queue (names + mobile numbers). There is no login on the desk.
- Entry fields are fixed by the rules: `name, age, ageUnit, sex, phone, weight, allergies, reason, bp, sugar, followUp, toOv, token, day, createdAt, status`. Any other field is rejected.
- Token = running number per day from `counters/{day}` (1, 2, 3…), status `waiting | seen`.
- MedScript already shows the queue, marks `seen`, and cleans old days.

## Rules this plan must obey
1. **Patient phones never get `deskId`.** It opens the whole queue. So patients' ClinicQ app must never talk to `orthovault02`.
2. **ClinicQ gets its own Firebase project.** Patient login (phone OTP) and many users must not sit next to the doctor's private OrthoVault data.
3. **Nothing in MedScript or the OrthoVault rules changes.** No rules re-paste, no new field.
4. Each doctor's data stays with that doctor: one `deskId` per doctor/clinic, saved only on that clinic's staff device (later: a staff-only Firestore doc, never in the public `clinics/{id}` doc).

## Flow (recommended)
```
Patient books in ClinicQ ──► ClinicQ project (own Firebase)
                                   │
 Patient arrives, staff taps "Arrived" in ClinicQ (staff device)
                                   │  uses the clinic's saved desk link
                                   ▼
        desks/{deskId}/queue  (orthovault02)  ──►  MedScript waiting list
                                   │
   Doctor taps Seen / opens Rx in MedScript
                                   │  ClinicQ staff app (open) watches the queue
                                   ▼
        ClinicQ appointment becomes "Seen"  ──►  patient's app updates
```
Why "on arrival" and not "all in the morning": the desk token then means order of arrival, walk-ins and booked patients share one honest queue, and the doctor's list is not full of people who have not come yet.

## Field mapping (ClinicQ → desk entry)
| Desk field | From ClinicQ |
|---|---|
| name | member name |
| age / ageUnit | member age string as is (`34`, `5y 3m`); unit `Y` |
| phone | 10-digit mobile |
| reason | `ClinicQ · 4:15 PM · OPD` + patient's reason (this is how the booking is marked, since no new field is allowed) |
| sex, weight, allergies, bp, sugar | left empty. ClinicQ does not collect them and must not guess |
| followUp, toOv | `false`; reception can change it as they do today |

## Things that can go wrong, and the answer
- **Sent twice** (double tap, retry): ClinicQ stores `sentToDesk` on the appointment and refuses a second send.
- **Staff app closed when doctor taps Seen:** status syncs back only while a ClinicQ staff screen is open. Fallback: staff can tap Seen in ClinicQ too. Not a safety issue, only a queue display delay.
- **Two token numbers** (booking `Q-07`, desk token `3`): patient app keeps showing the booking number; after "Arrived" it also shows "Queue no. 3". Reception only deals with the desk number.
- **Desk link leaked:** same risk as today; "new link" in MedScript already wipes the old one.
- **Offline desk write:** same 15-second timeout and clear error the desk uses today.

## Decisions I need from Dr. Goyal
1. Arrival model: **"Arrived" by staff** (recommended), or all of today's bookings pushed at opening time?
2. After arrival, should the patient's app show the desk queue number? (recommended: yes)
3. First version: only your 2 clinics (each with its own desk link), correct?

## Build order once approved
1. ClinicQ staff screen: paste/scan desk link once (stored on that device only).
2. "Arrived" button → writes the entry, stores `sentToDesk` + desk doc id.
3. Seen sync back (staff screen open).
4. Test with a throw-away desk id first, never the live one.
