import { useEffect, useState } from 'react';
import { CalendarDays, Edit2, Search, Stethoscope, Trash2 } from 'lucide-react';
import { api, authHeaders, getErrorMessage } from '../lib/api';

interface Visit {
  id: number | string;
  visit_date?: string;
  patient_name?: string;
  patient_display_id?: string;
  clinic_name?: string;
  diagnosis?: string;
  [key: string]: unknown;
}

export default function AllVisits() {
  const role = localStorage.getItem('role') || 'staff';

  const [visits, setVisits] = useState<Visit[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const fetchVisits = async (searchValue = '') => {
    try {
      const res = await api.get('/visits', {
        headers: authHeaders(),
        params: searchValue ? { search: searchValue } : undefined,
      });
      setVisits(res.data);
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Failed to fetch visits.'));
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchVisits();
  }, []);

  const editVisit = async (visit: Visit) => {
    const diagnosis = window.prompt('Diagnosis', visit.diagnosis);
    if (!diagnosis) {
      return;
    }
    try {
      await api.put(`/visits/${visit.id}`, { diagnosis }, { headers: authHeaders() });
      fetchVisits(search);
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Could not update visit.'));
    }
  };

  const deleteVisit = async (visitId: number | string) => {
    const yes = window.confirm('Delete this visit?');
    if (!yes) {
      return;
    }
    try {
      await api.delete(`/visits/${visitId}`, { headers: authHeaders() });
      fetchVisits(search);
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Could not delete visit.'));
    }
  };

  if (role !== 'admin') return <div className="p-4 text-center text-red-500 font-bold">Access Denied</div>;

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

  const preferredFieldOrder = [
    'visit_date',
    'patient_name',
    'patient_display_id',
    'clinic_name',
    'diagnosis',
    'prescription',
    'notes',
    'patient_id',
    'clinic_id',
    'created_by_id',
    'created_by_name',
  ];

  const formatDate = (value: string | undefined) => {
    if (!value) {
      return 'N/A';
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? 'N/A' : parsed.toLocaleDateString();
  };

  return (
    <div className="page-stack">
      <section className="page-hero fade-in-up">
        <div className="section-header">
          <div>
            <p className="page-hero__eyebrow">Audit trail</p>
            <h2 className="page-hero__title">All visits</h2>
            <p className="page-hero__copy">Review the wider visit history with a more readable, desktop-ready table surface.</p>
          </div>
          <div className="chip chip--blue">
            <CalendarDays className="h-3.5 w-3.5" /> Live records
          </div>
        </div>

        <div className="toolbar mt-5">
          <div className="relative flex-1 min-w-[280px]">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5f7184]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search patient, clinic or diagnosis"
              className="search-box pl-11"
            />
          </div>
          <button onClick={() => fetchVisits(search)} className="primary-button inline-flex items-center gap-2">
            <Stethoscope className="h-4 w-4" /> Search
          </button>
        </div>
      </section>

      {error && <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <div className="table-shell fade-in-up delay-1 overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Patient</th>
              <th>Clinic</th>
              <th>Details</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visits.map((visit) => (
              <tr key={visit.id}>
                <td>{formatDate(visit.visit_date)}</td>
                <td className="font-semibold text-[#173047]">{visit.patient_name || 'Unknown Patient'}<div className="text-xs text-[#5f7184]">{visit.patient_display_id || 'N/A'}</div></td>
                <td>{visit.clinic_name || 'Unknown Clinic'}</td>
                <td>
                  <p className="font-semibold text-[#173047]">{visit.diagnosis || 'N/A'}</p>
                  <div className="mt-2 space-y-1.5">
                    {[...
                      preferredFieldOrder
                        .filter((key) => key in visit)
                        .map((key) => [key, visit[key]] as const),
                      ...Object.entries(visit).filter(
                        ([key]) =>
                          !hiddenFields.has(key) &&
                          key !== 'id' &&
                          !preferredFieldOrder.includes(key)
                      ),
                    ]
                      .filter(([key]) => key !== 'clinic_name' && key !== 'patient_name' && key !== 'patient_display_id' && key !== 'diagnosis')
                      .map(([key, value]) => (
                        <p key={`${visit.id}-${key}`} className="text-xs text-[#5f7184]">
                          <span className="font-semibold text-[#173047]">{toLabel(key)}:</span> {toDisplayValue(value)}
                        </p>
                      ))}
                  </div>
                </td>
                <td>
                  <div className="flex gap-2">
                    <button onClick={() => editVisit(visit)} className="secondary-button inline-flex items-center gap-2 px-4 py-2"><Edit2 className="h-4 w-4" /> Edit</button>
                    <button onClick={() => deleteVisit(visit.id)} className="danger-button inline-flex items-center gap-2 px-4 py-2 rounded-2xl font-bold"><Trash2 className="h-4 w-4" /> Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}