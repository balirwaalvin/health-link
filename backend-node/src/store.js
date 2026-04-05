const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { initializeDatabase, query, withTransaction } = require('./db');

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function nowIso() {
  return new Date().toISOString();
}

function roleFromEmail(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    return 'staff';
  }

  if (normalized === normalizeEmail(process.env.ADMIN_EMAIL || 'admin@healthlink.ug')) {
    return 'admin';
  }

  if (normalized === normalizeEmail(process.env.STAFF_EMAIL || 'staff@healthlink.ug')) {
    return 'staff';
  }

  return 'staff';
}

function toIso(value) {
  if (!value) {
    return null;
  }

  return new Date(value).toISOString();
}

function toSafeUser(row) {
  if (!row) {
    return null;
  }

  return {
    id: Number(row.id),
    email: row.email,
    name: row.name,
    role: row.role,
    created_at: toIso(row.created_at),
    updated_at: toIso(row.updated_at),
  };
}

function toPatient(row) {
  if (!row) {
    return null;
  }

  return {
    id: Number(row.id),
    user_id: Number(row.user_id),
    first_name: row.first_name,
    last_name: row.last_name || '',
    phone: row.phone,
    medical_history: row.medical_history,
    blood_type: row.blood_type,
    allergies: row.allergies,
    email: row.email || null,
    created_at: toIso(row.created_at),
    updated_at: toIso(row.updated_at),
  };
}

function toClinic(row) {
  if (!row) {
    return null;
  }

  return {
    id: Number(row.id),
    name: row.name,
    location: row.location,
    phone: row.phone,
    address: row.address,
    email: row.email,
    website: row.website,
    created_at: toIso(row.created_at),
    updated_at: toIso(row.updated_at),
  };
}

function toVisit(row) {
  if (!row) {
    return null;
  }

  return {
    id: Number(row.id),
    patient_id: Number(row.patient_id),
    clinic_id: row.clinic_id === null || row.clinic_id === undefined ? null : Number(row.clinic_id),
    user_id: row.user_id === null || row.user_id === undefined ? null : Number(row.user_id),
    visit_date: row.visit_date,
    reason: row.reason || '',
    diagnosis: row.diagnosis || '',
    treatment: row.treatment || '',
    notes: row.notes || '',
    created_at: toIso(row.created_at),
    updated_at: toIso(row.updated_at),
  };
}

function toOtpChallenge(row) {
  if (!row) {
    return null;
  }

  return {
    patientId: Number(row.patient_id),
    patientEmail: row.patient_email,
    codeHash: row.code_hash,
    expiresAt: toIso(row.expires_at),
    requestedByUserId: row.requested_by_user_id === null || row.requested_by_user_id === undefined ? null : Number(row.requested_by_user_id),
    requestedAt: toIso(row.requested_at),
    attempts: Number(row.attempts || 0),
    updated_at: toIso(row.updated_at),
  };
}

function orderByLimitOffset(limit, skip) {
  return [Number(limit || 10), Number(skip || 0)];
}

async function hashPassword(password) {
  return bcrypt.hash(String(password || ''), 10);
}

async function upsertUser({ email, name, role, passwordHash }) {
  await initializeDatabase();

  const normalizedEmail = normalizeEmail(email);
  const normalizedName = String(name || '').trim() || normalizedEmail || 'User';
  const resolvedRole = role || roleFromEmail(normalizedEmail);
  const normalizedPasswordHash = passwordHash ? String(passwordHash) : null;

  const result = await query(
    `INSERT INTO users (email, name, role, password_hash)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email)
     DO UPDATE SET
       name = EXCLUDED.name,
       role = EXCLUDED.role,
       password_hash = COALESCE(EXCLUDED.password_hash, users.password_hash),
       updated_at = NOW()
     RETURNING id, email, name, role, created_at, updated_at`,
    [normalizedEmail, normalizedName, resolvedRole, normalizedPasswordHash]
  );

  return toSafeUser(result.rows[0]);
}

