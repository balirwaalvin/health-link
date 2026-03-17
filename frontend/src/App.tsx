import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="patients" element={<Patients />} />
        {/* Placeholders for future routes */}
        <Route path="patients/:id" element={<div className="p-4 text-center">Patient Details Placeholder</div>} />
        <Route path="patients/register" element={<div className="p-4 text-center">Register Placeholder</div>} />
        <Route path="visits/add" element={<div className="p-4 text-center">Add Visit Placeholder</div>} />
        <Route path="clinics" element={<div className="p-4 text-center">Clinics Placeholder</div>} />
      </Route>
    </Routes>
  );
}

export default App;
