import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Pencil, Plus, Trash2 } from 'lucide-react';
import { newId, store, useStore } from '../../lib/store';
import { setSession } from '../../lib/session';
import { setLang, useLang, useT } from '../../lib/i18n';
import { Avatar, Header, Modal } from '../../components/ui';
import type { Member, Relation } from '../../lib/types';
import { usePhone } from './shared';

const REL: Relation[] = ['spouse', 'child', 'parent', 'other'];

export function Profile() {
  const t = useT(); const lang = useLang(); const st = useStore(); const phone = usePhone(); const nav = useNavigate();
  const members = st.members[phone] ?? [];
  const [edit, setEdit] = useState<Member | null>(null);
  const [err, setErr] = useState('');
  const save = async () => { if (!edit) return; if (!edit.name.trim()) return setErr(t('Please enter a name')); await store.saveMember(phone, { ...edit, name: edit.name.trim(), age: edit.age.trim() }); setEdit(null); setErr(''); };
  return (<>
    <Header title={t('Profile')} />
    <div className="px-4 pt-4">
      <div className="card p-4"><div className="text-xs font-bold uppercase tracking-wide text-ink-2">{t('Mobile number')}</div><div className="mt-1 text-lg font-bold">+91 {phone}</div></div>
      <div className="mb-2 mt-5 flex items-center justify-between"><div className="lbl !mb-0">{t('Family members')}</div><button className="inline-flex items-center gap-1 text-sm font-bold text-primary-dark" onClick={() => { setEdit({ id: newId(), name: '', age: '', relation: 'spouse' }); setErr(''); }}><Plus size={16} />{t('Add family member')}</button></div>
      <div className="space-y-2">{members.map((m) => (
        <div key={m.id} className="card flex items-center gap-3 p-3">
          <Avatar name={m.name} size={40} tone={m.relation === 'self' ? 'blue' : 'teal'} />
          <div className="flex-1"><div className="font-semibold">{m.name}</div><div className="text-xs capitalize text-ink-2">{m.relation === 'self' ? t('You') : t(m.relation)}{m.age ? ` · ${m.age}` : ''}</div></div>
          <button className="rounded-full p-2 hover:bg-slate-100" aria-label={`Edit ${m.name}`} onClick={() => { setEdit(m); setErr(''); }}><Pencil size={16} /></button>
          {m.relation !== 'self' && <button className="rounded-full p-2 text-bad hover:bg-bad-50" aria-label={`Remove ${m.name}`} onClick={() => store.removeMember(phone, m.id)}><Trash2 size={16} /></button>}
        </div>))}</div>
      <div className="lbl mt-6">{t('Language')}</div>
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-primary-50 p-1">{(['en', 'hi'] as const).map((l) => <button key={l} onClick={() => setLang(l)} className={`rounded-lg py-2 text-sm font-bold ${lang === l ? 'bg-white text-primary-dark shadow-sm' : 'text-ink-2'}`}>{l === 'en' ? 'English' : 'हिन्दी'}</button>)}</div>
      <button className="btn-line mt-6 w-full" onClick={() => { setSession(null); nav('/login', { replace: true }); }}><LogOut size={16} />{t('Log out')}</button>
    </div>
    {edit && <Modal title={members.some((m) => m.id === edit.id) ? t('Edit member') : t('Add family member')} onClose={() => setEdit(null)}>
      <label className="lbl" htmlFor="mn">{t('Name')}</label><input id="mn" className="field" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} autoFocus />
      <label className="lbl mt-3" htmlFor="ma">{t('Age')}</label><input id="ma" className="field" placeholder="e.g. 34 or 5y 3m" value={edit.age} onChange={(e) => setEdit({ ...edit, age: e.target.value })} />
      {edit.relation !== 'self' && <><label className="lbl mt-3" htmlFor="mr">{t('Relation')}</label><select id="mr" className="field" value={edit.relation} onChange={(e) => setEdit({ ...edit, relation: e.target.value as Relation })}>{REL.map((r) => <option key={r} value={r}>{t(r[0].toUpperCase() + r.slice(1))}</option>)}</select></>}
      {err && <div className="mt-3 rounded-lg bg-bad-50 px-3 py-2 text-sm font-medium text-bad">{err}</div>}
      <button className="btn-primary mt-4 w-full" onClick={save}>{t('Save')}</button>
    </Modal>}
  </>);
}
