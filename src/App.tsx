import { HashRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { StaffLogin, Login } from './pages/Login';
import { PatientLayout } from './pages/patient/shared';
import { Home } from './pages/patient/Home';
import { Book } from './pages/patient/Book';
import { Confirmed } from './pages/patient/Confirmed';
import { Visits } from './pages/patient/Visits';
import { Records } from './pages/patient/Records';
import { Profile } from './pages/patient/Profile';
import { StaffLayout } from './pages/staff/shared';
import { Queue } from './pages/staff/Queue';
import { Slots } from './pages/staff/Slots';
import { Settings } from './pages/staff/Settings';

const ClinicLink = () => { const { id } = useParams(); return <Navigate to={`/book?clinic=${id}`} replace />; };

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/staff-login" element={<StaffLogin />} />
        <Route path="/c/:id" element={<ClinicLink />} />
        <Route element={<PatientLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/book" element={<Book />} />
          <Route path="/confirmed/:id" element={<Confirmed />} />
          <Route path="/visits" element={<Visits />} />
          <Route path="/records" element={<Records />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
        <Route element={<StaffLayout />}>
          <Route path="/staff" element={<Queue />} />
          <Route path="/staff/slots" element={<Slots />} />
          <Route path="/staff/settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
