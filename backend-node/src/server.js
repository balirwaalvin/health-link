const path = require('path');
const crypto = require('crypto');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });
if (!process.env.PORT) {
  dotenv.config({ path: path.join(__dirname, '..', '..', 'backend', '.env') });
}

const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const { requireAuth } = require('./auth');
const store = require('./appwriteStore');
const { seedDefaultAccounts } = require('./seedAccounts');

const app = express();
const PORT = Number(process.env.PORT || 8000);
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://127.0.0.1:5173';
const FRONTEND_URLS = String(process.env.FRONTEND_URLS || '');
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

function normalizeName(fullName = '') {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' ') || '',
  };
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
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
}));
app.use(express.json());

app.get('/', (_req, res) => {
  res.json({ status: 'running', app: 'Health Link API (Express + Appwrite)', version: '2.0.0' });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'healthy' });
});

app.post('/api/auth/login', (_req, res) => {
  return res.status(400).json({
    detail: 'Direct backend login is disabled. Sign in through Appwrite auth from the frontend.',
  });
});

app.get('/api/auth/user', requireAuth, (req, res) => {
  const user = req.auth.user;
  res.json(user);
});

app.get('/api/auth/verify-token', requireAuth, (req, res) => {
  res.json({ valid: true, user_id: req.auth.user.id, role: req.auth.user.role });
});

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

function toPatientResponse(patient) {
  return {
    ...patient,
    full_name: `${patient.first_name || ''} ${patient.last_name || ''}`.trim(),
    display_id: `MKN-${String(patient.id).padStart(4, '0')}`,
  };
}

app.get('/api/patients', requireAuth, async (req, res) => {
  const limit = Number(req.query.limit || 10);
  const skip = Number(req.query.skip || 0);

  const patients = await store.listPatients({ limit, skip });
  return res.json(patients.map(toPatientResponse));
});

app.get('/api/patients/:id', requireAuth, async (req, res) => {
  const patient = await store.getPatientById(Number(req.params.id));
  if (!patient) {
    return res.status(404).json({ detail: 'Patient not found' });
  }
  return res.json(toPatientResponse(patient));
});

app.post('/api/patients', requireAuth, async (req, res) => {
  try {
    const { full_name, first_name, last_name, phone, email } = req.body || {};
    const patientEmail = String(email || '').trim().toLowerCase();

    if (!patientEmail) {
      return res.status(400).json({ detail: 'Patient email is required' });
    }

    const existingPatient = await store.findPatientByEmail(patientEmail);
    if (existingPatient) {
      return res.status(400).json({ detail: 'A patient profile already exists for this email address' });
    }

    const parsedName = (!first_name && !last_name) ? normalizeName(full_name) : {
      firstName: first_name,
      lastName: last_name,
    };

    if (!parsedName.firstName) {
      return res.status(422).json({ detail: 'first_name or full_name is required' });
    }

    const patientName = `${String(parsedName.firstName).trim()} ${String(parsedName.lastName || '').trim()}`.trim();

    const patientUser = await store.upsertUser({
      email: patientEmail,
      name: patientName,
      role: 'patient',
    });

    const created = await store.createPatient({
      user_id: patientUser.id,
      first_name: parsedName.firstName,
      last_name: parsedName.lastName || '',
      phone: phone || null,
      medical_history: 'N/A',
      blood_type: 'N/A',
      allergies: 'N/A',
    });

    return res.json(toPatientResponse(created));
  } catch (error) {
    return res.status(500).json({ detail: `Failed to create patient: ${error.message}` });
  }
});

app.put('/api/patients/:id', requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const current = await store.getPatientById(id);
    if (!current) {
      return res.status(404).json({ detail: 'Patient not found' });
    }

    const { full_name, phone, email, medical_history, blood_type, allergies } = req.body || {};

    let firstName = current.first_name;
    let lastName = current.last_name;
    if (full_name) {
      const parsed = normalizeName(full_name);
      firstName = parsed.firstName || firstName;
      lastName = parsed.lastName || lastName;
    }

    let nextUserId = current.user_id;
    if (typeof email === 'string' && email.trim()) {
      const normalizedEmail = email.trim().toLowerCase();
      const nextName = `${String(firstName || '').trim()} ${String(lastName || '').trim()}`.trim();
      const user = await store.upsertUser({
        email: normalizedEmail,
        name: nextName,
        role: 'patient',
      });
      nextUserId = user.id;
    }

    const updated = await store.updatePatient(id, {
      first_name: firstName,
      last_name: lastName,
      phone: phone ?? current.phone,
      medical_history: medical_history ?? current.medical_history,
      blood_type: blood_type ?? current.blood_type,
      allergies: allergies ?? current.allergies,
      user_id: nextUserId,
    });

    return res.json(toPatientResponse(updated));
  } catch (error) {
    return res.status(500).json({ detail: `Failed to update patient: ${error.message}` });
  }
});

