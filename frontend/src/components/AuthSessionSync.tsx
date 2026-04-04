import { useEffect } from 'react';

function resolveApiBaseUrl() {
  const envUrl = String(import.meta.env.VITE_API_URL || '').trim();
  const isLocalRuntime =
    typeof window !== 'undefined' &&
    ['localhost', '127.0.0.1'].includes(window.location.hostname);

  if (!envUrl || (isLocalRuntime && envUrl.includes('example.com'))) {
    return 'http://localhost:8000';
  }

  return envUrl;
}

const apiBaseUrl = resolveApiBaseUrl();

export default function AuthSessionSync() {
  useEffect(() => {
    const sync = async () => {
      const token = localStorage.getItem('session_token');
      if (!token) {
        localStorage.removeItem('token');
        localStorage.removeItem('session_token');
        localStorage.removeItem('role');
        localStorage.removeItem('full_name');
        return;
      }

      localStorage.setItem('token', token);
      try {
        const response = await fetch(`${apiBaseUrl}/api/auth/user`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          localStorage.setItem('role', data.role || 'staff');
          localStorage.setItem('full_name', data.name || data.email || 'User');
          return;
        }
      } catch {
        // If API is temporarily unavailable, keep local session as-is.
      }

      localStorage.removeItem('token');
      localStorage.removeItem('session_token');
      localStorage.removeItem('role');
      localStorage.removeItem('full_name');
    };

    void sync();
  }, []);

  return null;
}
