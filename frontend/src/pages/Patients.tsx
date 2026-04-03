import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Edit, Plus, Search, Trash2 } from 'lucide-react';
import { api, authHeaders, getErrorMessage } from '../lib/api';
import { isTenDigitPhone, normalizePhoneInput } from '../lib/phone';

interface Patient {
  id: number | string;
  display_id?: string;
  full_name?: string;
  phone?: string;
  email?: string;
  [key: string]: unknown;
}

export default function Patients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const role = localStorage.getItem('role');
  const navigate = useNavigate();

  const fetchPatients = useCallback(async () => {
    try {
      const res = await api.get('/patients', {
        headers: authHeaders(),
      });
      const normalized = (res.data as Patient[]).map((patient) => ({
        ...patient,
        full_name: patient.full_name || 'Unnamed Patient',
        display_id: patient.display_id || 'N/A',
        phone: patient.phone || 'N/A',
      }));
      setPatients(normalized);
      setError('');
    } catch {
      setError('Failed to fetch patients. Check your backend connection and session.');
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchPatients();
  }, [fetchPatients]);

  const filteredPatients = useMemo(
    () =>
      patients.filter(
        (p) =>
          (p.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
          (p.display_id || '').toLowerCase().includes(search.toLowerCase())
      ),
    [patients, search]
  );

  const toLabel = (key: string) =>
    key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());

  const toDisplayValue = (value: unknown) => {
    if (value === null || value === undefined || value === '') {
      return 'N/A';
    }
    if (Array.isArray(value)) {
      return value.length ? value.join(', ') : 'N/A';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  };

  const hiddenFields = new Set([
    '$id',
    '$collectionId',
    '$databaseId',
    '$createdAt',
    '$updatedAt',
    '$permissions',
  ]);

  const deletePatient = async (id: number | string) => {
    const yes = window.confirm('Delete this patient and related visits?');
    if (!yes) {
      return;
    }
    try {
      await api.delete(`/patients/${id}`, { headers: authHeaders() });
      fetchPatients();
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Delete failed. Admin only.'));
    }
  };

  const editPatient = async (patient: Patient) => {
    const fullName = window.prompt('Edit full name', patient.full_name);
    if (!fullName) {
      return;
    }
    const phoneInput = window.prompt('Edit phone (10 digits)', patient.phone);
    const phone = normalizePhoneInput(phoneInput || '');
    if (!phone) {
      return;
    }
    if (!isTenDigitPhone(phone)) {
      setError('Phone number must be exactly 10 digits.');
      return;
    }
    const email = window.prompt('Edit email', patient.email || '');

    try {
      await api.put(
        `/patients/${patient.id}`,
        { full_name: fullName, phone, email },
        { headers: authHeaders() }
      );
      fetchPatients();
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Update failed. Admin only.'));
    }
  };

  return (
    <div className="relative min-h-[80vh]">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Patients List</h2>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Search by name or ID..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-[#5CA6E2] focus:border-[#5CA6E2]"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-[#DF3232] mb-3">{error}</p>}

      <div className="space-y-3 pb-20">
        {filteredPatients.map((patient) => (
          <div
            key={patient.id}
            className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center cursor-pointer hover:shadow-md"
            onClick={() => navigate(`/patients/${patient.id}`)}
          >
            <div>
              <h3 className="font-bold text-gray-800">{patient.full_name}</h3>
              <p className="text-sm text-gray-500">ID: {patient.display_id}</p>
              <div className="mt-2 space-y-1">
                {Object.entries(patient)
                  .filter(([key]) => !hiddenFields.has(key) && key !== 'id')
                  .map(([key, value]) => (
                    <p key={`${patient.id}-${key}`} className="text-xs text-gray-600">
                      <span className="font-semibold text-gray-700">{toLabel(key)}:</span> {toDisplayValue(value)}
                    </p>
                  ))}
              </div>
            </div>
            {role === 'admin' && (
              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => editPatient(patient)} className="p-2 text-gray-400 hover:text-[#5CA6E2]"><Edit className="w-4 h-4" /></button>
                <button onClick={() => deletePatient(patient.id)} className="p-2 text-gray-400 hover:text-[#DF3232]"><Trash2 className="w-4 h-4" /></button>
              </div>
            )}
          </div>
        ))}
        {filteredPatients.length === 0 && (
          <p className="text-center text-gray-500 py-8">No patients found.</p>
        )}
      </div>

      <Link
        to="/patients/register"
        className="fixed bottom-12 right-4 bg-[#318542] text-white p-4 rounded-full shadow-lg hover:bg-green-700 transition"
      >
        <Plus className="w-6 h-6" />
      </Link>
    </div>
  );
}