async function authenticateUser(email, password) {
  await initializeDatabase();

  const normalizedEmail = normalizeEmail(email);
  const normalizedPassword = String(password || '');
  if (!normalizedEmail || !normalizedPassword) {
    return null;
  }

  const result = await query(
    `SELECT id, email, name, role, password_hash, created_at, updated_at
     FROM users
     WHERE email = $1
     LIMIT 1`,
    [normalizedEmail]
  );

  const user = result.rows[0];
  if (!user?.password_hash) {
    return null;
  }

  const passwordMatches = await bcrypt.compare(normalizedPassword, user.password_hash);
  if (!passwordMatches) {
    return null;
  }

  return toSafeUser(user);
}

async function getUserByEmail(email) {
  await initializeDatabase();

  const result = await query(
    `SELECT id, email, name, role, created_at, updated_at
     FROM users
     WHERE email = $1
     LIMIT 1`,
    [normalizeEmail(email)]
  );

  return toSafeUser(result.rows[0]);
}

async function getUserById(id) {
  await initializeDatabase();

  const result = await query(
    `SELECT id, email, name, role, created_at, updated_at
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [Number(id)]
  );

  return toSafeUser(result.rows[0]);
}

async function listPatients({ limit, skip }) {
  await initializeDatabase();

  const [pageSize, offset] = orderByLimitOffset(limit, skip);
  const result = await query(
    `SELECT p.*, u.email
     FROM patients p
     JOIN users u ON u.id = p.user_id
     ORDER BY p.id DESC
     LIMIT $1 OFFSET $2`,
    [pageSize, offset]
  );

  return result.rows.map(toPatient);
}

async function getPatientById(id) {
  await initializeDatabase();

  const result = await query(
    `SELECT p.*, u.email
     FROM patients p
     JOIN users u ON u.id = p.user_id
     WHERE p.id = $1
     LIMIT 1`,
    [Number(id)]
  );

  return toPatient(result.rows[0]);
}

async function findPatientByEmail(email) {
  await initializeDatabase();

  const result = await query(
    `SELECT p.*, u.email
     FROM patients p
     JOIN users u ON u.id = p.user_id
     WHERE u.email = $1
     LIMIT 1`,
    [normalizeEmail(email)]
  );

  return toPatient(result.rows[0]);
}

async function createPatient(data) {
  await initializeDatabase();

  const result = await query(
    `INSERT INTO patients (
      user_id,
      first_name,
      last_name,
      phone,
      medical_history,
      blood_type,
      allergies
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *`,
    [
      Number(data.user_id),
      String(data.first_name || '').trim(),
      String(data.last_name || '').trim(),
      data.phone || null,
      data.medical_history || 'N/A',
      data.blood_type || 'N/A',
      data.allergies || 'N/A',
    ]
  );

  return getPatientById(result.rows[0].id);
}

async function updatePatient(id, updates) {
  await initializeDatabase();

  const currentResult = await query(
    `SELECT *
     FROM patients
     WHERE id = $1
     LIMIT 1`,
    [Number(id)]
  );

  const current = currentResult.rows[0];
  if (!current) {
    return null;
  }

  const next = {
    first_name: current.first_name,
    last_name: current.last_name,
    phone: current.phone,
    medical_history: current.medical_history,
    blood_type: current.blood_type,
    allergies: current.allergies,
    user_id: Number(current.user_id),
  };

  if (Object.prototype.hasOwnProperty.call(updates, 'first_name')) {
    next.first_name = String(updates.first_name || next.first_name).trim();
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'last_name')) {
    next.last_name = String(updates.last_name || next.last_name).trim();
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'phone')) {
    next.phone = updates.phone ?? next.phone;
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'medical_history')) {
    next.medical_history = updates.medical_history ?? next.medical_history;
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'blood_type')) {
    next.blood_type = updates.blood_type ?? next.blood_type;
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'allergies')) {
    next.allergies = updates.allergies ?? next.allergies;
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'user_id')) {
    next.user_id = Number(updates.user_id || next.user_id);
  }

  await query(
    `UPDATE patients
     SET first_name = $1,
         last_name = $2,
         phone = $3,
         medical_history = $4,
         blood_type = $5,
         allergies = $6,
         user_id = $7,
         updated_at = NOW()
     WHERE id = $8`,
    [
      next.first_name,
      next.last_name,
      next.phone,
      next.medical_history,
      next.blood_type,
      next.allergies,
      next.user_id,
      Number(id),
    ]
  );

  return getPatientById(id);
}

async function deletePatient(id) {
  await initializeDatabase();

  const result = await query(
    `DELETE FROM patients
     WHERE id = $1
     RETURNING id`,
    [Number(id)]
  );

  return result.rowCount > 0;
}

async function listClinics({ limit, skip }) {
  await initializeDatabase();

  const [pageSize, offset] = orderByLimitOffset(limit, skip);
  const result = await query(
    `SELECT *
     FROM clinics
     ORDER BY id DESC
     LIMIT $1 OFFSET $2`,
    [pageSize, offset]
  );

  return result.rows.map(toClinic);
}

async function getClinicById(id) {
  await initializeDatabase();

  const result = await query(
    `SELECT *
     FROM clinics
     WHERE id = $1
     LIMIT 1`,
    [Number(id)]
  );

  return toClinic(result.rows[0]);
}

async function createClinic(data) {
  await initializeDatabase();

  const result = await query(
    `INSERT INTO clinics (name, location, phone, address, email, website)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      String(data.name || '').trim(),
      data.location || null,
      data.phone || null,
      data.address || null,
      data.email || null,
      data.website || null,
    ]
  );

  return toClinic(result.rows[0]);
}

