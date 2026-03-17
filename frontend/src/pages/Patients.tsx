import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Search, Plus, Trash2, Edit } from 'lucide-react';

interface Patient {
  id: number;
  display_id: string;
  full_name: string;
  phone: string;
}

export default function Patients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState('');
  const role = localStorage.getItem('role');
  const navigate = useNavigate();

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://127.0.0.1:8000/patients', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPatients(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredPatients = patients.filter(p => 
    p.full_name.toLowerCase().includes(search.toLowerCase()) || 
    p.display_id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative min-h-[80vh]">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Patients</h2>
      
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

      <div className="space-y-3 pb-20">
        {filteredPatients.map(patient => (
          <div key={patient.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center cursor-pointer hover:shadow-md" onClick={() => navigate(`/patients/${patient.id}`)}>
            <div>
              <h3 className="font-bold text-gray-800">{patient.full_name}</h3>
              <p className="text-sm text-gray-500">ID: {patient.display_id} • {patient.phone}</p>
            </div>
            {role === 'admin' && (
              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                <button className="p-2 text-gray-400 hover:text-[#5CA6E2]"><Edit className="w-4 h-4" /></button>
                <button className="p-2 text-gray-400 hover:text-[#DF3232]"><Trash2 className="w-4 h-4" /></button>
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
