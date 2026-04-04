import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Edit2, Lock, Mail, Phone, PlusCircle, Shield, Trash2, UserRound } from 'lucide-react';
import { api, authHeaders, getErrorMessage } from '../lib/api';
import { isTenDigitPhone, normalizePhoneInput } from '../lib/phone';

interface Patient {
  id: number;
  display_id: string;
  full_name: string;
  phone: string;
  email?: string;
}

interface Visit {
  id: number;
  diagnosis: string;
  prescription: string;
  notes?: string;
  visit_date: string;
  clinic_name: string;
}

export default function PatientDetails() {
  const { id } = useParams();
  const patientId = id || '';
  const role = localStorage.getItem('role') || 'staff';
  const isAdmin = role === 'admin';
  const navigate = useNavigate();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [error, setError] = useState('');
  const [hasAccess, setHasAccess] = useState(false);
  const [otp, setOtp] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otpMessage, setOtpMessage] = useState('');

  const loadPatientData = useCallback(async () => {
    if (!patientId) {
      return;
    }
    try {
      setError('');
      const [patientRes, visitsRes] = await Promise.all([
        api.get(`/patients/${patientId}`, { headers: authHeaders() }),
        api.get(`/patients/${patientId}/visits`, { headers: authHeaders() }),
      ]);
      setPatient(patientRes.data);
      setVisits(visitsRes.data);
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Failed to load patient details.'));
    }
  }, [patientId]);

  useEffect(() => {
    if (!patientId) {
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadPatientData();
  }, [patientId, loadPatientData]);

  const requestAccess = async () => {
    try {
      const res = await api.post(`/patients/${patientId}/request-access`, {}, { headers: authHeaders() });
      setOtpMessage(res.data?.message || `OTP sent to ${res.data.email_to || 'patient email'}.`);
      setShowOtpInput(true);
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Could not request access.'));
    }
  };

  const verifyOtp = async () => {
    try {
      const res = await api.post(
        `/patients/${patientId}/verify-access`,
        { otp },
        { headers: authHeaders() }
      );
      setHasAccess(Boolean(res.data?.access_granted));
      setOtpMessage(res.data?.message || 'OTP verification complete.');
    } catch (error: unknown) {
      setOtpMessage(getErrorMessage(error, 'Could not verify OTP.'));
    }
  };

  const sortedVisits = useMemo(
    () => [...visits].sort((a, b) => new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime()),
    [visits]
  );

  const editPatient = async () => {
    if (!patient) {
      return;
    }
    const fullName = window.prompt('Edit full name', patient.full_name);
    if (!fullName) {
      return;
    }
    const phoneInput = window.prompt('Edit phone (10 digits)', patient.phone);
    const phone = normalizePhoneInput(phoneInput || '');
    if (!phone) {
      return;
    }
    if (!isTenDigitPhone(phone)) {
      setError('Phone number must be exactly 10 digits.');
      return;
    }
    const email = window.prompt('Edit email', patient.email || '');

    try {
      await api.put(
        `/patients/${patient.id}`,
        { full_name: fullName, phone, email },
        { headers: authHeaders() }
      );
      loadPatientData();
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Edit failed.'));
    }
  };

  const deletePatient = async () => {
    if (!patient) {
      return;
    }
    const yes = window.confirm('Delete patient and all linked visits?');
    if (!yes) {
      return;
    }
    try {
      await api.delete(`/patients/${patient.id}`, { headers: authHeaders() });
      navigate('/patients');
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Delete failed.'));
    }
  };

  return (
    <div className="page-stack">
      <button onClick={() => navigate(-1)} className="secondary-button inline-flex w-fit items-center gap-2">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {error && <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      {patient && (
        <div className="split-grid items-start">
          <section className="surface-card fade-in-up">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="section-eyebrow">Patient record</p>
                <h2 className="text-3xl font-black tracking-tight text-[#173047]">{patient.full_name}</h2>
                <p className="mt-1 text-sm text-[#5f7184] font-mono">{patient.display_id}</p>
              </div>
              {isAdmin && (
                <div className="flex gap-2">
                  <button onClick={editPatient} className="secondary-button inline-flex items-center gap-2 px-4 py-2">
                    <Edit2 className="h-4 w-4" /> Edit
                  </button>
                  <button onClick={deletePatient} className="danger-button inline-flex items-center gap-2 px-4 py-2 rounded-2xl font-bold">
                    <Trash2 className="h-4 w-4" /> Delete
                  </button>
                </div>
              )}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="chip chip--blue">
                <UserRound className="h-3.5 w-3.5" /> {patient.full_name}
              </div>
              <div className="chip chip--green">
                <Phone className="h-3.5 w-3.5" /> {patient.phone}
              </div>
              <div className="chip chip--amber">
                <Mail className="h-3.5 w-3.5" /> {patient.email || 'No email'}
              </div>
            </div>

            {!hasAccess ? (
              <div className="field-card mt-6 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-[#1f6feb]">
                  <Lock className="h-8 w-8" />
                </div>
                <h3 className="mt-4 text-xl font-black tracking-tight text-[#173047]">Protected medical history</h3>
                <p className="mt-2 text-sm text-[#5f7184]">OTP verification unlocks the visit timeline and hidden notes.</p>

                {!showOtpInput ? (
                  <button onClick={requestAccess} className="primary-button mt-5 inline-flex items-center gap-2">
                    <Shield className="h-4 w-4" /> Request access
                  </button>
                ) : (
                  <div className="mx-auto mt-5 w-full max-w-sm space-y-3">
                    <input
                      type="text"
                      placeholder="Enter OTP"
                      className="text-field"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                    />
                    <button onClick={verifyOtp} className="primary-button w-full inline-flex items-center justify-center gap-2">
                      <CheckCircle2 className="h-4 w-4" /> Verify OTP
                    </button>
                  </div>
                )}

                {otpMessage && <p className="mt-4 text-sm text-[#5f7184]">{otpMessage}</p>}
              </div>
            ) : (
              <div className="mt-6">
                <div className="surface-card__header">
                  <div>
                    <p className="section-eyebrow">Records</p>
                    <h3 className="surface-card__title">Visit history</h3>
                  </div>
                  {!isAdmin && (
                    <Link to={`/visits/add?patientId=${patient.id}`} className="secondary-button inline-flex items-center gap-2 px-4 py-2">
                      <PlusCircle className="h-4 w-4" /> Add visit
                    </Link>
                  )}
                </div>

                <div className="mini-grid">
                  {sortedVisits.length === 0 && <div className="empty-state text-center">No visits yet.</div>}
                  {sortedVisits.map((visit) => (
                    <div key={visit.id} className="timeline-card">
                      <p className="meta-label">{new Date(visit.visit_date).toLocaleDateString()} | {visit.clinic_name}</p>
                      <p className="mt-2 text-lg font-black tracking-tight text-[#173047]"><span className="text-[#5f7184] font-semibold">Diagnosis:</span> {visit.diagnosis}</p>
                      <p className="mt-1 text-sm text-[#173047]"><span className="font-semibold text-[#5f7184]">Prescription:</span> {visit.prescription}</p>
                      {visit.notes && <p className="mt-2 text-sm text-[#5f7184]">Notes: {visit.notes}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <aside className="surface-card fade-in-up delay-1">
            <p className="section-eyebrow">Snapshot</p>
            <h3 className="surface-card__title">Patient at a glance</h3>
            <p className="section-copy">The record card has been expanded for a web-app feel with clearer hierarchy, status chips, and richer detail surfaces.</p>
            <div className="mt-5 mini-grid">
              <div className="mini-card">
                <p className="mini-card__label">Access</p>
                <p className="mt-2 text-lg font-black tracking-tight text-[#16a34a]">{hasAccess ? 'Unlocked' : 'Locked'}</p>
              </div>
              <div className="mini-card">
                <p className="mini-card__label">Visit count</p>
                <p className="mt-2 text-lg font-black tracking-tight text-[#1f6feb]">{sortedVisits.length}</p>
              </div>
              <div className="mini-card">
                <p className="mini-card__label">Email</p>
                <p className="mt-2 text-sm font-semibold text-[#173047]">{patient.email || 'No email'}</p>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
