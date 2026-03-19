from datetime import datetime
from typing import List, Optional

from fastapi import Depends, FastAPI, HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from . import auth, database, models, schemas
from fastapi.middleware.cors import CORSMiddleware


def migrate_legacy_sqlite_schema():
    with database.engine.begin() as conn:
        table_rows = conn.exec_driver_sql("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
        tables = {row[0] for row in table_rows}

        def columns_for(table_name: str):
            rows = conn.exec_driver_sql(f"PRAGMA table_info({table_name})").fetchall()
            return {row[1] for row in rows}

        if "users" in tables:
            user_columns = columns_for("users")
            if "full_name" not in user_columns:
                conn.exec_driver_sql("ALTER TABLE users ADD COLUMN full_name VARCHAR")
            conn.exec_driver_sql("UPDATE users SET full_name = COALESCE(full_name, username)")

        if "patients" in tables:
            patient_columns = columns_for("patients")
            if "created_by_id" not in patient_columns:
                conn.exec_driver_sql("ALTER TABLE patients ADD COLUMN created_by_id INTEGER")
            conn.exec_driver_sql(
                """
                UPDATE patients
                SET created_by_id = COALESCE(
                    created_by_id,
                    (SELECT id FROM users WHERE username = 'staff' LIMIT 1),
                    (SELECT id FROM users LIMIT 1)
                )
                """
            )

        if "clinics" in tables:
            clinic_columns = columns_for("clinics")
            if "clinic_name" not in clinic_columns:
                conn.exec_driver_sql("ALTER TABLE clinics ADD COLUMN clinic_name VARCHAR")
            if "contact_phone" not in clinic_columns:
                conn.exec_driver_sql("ALTER TABLE clinics ADD COLUMN contact_phone VARCHAR")
            if "name" in clinic_columns:
                conn.exec_driver_sql("UPDATE clinics SET clinic_name = COALESCE(clinic_name, name)")
            if "phone" in clinic_columns:
                conn.exec_driver_sql("UPDATE clinics SET contact_phone = COALESCE(contact_phone, phone)")

        if "visits" in tables:
            visit_columns = columns_for("visits")
            if "visit_date" not in visit_columns:
                conn.exec_driver_sql("ALTER TABLE visits ADD COLUMN visit_date DATETIME")
            if "created_by_id" not in visit_columns:
                conn.exec_driver_sql("ALTER TABLE visits ADD COLUMN created_by_id INTEGER")
            if "date" in visit_columns:
                conn.exec_driver_sql("UPDATE visits SET visit_date = COALESCE(visit_date, date)")
            if "user_id" in visit_columns:
                conn.exec_driver_sql("UPDATE visits SET created_by_id = COALESCE(created_by_id, user_id)")


migrate_legacy_sqlite_schema()
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Health Link API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])


def require_admin(current_user: models.User):
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")


def to_visit_expanded(visit: models.Visit) -> schemas.VisitExpanded:
    return schemas.VisitExpanded(
        id=visit.id,
        diagnosis=visit.diagnosis,
        prescription=visit.prescription,
        notes=visit.notes,
        visit_date=visit.visit_date,
        patient_id=visit.patient_id,
        clinic_id=visit.clinic_id,
        created_by_id=visit.created_by_id,
        patient_name=visit.patient.full_name if visit.patient else "Unknown Patient",
        patient_display_id=visit.patient.display_id if visit.patient else "Unknown",
        clinic_name=visit.clinic.clinic_name if visit.clinic else "Unknown Clinic",
    )


