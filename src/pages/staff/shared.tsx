import { Navigate, Outlet } from 'react-router-dom';
import { CalendarClock, ListOrdered, Settings as Cog } from 'lucide-react';
import { useSession } from '../../lib/session';
import { useStore } from '../../lib/store';
import { DemoBanner, TabBar } from '../../components/ui';

export function useStaffClinic() {
  const s = useSession(); const st = useStore();
  return s?.role === 'staff' ? st.clinics.find((c) => c.id === s.clinicId) : undefined;
}

export function StaffLayout() {
  const s = useSession(); const c = useStaffClinic();
  if (s?.role !== 'staff' || !c) return <Navigate to="/staff-login" replace />;
  return (
    <div className="mx-auto min-h-screen max-w-2xl bg-surface pb-24">
      <DemoBanner />
      <Outlet />
      <TabBar items={[
        { to: '/staff', label: 'Queue', icon: <ListOrdered size={22} />, end: true },
        { to: '/staff/slots', label: 'Slots', icon: <CalendarClock size={22} /> },
        { to: '/staff/settings', label: 'Settings', icon: <Cog size={22} /> },
      ]} />
    </div>
  );
}
