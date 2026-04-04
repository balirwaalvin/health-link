const path = require('path');
const crypto = require('crypto');
const dotenv = require('dotenv');
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const db = require('./db');
const { createClerkClient } = require('@clerk/backend');
const { requireAuth } = require('./auth');
const { seedDefaultAccounts, DEFAULT_ACCOUNTS } = require('./seedAccounts');
const { signLocalToken } = require('./localAuth');

dotenv.config({ path: path.join(__dirname, '..', '.env') });
if (!process.env.PORT) {
  dotenv.config({ path: path.join(__dirname, '..', '..', 'backend', '.env') });
}

const app = express();
const PORT = Number(process.env.PORT || 8000);
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://127.0.0.1:5173';
const FRONTEND_URLS = String(process.env.FRONTEND_URLS || '');
const clerkClient = process.env.CLERK_SECRET_KEY
  ? createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
  : null;
const resendApiKey = String(process.env.RESEND_API_KEY || '').trim();
const resendFrom = String(process.env.RESEND_FROM || process.env.MAIL_FROM || '').trim();
const smtpConfigured =
  !!process.env.SMTP_HOST &&
  !!process.env.SMTP_PORT &&
  !!process.env.SMTP_USER &&
  !!process.env.SMTP_PASS &&
  !!process.env.MAIL_FROM;
const mailTransporter = smtpConfigured
  ? nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
  : null;

async function sendViaResend({ to, code, validMinutes }) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: resendFrom,
      to: [to],
      subject: 'Health Link access verification code',
      text: `Your Health Link verification code is ${code}. It expires in ${validMinutes} minutes.`,
      html: `<p>Your Health Link verification code is <strong>${code}</strong>.</p><p>This code expires in ${validMinutes} minutes.</p>`,
    }),
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(`Resend API error (${response.status}): ${responseText}`);
  }
}

async function getOrCreatePatientUser({ email, name }) {
  const existing = await db.query('SELECT * FROM users WHERE email = $1 ORDER BY id ASC LIMIT 1', [email]);

  if (existing.rows.length > 0) {
    const currentUser = existing.rows[0];
    if (currentUser.role && currentUser.role !== 'patient') {
      throw new Error('That email is already in use by another account.');
    }

    if (currentUser.name !== name || currentUser.role !== 'patient') {
      const updated = await db.query(
        'UPDATE users SET name = $1, role = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
        [name, 'patient', currentUser.id]
      );
      return updated.rows[0];
    }

    return currentUser;
  }

  const seedClerkId = `patient-${email}`.replace(/[^a-zA-Z0-9:_-]/g, '-');
  const inserted = await db.query(
    'INSERT INTO users (clerk_id, email, name, role, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING *',
    [seedClerkId, email, name, 'patient']
  );
  return inserted.rows[0];
}

async function sendPatientOtpEmail({ to, code, validMinutes }) {
  if (resendApiKey && resendFrom) {
    await sendViaResend({ to, code, validMinutes });
    return;
  }

  if (!mailTransporter) {
    throw new Error('Email is not configured. Set RESEND_API_KEY and RESEND_FROM, or SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and MAIL_FROM.');
  }

  await mailTransporter.sendMail({
    from: process.env.MAIL_FROM,
    to,
    subject: 'Health Link access verification code',
    text: `Your Health Link verification code is ${code}. It expires in ${validMinutes} minutes.`,
    html: `<p>Your Health Link verification code is <strong>${code}</strong>.</p><p>This code expires in ${validMinutes} minutes.</p>`,
  });
}

function buildAllowedOrigins() {
  const defaults = ['http://127.0.0.1:5173', 'http://localhost:5173'];
  const configured = [FRONTEND_URL, ...FRONTEND_URLS.split(',')]
    .map((origin) => String(origin || '').trim())
    .filter(Boolean);

  return new Set([...defaults, ...configured]);
}

const allowedOrigins = buildAllowedOrigins();

