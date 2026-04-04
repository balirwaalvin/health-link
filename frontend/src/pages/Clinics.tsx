import { useEffect, useState } from 'react';
import { Building2, Plus, Edit2, Trash2, MapPin, Phone } from 'lucide-react';
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
    <div className="page-stack">
      <section className="page-hero fade-in-up">
        <div className="section-header">
          <div>
            <p className="page-hero__eyebrow">Administration</p>
            <h2 className="page-hero__title">Clinics management</h2>
            <p className="page-hero__copy">Keep the clinic network organized with a clearer admin workspace and richer record presentation.</p>
          </div>
          <button onClick={addClinic} className="primary-button inline-flex items-center gap-2">
            <Plus className="h-4 w-4" /> New clinic
          </button>
        </div>
      </section>

      {error && <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        {clinics.map((c, index) => (
          <div key={c.id} className="surface-card fade-in-up" style={{ animationDelay: `${index * 80}ms` }}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="action-card__icon h-12 w-12">
                    <Building2 className="h-5 w-5 text-[#ff9f1c]" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black tracking-tight text-[#173047]">{c.clinic_name}</h3>
                    <p className="text-sm text-[#5f7184]">Clinic profile</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <div className="chip chip--amber"><MapPin className="h-3.5 w-3.5" /> {c.location || 'No location'}</div>
                  <div className="chip chip--green"><Phone className="h-3.5 w-3.5" /> {c.contact_phone || 'No phone'}</div>
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={() => editClinic(c)} className="secondary-button inline-flex items-center gap-2 px-4 py-2"><Edit2 className="h-4 w-4" /> Edit</button>
                <button onClick={() => deleteClinic(c.id)} className="danger-button inline-flex items-center gap-2 px-4 py-2 rounded-2xl font-bold"><Trash2 className="h-4 w-4" /> Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}