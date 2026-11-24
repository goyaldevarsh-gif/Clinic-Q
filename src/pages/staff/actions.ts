import { store } from '../../lib/store';
import { deskFor, getDeskId, sendToDesk } from '../../lib/desk';
import { fmt12, fmtToken, parseYmd } from '../../lib/slots';
import { getLang } from '../../lib/i18n';
import type { Appt, Clinic } from '../../lib/types';

const find = (id: string) => store.getState().appts.find((x) => x.id === id);

/** staff taps Arrived: patient is now in the queue, and (if a desk link is saved on this device) in the MedScript waiting list */
export async function arriveAndSend(a: Appt, clinic: Clinic) {
  await store.arrive(a.id);
  await pushToDesk(a.id, clinic);
}
export async function pushToDesk(id: string, clinic: Clinic) {
  const deskId = getDeskId(clinic.id); const a = find(id);
  if (!deskId || !a || a.deskDocId) return;
  await sendToDesk(a, clinic, deskId, deskFor(deskId), store.patchAppt);
}
export async function markSeen(a: Appt, clinic: Clinic) {
  await store.setStatus(a.id, 'seen');
  const deskId = getDeskId(clinic.id);
  if (deskId && a.deskDocId) deskFor(deskId).mark(deskId, a.deskDocId, 'seen').catch(() => {});
}
export async function undoSeen(a: Appt, clinic: Clinic) {
  await store.setStatus(a.id, 'waiting');
  const deskId = getDeskId(clinic.id);
  if (deskId && a.deskDocId) deskFor(deskId).mark(deskId, a.deskDocId, 'waiting').catch(() => {});
}

/** WhatsApp click-to-send reminder (the staff member presses send; nothing is sent automatically) */
export function reminderLink(a: Appt, clinic: Clinic, doctorName: string) {
  const when = `${parseYmd(a.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}, ${fmt12(a.time)}`;
  const text = getLang() === 'hi'
    ? `नमस्ते ${a.name}, ${clinic.name} में ${doctorName} के साथ आपकी ${a.type} अपॉइंटमेंट ${when} को है। टोकन ${fmtToken(a.token)}। अगर नहीं आ सकते तो कृपया बता दें।`
    : `Hello ${a.name}, a reminder of your ${a.type} appointment with ${doctorName} at ${clinic.name} on ${when}. Token ${fmtToken(a.token)}. Please let us know if you cannot come.`;
  return `https://wa.me/91${a.phone.replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(text)}`;
}