app.use(cors({
  origin(origin, callback) {
    // Allow non-browser requests (curl, health checks, server-to-server).
    if (!origin) {
      callback(null, true);
      return;
    }

    if (allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
}));
app.use(express.json());

app.get('/', (_req, res) => {
  res.json({ status: 'running', app: 'Health Link API (Express)', version: '1.0.0' });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'healthy' });
});

app.post('/api/auth/login', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');

  if (!email || !password) {
    return res.status(400).json({ detail: 'Email and password are required' });
  }

  const allowed = DEFAULT_ACCOUNTS.find((account) => account.email.toLowerCase() === email);
  if (!allowed || allowed.password !== password) {
    return res.status(401).json({ detail: 'Invalid email or password' });
  }

  let userResult = await db.query('SELECT * FROM users WHERE email = $1 ORDER BY id ASC LIMIT 1', [email]);
  if (userResult.rows.length === 0) {
    userResult = await db.query(
      'INSERT INTO users (clerk_id, email, name, role, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING *',
      [`local-${allowed.role}-${allowed.email}`.replace(/[^a-zA-Z0-9:_-]/g, '-'), allowed.email, allowed.name, allowed.role]
    );
  }

  const user = userResult.rows[0];
  const token = signLocalToken(
    { sub: String(user.id), email: user.email, role: user.role, name: user.name || allowed.name },
    process.env.APP_AUTH_SECRET || 'dev-local-auth-secret-change-me'
  );

  return res.json({
    access_token: token,
    token_type: 'bearer',
    role: user.role,
    name: user.name || allowed.name,
    email: user.email,
  });
});

app.get('/api/auth/user', requireAuth, (req, res) => {
  const user = req.auth.user;
  res.json({
    id: user.id,
    clerk_id: user.clerk_id,
    email: user.email,
    name: user.name,
    role: user.role,
    created_at: user.created_at,
    updated_at: user.updated_at,
  });
});

app.get('/api/auth/verify-token', requireAuth, (req, res) => {
  res.json({ valid: true, user_id: req.auth.user.id, role: req.auth.user.role });
});

app.get('/api/patients', requireAuth, async (req, res) => {
  const limit = Number(req.query.limit || 10);
  const skip = Number(req.query.skip || 0);

  const result = await db.query(
    `SELECT p.*, u.email
     FROM patients p
     LEFT JOIN users u ON u.id = p.user_id
     ORDER BY p.id DESC
     LIMIT $1 OFFSET $2`,
    [limit, skip]
  );

  const data = result.rows.map((p) => ({
    ...p,
    full_name: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
    display_id: `MKN-${String(p.id).padStart(4, '0')}`,
  }));

  res.json(data);
});

app.get('/api/patients/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const result = await db.query(
    `SELECT p.*, u.email
     FROM patients p
     LEFT JOIN users u ON u.id = p.user_id
     WHERE p.id = $1
     LIMIT 1`,
    [id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ detail: 'Patient not found' });
  }

  const p = result.rows[0];
  return res.json({
    ...p,
    full_name: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
    display_id: `MKN-${String(p.id).padStart(4, '0')}`,
  });
});

app.post('/api/patients', requireAuth, async (req, res) => {
  try {
    const { full_name, first_name, last_name, phone, email } = req.body || {};
    const patientEmail = String(email || '').trim().toLowerCase();

    if (!patientEmail) {
      return res.status(400).json({ detail: 'Patient email is required' });
    }

    const existing = await db.query(
      `SELECT p.id
       FROM patients p
       INNER JOIN users u ON u.id = p.user_id
       WHERE u.email = $1
       LIMIT 1`,
      [patientEmail]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ detail: 'A patient profile already exists for this email address' });
    }

    let fName = first_name;
    let lName = last_name;
    if ((!fName || !lName) && full_name) {
      const parts = String(full_name).trim().split(' ');
      fName = parts[0] || '';
      lName = parts.slice(1).join(' ') || '';
    }

    if (!fName) {
      return res.status(422).json({ detail: 'first_name or full_name is required' });
    }

    const patientName = `${String(fName).trim()} ${String(lName || '').trim()}`.trim();
    const patientUser = await getOrCreatePatientUser({ email: patientEmail, name: patientName || fName });

    const inserted = await db.query(
      `INSERT INTO patients (user_id, first_name, last_name, phone, medical_history, blood_type, allergies, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING *`,
      [patientUser.id, fName, lName || '', phone || null, 'N/A', 'N/A', 'N/A']
    );

    const p = inserted.rows[0];
    return res.json({
      ...p,
      full_name: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
      display_id: `MKN-${String(p.id).padStart(4, '0')}`,
      email: patientUser.email,
    });
  } catch (error) {
    return res.status(500).json({ detail: `Failed to create patient: ${error.message}` });
  }
});

