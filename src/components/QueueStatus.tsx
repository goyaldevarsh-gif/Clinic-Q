import { useT } from '../lib/i18n';
import { fmtToken } from '../lib/slots';
import { aheadText, queueInfo } from '../pages/patient/shared';
import type { Appt, State } from '../lib/types';

/** What the patient sees on the day: not yet checked in, or checked in with the queue number and people ahead. */
export function QueueStatus({ st, a, tone = 'light' }: { st: State; a: Appt; tone?: 'light' | 'dark' }) {
  const t = useT();
  const q = queueInfo(st, a);
  const box = tone === 'dark' ? 'bg-white/15 text-white' : 'bg-primary-50 text-ink';
  return (
    <div className={`mt-3 rounded-xl px-3 py-2 text-sm ${box}`}>
      {q.serving && <div><b>{t('Now serving')}:</b> {fmtToken(q.serving.token)}</div>}
      {q.arrived
        ? <div>✓ {t('Checked in')}{q.deskToken ? ` · ${t('Queue no.')} ${q.deskToken}` : ''} · {aheadText(t, q.ahead, q.minutes)}</div>
        : <div>{t('Tell the reception your token')} {fmtToken(a.token)} {t('when you arrive')}.</div>}
    </div>
  );
}
