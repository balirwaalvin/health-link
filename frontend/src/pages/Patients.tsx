import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, Edit, Plus, Search, Trash2, UserRound, Mail, Phone } from 'lucide-react';
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
    <div className="page-stack">
      <section className="page-hero fade-in-up">
        <div className="section-header">
          <div>
            <p className="page-hero__eyebrow">Directory</p>
            <h2 className="page-hero__title">Patients list</h2>
            <p className="page-hero__copy">Search, review, and open patient records from a wider desktop-friendly view.</p>
          </div>
          <Link to="/patients/register" className="primary-button inline-flex items-center gap-2">
            <Plus className="h-4 w-4" /> Register patient
          </Link>
        </div>

        <div className="split-grid items-end">
          <div className="surface-card">
            <p className="section-eyebrow">Search</p>
            <div className="relative mt-3">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5f7184]" />
              <input
                type="text"
                placeholder="Search by name or ID..."
                className="search-box pl-11"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="feature-grid">
            <div className="mini-card">
              <p className="mini-card__label">Records</p>
              <p className="mt-3 text-3xl font-black tracking-tight text-[#1f6feb]">{filteredPatients.length}</p>
              <p className="mini-card__copy">Patients currently visible in the filtered list.</p>
            </div>
            <div className="mini-card">
              <p className="mini-card__label">Role</p>
              <p className="mt-3 text-2xl font-black tracking-tight text-[#173047]">{role || 'staff'}</p>
              <p className="mini-card__copy">Controls available actions and record editing.</p>
            </div>
            <div className="mini-card">
              <p className="mini-card__label">Access</p>
              <p className="mt-3 text-2xl font-black tracking-tight text-[#16a34a]">Protected</p>
              <p className="mini-card__copy">Sensitive patient history stays OTP-gated.</p>
            </div>
          </div>
        </div>
      </section>

      {error && <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <div className="grid gap-4 lg:grid-cols-2 pb-24">
        {filteredPatients.map((patient, index) => (
          <div
            key={patient.id}
            className="surface-card cursor-pointer transition duration-200 hover:translate-y-[-2px] hover:shadow-[0_24px_50px_rgba(23,48,71,0.12)] fade-in-up"
            style={{ animationDelay: `${index * 70}ms` }}
            onClick={() => navigate(`/patients/${patient.id}`)}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="action-card__icon h-12 w-12">
                    <UserRound className="h-5 w-5 text-[#1f6feb]" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black tracking-tight text-[#173047]">{patient.full_name}</h3>
                    <p className="text-sm text-[#5f7184]">ID: {patient.display_id}</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <div className="chip chip--blue">
                    <Mail className="h-3.5 w-3.5" />
                    {patient.email || 'No email'}
                  </div>
                  <div className="chip chip--green">
                    <Phone className="h-3.5 w-3.5" />
                    {patient.phone || 'N/A'}
                  </div>
                </div>

                <div className="mt-4 grid gap-1.5">
                  {Object.entries(patient)
                    .filter(([key]) => !hiddenFields.has(key) && key !== 'id' && key !== 'email' && key !== 'phone')
                    .map(([key, value]) => (
                      <p key={`${patient.id}-${key}`} className="text-xs text-gray-600">
                        <span className="font-semibold text-gray-700">{toLabel(key)}:</span> {toDisplayValue(value)}
                      </p>
                    ))}
                </div>
              </div>

              <ChevronRight className="mt-2 h-5 w-5 text-[#5f7184]" />
            </div>

            {role === 'admin' && (
              <div className="mt-4 flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => editPatient(patient)} className="secondary-button inline-flex items-center gap-2 px-4 py-2">
                  <Edit className="h-4 w-4" /> Edit
                </button>
                <button onClick={() => deletePatient(patient.id)} className="danger-button inline-flex items-center gap-2 px-4 py-2 rounded-2xl font-bold">
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
              </div>
            )}
          </div>
        ))}
        {filteredPatients.length === 0 && <div className="empty-state lg:col-span-2 text-center">No patients found.</div>}
      </div>

      <Link to="/patients/register" className="floating-fab" aria-label="Register patient">
        <Plus className="h-6 w-6" />
      </Link>
    </div>
  );
}
