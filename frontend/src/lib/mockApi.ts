import {
  mockUsers,
  mockPatients,
  mockVisits,
  mockClinics,
} from './mockData';

// Simulate network delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let patients = [...mockPatients];
let visits = [...mockVisits];
let clinics = [...mockClinics];
let nextPatientId = 5;
let nextVisitId = 4;

export const mockApi = {
  async login(username: string, password: string) {
    await delay(300);
    const user = mockUsers[username as keyof typeof mockUsers];
    if (!user) {
      throw { response: { status: 401, data: { detail: 'Invalid credentials.' } } };
    }
    return {
      data: user,
    };
  },

  async getDashboardStats() {
    await delay(200);
    return {
      data: {
        patients: patients.length,
        visits: visits.length,
        clinics: clinics.length,
        role: localStorage.getItem('role') || 'staff',
      },
    };
  },

  async getPatients(search?: string) {
    await delay(300);
    if (search) {
      const filtered = patients.filter((p) =>
        p.full_name.toLowerCase().includes(search.toLowerCase())
      );
      return { data: filtered };
    }
    return { data: patients };
  },

  async getPatient(id: number) {
    await delay(200);
    const patient = patients.find((p) => p.id === id);
    if (!patient) {
      throw { response: { status: 404, data: { detail: 'Patient not found.' } } };
    }
    return { data: patient };
  },

  async createPatient(data: any) {
    await delay(400);
    const newPatient = {
      ...data,
      id: nextPatientId++,
      display_id: `MKN-${String(nextPatientId).padStart(3, '0')}`,
      created_at: new Date().toISOString().split('T')[0],
    };
    patients.push(newPatient);
    return { data: newPatient };
  },

  async getClinics() {
    await delay(200);
    return { data: clinics };
  },

  async createClinic(data: any) {
    await delay(300);
    const newClinic = {
      ...data,
      id: clinics.length + 1,
    };
    clinics.push(newClinic);
    return { data: newClinic };
  },

  async updateClinic(id: number, data: any) {
    await delay(300);
    const index = clinics.findIndex((c) => c.id === id);
    if (index === -1) {
      throw { response: { status: 404, data: { detail: 'Clinic not found.' } } };
    }
    clinics[index] = { ...clinics[index], ...data };
    return { data: clinics[index] };
  },

  async deleteClinic(id: number) {
    await delay(300);
    const index = clinics.findIndex((c) => c.id === id);
    if (index === -1) {
      throw { response: { status: 404, data: { detail: 'Clinic not found.' } } };
    }
    clinics.splice(index, 1);
    return { data: { success: true } };
  },

  async getVisits(search?: string) {
    await delay(300);
    if (search) {
      const filtered = visits.filter((v) =>
        v.patient_name.toLowerCase().includes(search.toLowerCase())
      );
      return { data: filtered };
    }
    return { data: visits };
  },

  async getPatientVisits(patientId: number) {
    await delay(200);
    const patientVisits = visits.filter((v) => v.patient_id === patientId);
    return { data: patientVisits };
  },

  async createVisit(data: any) {
    await delay(400);
    const patient = patients.find((p) => p.id === data.patient_id);
    const clinic = clinics.find((c) => c.id === data.clinic_id);

    if (!patient || !clinic) {
      throw {
        response: {
          status: 404,
          data: { detail: 'Patient or clinic not found.' },
        },
      };
    }

    const newVisit = {
      ...data,
      id: nextVisitId++,
      created_at: new Date().toISOString(),
      patient_name: patient.full_name,
      clinic_name: clinic.name,
    };
    visits.push(newVisit);
    return { data: newVisit };
  },

  async updateVisit(id: number, data: any) {
    await delay(300);
    const index = visits.findIndex((v) => v.id === id);
    if (index === -1) {
      throw { response: { status: 404, data: { detail: 'Visit not found.' } } };
    }
    visits[index] = { ...visits[index], ...data };
    return { data: visits[index] };
  },

  async deleteVisit(id: number) {
    await delay(300);
    const index = visits.findIndex((v) => v.id === id);
    if (index === -1) {
      throw { response: { status: 404, data: { detail: 'Visit not found.' } } };
    }
    visits.splice(index, 1);
    return { data: { success: true } };
  },

  async requestOtp(patientId: number) {
    await delay(500);
    return { data: { otp_code: '48291', message: 'OTP sent successfully' } };
  },
};
