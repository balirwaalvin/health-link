const crypto = require('crypto');
const { ID, InputFile } = require('node-appwrite');
const { APPWRITE_DATA_BUCKET_ID, getStorageService } = require('./appwriteClient');

const STORE_FILE_ID = String(process.env.APPWRITE_STORE_FILE_ID || 'health-link-store').trim();
const STORE_FILE_NAME = String(process.env.APPWRITE_STORE_FILE_NAME || 'health-link-store.json').trim();

const storage = getStorageService();

function defaultState() {
  const now = new Date().toISOString();
  return {
    meta: {
      nextUserId: 1,
      nextPatientId: 1,
      nextClinicId: 1,
      nextVisitId: 1,
      initializedAt: now,
      updatedAt: now,
    },
    users: [],
    patients: [],
    clinics: [],
    visits: [],
    otpChallenges: {},
  };
}

function isNotFoundError(error) {
  const text = String(error?.message || '').toLowerCase();
  return Number(error?.code) === 404 || text.includes('not found');
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

async function toUtf8(raw) {
  if (Buffer.isBuffer(raw)) {
    return raw.toString('utf8');
  }

  if (raw instanceof Uint8Array) {
    return Buffer.from(raw).toString('utf8');
  }

  if (typeof raw === 'string') {
    return raw;
  }

  if (raw && typeof raw.text === 'function') {
    return raw.text();
  }

  if (raw && typeof raw.on === 'function') {
    return new Promise((resolve, reject) => {
      const chunks = [];
      raw.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      raw.on('error', reject);
      raw.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
  }

  return String(raw || '');
}

let cache = null;
let writeQueue = Promise.resolve();

async function loadState() {
  if (cache) {
    return deepClone(cache);
  }

  try {
    const file = await storage.getFileDownload(APPWRITE_DATA_BUCKET_ID, STORE_FILE_ID);
    const text = await toUtf8(file);
    const parsed = text ? JSON.parse(text) : defaultState();
    cache = parsed;
    return deepClone(parsed);
  } catch (error) {
    if (!isNotFoundError(error)) {
      throw error;
    }

    const initial = defaultState();
    await persistState(initial);
    cache = initial;
    return deepClone(initial);
  }
}

async function persistState(state) {
  const next = deepClone(state);
  next.meta.updatedAt = new Date().toISOString();

  const body = Buffer.from(JSON.stringify(next, null, 2), 'utf8');
  const input = InputFile.fromBuffer(body, STORE_FILE_NAME);

  try {
    await storage.deleteFile(APPWRITE_DATA_BUCKET_ID, STORE_FILE_ID);
  } catch (error) {
    if (!isNotFoundError(error)) {
      throw error;
    }
  }

  await storage.createFile(APPWRITE_DATA_BUCKET_ID, STORE_FILE_ID, input);
  cache = next;
  return deepClone(next);
}

async function mutateState(mutator) {
  writeQueue = writeQueue.then(async () => {
    const state = await loadState();
    const result = await mutator(state);
    await persistState(state);
    return result;
  });

  return writeQueue;
}

function nextId(state, key) {
  const id = Number(state.meta[key] || 1);
  state.meta[key] = id + 1;
  return id;
}

function nowIso() {
  return new Date().toISOString();
}

function roleFromEmail(email) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) {
    return 'staff';
  }
  if (normalized === String(process.env.ADMIN_EMAIL || '').trim().toLowerCase()) {
    return 'admin';
  }
  if (normalized === String(process.env.STAFF_EMAIL || '').trim().toLowerCase()) {
    return 'staff';
  }
  return 'staff';
}

async function upsertUser({ email, name, role, appwriteUserId }) {
  return mutateState((state) => {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedName = String(name || '').trim();

    const existing = state.users.find((u) => u.email === normalizedEmail);
    if (existing) {
      existing.name = normalizedName || existing.name;
      existing.role = role || existing.role;
      existing.appwrite_user_id = appwriteUserId || existing.appwrite_user_id || null;
      existing.updated_at = nowIso();
      return deepClone(existing);
    }

    const user = {
      id: nextId(state, 'nextUserId'),
      email: normalizedEmail,
      name: normalizedName,
      role: role || roleFromEmail(normalizedEmail),
      appwrite_user_id: appwriteUserId || null,
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    state.users.push(user);
    return deepClone(user);
  });
}

async function getUserByEmail(email) {
  const state = await loadState();
  const normalizedEmail = String(email || '').trim().toLowerCase();
  return deepClone(state.users.find((u) => u.email === normalizedEmail) || null);
}

async function getUserById(id) {
  const state = await loadState();
  return deepClone(state.users.find((u) => Number(u.id) === Number(id)) || null);
}

async function listPatients({ limit, skip }) {
  const state = await loadState();
  const usersById = new Map(state.users.map((u) => [Number(u.id), u]));
  const ordered = [...state.patients].sort((a, b) => Number(b.id) - Number(a.id));
  return ordered.slice(skip, skip + limit).map((p) => ({
    ...p,
    email: usersById.get(Number(p.user_id))?.email || null,
  }));
}

async function getPatientById(id) {
  const state = await loadState();
  const patient = state.patients.find((p) => Number(p.id) === Number(id));
  if (!patient) {
    return null;
  }
  const user = state.users.find((u) => Number(u.id) === Number(patient.user_id));
  return { ...patient, email: user?.email || null };
}

async function findPatientByEmail(email) {
  const state = await loadState();
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const user = state.users.find((u) => u.email === normalizedEmail);
  if (!user) {
    return null;
  }
  return deepClone(state.patients.find((p) => Number(p.user_id) === Number(user.id)) || null);
}

async function createPatient(data) {
  return mutateState((state) => {
    const patient = {
      id: nextId(state, 'nextPatientId'),
      user_id: Number(data.user_id),
      first_name: String(data.first_name || '').trim(),
      last_name: String(data.last_name || '').trim(),
      phone: data.phone || null,
      medical_history: data.medical_history || 'N/A',
      blood_type: data.blood_type || 'N/A',
      allergies: data.allergies || 'N/A',
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    state.patients.push(patient);

    const user = state.users.find((u) => Number(u.id) === Number(patient.user_id));
    return deepClone({ ...patient, email: user?.email || null });
  });
}

async function updatePatient(id, updates) {
  return mutateState((state) => {
    const patient = state.patients.find((p) => Number(p.id) === Number(id));
    if (!patient) {
      return null;
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'first_name')) {
      patient.first_name = String(updates.first_name || patient.first_name).trim();
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'last_name')) {
      patient.last_name = String(updates.last_name || patient.last_name).trim();
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'phone')) {
      patient.phone = updates.phone ?? patient.phone;
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'medical_history')) {
      patient.medical_history = updates.medical_history ?? patient.medical_history;
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'blood_type')) {
      patient.blood_type = updates.blood_type ?? patient.blood_type;
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'allergies')) {
      patient.allergies = updates.allergies ?? patient.allergies;
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'user_id')) {
      patient.user_id = Number(updates.user_id || patient.user_id);
    }

    patient.updated_at = nowIso();

    const user = state.users.find((u) => Number(u.id) === Number(patient.user_id));
    return deepClone({ ...patient, email: user?.email || null, user_id: patient.user_id });
  });
}

