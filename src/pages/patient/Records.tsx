import { FileText, ShieldCheck } from 'lucide-react';
import { Empty, Header } from '../../components/ui';
import { useT } from '../../lib/i18n';

export function Records() {
  const t = useT();
  return (<>
    <Header title={t('Records')} />
    <Empty icon={<FileText size={28} />} title={`${t('Your medical records')} · ${t('Coming soon')}`} text={t('Prescriptions and reports shared by your clinic will appear here. You will only ever see your own and your family records.')} />
    <div className="mx-4 flex items-start gap-3 rounded-2xl bg-primary-50 p-4 text-sm text-primary-dark"><ShieldCheck className="mt-0.5 shrink-0" size={18} />{t('Records are shown only after your clinic chooses to share them, and only to the mobile number they were issued to.')}</div>
  </>);
}