app.delete('/api/patients/:id', requireAuth, async (req, res) => {
  const deleted = await store.deletePatient(Number(req.params.id));
  if (!deleted) {
    return res.status(404).json({ detail: 'Patient not found' });
  }
  return res.json({ status: 'success', message: 'Patient deleted' });
});

app.get('/api/patients/:id/visits', requireAuth, async (req, res) => {
  const patientId = Number(req.params.id);
  const visits = await store.listVisitsByPatientId(patientId);

  const rows = await Promise.all(visits.map(async (visit) => {
    const clinic = await store.getClinicById(visit.clinic_id);
    return {
      ...visit,
      prescription: visit.treatment,
      clinic_name: clinic?.name || 'Unknown Clinic',
    };
  }));

  return res.json(rows);
});

app.post('/api/patients/:id/request-access', requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const patient = await store.getPatientById(id);
    if (!patient) {
      return res.status(404).json({ detail: 'Patient not found' });
    }

    if (!patient.email) {
      return res.status(400).json({ detail: 'Patient does not have an email for OTP delivery' });
    }

    const validMinutes = 5;
    const code = `${Math.floor(100000 + Math.random() * 900000)}`;
    const codeHash = await store.hashOtp(code);
    const expiresAt = new Date(Date.now() + validMinutes * 60 * 1000).toISOString();

    await store.setOtpChallenge(id, {
      patientId: id,
      patientEmail: patient.email,
      codeHash,
      expiresAt,
      requestedByUserId: req.auth.user.id,
      requestedAt: new Date().toISOString(),
      attempts: 0,
    });

    await sendPatientOtpEmail({ to: patient.email, code, validMinutes });

    return res.json({
      status: 'success',
      message: `Verification code sent to ${patient.email}`,
      email: patient.email,
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

  const challenge = await store.getOtpChallenge(id);
  if (!challenge || Number(challenge.patientId) !== id) {
    return res.json({ message: 'No OTP challenge found. Request access first.', access_granted: false });
  }

  const expiresAt = Date.parse(String(challenge.expiresAt || ''));
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) {
    await store.clearOtpChallenge(id);
    return res.json({ message: 'OTP expired. Request a new code.', access_granted: false });
  }

  const suppliedHash = crypto.createHash('sha256').update(code).digest('hex');
  if (suppliedHash !== challenge.codeHash) {
    await store.setOtpChallenge(id, {
      ...challenge,
      attempts: Number(challenge.attempts || 0) + 1,
    });
    return res.json({ message: 'Invalid OTP.', access_granted: false });
  }

  await store.clearOtpChallenge(id);
  return res.json({ message: 'Access granted for this session.', access_granted: true });
});

app.get('/api/clinics', requireAuth, async (req, res) => {
  const limit = Number(req.query.limit || 10);
  const skip = Number(req.query.skip || 0);
  const clinics = await store.listClinics({ limit, skip });

  const data = clinics.map((clinic) => ({
    ...clinic,
    clinic_name: clinic.name,
    contact_phone: clinic.phone,
  }));

  return res.json(data);
});

app.get('/api/clinics/:id', requireAuth, async (req, res) => {
  const clinic = await store.getClinicById(Number(req.params.id));
  if (!clinic) {
    return res.status(404).json({ detail: 'Clinic not found' });
  }

  return res.json({ ...clinic, clinic_name: clinic.name, contact_phone: clinic.phone });
});

app.post('/api/clinics', requireAuth, async (req, res) => {
  const { clinic_name, name, location, contact_phone, phone, address, email, website } = req.body || {};
  const clinic = await store.createClinic({
    name: clinic_name || name || 'Unnamed Clinic',
    location: location || null,
    phone: contact_phone || phone || null,
    address: address || null,
    email: email || null,
    website: website || null,
  });
  return res.json({ ...clinic, clinic_name: clinic.name, contact_phone: clinic.phone });
});

