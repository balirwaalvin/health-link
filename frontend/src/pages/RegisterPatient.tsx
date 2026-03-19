import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, authHeaders, getErrorMessage } from '../lib/api';

export default function RegisterPatient() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    email: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError('');
      const res = await api.post('/patients', form, { headers: authHeaders() });
      navigate(`/patients/${res.data.id}`);
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Registration failed.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-800">Register Patient</h2>

      {error && <p className="text-sm text-[#DF3232]">{error}</p>}

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
        <div className="bg-blue-50 text-[#5CA6E2] p-3 rounded-lg text-sm font-medium text-center mb-4 border border-blue-100">
          Display ID auto-generates (MKN-001 format)
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
          <input
            type="text"
            className="w-full border-gray-300 border rounded-lg p-2 focus:ring-[#5CA6E2]"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
          <input
            type="tel"
            className="w-full border-gray-300 border rounded-lg p-2 focus:ring-[#5CA6E2]"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            className="w-full border-gray-300 border rounded-lg p-2 focus:ring-[#5CA6E2]"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-[#318542] text-white p-3 rounded-lg font-bold hover:bg-green-700 transition shadow-md disabled:bg-gray-400"
        >
          {saving ? 'Registering...' : 'Register'}
        </button>
      </form>
    </div>
  );
}