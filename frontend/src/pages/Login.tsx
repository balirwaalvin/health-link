import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Activity, ArrowRight, HeartPulse, ShieldCheck, Sparkles, Stethoscope } from 'lucide-react';
import { api, getErrorMessage } from '../lib/api';

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
    <div className="auth-shell">
      {isSignedIn ? (
        <Navigate to="/" replace />
      ) : (
        <section className="auth-panel fade-in-up">
          <div className="auth-visual">
            <span className="auth-visual__badge">
              <Sparkles className="h-3.5 w-3.5" />
              Desktop-first care workspace
            </span>
            <h1 className="auth-visual__title">Health Link Mukono</h1>
            <p className="auth-visual__copy">
              A brighter clinical workspace for registering patients, managing visits, and securing medical access with OTP.
            </p>

            <div className="auth-visual__mosaic">
              <div className="mosaic-card">
                <ShieldCheck className="h-5 w-5" />
                <p className="mt-3 text-sm font-semibold">Protected records</p>
                <p className="mt-1 text-xs text-white/75">OTP gate for sensitive patient history.</p>
              </div>
              <div className="mosaic-card">
                <Stethoscope className="h-5 w-5" />
                <p className="mt-3 text-sm font-semibold">Clinical workflows</p>
                <p className="mt-1 text-xs text-white/75">Visits, clinics, and patient records in one place.</p>
              </div>
              <div className="mosaic-card">
                <HeartPulse className="h-5 w-5" />
                <p className="mt-3 text-sm font-semibold">Better visibility</p>
                <p className="mt-1 text-xs text-white/75">Structured data with clearer cards and tables.</p>
              </div>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="chip chip--blue justify-center text-white/95">
                <Activity className="h-3.5 w-3.5" />
                Responsive
              </div>
              <div className="chip chip--green justify-center text-white/95">
                <ShieldCheck className="h-3.5 w-3.5" />
                Secure
              </div>
              <div className="chip chip--amber justify-center text-white/95">
                <Sparkles className="h-3.5 w-3.5" />
                Animated
              </div>
            </div>
          </div>

          <div className="auth-form">
            <div className="mb-6">
              <p className="page-hero__eyebrow">Sign in</p>
              <h2 className="text-3xl font-black tracking-tight text-gray-900">Access the workspace</h2>
              <p className="mt-2 text-sm text-gray-600">Use your staff or admin credentials to continue.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="field-label mb-2 block" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="text-field"
                />
              </div>

              <div>
                <label className="field-label mb-2 block" htmlFor="password">
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
                    className="text-field pr-20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-3 text-xs font-bold text-[#0f4fc3] hover:text-[#0d4fc2]"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              {error && <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

              <button type="submit" disabled={submitting} className="primary-button w-full">
                <span className="inline-flex items-center justify-center gap-2">
                  {submitting ? 'Signing in...' : 'Enter dashboard'}
                  <ArrowRight className="h-4 w-4" />
                </span>
              </button>
            </form>
          </div>
        </section>
      )}
    </div>
  );
}
