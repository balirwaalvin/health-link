import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { account, createOrReplaceEmailPasswordSession } from '../lib/appwrite';
import { brandColors, brandLogoUrl } from '../lib/branding';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      await createOrReplaceEmailPasswordSession(email, password);
      const user = await account.get();
      
      localStorage.setItem('token', 'appwrite_session');
      const userRole = user.labels?.includes('admin') ? 'admin' : 'staff';
      localStorage.setItem('role', userRole);
      localStorage.setItem('full_name', user.name || email);
      navigate('/');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid credentials.';
      setError(message);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-3 sm:p-4 pb-12"
      style={{
        background:
          'radial-gradient(circle at 18% 20%, rgba(92, 166, 226, 0.22) 0%, rgba(92, 166, 226, 0) 40%), radial-gradient(circle at 82% 82%, rgba(223, 50, 50, 0.16) 0%, rgba(223, 50, 50, 0) 38%), #f2f7fc',
      }}
    >
      <div className="relative w-full max-w-sm sm:max-w-md">
        <div
          className="pointer-events-none absolute -inset-1.5 sm:-inset-2.5 rounded-[1.4rem] blur-xl sm:blur-2xl"
          style={{
            background:
              'linear-gradient(135deg, rgba(92,166,226,0.35) 0%, rgba(92,166,226,0.12) 40%, rgba(223,50,50,0.28) 100%)',
          }}
        />

        <div
          className="relative bg-white/95 backdrop-blur-sm p-5 sm:p-8 rounded-[1.25rem] sm:rounded-2xl w-full border border-white/80"
          style={{
            boxShadow:
              '0 0 0 1px rgba(92,166,226,0.2), 0 0 16px rgba(92,166,226,0.18), 0 0 34px rgba(223,50,50,0.12), 0 12px 26px rgba(24, 48, 82, 0.14)',
          }}
        >
          <div className="text-center mb-5 sm:mb-6">
            <div
              className="mx-auto mb-3 w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white p-2 flex items-center justify-center"
              style={{ boxShadow: '0 0 14px rgba(92,166,226,0.34), inset 0 0 10px rgba(223,50,50,0.12)' }}
            >
              <img src={brandLogoUrl} alt="Health Link logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-2xl font-bold mb-2" style={{ color: brandColors.primaryBlue }}>Health Link</h1>
            <p className="text-gray-500">Mukono District</p>
          </div>

          {error && <div className="bg-red-100 text-[#DF3232] p-3 rounded mb-4 text-sm">{error}</div>}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                className="w-full border-gray-300 border rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-[#5CA6E2]/50"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                className="w-full border-gray-300 border rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-[#5CA6E2]/50"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className="w-full text-white p-3 rounded-lg font-bold transition shadow-md hover:brightness-105"
              style={{
                background: 'linear-gradient(90deg, #5CA6E2 0%, #4f95d3 55%, #DF3232 100%)',
              }}
            >
              Login
            </button>
          </form>
        </div>
      </div>

      <div className="fixed bottom-0 w-full left-0 bg-[#DF3232] text-white text-center text-xs py-2 font-semibold shadow-lg z-50">
        PROTOTYPE - NOT FOR REAL MEDICAL USE
      </div>
    </div>
  );
}
