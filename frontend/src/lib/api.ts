/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { databases, appwriteConfig } from './appwrite';
import { ID, Query } from 'appwrite';

const DB = appwriteConfig.databaseId;
const PATIENTS = appwriteConfig.patientsCollectionId;
const CLINICS = appwriteConfig.clinicsCollectionId;
const VISITS = appwriteConfig.visitsCollectionId;
const OTP_VALID_MINUTES = 5;
const otpStore = new Map<string, { otp: string; expiresAt: number }>();

export const api = {
  get: async (url: string, config?: any) => {
    if (url === '/dashboard/stats') {
      const p = await databases.listDocuments(DB, PATIENTS, [Query.limit(1)]);
      const c = await databases.listDocuments(DB, CLINICS, [Query.limit(1)]);
      const v = await databases.listDocuments(DB, VISITS, [Query.limit(1)]);
      return { 
        data: { 
          patients: p.total, 
          clinics: c.total, 
          visits: v.total, 
          role: localStorage.getItem('role') || 'staff' 
        } 
      };
    }
    if (url === '/patients') {
      const res = await databases.listDocuments(DB, PATIENTS, [Query.orderDesc('$createdAt')]);
      return { data: res.documents.map((d: any) => ({...d, id: d.$id})) };
    }
    if (url.match(/^\/patients\/(.+)$/)) {
      const id = url.split('/')[2];
      if (url.includes('/visits')) {
        const res = await databases.listDocuments(DB, VISITS, [Query.equal('patient_id', id), Query.orderDesc('$createdAt')]);
        return { data: res.documents.map((d: any) => ({...d, id: d.$id})) };
      }
      const d: any = await databases.getDocument(DB, PATIENTS, id);
      return { data: { ...d, id: d.$id } };
    }
    if (url === '/visits') {
      const [visitsRes, patientsRes, clinicsRes] = await Promise.all([
        databases.listDocuments(DB, VISITS, [Query.orderDesc('$createdAt')]),
        databases.listDocuments(DB, PATIENTS, [Query.limit(5000)]),
        databases.listDocuments(DB, CLINICS, [Query.limit(5000)]),
      ]);

      const patientById = new Map(
        patientsRes.documents.map((p: any) => [String(p.$id), p])
      );
      const clinicById = new Map(
        clinicsRes.documents.map((c: any) => [String(c.$id), c])
      );

      let visits = visitsRes.documents.map((d: any) => {
        const patient = patientById.get(String(d.patient_id));
        const clinic = clinicById.get(String(d.clinic_id));
        return {
          ...d,
          id: d.$id,
          patient_name: d.patient_name || patient?.full_name || 'Unknown Patient',
          patient_display_id: d.patient_display_id || patient?.display_id || 'N/A',
          clinic_name: d.clinic_name || clinic?.clinic_name || 'Unknown Clinic',
        };
      });

      const searchValue = (config?.params?.search || '').toString().trim().toLowerCase();
      if (searchValue) {
        visits = visits.filter((visit: any) =>
          [visit.patient_name, visit.patient_display_id, visit.clinic_name, visit.diagnosis]
            .map((value) => (value || '').toString().toLowerCase())
            .some((value) => value.includes(searchValue))
        );
      }

      return { data: visits };
    }
    if (url === '/clinics') {
      const res = await databases.listDocuments(DB, CLINICS, [Query.orderDesc('$createdAt')]);
      return { data: res.documents.map((d: any) => ({...d, id: d.$id})) };
    }
    throw new Error('Not found: ' + url);
  },
  
  post: async (url: string, data?: any, _config?: any) => {
    if (url.match(/^\/patients\/(.+)\/request-access$/)) {
      const patientId = url.split('/')[2];
      const patient = await databases.getDocument(DB, PATIENTS, patientId);
      const otpCode = String(Math.floor(10000 + Math.random() * 90000));
      const key = `${patientId}:${localStorage.getItem('role') || 'staff'}`;
      otpStore.set(key, {
        otp: otpCode,
        expiresAt: Date.now() + OTP_VALID_MINUTES * 60 * 1000,
      });
      return {
        data: {
          message: 'OTP email dispatched (prototype placeholder)',
          email_to: (patient as { email?: string }).email || null,
          otp_preview: otpCode,
          valid_minutes: OTP_VALID_MINUTES,
        },
      };
    }
    if (url.match(/^\/patients\/(.+)\/verify-access$/)) {
      const patientId = url.split('/')[2];
      const key = `${patientId}:${localStorage.getItem('role') || 'staff'}`;
      const otpEntry = otpStore.get(key);
      if (!otpEntry) {
        return { data: { message: 'No OTP request found.', access_granted: false } };
      }
      if (Date.now() > otpEntry.expiresAt) {
        otpStore.delete(key);
        return { data: { message: 'OTP expired. Request a new code.', access_granted: false } };
      }
      if ((data?.otp || '') !== otpEntry.otp) {
        return { data: { message: 'Invalid OTP.', access_granted: false } };
      }
      otpStore.delete(key);
      return { data: { message: 'Access granted for this session.', access_granted: true } };
    }

    if (url === '/patients') {
      const d: any = await databases.createDocument(DB, PATIENTS, ID.unique(), {
        full_name: data.full_name,
        phone: data.phone,
        email: data.email || null,
        display_id: `MKN-${Math.floor(Math.random() * 10000)}`
      });
      return { data: { ...d, id: d.$id } };
    }
    if (url === '/clinics') {
      const d: any = await databases.createDocument(DB, CLINICS, ID.unique(), {
        clinic_name: data.clinic_name,
        location: data.location,
        contact_phone: data.contact_phone
      });
      return { data: { ...d, id: d.$id } };
    }
    if (url === '/visits') {
      const role = localStorage.getItem('role') || 'staff';
      if (role !== 'staff') {
        throw new Error('Only staff can create visits.');
      }

      const payload = {
         diagnosis: data.diagnosis,
         prescription: data.prescription,
         notes: data.notes || '',
         visit_date: data.visit_date || new Date().toISOString(),
         patient_id: String(data.patient_id),
         clinic_id: String(data.clinic_id),
         created_by_name: localStorage.getItem('full_name') || 'staff'
      };
      const d: any = await databases.createDocument(DB, VISITS, ID.unique(), payload);
      return { data: { ...d, id: d.$id } };
    }
    throw new Error('Not found: ' + url);
  },

  put: async (url: string, data?: any, _config?: any) => {
    if (url.match(/^\/clinics\/(.+)$/)) {
      const id = url.split('/')[2];
      const { id: _, $id, $createdAt, $updatedAt, $permissions, $databaseId, $collectionId, ...updateData } = data;
      const d: any = await databases.updateDocument(DB, CLINICS, id, updateData);
      return { data: { ...d, id: d.$id } };
    }
    if (url.match(/^\/visits\/(.+)$/)) {
      const id = url.split('/')[2];
      const { id: _, $id, $createdAt, $updatedAt, $permissions, $databaseId, $collectionId, ...updateData } = data;
      const d: any = await databases.updateDocument(DB, VISITS, id, updateData);
      return { data: { ...d, id: d.$id } };
    }
    throw new Error('Not found');
  },

  delete: async (url: string, _config?: any) => {
    if (url.match(/^\/clinics\/(.+)$/)) {
      const id = url.split('/')[2];
      await databases.deleteDocument(DB, CLINICS, id);
      return { data: { success: true } };
    }
    if (url.match(/^\/visits\/(.+)$/)) {
      const id = url.split('/')[2];
      await databases.deleteDocument(DB, VISITS, id);
      return { data: { success: true } };
    }
    throw new Error('Not found');
  }
};

export function authHeaders() { return {}; }

export function getErrorMessage(error: any, fallback: string) {
  return error?.message || fallback;
}
