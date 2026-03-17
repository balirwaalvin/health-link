import { Link } from 'react-router-dom';
import { Users, PlusCircle, UserPlus, Building } from 'lucide-react';

export default function Dashboard() {
  const role = localStorage.getItem('role') || 'staff';
  const isAdmin = role === 'admin';

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-800">Welcome Back</h2>
        <p className="text-gray-500">What would you like to do today?</p>
      </div>

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
          <div className="bg-purple-100 p-3 rounded-full mb-3 group-hover:bg-purple-500 group-hover:text-white transition">
            <UserPlus className="w-8 h-8 text-purple-500 group-hover:text-white" />
          </div>
          <span className="font-medium text-gray-700">Register New Patient</span>
        </Link>

        {isAdmin && (
          <Link to="/clinics" className="flex flex-col items-center justify-center bg-[#5CA6E2] text-white p-6 rounded-xl shadow-sm hover:bg-blue-500 transition col-span-2">
            <Building className="w-8 h-8 mb-3" />
            <span className="font-medium">Clinics Management</span>
          </Link>
        )}
      </div>
    </div>
  );
}