app.put('/api/patients/:id', requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { full_name, phone, email, medical_history, blood_type, allergies } = req.body || {};

    const exists = await db.query(
      `SELECT p.*, u.email AS patient_email, u.id AS user_id
       FROM patients p
       LEFT JOIN users u ON u.id = p.user_id
       WHERE p.id = $1
       LIMIT 1`,
      [id]
    );
    if (exists.rows.length === 0) {
      return res.status(404).json({ detail: 'Patient not found' });
    }

    const current = exists.rows[0];
    let fName = current.first_name;
    let lName = current.last_name;
    if (full_name) {
      const parts = String(full_name).trim().split(' ');
      fName = parts[0] || fName;
      lName = parts.slice(1).join(' ') || '';
    }

    let updatedEmail = current.patient_email || null;
    if (typeof email === 'string' && email.trim()) {
      updatedEmail = email.trim().toLowerCase();
      await db.query('UPDATE users SET email = $1, name = $2, updated_at = NOW() WHERE id = $3', [
        updatedEmail,
        `${String(fName || '').trim()} ${String(lName || '').trim()}`.trim(),
        current.user_id,
      ]);
    }

    const updated = await db.query(
       `UPDATE patients
       SET first_name = $1,
           last_name = $2,
           phone = COALESCE($3, phone),
           medical_history = COALESCE($4, medical_history),
           blood_type = COALESCE($5, blood_type),
           allergies = COALESCE($6, allergies),
           updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [fName, lName, phone ?? null, medical_history ?? null, blood_type ?? null, allergies ?? null, id]
    );

    const p = updated.rows[0];
    return res.json({
      ...p,
      full_name: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
      display_id: `MKN-${String(p.id).padStart(4, '0')}`,
      email: updatedEmail,
    });
  } catch (error) {
    return res.status(500).json({ detail: `Failed to update patient: ${error.message}` });
  }
});

app.delete('/api/patients/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const exists = await db.query('SELECT id FROM patients WHERE id = $1 LIMIT 1', [id]);
  if (exists.rows.length === 0) {
    return res.status(404).json({ detail: 'Patient not found' });
  }

  await db.query('DELETE FROM visits WHERE patient_id = $1', [id]);
  await db.query('DELETE FROM patients WHERE id = $1', [id]);
  return res.json({ status: 'success', message: 'Patient deleted' });
});

app.get('/api/patients/:id/visits', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const visits = await db.query(
    `SELECT v.*, c.name AS clinic_name
     FROM visits v
     LEFT JOIN clinics c ON c.id = v.clinic_id
     WHERE v.patient_id = $1
     ORDER BY v.visit_date DESC`,
    [id]
  );

  const data = visits.rows.map((v) => ({
    ...v,
    prescription: v.treatment,
    clinic_name: v.clinic_name || 'Unknown Clinic',
  }));

  return res.json(data);
});

app.post('/api/patients/:id/request-access', requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const patient = await db.query(
      `SELECT p.id, u.email
       FROM patients p
       LEFT JOIN users u ON u.id = p.user_id
       WHERE p.id = $1
       LIMIT 1`,
      [id]
    );
    if (patient.rows.length === 0) {
      return res.status(404).json({ detail: 'Patient not found' });
    }

    const patientEmail = patient.rows[0].email;
    if (!patientEmail) {
      return res.status(400).json({ detail: 'Patient does not have an email for OTP delivery' });
    }

    if (!clerkClient) {
      return res.status(500).json({ detail: 'CLERK_SECRET_KEY is missing on the server' });
    }

    const validMinutes = 5;
    const code = `${Math.floor(100000 + Math.random() * 900000)}`;
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    const expiresAt = new Date(Date.now() + validMinutes * 60 * 1000).toISOString();

    const list = await clerkClient.users.getUserList({ emailAddress: [patientEmail], limit: 1 });
    let user = list.data[0] || null;

    if (!user) {
      // Patient OTP is Clerk-backed; create a minimal user record if missing.
      user = await clerkClient.users.createUser({
        emailAddress: [patientEmail],
        skipLegalChecks: true,
        firstName: 'Patient',
        lastName: `#${id}`,
        password: `Otp!${crypto.randomBytes(12).toString('hex')}`,
      });
    }

    const currentPrivateMetadata = user.privateMetadata || {};
    await clerkClient.users.updateUser(user.id, {
      privateMetadata: {
        ...currentPrivateMetadata,
        patientAccessOtp: {
          patientId: id,
          codeHash,
          expiresAt,
          requestedByUserId: req.auth.user.id,
          requestedAt: new Date().toISOString(),
          attempts: 0,
        },
      },
    });

    await sendPatientOtpEmail({ to: patientEmail, code, validMinutes });

    return res.json({
      status: 'success',
      message: `Verification code sent to ${patientEmail}`,
      email: patientEmail,
      valid_minutes: validMinutes,
    });
  } catch (error) {
    return res.status(500).json({ detail: `Failed to send OTP email: ${error.message}` });
  }
});

