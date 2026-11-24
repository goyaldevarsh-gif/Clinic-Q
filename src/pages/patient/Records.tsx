import { FileText, ShieldCheck } from 'lucide-react';
import { Empty, Header } from '../../components/ui';
import { useT } from '../../lib/i18n';
import { useStore } from '../../lib/store';
import { usePhone } from './shared';

export function Records() {
  const t = useT(); const st = useStore(); const phone = usePhone();
  const mine = (st.records ?? []).filter((r) => r.phone === phone).sort((a, b) => b.createdAt - a.createdAt);
  return (<>
    <Header title={t('Records')} />
    {mine.length > 0 && <div className="space-y-2 px-4 pt-4">{mine.map((r) => (
      <div key={r.id} className="card p-4"><div className="font-bold">{r.title}</div><div className="text-xs text-ink-2">{r.name} · {r.doctorName} · {r.date}</div><p className="mt-2 whitespace-pre-wrap text-sm">{r.body}</p></div>))}</div>}
    {mine.length === 0 && <Empty icon={<FileText size={28} />} title={`${t('Your medical records')} · ${t('Coming soon')}`} text={t('Prescriptions and reports shared by your clinic will appear here. You will only ever see your own and your family records.')} />}
    <div className="mx-4 flex items-start gap-3 rounded-2xl bg-primary-50 p-4 text-sm text-primary-dark"><ShieldCheck className="mt-0.5 shrink-0" size={18} />{t('Records are shown only after your clinic chooses to share them, and only to the mobile number they were issued to.')}</div>
  </>);
}