async function deletePatient(id) {
  return mutateState((state) => {
    const index = state.patients.findIndex((p) => Number(p.id) === Number(id));
    if (index === -1) {
      return false;
    }
    state.patients.splice(index, 1);
    state.visits = state.visits.filter((v) => Number(v.patient_id) !== Number(id));
    delete state.otpChallenges[String(id)];
    return true;
  });
}

async function listClinics({ limit, skip }) {
  const state = await loadState();
  const ordered = [...state.clinics].sort((a, b) => Number(b.id) - Number(a.id));
  return deepClone(ordered.slice(skip, skip + limit));
}

async function getClinicById(id) {
  const state = await loadState();
  return deepClone(state.clinics.find((c) => Number(c.id) === Number(id)) || null);
}

async function createClinic(data) {
  return mutateState((state) => {
    const clinic = {
      id: nextId(state, 'nextClinicId'),
      name: String(data.name || '').trim(),
      location: data.location || null,
      phone: data.phone || null,
      address: data.address || null,
      email: data.email || null,
      website: data.website || null,
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    state.clinics.push(clinic);
    return deepClone(clinic);
  });
}

async function updateClinic(id, updates) {
  return mutateState((state) => {
    const clinic = state.clinics.find((c) => Number(c.id) === Number(id));
    if (!clinic) {
      return null;
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'name')) {
      clinic.name = updates.name || clinic.name;
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'location')) {
      clinic.location = updates.location ?? clinic.location;
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'phone')) {
      clinic.phone = updates.phone ?? clinic.phone;
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'address')) {
      clinic.address = updates.address ?? clinic.address;
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'email')) {
      clinic.email = updates.email ?? clinic.email;
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'website')) {
      clinic.website = updates.website ?? clinic.website;
    }

    clinic.updated_at = nowIso();
    return deepClone(clinic);
  });
}