app.post('/api/patients/:id/verify-access', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const code = String(req.body?.otp || '').trim();
  if (!code) {
    return res.status(400).json({ detail: 'OTP code is required' });
  }

  const patient = await db.query(
    `SELECT p.id, u.email
     FROM patients p
     LEFT JOIN users u ON u.id = p.user_id
     WHERE p.id = $1
     LIMIT 1`,
    [id]
  );
  if (patient.rows.length === 0) {
    return res.status(404).json({ detail: 'Patient not found' });
  }

  const patientEmail = patient.rows[0].email;
  if (!patientEmail) {
    return res.status(400).json({ detail: 'Patient does not have an email for OTP verification' });
  }

  if (!clerkClient) {
    return res.status(500).json({ detail: 'CLERK_SECRET_KEY is missing on the server' });
  }

  const list = await clerkClient.users.getUserList({ emailAddress: [patientEmail], limit: 1 });
  const user = list.data[0] || null;
  if (!user) {
    return res.json({ message: 'No OTP challenge found. Request access first.', access_granted: false });
  }

  const otpState = user.privateMetadata?.patientAccessOtp;
  if (!otpState || Number(otpState.patientId) !== id) {
    return res.json({ message: 'No OTP challenge found. Request access first.', access_granted: false });
  }

  const expiresAt = Date.parse(String(otpState.expiresAt || ''));
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) {
    await clerkClient.users.updateUser(user.id, {
      privateMetadata: {
        ...(user.privateMetadata || {}),
        patientAccessOtp: null,
      },
    });
    return res.json({ message: 'OTP expired. Request a new code.', access_granted: false });
  }

  const suppliedHash = crypto.createHash('sha256').update(code).digest('hex');
  if (suppliedHash !== otpState.codeHash) {
    const attempts = Number(otpState.attempts || 0) + 1;
    await clerkClient.users.updateUser(user.id, {
      privateMetadata: {
        ...(user.privateMetadata || {}),
        patientAccessOtp: {
          ...otpState,
          attempts,
        },
      },
    });
    return res.json({ message: 'Invalid OTP.', access_granted: false });
  }

  await clerkClient.users.updateUser(user.id, {
    privateMetadata: {
      ...(user.privateMetadata || {}),
      patientAccessOtp: null,
    },
  });

  return res.json({ message: 'Access granted for this session.', access_granted: true });
});

