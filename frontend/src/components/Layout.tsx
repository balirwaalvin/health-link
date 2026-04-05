import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Activity, CalendarPlus2, ClipboardList, Home, Info, LogOut, ShieldCheck, Stethoscope, Users, Hospital } from 'lucide-react';
import { brandLogoUrl } from '../lib/branding';
import { signOutFromBackend } from '../lib/auth';

export default function Layout() {
  const navigate = useNavigate();
  const isSignedIn = Boolean(localStorage.getItem('session_token'));
  const role = localStorage.getItem('role') || 'staff';
  const location = useLocation();

  const handleLogout = async () => {
    await signOutFromBackend();
    localStorage.removeItem('token');
    localStorage.removeItem('session_token');
    localStorage.removeItem('role');
    localStorage.removeItem('full_name');
    sessionStorage.clear();
    navigate('/login', { replace: true });
  };

  if (!isSignedIn) {
    return <Navigate to="/login" replace />;
  }

  const navItems = [
    { to: '/', label: 'Dashboard', icon: Home },
    { to: '/patients', label: 'Patients', icon: Users },
    { to: '/about', label: 'About', icon: Info },
  ];

  if (role === 'staff') {
    navItems.splice(2, 0, { to: '/visits/add', label: 'Add Visit', icon: CalendarPlus2 });
    navItems.splice(3, 0, { to: '/patients/register', label: 'Register', icon: ShieldCheck });
  }

  if (role === 'admin') {
    navItems.splice(4, 0, { to: '/clinics', label: 'Clinics', icon: Hospital });
    navItems.splice(5, 0, { to: '/visits', label: 'All Visits', icon: ClipboardList });
  }

  return (
    <div className="app-shell">
      <div className="app-shell__backdrop" aria-hidden="true">
        <div className="app-shell__grid" />
        <div className="app-shell__orb app-shell__orb--blue" />
        <div className="app-shell__orb app-shell__orb--orange" />
      </div>

      <div className="desktop-shell relative z-10">
        <aside className="desktop-sidebar">
          <div className="brand-lockup">
            <div className="brand-lockup__mark">
              <img src={brandLogoUrl} alt="Health Link logo" className="h-full w-full object-contain" />
            </div>
            <div>
              <h1 className="brand-lockup__title">Health Link Mukono</h1>
              <p className="brand-lockup__subtitle">Cross-clinic care records, OTP-secured access.</p>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <span className="role-chip">Role: {role}</span>
            <span className="status-chip">
              <Activity className="h-3.5 w-3.5" />
              Live system
            </span>
          </div>

          <nav className="nav-stack" aria-label="Primary">
            {navItems.map((item) => {
              const active = location.pathname === item.to;
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`nav-pill ${active ? 'nav-pill--active' : ''}`}
                >
                  <Icon className="nav-pill__icon h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="sidebar-panel">
            <p className="sidebar-panel__title">Workflow</p>
            <p className="sidebar-panel__text">
              Register patients, unlock records with OTP, and manage clinics from a clearer desktop workspace.
            </p>
          </div>

          <button
            onClick={() => {
              void handleLogout();
            }}
            className="logout-button mt-4 w-full"
          >
            <span className="inline-flex items-center justify-center gap-2">
              <LogOut className="h-4 w-4" />
              Logout
            </span>
          </button>
        </aside>

        <div className="content-shell">
          <div className="topbar">
            <div>
              <div className="topbar__title">
                <Stethoscope className="h-5 w-5 text-[#1f6feb]" />
                <div>
                  <h1>Health Link Workspace</h1>
                  <p className="topbar__meta">Desktop-first operations dashboard for clinical teams.</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                void handleLogout();
              }}
              className="logout-button hidden md:inline-flex"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>

          <div className="mt-4 top-nav md:hidden">
            {navItems.map((item) => {
              const active = location.pathname === item.to;
              const Icon = item.icon;
              return (
                <Link key={item.to} to={item.to} className={`top-nav__pill ${active ? 'top-nav__pill--active' : ''}`}>
                  <Icon className="h-4 w-4 inline" /> {item.label}
                </Link>
              );
            })}
          </div>

          <main className="page-frame">
            <Outlet />
          </main>
        </div>
      </div>

      <div className="prototype-banner">PROTOTYPE - NOT FOR REAL MEDICAL USE</div>
    </div>
  );
}
