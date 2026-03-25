import { useEffect, useState } from 'react';
import { Building, Plus, Edit2, Trash2 } from 'lucide-react';
import { api, authHeaders, getErrorMessage } from '../lib/api';
import { isEmptyOrTenDigitPhone, normalizePhoneInput } from '../lib/phone';

interface Clinic {
  id: number;
  clinic_name: string;
  location?: string;
  contact_phone?: string;
}

export default function Clinics() {
  const role = localStorage.getItem('role') || 'staff';

  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [error, setError] = useState('');

  const fetchClinics = async () => {
    try {
      const res = await api.get('/clinics', { headers: authHeaders() });
      setClinics(res.data);
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Failed to fetch clinics.'));
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchClinics();
  }, []);

  const addClinic = async () => {
    const clinic_name = window.prompt('Clinic name');
    if (!clinic_name) {
      return;
    }
    const location = window.prompt('Location (optional)') || '';
    const contactPhoneInput = window.prompt('Phone (10 digits, optional)') || '';
    const contact_phone = normalizePhoneInput(contactPhoneInput);
    if (!isEmptyOrTenDigitPhone(contact_phone)) {
      setError('Clinic phone must be exactly 10 digits.');
      return;
    }

    try {
      await api.post('/clinics', { clinic_name, location, contact_phone }, { headers: authHeaders() });
      fetchClinics();
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Failed to add clinic.'));
    }
  };

  const editClinic = async (clinic: Clinic) => {
    const clinic_name = window.prompt('Clinic name', clinic.clinic_name);
    if (!clinic_name) {
      return;
    }
    const location = window.prompt('Location', clinic.location || '') || '';
    const contactPhoneInput = window.prompt('Phone (10 digits)', clinic.contact_phone || '') || '';
    const contact_phone = normalizePhoneInput(contactPhoneInput);
    if (!isEmptyOrTenDigitPhone(contact_phone)) {
      setError('Clinic phone must be exactly 10 digits.');
      return;
    }

    try {
      await api.put(
        `/clinics/${clinic.id}`,
        { clinic_name, location, contact_phone },
        { headers: authHeaders() }
      );
      fetchClinics();
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Failed to update clinic.'));
    }
  };

  const deleteClinic = async (clinicId: number) => {
    const yes = window.confirm('Delete this clinic?');
    if (!yes) {
      return;
    }
    try {
      await api.delete(`/clinics/${clinicId}`, { headers: authHeaders() });
      fetchClinics();
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Failed to delete clinic.'));
    }
  };

  if (role !== 'admin') return <div className="p-4 text-center text-red-500 font-bold">Access Denied</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Building className="w-6 h-6 text-[#FFA500]" /> Clinics Management
        </h2>
        <button onClick={addClinic} className="bg-[#FFA500] text-white p-2 rounded-lg font-bold hover:bg-orange-500 transition shadow-sm flex items-center">
          <Plus className="w-4 h-4 mr-1" /> New
        </button>
      </div>

      {error && <p className="text-sm text-[#DF3232]">{error}</p>}

      <div className="grid gap-3">
        {clinics.map(c => (
          <div key={c.id} className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-[#FFA500] flex justify-between items-center">
            <div>
              <h3 className="font-bold text-gray-800">{c.clinic_name}</h3>
              <p className="text-sm text-gray-500">{c.location || 'No location'} | {c.contact_phone || 'No phone'}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => editClinic(c)} className="p-2 text-gray-400 hover:text-[#5CA6E2] transition"><Edit2 className="w-4 h-4" /></button>
              <button onClick={() => deleteClinic(c.id)} className="p-2 text-gray-400 hover:text-[#DF3232] transition"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}