app.get('/api/clinics', requireAuth, async (req, res) => {
  const limit = Number(req.query.limit || 10);
  const skip = Number(req.query.skip || 0);
  const clinics = await db.query(
    'SELECT * FROM clinics ORDER BY id DESC LIMIT $1 OFFSET $2',
    [limit, skip]
  );

  const data = clinics.rows.map((c) => ({
    ...c,
    clinic_name: c.name,
    contact_phone: c.phone,
  }));
  res.json(data);
});

app.get('/api/clinics/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const clinic = await db.query('SELECT * FROM clinics WHERE id = $1 LIMIT 1', [id]);
  if (clinic.rows.length === 0) {
    return res.status(404).json({ detail: 'Clinic not found' });
  }
  const c = clinic.rows[0];
  return res.json({ ...c, clinic_name: c.name, contact_phone: c.phone });
});

app.post('/api/clinics', requireAuth, async (req, res) => {
  const { clinic_name, name, location, contact_phone, phone, address, email, website } = req.body || {};
  const inserted = await db.query(
    `INSERT INTO clinics (name, location, phone, address, email, website, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
     RETURNING *`,
    [clinic_name || name || 'Unnamed Clinic', location || null, contact_phone || phone || null, address || null, email || null, website || null]
  );
  const c = inserted.rows[0];
  return res.json({ ...c, clinic_name: c.name, contact_phone: c.phone });
});

app.put('/api/clinics/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const { clinic_name, name, location, contact_phone, phone } = req.body || {};
  const exists = await db.query('SELECT * FROM clinics WHERE id = $1 LIMIT 1', [id]);
  if (exists.rows.length === 0) {
    return res.status(404).json({ detail: 'Clinic not found' });
  }
  const cur = exists.rows[0];
  const updated = await db.query(
    `UPDATE clinics
     SET name = $1,
         location = $2,
         phone = $3,
         updated_at = NOW()
     WHERE id = $4
     RETURNING *`,
    [clinic_name || name || cur.name, location ?? cur.location, contact_phone || phone || cur.phone, id]
  );
  const c = updated.rows[0];
  return res.json({ ...c, clinic_name: c.name, contact_phone: c.phone });
});

app.delete('/api/clinics/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const exists = await db.query('SELECT id FROM clinics WHERE id = $1 LIMIT 1', [id]);
  if (exists.rows.length === 0) {
    return res.status(404).json({ detail: 'Clinic not found' });
  }
  await db.query('DELETE FROM clinics WHERE id = $1', [id]);
  return res.json({ status: 'success', message: 'Clinic deleted' });
});

app.get('/api/visits', requireAuth, async (req, res) => {
  const limit = Number(req.query.limit || 10);
  const skip = Number(req.query.skip || 0);
  const patientId = req.query.patient_id ? Number(req.query.patient_id) : null;
  const clinicId = req.query.clinic_id ? Number(req.query.clinic_id) : null;

  const clauses = [];
  const params = [];
  if (patientId) {
    params.push(patientId);
    clauses.push(`v.patient_id = $${params.length}`);
  }
  if (clinicId) {
    params.push(clinicId);
    clauses.push(`v.clinic_id = $${params.length}`);
  }

  params.push(limit);
  const limitIdx = params.length;
  params.push(skip);
  const skipIdx = params.length;

  const whereSql = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const visits = await db.query(
    `SELECT v.*, c.name AS clinic_name, p.first_name, p.last_name
     FROM visits v
     LEFT JOIN clinics c ON c.id = v.clinic_id
     LEFT JOIN patients p ON p.id = v.patient_id
     ${whereSql}
     ORDER BY v.visit_date DESC
     LIMIT $${limitIdx} OFFSET $${skipIdx}`,
    params
  );

  const data = visits.rows.map((v) => ({
    ...v,
    prescription: v.treatment,
    patient_name: `${v.first_name || ''} ${v.last_name || ''}`.trim() || 'Unknown Patient',
    patient_display_id: `MKN-${String(v.patient_id).padStart(4, '0')}`,
    clinic_name: v.clinic_name || 'Unknown Clinic',
  }));

  res.json(data);
});

