import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api, getErrorMessage } from '../lib/api';
import { brandColors } from '../lib/branding';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setSubmitting(true);
    setError(null);

    try {
      const response = await api.post('/auth/login', {
        email: email.trim(),
        password,
      });

      const token = response?.data?.access_token;
      if (!token) {
        setError('Login did not return an access token.');
        return;
      }

      localStorage.setItem('token', token);
      localStorage.setItem('session_token', token);
      localStorage.setItem('role', response.data?.role || 'staff');
      localStorage.setItem('full_name', response.data?.name || response.data?.email || 'User');

      navigate('/', { replace: true });
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Invalid email or password.'));
    } finally {
      setSubmitting(false);
    }
  };

  const isSignedIn = Boolean(localStorage.getItem('session_token'));

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-3 sm:p-4 pb-12"
      style={{
        background:
          'radial-gradient(circle at 18% 20%, rgba(92, 166, 226, 0.22) 0%, rgba(92, 166, 226, 0) 40%), radial-gradient(circle at 82% 82%, rgba(223, 50, 50, 0.16) 0%, rgba(223, 50, 50, 0) 38%), #f2f7fc',
      }}
    >
      {isSignedIn ? (
        <Navigate to="/" replace />
      ) : (
        <div className="w-full max-w-sm sm:max-w-md">
          <h1 className="text-2xl font-bold text-center mb-4" style={{ color: brandColors.primaryBlue }}>
            Health Link
          </h1>
          <div className="shadow-xl border border-white/80 rounded-2xl bg-white p-5 sm:p-6">
            <h2 className="text-lg font-semibold mb-1" style={{ color: brandColors.primaryBlue }}>
              Sign in
            </h2>
            <p className="text-sm text-gray-600 mb-4">Use your email and password.</p>

              <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5CA6E2]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="password">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-16 text-sm focus:outline-none focus:ring-2 focus:ring-[#5CA6E2]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-2 text-xs font-medium text-[#155A8A] hover:text-[#0F4A72] focus:outline-none"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-[#5CA6E2] text-white py-2.5 text-sm font-semibold disabled:opacity-60"
              >
                {submitting ? 'Signing in...' : 'Sign in'}
              </button>
              </form>
          </div>
        </div>
      )}
    </div>
  );
}
