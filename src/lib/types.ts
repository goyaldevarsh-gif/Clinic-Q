export type ApptType = 'OPD' | 'Dressing';
export type Status = 'waiting' | 'seen' | 'cancelled';

/** 'HH:MM' 24h */
export interface Session { start: string; end: string }

export interface Schedule {
  /** weekday 0 (Sun) … 6 (Sat) → sessions; missing/empty = closed */
  days: Record<number, Session[]>;
  slotMinutes: number;
  /** patients allowed per slot */
  perSlot: number;
  dressing: boolean;
}

export interface Doctor { id: string; name: string; qualification: string; speciality: string; schedule: Schedule }

export interface Clinic { id: string; name: string; area: string; city: string; doctors: Doctor[] }

export type Relation = 'self' | 'spouse' | 'child' | 'parent' | 'other';
export interface Member { id: string; name: string; age: string; relation: Relation }

export interface Appt {
  id: string;
  clinicId: string;
  doctorId: string;
  /** YYYY-MM-DD (clinic local date) */
  date: string;
  /** HH:MM */
  time: string;
  type: ApptType;
  memberId?: string;
  name: string;
  age: string;
  /** 10-digit mobile, may be '' for walk-ins */
  phone: string;
  reason?: string;
  token: number;
  status: Status;
  walkIn?: boolean;
  cancelledBy?: 'patient' | 'clinic' | 'rescheduled';
  createdAt: number;
  /** set when staff taps Arrived (walk-ins: when added) */
  arrivedAt?: number;
  /** entry in the MedScript reception desk queue, once sent */
  deskDocId?: string;
  deskToken?: number;
  deskErr?: string;
}

export interface BookInput {
  clinicId: string; doctorId: string; date: string; time: string; type: ApptType;
  memberId?: string; name: string; age: string; phone: string; reason?: string;
}

export interface State {
  clinics: Clinic[];
  members: Record<string, Member[]>;
  appts: Appt[];
}