app.get('/api/visits/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const visit = await db.query('SELECT * FROM visits WHERE id = $1 LIMIT 1', [id]);
  if (visit.rows.length === 0) {
    return res.status(404).json({ detail: 'Visit not found' });
  }
  const v = visit.rows[0];
  return res.json({ ...v, prescription: v.treatment });
});

app.post('/api/visits', requireAuth, async (req, res) => {
  const { patient_id, clinic_id, visit_date, reason, diagnosis, prescription, treatment, notes } = req.body || {};
  if (!patient_id || !clinic_id || !visit_date) {
    return res.status(422).json({ detail: 'patient_id, clinic_id, and visit_date are required' });
  }

  const patient = await db.query('SELECT * FROM patients WHERE id = $1 LIMIT 1', [Number(patient_id)]);
  if (patient.rows.length === 0) {
    return res.status(404).json({ detail: 'Patient not found' });
  }
  const clinic = await db.query('SELECT * FROM clinics WHERE id = $1 LIMIT 1', [Number(clinic_id)]);
  if (clinic.rows.length === 0) {
    return res.status(404).json({ detail: 'Clinic not found' });
  }

  const inserted = await db.query(
    `INSERT INTO visits (patient_id, clinic_id, user_id, visit_date, reason, diagnosis, treatment, notes, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
     RETURNING *`,
    [Number(patient_id), Number(clinic_id), req.auth.user.id, visit_date, reason || '', diagnosis || '', prescription || treatment || '', notes || '']
  );

  const v = inserted.rows[0];
  return res.json({
    ...v,
    prescription: v.treatment,
    patient_name: `${patient.rows[0].first_name || ''} ${patient.rows[0].last_name || ''}`.trim(),
    patient_display_id: `MKN-${String(v.patient_id).padStart(4, '0')}`,
    clinic_name: clinic.rows[0].name,
  });
});

app.put('/api/visits/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const { reason, diagnosis, prescription, treatment, notes } = req.body || {};

  const exists = await db.query('SELECT * FROM visits WHERE id = $1 LIMIT 1', [id]);
  if (exists.rows.length === 0) {
    return res.status(404).json({ detail: 'Visit not found' });
  }

  const cur = exists.rows[0];
  const updated = await db.query(
    `UPDATE visits
     SET reason = COALESCE($1, reason),
         diagnosis = COALESCE($2, diagnosis),
         treatment = COALESCE($3, treatment),
         notes = COALESCE($4, notes),
         updated_at = NOW()
     WHERE id = $5
     RETURNING *`,
    [reason ?? null, diagnosis ?? null, prescription || treatment || null, notes ?? null, id]
  );

  const v = updated.rows[0];
  return res.json({ ...v, prescription: v.treatment });
});

app.delete('/api/visits/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const exists = await db.query('SELECT id FROM visits WHERE id = $1 LIMIT 1', [id]);
  if (exists.rows.length === 0) {
    return res.status(404).json({ detail: 'Visit not found' });
  }

  await db.query('DELETE FROM visits WHERE id = $1', [id]);
  return res.json({ status: 'success', message: 'Visit deleted' });
});

async function start() {
  const seedOnStart = String(process.env.SEED_ON_START || 'true').toLowerCase() !== 'false';
  if (seedOnStart) {
    try {
      await seedDefaultAccounts();
    } catch (error) {
      console.warn('Default account seeding failed. Starting API without startup seed:', error.message || error);
    }
  } else {
    console.log('Skipping default account seeding because SEED_ON_START=false');
  }

  app.listen(PORT, () => {
    console.log(`Express backend running on http://127.0.0.1:${PORT}`);
  });
}

start().catch((error) => {
  console.error('Failed to start Express backend:', error);
  process.exit(1);
});
