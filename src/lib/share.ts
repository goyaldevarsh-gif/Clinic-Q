import type { Appt, Clinic } from './types';
import { fmt12, fmtToken, toMin, fromMin } from './slots';

export function makeIcs(a: Appt, clinic: Clinic, docName: string) {
  const d = a.date.replace(/-/g, '');
  const t = (hm: string) => hm.replace(':', '') + '00';
  const end = fromMin(toMin(a.time) + 15);
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ClinicQ//EN', 'BEGIN:VEVENT', `UID:${a.id}@clinicq`, `DTSTAMP:${d}T${t(a.time)}`, `DTSTART:${d}T${t(a.time)}`, `DTEND:${d}T${t(end)}`,
    `SUMMARY:${a.type} – ${docName}`, `LOCATION:${clinic.name}, ${clinic.area}, ${clinic.city}`, `DESCRIPTION:Token ${fmtToken(a.token)}`, 'END:VEVENT', 'END:VCALENDAR'];
  return lines.join('\r\n');
}

export function downloadIcs(a: Appt, clinic: Clinic, docName: string) {
  const url = URL.createObjectURL(new Blob([makeIcs(a, clinic, docName)], { type: 'text/calendar' }));
  const el = document.createElement('a'); el.href = url; el.download = `appointment-${a.date}.ics`; el.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function shareText(a: Appt, clinic: Clinic, docName: string) {
  return `My appointment: ${a.type} with ${docName}\n${a.date} at ${fmt12(a.time)}\n${clinic.name}, ${clinic.area}, ${clinic.city}\nToken ${fmtToken(a.token)}`;
}
export async function shareAppt(a: Appt, clinic: Clinic, docName: string) {
  const text = shareText(a, clinic, docName);
  if (navigator.share) { try { await navigator.share({ text }); return; } catch { /* cancelled */ } }
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
}