app.put('/api/clinics/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const existing = await store.getClinicById(id);
  if (!existing) {
    return res.status(404).json({ detail: 'Clinic not found' });
  }

  const { clinic_name, name, location, contact_phone, phone, address, email, website } = req.body || {};
  const clinic = await store.updateClinic(id, {
    name: clinic_name || name || existing.name,
    location: location ?? existing.location,
    phone: contact_phone || phone || existing.phone,
    address: address ?? existing.address,
    email: email ?? existing.email,
    website: website ?? existing.website,
  });

  return res.json({ ...clinic, clinic_name: clinic.name, contact_phone: clinic.phone });
});

app.delete('/api/clinics/:id', requireAuth, async (req, res) => {
  const deleted = await store.deleteClinic(Number(req.params.id));
  if (!deleted) {
    return res.status(404).json({ detail: 'Clinic not found' });
  }

  return res.json({ status: 'success', message: 'Clinic deleted' });
});

app.get('/api/visits', requireAuth, async (req, res) => {
  const limit = Number(req.query.limit || 10);
  const skip = Number(req.query.skip || 0);
  const patientId = req.query.patient_id ? Number(req.query.patient_id) : null;
  const clinicId = req.query.clinic_id ? Number(req.query.clinic_id) : null;

  const visits = await store.listVisits({
    limit,
    skip,
    patientId,
    clinicId,
  });

  const enriched = await Promise.all(visits.map(async (visit) => {
    const clinic = await store.getClinicById(visit.clinic_id);
    const patient = await store.getPatientById(visit.patient_id);

    return {
      ...visit,
      prescription: visit.treatment,
      patient_name: `${patient?.first_name || ''} ${patient?.last_name || ''}`.trim() || 'Unknown Patient',
      patient_display_id: `MKN-${String(visit.patient_id).padStart(4, '0')}`,
      clinic_name: clinic?.name || 'Unknown Clinic',
    };
  }));

  return res.json(enriched);
});

app.get('/api/visits/:id', requireAuth, async (req, res) => {
  const visit = await store.getVisitById(Number(req.params.id));
  if (!visit) {
    return res.status(404).json({ detail: 'Visit not found' });
  }

  return res.json({ ...visit, prescription: visit.treatment });
});

app.post('/api/visits', requireAuth, async (req, res) => {
  const { patient_id, clinic_id, visit_date, reason, diagnosis, prescription, treatment, notes } = req.body || {};
  if (!patient_id || !clinic_id || !visit_date) {
    return res.status(422).json({ detail: 'patient_id, clinic_id, and visit_date are required' });
  }

  const patient = await store.getPatientById(Number(patient_id));
  if (!patient) {
    return res.status(404).json({ detail: 'Patient not found' });
  }

  const clinic = await store.getClinicById(Number(clinic_id));
  if (!clinic) {
    return res.status(404).json({ detail: 'Clinic not found' });
  }

  const visit = await store.createVisit({
    patient_id: Number(patient_id),
    clinic_id: Number(clinic_id),
    user_id: req.auth.user.id,
    visit_date,
    reason: reason || '',
    diagnosis: diagnosis || '',
    treatment: prescription || treatment || '',
    notes: notes || '',
  });

  return res.json({
    ...visit,
    prescription: visit.treatment,
    patient_name: `${patient.first_name || ''} ${patient.last_name || ''}`.trim(),
    patient_display_id: `MKN-${String(visit.patient_id).padStart(4, '0')}`,
    clinic_name: clinic.name,
  });
});

app.put('/api/visits/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const { reason, diagnosis, prescription, treatment, notes } = req.body || {};

  const visit = await store.updateVisit(id, {
    reason: reason ?? null,
    diagnosis: diagnosis ?? null,
    treatment: prescription || treatment || null,
    notes: notes ?? null,
  });

  if (!visit) {
    return res.status(404).json({ detail: 'Visit not found' });
  }

  return res.json({ ...visit, prescription: visit.treatment });
});

app.delete('/api/visits/:id', requireAuth, async (req, res) => {
  const deleted = await store.deleteVisit(Number(req.params.id));
  if (!deleted) {
    return res.status(404).json({ detail: 'Visit not found' });
  }

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
