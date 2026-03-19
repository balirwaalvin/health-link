import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building, PlusCircle, UserPlus, Users } from 'lucide-react';
import { api, authHeaders } from '../lib/api';

interface Stats {
  patients: number;
  visits: number;
  clinics: number;
  role: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState('');
  const role = localStorage.getItem('role') || 'staff';
  const name = localStorage.getItem('full_name') || 'User';
  const isAdmin = role === 'admin';

  useEffect(() => {
    const loadStats = async () => {
      try {
        const res = await api.get('/dashboard/stats', { headers: authHeaders() });
        setStats(res.data);
      } catch {
        setError('Could not load dashboard stats.');
      }
    };

    loadStats();
  }, []);

  return (
    <div className="space-y-5">
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-800">Welcome, {name}</h2>
        <p className="text-sm text-gray-500">Quick access to core workflows.</p>
      </div>

      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-lg p-3 border border-gray-200 text-center">
            <p className="text-xs text-gray-500">Patients</p>
            <p className="text-xl font-bold text-[#5CA6E2]">{stats.patients}</p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-gray-200 text-center">
            <p className="text-xs text-gray-500">Visits</p>
            <p className="text-xl font-bold text-[#318542]">{stats.visits}</p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-gray-200 text-center">
            <p className="text-xs text-gray-500">Clinics</p>
            <p className="text-xl font-bold text-[#FFA500]">{stats.clinics}</p>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-[#DF3232]">{error}</p>}

      <div className="grid grid-cols-2 gap-4">
        <Link to="/patients" className="flex flex-col items-center justify-center bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition border border-gray-100 group">
          <div className="bg-blue-100 p-3 rounded-full mb-3 group-hover:bg-[#5CA6E2] group-hover:text-white transition">
            <Users className="w-8 h-8 text-[#5CA6E2] group-hover:text-white" />
          </div>
          <span className="font-medium text-gray-700">Patients</span>
        </Link>

        <Link to="/visits/add" className="flex flex-col items-center justify-center bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition border border-gray-100 group">
          <div className="bg-green-100 p-3 rounded-full mb-3 group-hover:bg-[#318542] group-hover:text-white transition">
            <PlusCircle className="w-8 h-8 text-[#318542] group-hover:text-white" />
          </div>
          <span className="font-medium text-gray-700">Add Visit</span>
        </Link>

        <Link to="/patients/register" className="flex flex-col items-center justify-center bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition border border-gray-100 group col-span-2">
          <div className="bg-blue-100 p-3 rounded-full mb-3 group-hover:bg-[#5CA6E2] group-hover:text-white transition">
            <UserPlus className="w-8 h-8 text-[#5CA6E2] group-hover:text-white" />
          </div>
          <span className="font-medium text-gray-700">Register New Patient</span>
        </Link>

        {isAdmin && (
          <>
            <Link to="/clinics" className="flex flex-col items-center justify-center bg-[#FFA500] text-white p-6 rounded-xl shadow-sm hover:bg-orange-500 transition col-span-1">
              <Building className="w-8 h-8 mb-3" />
              <span className="font-medium text-center">Clinics Management</span>
            </Link>
            <Link to="/visits" className="flex flex-col items-center justify-center bg-[#5CA6E2] text-white p-6 rounded-xl shadow-sm hover:bg-blue-500 transition col-span-1">
              <span className="font-bold text-2xl mb-3">All</span>
              <span className="font-medium text-center">All Visits</span>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
