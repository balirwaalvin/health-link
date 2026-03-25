import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import PatientDetails from './pages/PatientDetails';
import AddVisit from './pages/AddVisit';
import RegisterPatient from './pages/RegisterPatient';
import Clinics from './pages/Clinics';
import AllVisits from './pages/AllVisits';
import About from './pages/About';
import RoleGuard from './components/RoleGuard';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="patients" element={<Patients />} />
        <Route
          path="patients/register"
          element={
            <RoleGuard allowedRoles={['staff']} redirectTo="/patients">
              <RegisterPatient />
            </RoleGuard>
          }
        />
        <Route path="patients/:id" element={<PatientDetails />} />
        <Route
          path="visits/add"
          element={
            <RoleGuard allowedRoles={['staff']} redirectTo="/visits">
              <AddVisit />
            </RoleGuard>
          }
        />
        <Route
          path="visits"
          element={
            <RoleGuard allowedRoles={['admin']}>
              <AllVisits />
            </RoleGuard>
          }
        />
        <Route
          path="clinics"
          element={
            <RoleGuard allowedRoles={['admin']}>
              <Clinics />
            </RoleGuard>
          }
        />
        <Route path="about" element={<About />} />
      </Route>
    </Routes>
  );
}

export default App;
