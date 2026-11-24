import { Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { CalendarClock, ListOrdered, LogOut, Settings as Cog } from 'lucide-react';
import { setSession, useSession } from '../../lib/session';
import { useStore } from '../../lib/store';
import { useT } from '../../lib/i18n';
import { Avatar, DemoBanner, LangToggle, Logo, TabBar } from '../../components/ui';

export function useStaffClinic() {
  const s = useSession(); const st = useStore();
  return s?.role === 'staff' ? st.clinics.find((c) => c.id === s.clinicId) : undefined;
}

const NAV = [
  { to: '/staff', label: 'Queue', icon: <ListOrdered size={22} />, end: true },
  { to: '/staff/slots', label: 'Slots', icon: <CalendarClock size={22} /> },
  { to: '/staff/settings', label: 'Settings', icon: <Cog size={22} /> },
];

export function StaffLayout() {
  const s = useSession(); const c = useStaffClinic(); const t = useT(); const nav = useNavigate();
  if (s?.role !== 'staff' || !c) return <Navigate to="/staff-login" replace />;
  const doc = c.doctors[0];
  return (
    <div className="min-h-screen bg-surface md:flex">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-white p-5 md:flex">
        <Logo size={28} />
        <div className="mt-6 flex items-center gap-3 rounded-2xl bg-primary-50 p-3">
          <Avatar name={doc.name} size={42} />
          <div className="min-w-0"><div className="truncate text-sm font-bold">{doc.name}</div><div className="truncate text-xs text-ink-2">{c.name}</div></div>
        </div>
        <nav className="mt-5 space-y-1">
          {NAV.map((i) => (
            <NavLink key={i.to} to={i.to} end={i.end} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold ${isActive ? 'bg-primary-dark text-white' : 'text-ink-2 hover:bg-slate-50'}`}>{i.icon}{t(i.label)}</NavLink>
          ))}
        </nav>
        <div className="mt-auto space-y-2">
          <div className="flex justify-center"><LangToggle /></div>
          <button className="btn-line w-full" onClick={() => { setSession(null); nav('/staff-login', { replace: true }); }}><LogOut size={16} />{t('Log out')}</button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 pb-24 md:pb-10">
        <DemoBanner />
        <div className="mx-auto max-w-2xl md:max-w-3xl"><Outlet /></div>
      </main>
      <TabBar className="md:hidden" items={NAV} />
    </div>
  );
}
