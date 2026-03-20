import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { account } from '../lib/appwrite';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      await account.createEmailPasswordSession(email, password);
      const user = await account.get();
      
      localStorage.setItem('token', 'appwrite_session');
      const userRole = user.labels?.includes('admin') ? 'admin' : 'staff';
      localStorage.setItem('role', userRole);
      localStorage.setItem('full_name', user.name || email);
      navigate('/');
    } catch (err: any) {
      setError(err?.message || 'Invalid credentials.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4 pb-12">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-[#5CA6E2] mb-2">Health Link</h1>
          <p className="text-gray-500">Mukono District</p>
        </div>

        {error && <div className="bg-red-100 text-[#DF3232] p-3 rounded mb-4 text-sm">{error}</div>}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input 
              type="email" 
              className="w-full border-gray-300 border rounded-lg p-2 focus:ring-[#5CA6E2]"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input 
              type="password" 
              className="w-full border-gray-300 border rounded-lg p-2 focus:ring-[#5CA6E2]"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="w-full bg-[#5CA6E2] text-white p-3 rounded-lg font-bold hover:bg-blue-600 transition shadow-md">
            Login
          </button>
        </form>

        <div className="mt-6 text-xs text-center text-gray-400">
          <p>Demo accounts (preloaded):</p>
          <p>Admin: admin@healthlink.com / admin123</p>
          <p>Staff: staff@healthlink.com / staff123</p>
        </div>
      </div>

      <div className="fixed bottom-0 w-full left-0 bg-[#DF3232] text-white text-center text-xs py-2 font-semibold shadow-lg z-50">
        PROTOTYPE - NOT FOR REAL MEDICAL USE
      </div>
    </div>
  );
}
