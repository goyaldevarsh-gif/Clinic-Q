import type { Clinic, Schedule } from './types';

const mon_sat = (start: string, end: string): Schedule['days'] => ({ 1: [{ start, end }], 2: [{ start, end }], 3: [{ start, end }], 4: [{ start, end }], 5: [{ start, end }], 6: [{ start, end }] });

/** Demo clinics only. Clinic staff can edit everything from Settings / Slots. */
export const SEED_CLINICS: Clinic[] = [
  {
    id: 'mittal', name: 'Mittal Clinic', area: 'Ambabari', city: 'Jaipur',
    doctors: [{ id: 'dg', name: 'Dr. Devarsh Goyal', qualification: 'MS Orthopaedics', speciality: 'Trauma · Arthroscopy · Arthroplasty', schedule: { days: mon_sat('16:00', '17:00'), slotMinutes: 15, perSlot: 2, dressing: true } }],
  },
  {
    id: 'brij', name: 'Shri Brij Fracture Hospital', area: 'Jhotwara', city: 'Jaipur',
    doctors: [{ id: 'dg', name: 'Dr. Devarsh Goyal', qualification: 'MS Orthopaedics', speciality: 'Trauma · Arthroscopy · Arthroplasty', schedule: { days: mon_sat('17:00', '19:00'), slotMinutes: 15, perSlot: 2, dressing: true } }],
  },
];
