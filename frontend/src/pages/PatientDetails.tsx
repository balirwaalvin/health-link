import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Edit2, Lock, PlusCircle, Trash2 } from 'lucide-react';
import { api, authHeaders, getErrorMessage } from '../lib/api';

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
  const patientId = Number(id);
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
      setOtpMessage(`OTP sent to ${res.data.email_to || 'patient email'} (Prototype code: ${res.data.otp_preview})`);
      setShowOtpInput(true);
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Could not request access.'));
    }
  };

  const verifyOtp = () => {
    if (otp === '48291') {
      setHasAccess(true);
      setOtpMessage('Access granted for this session.');
    } else {
      setOtpMessage('Invalid OTP.');
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
    const phone = window.prompt('Edit phone', patient.phone);
    if (!phone) {
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
    <div className="space-y-4">
      <button onClick={() => navigate(-1)} className="flex items-center text-gray-500 hover:text-gray-800 font-medium mb-2">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back
      </button>

      {error && <p className="text-sm text-[#DF3232]">{error}</p>}

      {patient && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">{patient.full_name}</h2>
              <p className="text-sm text-gray-500 font-mono">{patient.display_id}</p>
            </div>
            {isAdmin && (
              <div className="flex gap-2">
                <button onClick={editPatient} className="p-2 text-[#FFA500] bg-orange-50 rounded-full"><Edit2 className="w-5 h-5" /></button>
                <button onClick={deletePatient} className="p-2 text-[#DF3232] bg-red-50 rounded-full"><Trash2 className="w-5 h-5" /></button>
              </div>
            )}
          </div>

          <div className="text-sm text-gray-600 mb-6 space-y-1">
            <p><span className="font-medium text-gray-700">Phone:</span> {patient.phone}</p>
            <p><span className="font-medium text-gray-700">Email:</span> {patient.email || 'No email'}</p>
          </div>

          {!hasAccess ? (
            <div className="bg-blue-50 p-4 rounded-lg flex flex-col items-center justify-center text-center">
              <Lock className="w-8 h-8 text-[#5CA6E2] mb-2" />
              <h3 className="font-bold text-gray-700 mb-1">Protected Medical History</h3>
              <p className="text-xs text-gray-500 mb-4">Request access to send OTP email (prototype).</p>

              {!showOtpInput ? (
                <button onClick={requestAccess} className="bg-[#5CA6E2] text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-blue-500 transition">
                  Request Access
                </button>
              ) : (
                <div className="w-full max-w-xs space-y-2">
                  <input
                    type="text"
                    placeholder="Enter OTP"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5CA6E2]"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                  />
                  <button onClick={verifyOtp} className="w-full bg-[#318542] text-white px-4 py-2 rounded-lg font-medium text-sm">Verify OTP</button>
                </div>
              )}

              {otpMessage && <p className="text-xs mt-2 text-gray-600">{otpMessage}</p>}
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-800">Visit History</h3>
                <Link to={`/visits/add?patientId=${patient.id}`} className="text-[#318542] hover:text-green-700 p-1 flex items-center gap-1 font-medium text-sm">
                  <PlusCircle className="w-4 h-4" /> Add Visit
                </Link>
              </div>

              <div className="space-y-3">
                {sortedVisits.length === 0 && <p className="text-sm text-gray-500">No visits yet.</p>}
                {sortedVisits.map((visit) => (
                  <div key={visit.id} className="border border-gray-100 rounded-lg p-3 bg-gray-50">
                    <p className="text-xs text-gray-500 font-bold mb-1">
                      {new Date(visit.visit_date).toLocaleDateString()} | {visit.clinic_name}
                    </p>
                    <p className="text-sm text-gray-800"><span className="font-medium">Diagnosis:</span> {visit.diagnosis}</p>
                    <p className="text-sm text-gray-800 mt-1"><span className="font-medium">Prescription:</span> {visit.prescription}</p>
                    {visit.notes && <p className="text-xs text-gray-500 mt-1">Notes: {visit.notes}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
