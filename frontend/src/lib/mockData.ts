export const mockUsers = {
  admin: {
    access_token: 'mock-token-admin-12345',
    role: 'admin',
    full_name: 'Dr. Admin User',
  },
  staff: {
    access_token: 'mock-token-staff-12345',
    role: 'staff',
    full_name: 'Nurse Staff Member',
  },
};

export const mockPatients = [
  {
    id: 1,
    display_id: 'MKN-001',
    full_name: 'John Kasubi',
    date_of_birth: '1985-03-15',
    gender: 'M',
    phone: '+256701234567',
    address: 'Mukono Town',
    created_at: '2025-01-10',
  },
  {
    id: 2,
    display_id: 'MKN-002',
    full_name: 'Sarah Namukasa',
    date_of_birth: '1990-07-22',
    gender: 'F',
    phone: '+256702345678',
    address: 'Nile Avenue, Mukono',
    created_at: '2025-01-12',
  },
  {
    id: 3,
    display_id: 'MKN-003',
    full_name: 'Emmanuel Omusu',
    date_of_birth: '1988-11-08',
    gender: 'M',
    phone: '+256703456789',
    address: 'Mukono Central',
    created_at: '2025-01-15',
  },
  {
    id: 4,
    display_id: 'MKN-004',
    full_name: 'Grace Nanteza',
    date_of_birth: '1995-05-30',
    gender: 'F',
    phone: '+256704567890',
    address: 'Kiwawu',
    created_at: '2025-01-18',
  },
];

export const mockClinics = [
  {
    id: 1,
    name: 'Mukono Central Clinic',
    address: 'Mukono Town Centre',
    phone: '+256414000001',
  },
  {
    id: 2,
    name: 'Kiwawu Health Centre',
    address: 'Kiwawu Village',
    phone: '+256414000002',
  },
  {
    id: 3,
    name: 'Nile Health Services',
    address: 'Nile Avenue',
    phone: '+256414000003',
  },
];

export const mockVisits = [
  {
    id: 1,
    patient_id: 1,
    clinic_id: 1,
    visit_date: '2025-03-15',
    diagnosis: 'Hypertension',
    prescription: 'Lisinopril 10mg daily',
    notes: 'Follow-up visit, BP stable',
    created_at: '2025-03-15T10:30:00',
    patient_name: 'John Kasubi',
    clinic_name: 'Mukono Central Clinic',
  },
  {
    id: 2,
    patient_id: 2,
    clinic_id: 2,
    visit_date: '2025-03-16',
    diagnosis: 'Type 2 Diabetes',
    prescription: 'Metformin 500mg twice daily',
    notes: 'Blood glucose levels within range',
    created_at: '2025-03-16T14:15:00',
    patient_name: 'Sarah Namukasa',
    clinic_name: 'Kiwawu Health Centre',
  },
  {
    id: 3,
    patient_id: 3,
    clinic_id: 1,
    visit_date: '2025-03-14',
    diagnosis: 'Malaria',
    prescription: 'Artemether 120mg IM, then Artemisinin',
    notes: 'Positive RDT, started antimalarial treatment',
    created_at: '2025-03-14T09:00:00',
    patient_name: 'Emmanuel Omusu',
    clinic_name: 'Mukono Central Clinic',
  },
];
