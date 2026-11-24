import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useLang, useT } from '../lib/i18n';
import { CONTACT, NOTICE } from '../lib/legal';

export function Privacy() {
  const t = useT(); const hi = useLang() === 'hi';
  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto max-w-md px-5 py-6">
        <Link to="/login" className="inline-flex items-center gap-1 text-sm font-semibold text-primary-dark"><ChevronLeft size={16} />{t('Back')}</Link>
        <h1 className="mt-3 text-2xl font-extrabold text-primary-dark">{t('Privacy notice')}</h1>
        <div className="mt-4 space-y-3">{NOTICE.map((s) => (
          <section key={s.h} className="card p-4"><h2 className="font-bold">{hi ? s.hHi : s.h}</h2><p className="mt-1 text-sm text-ink-2">{hi ? s.pHi : s.p}</p></section>))}</div>
        <p className="mt-4 text-xs text-ink-2">{t('Questions or deletion requests')}: {CONTACT}</p>
      </div>
    </div>
  );
}
