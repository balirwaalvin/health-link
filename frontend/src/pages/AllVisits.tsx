import { useEffect, useState } from 'react';
import { Edit2, Trash2 } from 'lucide-react';
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
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-800">All Visits</h2>

      <div className="flex gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search patient, clinic or diagnosis"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
        />
        <button onClick={() => fetchVisits(search)} className="bg-[#5CA6E2] text-white px-3 rounded-lg">Search</button>
      </div>

      {error && <p className="text-sm text-[#DF3232]">{error}</p>}
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
         <table className="w-full text-left text-sm">
           <thead className="bg-gray-50 text-gray-600">
             <tr>
               <th className="p-3">Date</th>
               <th className="p-3">Patient</th>
               <th className="p-3">Clinic</th>
               <th className="p-3">Diagnosis</th>
                <th className="p-3">Actions</th>
             </tr>
           </thead>
           <tbody className="divide-y divide-gray-100">
             {visits.map((visit) => (
               <tr key={visit.id}>
                 <td className="p-3">{formatDate(visit.visit_date)}</td>
                 <td className="p-3 font-medium">{visit.patient_name || 'Unknown Patient'} ({visit.patient_display_id || 'N/A'})</td>
                 <td className="p-3">{visit.clinic_name || 'Unknown Clinic'}</td>
                 <td className="p-3">
                   <p className="font-medium text-gray-800 mb-1">{visit.diagnosis || 'N/A'}</p>
                   <div className="space-y-1">
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
                         <p key={`${visit.id}-${key}`} className="text-xs text-gray-600">
                           <span className="font-semibold text-gray-700">{toLabel(key)}:</span> {toDisplayValue(value)}
                         </p>
                       ))}
                   </div>
                 </td>
                 <td className="p-3">
                   <div className="flex gap-2">
                     <button onClick={() => editVisit(visit)} className="text-[#5CA6E2]"><Edit2 className="w-4 h-4" /></button>
                     <button onClick={() => deleteVisit(visit.id)} className="text-[#DF3232]"><Trash2 className="w-4 h-4" /></button>
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