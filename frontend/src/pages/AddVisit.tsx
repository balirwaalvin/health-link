import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Hospital, NotebookPen, Save, Users } from 'lucide-react';
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
    <div className="page-stack">
      <section className="page-hero fade-in-up">
        <p className="page-hero__eyebrow">Visit entry</p>
        <h2 className="page-hero__title">Add visit</h2>
        <p className="page-hero__copy">Capture the encounter in a wider form layout with stronger hierarchy and better desktop spacing.</p>
      </section>

      {error && <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <div className="split-grid items-start">
        <form onSubmit={handleSubmit} className="surface-card space-y-5 fade-in-up delay-1">
          <div className="field-grid grid gap-4 md:grid-cols-2">
            <div>
              <label className="field-label mb-2 block">Patient</label>
              <select
                className="select-field"
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
              <label className="field-label mb-2 block">Clinic</label>
              <select
                className="select-field"
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
              <label className="field-label mb-2 block">Date</label>
              <input
                type="date"
                className="text-field"
                value={form.visit_date}
                onChange={(e) => setForm({ ...form, visit_date: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="field-label mb-2 block">Diagnosis</label>
              <input
                type="text"
                className="text-field"
                value={form.diagnosis}
                onChange={(e) => setForm({ ...form, diagnosis: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label className="field-label mb-2 block">Prescription</label>
            <textarea
              className="textarea-field"
              value={form.prescription}
              onChange={(e) => setForm({ ...form, prescription: e.target.value })}
              rows={3}
            />
          </div>

          <div>
            <label className="field-label mb-2 block">Notes</label>
            <textarea
              className="textarea-field"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={4}
            />
          </div>

          <button
            type="submit"
            disabled={!isValid || saving}
            className="primary-button w-full inline-flex items-center justify-center gap-2"
          >
            <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save visit'}
          </button>
        </form>

        <aside className="surface-card fade-in-up delay-2">
          <p className="section-eyebrow">Guidance</p>
          <h3 className="surface-card__title">Workflow cues</h3>
          <div className="mini-grid mt-5">
            <div className="mini-card">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-[#1f6feb]" />
                <span className="font-semibold">Choose the correct patient</span>
              </div>
              <p className="mini-card__copy">Use the patient selector to bind the visit to the right record.</p>
            </div>
            <div className="mini-card">
              <div className="flex items-center gap-2">
                <Hospital className="h-4 w-4 text-[#ff9f1c]" />
                <span className="font-semibold">Pick the clinic</span>
              </div>
              <p className="mini-card__copy">Keep the encounter traceable to the facility that handled it.</p>
            </div>
            <div className="mini-card">
              <div className="flex items-center gap-2">
                <NotebookPen className="h-4 w-4 text-[#16a34a]" />
                <span className="font-semibold">Document clearly</span>
              </div>
              <p className="mini-card__copy">Diagnosis, prescription, and notes should remain concise and readable.</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
