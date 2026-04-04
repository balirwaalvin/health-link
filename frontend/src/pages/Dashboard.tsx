import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, ChevronRight, Clock3, PlusCircle, Sparkles, UserPlus, Users, Activity, ClipboardList } from 'lucide-react';
import { api, authHeaders } from '../lib/api';

interface Stats {
  patients: number;
  visits: number;
  clinics: number;
  role: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState('');
  const role = localStorage.getItem('role') || 'staff';
  const name = localStorage.getItem('full_name') || 'User';
  const isAdmin = role === 'admin';

  useEffect(() => {
    const loadStats = async () => {
      try {
        const res = await api.get('/dashboard/stats', { headers: authHeaders() });
        setStats(res.data);
      } catch {
        setError('Could not load dashboard stats.');
      }
    };

    loadStats();
  }, []);

  return (
    <div className="page-stack">
      <section className="page-hero fade-in-up">
        <div className="hero-grid items-center">
          <div>
            <p className="page-hero__eyebrow">Command center</p>
            <h2 className="page-hero__title">Welcome back, {name}</h2>
            <p className="page-hero__copy">
              Move through the clinic workspace with clearer analytics, stronger visual hierarchy, and faster access to high-value actions.
            </p>
            <div className="page-hero__actions">
              <Link to="/patients" className="primary-button inline-flex items-center gap-2">
                Open patients <ChevronRight className="h-4 w-4" />
              </Link>
              <Link to="/about" className="secondary-button inline-flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Explore workspace
              </Link>
            </div>
          </div>

          <div className="feature-grid">
            <div className="mini-card">
              <div className="flex items-center justify-between">
                <span className="chip chip--blue">Real-time</span>
                <Clock3 className="h-4 w-4 text-[#1f6feb]" />
              </div>
              <p className="mt-4 text-lg font-black tracking-tight">Desktop-ready workflows</p>
              <p className="mini-card__copy">Clearer forms, wider layouts, and richer data surfaces for staff.</p>
            </div>
            <div className="mini-card">
              <div className="flex items-center justify-between">
                <span className="chip chip--green">Protected</span>
                <Activity className="h-4 w-4 text-[#16a34a]" />
              </div>
              <p className="mt-4 text-lg font-black tracking-tight">OTP-secured access</p>
              <p className="mini-card__copy">Patient records remain gated until verification succeeds.</p>
            </div>
            <div className="mini-card">
              <div className="flex items-center justify-between">
                <span className="chip chip--amber">Structured</span>
                <Building2 className="h-4 w-4 text-[#ff9f1c]" />
              </div>
              <p className="mt-4 text-lg font-black tracking-tight">Clinic-wide visibility</p>
              <p className="mini-card__copy">Centralized patient, visit, and clinic operations.</p>
            </div>
          </div>
        </div>
      </section>

      {stats && (
        <div className="stats-grid fade-in-up delay-1">
          <div className="stat-card">
            <p className="stat-card__label">Patients</p>
            <div className="stat-card__value text-[#1f6feb]">{stats.patients}</div>
            <p className="stat-card__footnote">Registered patient records in the system.</p>
          </div>
          <div className="stat-card">
            <p className="stat-card__label">Visits</p>
            <div className="stat-card__value text-[#16a34a]">{stats.visits}</div>
            <p className="stat-card__footnote">Recorded encounters and follow-ups.</p>
          </div>
          <div className="stat-card">
            <p className="stat-card__label">Clinics</p>
            <div className="stat-card__value text-[#ff9f1c]">{stats.clinics}</div>
            <p className="stat-card__footnote">Active clinics collaborating in the network.</p>
          </div>
          <div className="stat-card">
            <p className="stat-card__label">Role</p>
            <div className="stat-card__value text-[#0f4fc3]">{stats.role}</div>
            <p className="stat-card__footnote">Current signed-in access level.</p>
          </div>
        </div>
      )}

      {error && <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <section className="content-grid fade-in-up delay-2">
        <div className="surface-card">
          <div className="surface-card__header">
            <div>
              <p className="section-eyebrow">Quick actions</p>
              <h3 className="surface-card__title">Start a workflow</h3>
            </div>
          </div>

          <div className="action-grid">
            <Link to="/patients" className="action-card">
              <div className="action-card__icon">
                <Users className="h-6 w-6 text-[#1f6feb]" />
              </div>
              <div>
                <h4 className="action-card__title">Browse Patients</h4>
                <p className="action-card__copy">Find records, open profiles, and continue care quickly.</p>
              </div>
            </Link>

            <Link to="/visits/add" className="action-card">
              <div className="action-card__icon">
                <PlusCircle className="h-6 w-6 text-[#16a34a]" />
              </div>
              <div>
                <h4 className="action-card__title">Log a Visit</h4>
                <p className="action-card__copy">Capture diagnosis and treatment in a cleaner form.</p>
              </div>
            </Link>

            <Link to="/patients/register" className="action-card">
              <div className="action-card__icon">
                <UserPlus className="h-6 w-6 text-[#1f6feb]" />
              </div>
              <div>
                <h4 className="action-card__title">Register Patient</h4>
                <p className="action-card__copy">Create a patient account with a visible email trail.</p>
              </div>
            </Link>

            {isAdmin && (
              <>
                <Link to="/clinics" className="action-card">
                  <div className="action-card__icon">
                    <Building2 className="h-6 w-6 text-[#ff9f1c]" />
                  </div>
                  <div>
                    <h4 className="action-card__title">Clinics</h4>
                    <p className="action-card__copy">Manage clinic records, addresses, and contact details.</p>
                  </div>
                </Link>

                <Link to="/visits" className="action-card">
                  <div className="action-card__icon">
                    <ClipboardList className="h-6 w-6 text-[#0f4fc3]" />
                  </div>
                  <div>
                    <h4 className="action-card__title">All Visits</h4>
                    <p className="action-card__copy">Review the broader visit history across clinics.</p>
                  </div>
                </Link>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