async function updateClinic(id, updates) {
  await initializeDatabase();

  const currentResult = await query(
    `SELECT *
     FROM clinics
     WHERE id = $1
     LIMIT 1`,
    [Number(id)]
  );

  const current = currentResult.rows[0];
  if (!current) {
    return null;
  }

  const next = {
    name: current.name,
    location: current.location,
    phone: current.phone,
    address: current.address,
    email: current.email,
    website: current.website,
  };

  if (Object.prototype.hasOwnProperty.call(updates, 'name')) {
    next.name = updates.name || next.name;
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'location')) {
    next.location = updates.location ?? next.location;
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'phone')) {
    next.phone = updates.phone ?? next.phone;
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'address')) {
    next.address = updates.address ?? next.address;
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'email')) {
    next.email = updates.email ?? next.email;
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'website')) {
    next.website = updates.website ?? next.website;
  }

  const result = await query(
    `UPDATE clinics
     SET name = $1,
         location = $2,
         phone = $3,
         address = $4,
         email = $5,
         website = $6,
         updated_at = NOW()
     WHERE id = $7
     RETURNING *`,
    [
      next.name,
      next.location,
      next.phone,
      next.address,
      next.email,
      next.website,
      Number(id),
    ]
  );

  return toClinic(result.rows[0]);
}

async function deleteClinic(id) {
  await initializeDatabase();

  const result = await query(
    `DELETE FROM clinics
     WHERE id = $1
     RETURNING id`,
    [Number(id)]
  );

  return result.rowCount > 0;
}

