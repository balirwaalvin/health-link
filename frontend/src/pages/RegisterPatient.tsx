import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BadgePlus, Mail, ShieldCheck, UserRound, Phone, Sparkles } from 'lucide-react';
import { api, authHeaders, getErrorMessage } from '../lib/api';
import { isTenDigitPhone, normalizePhoneInput } from '../lib/phone';

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
    if (!isTenDigitPhone(form.phone)) {
      setError('Phone number must be exactly 10 digits.');
      return;
    }
    if (!form.email.trim()) {
      setError('Email is required. OTP will be sent to this address.');
      return;
    }

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
    <div className="page-stack">
      <section className="page-hero fade-in-up">
        <p className="page-hero__eyebrow">Patient intake</p>
        <h2 className="page-hero__title">Register patient</h2>
        <p className="page-hero__copy">Create a patient record with a more complete desktop form and a clearer OTP email flow.</p>
      </section>

      {error && <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <div className="split-grid items-start">
        <form onSubmit={handleSubmit} className="surface-card space-y-5 fade-in-up delay-1">
          <div className="info-strip flex items-center gap-3">
            <div className="action-card__icon h-12 w-12">
              <BadgePlus className="h-5 w-5 text-[#1f6feb]" />
            </div>
            <div>
              <p className="font-black tracking-tight text-[#173047]">Display ID auto-generates</p>
              <p className="text-sm text-[#5f7184]">OTP will be sent to the patient's email address.</p>
            </div>
          </div>

          <div>
            <label className="field-label mb-2 block">Full name</label>
            <input
              type="text"
              className="text-field"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="field-label mb-2 block">Phone number</label>
              <input
                type="tel"
                className="text-field"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: normalizePhoneInput(e.target.value) })}
                inputMode="numeric"
                maxLength={10}
                pattern="\d{10}"
                required
              />
            </div>

            <div>
              <label className="field-label mb-2 block">Email</label>
              <input
                type="email"
                className="text-field"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
          </div>

          <button type="submit" disabled={saving} className="primary-button w-full inline-flex items-center justify-center gap-2">
            <ShieldCheck className="h-4 w-4" /> {saving ? 'Registering...' : 'Register patient'}
          </button>
        </form>

        <aside className="surface-card fade-in-up delay-2">
          <p className="section-eyebrow">Preview</p>
          <h3 className="surface-card__title">What gets stored</h3>
          <div className="mini-grid mt-5">
            <div className="mini-card"><UserRound className="h-4 w-4 text-[#1f6feb]" /><p className="mt-2 font-semibold">Patient name and profile</p></div>
            <div className="mini-card"><Phone className="h-4 w-4 text-[#16a34a]" /><p className="mt-2 font-semibold">Phone for contact tracing</p></div>
            <div className="mini-card"><Mail className="h-4 w-4 text-[#ff9f1c]" /><p className="mt-2 font-semibold">Email for OTP delivery</p></div>
          </div>
          <div className="mt-5 rounded-3xl bg-gradient-to-br from-[#1f6feb] to-[#0f355f] p-6 text-white">
            <Sparkles className="h-6 w-6" />
            <p className="mt-4 text-lg font-black tracking-tight">Designed for the web</p>
            <p className="mt-2 text-sm text-white/80">Larger layout, richer spacing, and clearer workflows for desktop usage.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}