async function deleteClinic(id) {
  return mutateState((state) => {
    const index = state.clinics.findIndex((c) => Number(c.id) === Number(id));
    if (index === -1) {
      return false;
    }

    state.clinics.splice(index, 1);
    return true;
  });
}

async function listVisits({ limit, skip, patientId, clinicId }) {
  const state = await loadState();

  const filtered = state.visits.filter((visit) => {
    if (patientId && Number(visit.patient_id) !== Number(patientId)) {
      return false;
    }
    if (clinicId && Number(visit.clinic_id) !== Number(clinicId)) {
      return false;
    }
    return true;
  });

  const ordered = filtered.sort((a, b) => {
    const aDate = Date.parse(String(a.visit_date || '')) || 0;
    const bDate = Date.parse(String(b.visit_date || '')) || 0;
    return bDate - aDate;
  });

  return deepClone(ordered.slice(skip, skip + limit));
}

async function listVisitsByPatientId(patientId) {
  return listVisits({ limit: Number.MAX_SAFE_INTEGER, skip: 0, patientId, clinicId: null });
}

async function getVisitById(id) {
  const state = await loadState();
  return deepClone(state.visits.find((v) => Number(v.id) === Number(id)) || null);
}

async function createVisit(data) {
  return mutateState((state) => {
    const visit = {
      id: nextId(state, 'nextVisitId'),
      patient_id: Number(data.patient_id),
      clinic_id: Number(data.clinic_id),
      user_id: Number(data.user_id),
      visit_date: data.visit_date,
      reason: data.reason || '',
      diagnosis: data.diagnosis || '',
      treatment: data.treatment || '',
      notes: data.notes || '',
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    state.visits.push(visit);
    return deepClone(visit);
  });
}

async function updateVisit(id, updates) {
  return mutateState((state) => {
    const visit = state.visits.find((v) => Number(v.id) === Number(id));
    if (!visit) {
      return null;
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'reason')) {
      visit.reason = updates.reason ?? visit.reason;
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'diagnosis')) {
      visit.diagnosis = updates.diagnosis ?? visit.diagnosis;
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'treatment')) {
      visit.treatment = updates.treatment ?? visit.treatment;
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'notes')) {
      visit.notes = updates.notes ?? visit.notes;
    }

    visit.updated_at = nowIso();
    return deepClone(visit);
  });
}

async function deleteVisit(id) {
  return mutateState((state) => {
    const index = state.visits.findIndex((v) => Number(v.id) === Number(id));
    if (index === -1) {
      return false;
    }
    state.visits.splice(index, 1);
    return true;
  });
}

async function setOtpChallenge(patientId, payload) {
  return mutateState((state) => {
    state.otpChallenges[String(patientId)] = {
      ...payload,
      updated_at: nowIso(),
    };
    return true;
  });
}

async function getOtpChallenge(patientId) {
  const state = await loadState();
  return deepClone(state.otpChallenges[String(patientId)] || null);
}

async function clearOtpChallenge(patientId) {
  return mutateState((state) => {
    delete state.otpChallenges[String(patientId)];
    return true;
  });
}

async function hashOtp(code) {
  return crypto.createHash('sha256').update(String(code)).digest('hex');
}

module.exports = {
  clearOtpChallenge,
  createClinic,
  createPatient,
  createVisit,
  deleteClinic,
  deletePatient,
  deleteVisit,
  getClinicById,
  getOtpChallenge,
  getPatientById,
  getUserByEmail,
  getUserById,
  getVisitById,
  hashOtp,
  listClinics,
  listPatients,
  listVisits,
  listVisitsByPatientId,
  setOtpChallenge,
  upsertUser,
  updateClinic,
  updatePatient,
  updateVisit,
  findPatientByEmail,
};
