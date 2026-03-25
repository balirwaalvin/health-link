import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { brandLogoUrl } from '../lib/branding';

export default function Layout() {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role') || 'staff';
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const navItems = [
    { to: '/', label: 'Dashboard' },
    { to: '/patients', label: 'Patients' },
    { to: '/about', label: 'About' },
  ];

  if (role === 'staff') {
    navItems.splice(2, 0, { to: '/visits/add', label: 'Add Visit' });
    navItems.splice(3, 0, { to: '/patients/register', label: 'Register' });
  }

  if (role === 'admin') {
    navItems.splice(4, 0, { to: '/clinics', label: 'Clinics' });
    navItems.splice(5, 0, { to: '/visits', label: 'All Visits' });
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 pb-12">
      <header className="bg-[#5CA6E2] text-white p-4 shadow-md flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 sm:h-14 sm:w-14 bg-white rounded-lg p-1.5 shadow-sm">
            <img src={brandLogoUrl} alt="Health Link logo" className="h-full w-full object-contain" />
          </div>
          <div>
          <h1 className="text-xl font-bold">Health Link Mukono</h1>
          <p className="text-xs opacity-90">Role: {role}</p>
          </div>
        </div>
        <button 
          onClick={async () => {
            try {
              const { account } = await import('../lib/appwrite');
              await account.deleteSession('current');
            } catch {
              // Continue logout cleanup even if session deletion fails.
            }
            localStorage.removeItem('token');
            localStorage.removeItem('role');
            localStorage.removeItem('full_name');
            window.location.href = '/login';
          }}
          className="text-sm bg-white/20 px-3 py-1 rounded hover:bg-white/30"
        >
          Logout
        </button>
      </header>

      <nav className="bg-white border-b border-gray-200 px-2 py-2 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {navItems.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                  active
                    ? 'bg-[#5CA6E2] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <main className="flex-1 p-4 max-w-md mx-auto w-full">
        <Outlet />
      </main>

      <div className="fixed bottom-0 w-full bg-[#DF3232] text-white text-center text-xs py-2 font-semibold shadow-lg z-50">
        PROTOTYPE - NOT FOR REAL MEDICAL USE
      </div>
    </div>
  );
}