def seed_data_if_needed():
    db = database.SessionLocal()
    try:
        admin = db.query(models.User).filter(models.User.username == "admin").first()
        if not admin:
            admin = models.User(
                username="admin",
                password_hash="admin123",
                role="admin",
                full_name="System Administrator",
            )
            db.add(admin)
        else:
            admin.password_hash = "admin123"
            admin.role = "admin"
            admin.full_name = admin.full_name or "System Administrator"

        staff = db.query(models.User).filter(models.User.username == "staff").first()
        if not staff:
            staff = models.User(
                username="staff",
                password_hash="staff123",
                role="staff",
                full_name="Clinic Staff",
            )
            db.add(staff)
        else:
            staff.password_hash = "staff123"
            staff.role = "staff"
            staff.full_name = staff.full_name or "Clinic Staff"

        db.commit()
        db.refresh(admin)
        db.refresh(staff)

        if db.query(models.Clinic).count() == 0:
            db.add_all(
                [
                    models.Clinic(clinic_name="Mercy Clinic", location="Mukono", contact_phone="0700001001"),
                    models.Clinic(clinic_name="Mukono Family Clinic", location="Mukono", contact_phone="0700001002"),
                    models.Clinic(clinic_name="Bugujju HC", location="Bugujju", contact_phone="0700001003"),
                ]
            )

        if db.query(models.Patient).count() == 0:
            db.add_all(
                [
                    models.Patient(
                        display_id="MKN-001",
                        full_name="Nakato Sarah",
                        phone="0781234567",
                        email="sarah@test.com",
                        created_by_id=staff.id,
                    ),
                    models.Patient(
                        display_id="MKN-002",
                        full_name="Okello John",
                        phone="0782345678",
                        email="john@test.com",
                        created_by_id=staff.id,
                    ),
                    models.Patient(
                        display_id="MKN-003",
                        full_name="Ouma Peter",
                        phone="0783456789",
                        email="peter@test.com",
                        created_by_id=staff.id,
                    ),
                ]
            )

        db.commit()

        if db.query(models.Visit).count() == 0:
            p1 = db.query(models.Patient).filter(models.Patient.display_id == "MKN-001").first()
            p2 = db.query(models.Patient).filter(models.Patient.display_id == "MKN-002").first()
            c1 = db.query(models.Clinic).filter(models.Clinic.clinic_name == "Mercy Clinic").first()
            c2 = db.query(models.Clinic).filter(models.Clinic.clinic_name == "Mukono Family Clinic").first()
            c3 = db.query(models.Clinic).filter(models.Clinic.clinic_name == "Bugujju HC").first()
            if p1 and p2 and c1 and c2 and c3:
                db.add_all(
                    [
                        models.Visit(
                            patient_id=p1.id,
                            clinic_id=c1.id,
                            diagnosis="Malaria",
                            prescription="Artemether-Lumefantrine",
                            notes="Initial diagnosis in triage.",
                            visit_date=datetime(2026, 3, 15),
                            created_by_id=staff.id,
                        ),
                        models.Visit(
                            patient_id=p1.id,
                            clinic_id=c3.id,
                            diagnosis="Cough",
                            prescription="Cough syrup",
                            notes="Follow-up advised.",
                            visit_date=datetime(2026, 1, 10),
                            created_by_id=staff.id,
                        ),
                        models.Visit(
                            patient_id=p2.id,
                            clinic_id=c2.id,
                            diagnosis="Malaria",
                            prescription="Coartem",
                            notes="Patient responded well.",
                            visit_date=datetime(2026, 3, 10),
                            created_by_id=staff.id,
                        ),
                    ]
                )
                db.commit()
    finally:
        db.close()


seed_data_if_needed()

@app.get("/")
def read_root():
    return {"message": "Welcome to Health Link API", "status": "ok"}


@app.get("/dashboard/stats")
def get_dashboard_stats(
    db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)
):
    return {
        "patients": db.query(models.Patient).count(),
        "visits": db.query(models.Visit).count(),
        "clinics": db.query(models.Clinic).count(),
        "role": current_user.role,
    }