async function listVisits({ limit, skip, patientId, clinicId }) {
  await initializeDatabase();

  const where = [];
  const params = [];

  if (patientId) {
    params.push(Number(patientId));
    where.push(`patient_id = $${params.length}`);
  }

  if (clinicId) {
    params.push(Number(clinicId));
    where.push(`clinic_id = $${params.length}`);
  }

  const [pageSize, offset] = orderByLimitOffset(limit, skip);
  params.push(pageSize, offset);

  const result = await query(
    `SELECT *
     FROM visits
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY visit_date DESC, id DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return result.rows.map(toVisit);
}

async function listVisitsByPatientId(patientId) {
  return listVisits({ limit: Number.MAX_SAFE_INTEGER, skip: 0, patientId, clinicId: null });
}

async function getVisitById(id) {
  await initializeDatabase();

  const result = await query(
    `SELECT *
     FROM visits
     WHERE id = $1
     LIMIT 1`,
    [Number(id)]
  );

  return toVisit(result.rows[0]);
}

async function createVisit(data) {
  await initializeDatabase();

  const result = await query(
    `INSERT INTO visits (
      patient_id,
      clinic_id,
      user_id,
      visit_date,
      reason,
      diagnosis,
      treatment,
      notes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *`,
    [
      Number(data.patient_id),
      Number(data.clinic_id),
      Number(data.user_id),
      String(data.visit_date || ''),
      data.reason || '',
      data.diagnosis || '',
      data.treatment || '',
      data.notes || '',
    ]
  );

  return toVisit(result.rows[0]);
}

async function updateVisit(id, updates) {
  await initializeDatabase();

  const currentResult = await query(
    `SELECT *
     FROM visits
     WHERE id = $1
     LIMIT 1`,
    [Number(id)]
  );

  const current = currentResult.rows[0];
  if (!current) {
    return null;
  }

  const next = {
    reason: current.reason,
    diagnosis: current.diagnosis,
    treatment: current.treatment,
    notes: current.notes,
  };

  if (Object.prototype.hasOwnProperty.call(updates, 'reason')) {
    next.reason = updates.reason ?? next.reason;
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'diagnosis')) {
    next.diagnosis = updates.diagnosis ?? next.diagnosis;
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'treatment')) {
    next.treatment = updates.treatment ?? next.treatment;
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'notes')) {
    next.notes = updates.notes ?? next.notes;
  }

  const result = await query(
    `UPDATE visits
     SET reason = $1,
         diagnosis = $2,
         treatment = $3,
         notes = $4,
         updated_at = NOW()
     WHERE id = $5
     RETURNING *`,
    [next.reason, next.diagnosis, next.treatment, next.notes, Number(id)]
  );

  return toVisit(result.rows[0]);
}

async function deleteVisit(id) {
  await initializeDatabase();

  const result = await query(
    `DELETE FROM visits
     WHERE id = $1
     RETURNING id`,
    [Number(id)]
  );

  return result.rowCount > 0;
}

async function setOtpChallenge(patientId, payload) {
  await initializeDatabase();

  await query(
    `INSERT INTO otp_challenges (
      patient_id,
      patient_email,
      code_hash,
      expires_at,
      requested_by_user_id,
      requested_at,
      attempts
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (patient_id)
    DO UPDATE SET
      patient_email = EXCLUDED.patient_email,
      code_hash = EXCLUDED.code_hash,
      expires_at = EXCLUDED.expires_at,
      requested_by_user_id = EXCLUDED.requested_by_user_id,
      requested_at = EXCLUDED.requested_at,
      attempts = EXCLUDED.attempts,
      updated_at = NOW()`,
    [
      Number(patientId),
      String(payload.patientEmail || '').trim().toLowerCase(),
      String(payload.codeHash || ''),
      payload.expiresAt,
      payload.requestedByUserId ? Number(payload.requestedByUserId) : null,
      payload.requestedAt || nowIso(),
      Number(payload.attempts || 0),
    ]
  );

  return true;
}

async function getOtpChallenge(patientId) {
  await initializeDatabase();

  const result = await query(
    `SELECT *
     FROM otp_challenges
     WHERE patient_id = $1
     LIMIT 1`,
    [Number(patientId)]
  );

  return toOtpChallenge(result.rows[0]);
}

async function clearOtpChallenge(patientId) {
  await initializeDatabase();

  const result = await query(
    `DELETE FROM otp_challenges
     WHERE patient_id = $1
     RETURNING patient_id`,
    [Number(patientId)]
  );

  return result.rowCount > 0;
}

async function hashOtp(code) {
  return crypto.createHash('sha256').update(String(code || '')).digest('hex');
}

module.exports = {
  authenticateUser,
  clearOtpChallenge,
  createClinic,
  createPatient,
  createVisit,
  deleteClinic,
  deletePatient,
  deleteVisit,
  findPatientByEmail,
  getClinicById,
  getOtpChallenge,
  getPatientById,
  getUserByEmail,
  getUserById,
  getVisitById,
  hashOtp,
  hashPassword,
  initializeDatabase,
  listClinics,
  listPatients,
  listVisits,
  listVisitsByPatientId,
  roleFromEmail,
  setOtpChallenge,
  upsertUser,
  updateClinic,
  updatePatient,
  updateVisit,
  withTransaction,
};