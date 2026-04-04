/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import axios from 'axios';

function resolveApiBaseUrl() {
  const envUrl = String(import.meta.env.VITE_API_URL || '').trim();
  const isLocalRuntime =
    typeof window !== 'undefined' &&
    ['localhost', '127.0.0.1'].includes(window.location.hostname);

  // Avoid using placeholder production hosts while running locally.
  if (!envUrl || (isLocalRuntime && envUrl.includes('example.com'))) {
    return 'http://localhost:8000';
  }

  return envUrl;
}

const API_BASE_URL = resolveApiBaseUrl();

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

function toApiPath(url: string): string {
  if (url.startsWith('/api/')) {
    return url;
  }
  return `/api${url}`;
}

apiClient.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('clerk_token') || localStorage.getItem('session_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function getStorageKey(patientId: string, role: string) {
  return `otp-session:${patientId}:${role}`;
}

function setOtpSession(patientId: string, role: string, token: string) {
  const payload = {
    token,
    expiresAt: Date.now() + 15 * 60 * 1000,
  };
  sessionStorage.setItem(getStorageKey(patientId, role), JSON.stringify(payload));
}

function clearOtpSession(patientId: string, role: string) {
  sessionStorage.removeItem(getStorageKey(patientId, role));
}

export const api = {
  get: async (url: string, config?: any) => {
    try {
      if (url === '/dashboard/stats') {
        const [patientsRes, clinicsRes, visitsRes] = await Promise.all([
          apiClient.get('/api/patients?limit=5000'),
          apiClient.get('/api/clinics?limit=5000'),
          apiClient.get('/api/visits?limit=5000'),
        ]);
        return {
          data: {
            patients: Array.isArray(patientsRes.data) ? patientsRes.data.length : 0,
            clinics: Array.isArray(clinicsRes.data) ? clinicsRes.data.length : 0,
            visits: Array.isArray(visitsRes.data) ? visitsRes.data.length : 0,
            role: localStorage.getItem('role') || 'staff',
          },
        };
      }

      const res = await apiClient.get(toApiPath(url), config);

      if (url === '/visits' && config?.params?.search && Array.isArray(res.data)) {
        const searchValue = String(config.params.search).trim().toLowerCase();
        const filtered = res.data.filter((visit: any) =>
          [visit.patient_name, visit.patient_display_id, visit.clinic_name, visit.diagnosis]
            .map((value) => (value || '').toString().toLowerCase())
            .some((value) => value.includes(searchValue))
        );
        return { data: filtered };
      }

      return { data: res.data };
    } catch (error: any) {
      console.error(`API GET ${url} failed:`, error);
      throw error;
    }
  },

  post: async (url: string, data?: any, _config?: any) => {
    try {
      if (url.match(/^\/patients\/(.+)\/request-access$/)) {
        const patientId = url.split('/')[2];
        const res = await apiClient.post(toApiPath(url), data);
        const role = localStorage.getItem('role') || 'staff';
        setOtpSession(patientId, role, 'otp-sent');
        return {
          data: {
            message: res.data?.message || 'Verification email sent. Check your inbox.',
            email_to: res.data?.email || '',
            otp_preview: res.data?.otp_preview,
            valid_minutes: res.data?.valid_minutes || 5,
          },
        };
      }

      if (url.match(/^\/patients\/(.+)\/verify-access$/)) {
        const patientId = url.split('/')[2];
        const role = localStorage.getItem('role') || 'staff';
        const res = await apiClient.post(toApiPath(url), data);
        if (res.data?.access_granted) {
          clearOtpSession(patientId, role);
        }
        return { data: res.data };
      }

      const res = await apiClient.post(toApiPath(url), data);
      return { data: res.data };
    } catch (error: any) {
      console.error(`API POST ${url} failed:`, error);
      throw error;
    }
  },

  put: async (url: string, data?: any, _config?: any) => {
    try {
      const res = await apiClient.put(toApiPath(url), data);
      return { data: res.data };
    } catch (error: any) {
      console.error(`API PUT ${url} failed:`, error);
      throw error;
    }
  },

  delete: async (url: string, _config?: any) => {
    try {
      const res = await apiClient.delete(toApiPath(url));
      return { data: res.data };
    } catch (error: any) {
      console.error(`API DELETE ${url} failed:`, error);
      throw error;
    }
  },
};

export function authHeaders() {
  return {};
}

export function getErrorMessage(error: any, fallback: string) {
  if (error?.response?.data?.detail) {
    return String(error.response.data.detail);
  }
  return error?.message || fallback;
}