@app.get("/patients", response_model=List[schemas.Patient])
def get_patients(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    patients = db.query(models.Patient).offset(skip).limit(limit).all()
    return patients


@app.get("/patients/{patient_id}", response_model=schemas.Patient)
def get_patient(patient_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient

@app.post("/patients", response_model=schemas.Patient)
def create_patient(
    patient: schemas.PatientCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    count = db.query(models.Patient).count()
    display_id = f"MKN-{count + 1:03d}"

    db_patient = models.Patient(**patient.model_dump(), display_id=display_id, created_by_id=current_user.id)
    db.add(db_patient)
    db.commit()
    db.refresh(db_patient)
    return db_patient


@app.put("/patients/{patient_id}", response_model=schemas.Patient)
def update_patient(
    patient_id: int,
    patient_update: schemas.PatientUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    require_admin(current_user)
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    for key, value in patient_update.model_dump(exclude_unset=True).items():
        setattr(patient, key, value)
    db.commit()
    db.refresh(patient)
    return patient


@app.delete("/patients/{patient_id}", response_model=schemas.MessageResponse)
def delete_patient(
    patient_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    require_admin(current_user)
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    db.query(models.Visit).filter(models.Visit.patient_id == patient_id).delete()
    db.delete(patient)
    db.commit()
    return {"message": "Patient deleted"}


@app.get("/patients/{patient_id}/visits", response_model=List[schemas.VisitExpanded])
def get_patient_visits(
    patient_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    visits = (
        db.query(models.Visit)
        .filter(models.Visit.patient_id == patient_id)
        .order_by(models.Visit.visit_date.desc())
        .all()
    )
    return [to_visit_expanded(v) for v in visits]


@app.post("/patients/{patient_id}/request-access", response_model=schemas.OtpResponse)
def request_patient_access(
    patient_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return {
        "message": "OTP email dispatched (prototype placeholder)",
        "email_to": patient.email,
        "otp_preview": "48291",
        "valid_minutes": 5,
    }

@app.get("/clinics", response_model=List[schemas.Clinic])
def get_clinics(db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.Clinic).all()

@app.post("/clinics", response_model=schemas.Clinic)
def create_clinic(
    clinic: schemas.ClinicCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    require_admin(current_user)
    db_clinic = models.Clinic(**clinic.model_dump())
    db.add(db_clinic)
    db.commit()
    db.refresh(db_clinic)
    return db_clinic


@app.put("/clinics/{clinic_id}", response_model=schemas.Clinic)
def update_clinic(
    clinic_id: int,
    clinic_update: schemas.ClinicUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    require_admin(current_user)
    clinic = db.query(models.Clinic).filter(models.Clinic.id == clinic_id).first()
    if not clinic:
        raise HTTPException(status_code=404, detail="Clinic not found")
    for key, value in clinic_update.model_dump(exclude_unset=True).items():
        setattr(clinic, key, value)
    db.commit()
    db.refresh(clinic)
    return clinic


@app.delete("/clinics/{clinic_id}", response_model=schemas.MessageResponse)
def delete_clinic(
    clinic_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    require_admin(current_user)
    clinic = db.query(models.Clinic).filter(models.Clinic.id == clinic_id).first()
    if not clinic:
        raise HTTPException(status_code=404, detail="Clinic not found")
    has_visits = db.query(models.Visit).filter(models.Visit.clinic_id == clinic_id).first()
    if has_visits:
        raise HTTPException(status_code=400, detail="Cannot delete clinic with existing visits")
    db.delete(clinic)
    db.commit()
    return {"message": "Clinic deleted"}

@app.get("/visits", response_model=List[schemas.VisitExpanded])
def get_visits(
    search: Optional[str] = None,
    clinic_id: Optional[int] = None,
    patient_id: Optional[int] = None,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    require_admin(current_user)
    query = db.query(models.Visit)
    if clinic_id:
        query = query.filter(models.Visit.clinic_id == clinic_id)
    if patient_id:
        query = query.filter(models.Visit.patient_id == patient_id)
    visits = query.order_by(models.Visit.visit_date.desc()).all()
    expanded = [to_visit_expanded(v) for v in visits]
    if search:
        needle = search.lower()
        expanded = [
            v
            for v in expanded
            if needle in v.patient_name.lower()
            or needle in v.patient_display_id.lower()
            or needle in v.clinic_name.lower()
            or needle in v.diagnosis.lower()
        ]
    return expanded

@app.post("/visits", response_model=schemas.Visit)
def create_visit(
    visit: schemas.VisitCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    patient = db.query(models.Patient).filter(models.Patient.id == visit.patient_id).first()
    clinic = db.query(models.Clinic).filter(models.Clinic.id == visit.clinic_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    if not clinic:
        raise HTTPException(status_code=404, detail="Clinic not found")
    payload = visit.model_dump()
    if not payload.get("visit_date"):
        payload["visit_date"] = datetime.utcnow()
    db_visit = models.Visit(**payload, created_by_id=current_user.id)
    db.add(db_visit)
    db.commit()
    db.refresh(db_visit)
    return db_visit


@app.put("/visits/{visit_id}", response_model=schemas.Visit)
def update_visit(
    visit_id: int,
    visit_update: schemas.VisitUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    require_admin(current_user)
    visit = db.query(models.Visit).filter(models.Visit.id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    for key, value in visit_update.model_dump(exclude_unset=True).items():
        setattr(visit, key, value)
    db.commit()
    db.refresh(visit)
    return visit


@app.delete("/visits/{visit_id}", response_model=schemas.MessageResponse)
def delete_visit(
    visit_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    require_admin(current_user)
    visit = db.query(models.Visit).filter(models.Visit.id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    db.delete(visit)
    db.commit()
    return {"message": "Visit deleted"}
