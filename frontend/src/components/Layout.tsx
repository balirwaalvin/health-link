import { Outlet, Navigate } from 'react-router-dom';

export default function Layout() {
  const token = localStorage.getItem('token');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 pb-12">
      <header className="bg-[#5CA6E2] text-white p-4 shadow-md flex justify-between items-center">
        <h1 className="text-xl font-bold">Health Link Mukono</h1>
        <button 
          onClick={() => {
            localStorage.removeItem('token');
            localStorage.removeItem('role');
            window.location.href = '/login';
          }}
          className="text-sm bg-white/20 px-3 py-1 rounded hover:bg-white/30"
        >
          Logout
        </button>
      </header>

      <main className="flex-1 p-4 max-w-md mx-auto w-full">
        <Outlet />
      </main>

      {/* Persistent Disclaimer */}
      <div className="fixed bottom-0 w-full bg-[#DF3232] text-white text-center text-xs py-2 font-semibold shadow-lg z-50">
        ⚠️ PROTOTYPE — NOT FOR REAL MEDICAL USE
      </div>
    </div>
  );
}
