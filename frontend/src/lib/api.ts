import axios from 'axios';
import { mockApi } from './mockApi';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true';

// Mock API interceptor
class MockInterceptor {
  async get(url: string, config?: any) {
    if (url === '/dashboard/stats') return mockApi.getDashboardStats();
    if (url === '/patients') return mockApi.getPatients();
    if (url.match(/^\/patients\/\d+$/)) {
      const id = parseInt(url.split('/')[2]);
      if (url.includes('/visits')) return mockApi.getPatientVisits(id);
      return mockApi.getPatient(id);
    }
    if (url === '/visits') return mockApi.getVisits();
    if (url === '/clinics') return mockApi.getClinics();
    throw { response: { status: 404, data: { detail: 'Not found' } } };
  }

  async post(url: string, data?: any, config?: any) {
    const formData = data;
    if (url === '/auth/token') {
      return mockApi.login(formData.get?.('username') || formData.username, formData.get?.('password') || formData.password);
    }
    if (url === '/patients') return mockApi.createPatient(data);
    if (url === '/clinics') return mockApi.createClinic(data);
    if (url === '/visits') return mockApi.createVisit(data);
    if (url.match(/^\/patients\/\d+\/request-otp$/)) {
      const id = parseInt(url.split('/')[2]);
      return mockApi.requestOtp(id);
    }
    throw { response: { status: 404, data: { detail: 'Not found' } } };
  }

  async put(url: string, data?: any, config?: any) {
    if (url.match(/^\/clinics\/\d+$/)) {
      const id = parseInt(url.split('/')[2]);
      return mockApi.updateClinic(id, data);
    }
    if (url.match(/^\/visits\/\d+$/)) {
      const id = parseInt(url.split('/')[2]);
      return mockApi.updateVisit(id, data);
    }
    throw { response: { status: 404, data: { detail: 'Not found' } } };
  }

  async delete(url: string, config?: any) {
    if (url.match(/^\/clinics\/\d+$/)) {
      const id = parseInt(url.split('/')[2]);
      return mockApi.deleteClinic(id);
    }
    if (url.match(/^\/visits\/\d+$/)) {
      const id = parseInt(url.split('/')[2]);
      return mockApi.deleteVisit(id);
    }
    throw { response: { status: 404, data: { detail: 'Not found' } } };
  }
}

const mockInterceptor = new MockInterceptor();

export const api = USE_MOCK_DATA
  ? (mockInterceptor as any)
  : axios.create({
      baseURL: API_BASE_URL,
    });

export function authHeaders() {
  const token = localStorage.getItem('token');
  return {
    Authorization: `Bearer ${token ?? ''}`,
  };
}

export function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string' && detail.trim()) {
      return detail;
    }
  }
  return fallback;
}
