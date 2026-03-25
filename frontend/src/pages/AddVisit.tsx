import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, authHeaders, getErrorMessage } from '../lib/api';

interface OptionItem {
  id: string;
  label: string;
}

interface PatientResponse {
  id: number;
  full_name: string;
  display_id: string;
}

interface ClinicResponse {
  id: number;
  clinic_name: string;
}

export default function AddVisit() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedPatientId = searchParams.get('patientId') || '';

  const [patients, setPatients] = useState<OptionItem[]>([]);
  const [clinics, setClinics] = useState<OptionItem[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    patient_id: preselectedPatientId,
    visit_date: new Date().toISOString().split('T')[0],
    clinic_id: '',
    diagnosis: '',
    prescription: '',
    notes: '',
  });

  useEffect(() => {
    const load = async () => {
      try {
        const [patientsRes, clinicsRes] = await Promise.all([
          api.get('/patients', { headers: authHeaders() }),
          api.get('/clinics', { headers: authHeaders() }),
        ]);

        const patientOptions = (patientsRes.data as PatientResponse[]).map((p) => ({
          id: String(p.id),
          label: `${p.full_name} (${p.display_id})`,
        }));
        const clinicOptions = (clinicsRes.data as ClinicResponse[]).map((c) => ({
          id: String(c.id),
          label: c.clinic_name,
        }));

        setPatients(patientOptions);
        setClinics(clinicOptions);

        setForm((prev) => ({
          ...prev,
          patient_id: prev.patient_id || patientOptions[0]?.id || '',
          clinic_id: prev.clinic_id || clinicOptions[0]?.id || '',
        }));
      } catch {
        setError('Failed to load patients/clinics.');
      }
    };

    load();
  }, []);

  const isValid = useMemo(() => {
    return Boolean(form.patient_id && form.clinic_id && form.diagnosis.trim());
  }, [form]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) {
      return;
    }

    try {
      setSaving(true);
      setError('');
      await api.post(
        '/visits',
        {
          ...form,
          patient_id: Number(form.patient_id),
          clinic_id: Number(form.clinic_id),
          visit_date: `${form.visit_date}T00:00:00`,
        },
        { headers: authHeaders() }
      );
      navigate(`/patients/${form.patient_id}`);
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Could not save visit.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-800">Add Visit</h2>

      {error && <p className="text-sm text-[#DF3232]">{error}</p>}

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Patient</label>
          <select
            className="w-full border-gray-300 border rounded-lg p-2 focus:ring-[#5CA6E2]"
            value={form.patient_id}
            onChange={(e) => setForm({ ...form, patient_id: e.target.value })}
          >
            <option value="" disabled>Select a patient</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input
            type="date"
            className="w-full border-gray-300 border rounded-lg p-2 focus:ring-[#5CA6E2]"
            value={form.visit_date}
            onChange={(e) => setForm({ ...form, visit_date: e.target.value })}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Clinic</label>
          <select
            className="w-full border-gray-300 border rounded-lg p-2 focus:ring-[#5CA6E2]"
            value={form.clinic_id}
            onChange={(e) => setForm({ ...form, clinic_id: e.target.value })}
          >
            <option value="" disabled>Select a clinic</option>
            {clinics.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Diagnosis</label>
          <input
            type="text"
            className="w-full border-gray-300 border rounded-lg p-2 focus:ring-[#5CA6E2]"
            value={form.diagnosis}
            onChange={(e) => setForm({ ...form, diagnosis: e.target.value })}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Prescription</label>
          <textarea
            className="w-full border-gray-300 border rounded-lg p-2 focus:ring-[#5CA6E2]"
            value={form.prescription}
            onChange={(e) => setForm({ ...form, prescription: e.target.value })}
            rows={2}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            className="w-full border-gray-300 border rounded-lg p-2 focus:ring-[#5CA6E2]"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={3}
          />
        </div>

        <button
          type="submit"
          disabled={!isValid || saving}
          className="w-full bg-[#318542] disabled:bg-gray-400 text-white p-3 rounded-lg font-bold hover:bg-green-700 transition"
        >
          {saving ? 'Saving...' : 'Save Visit'}
        </button>
      </form>
    </div>
  );
}
