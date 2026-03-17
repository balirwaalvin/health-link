from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy.orm import Session
from . import models, schemas, database, auth
from fastapi.middleware.cors import CORSMiddleware
from typing import List

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

@app.get("/")
def read_root():
    return {"message": "Welcome to Health Link API"}

@app.get("/patients", response_model=List[schemas.Patient])
def get_patients(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    patients = db.query(models.Patient).offset(skip).limit(limit).all()
    return patients

@app.post("/patients", response_model=schemas.Patient)
def create_patient(patient: schemas.PatientCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    db_patient = models.Patient(**patient.model_dump())
    db.add(db_patient)
    db.commit()
    db.refresh(db_patient)
    return db_patient

@app.get("/clinics", response_model=List[schemas.Clinic])
def get_clinics(db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.Clinic).all()

@app.post("/clinics", response_model=schemas.Clinic)
def create_clinic(clinic: schemas.ClinicCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    db_clinic = models.Clinic(**clinic.model_dump())
    db.add(db_clinic)
    db.commit()
    db.refresh(db_clinic)
    return db_clinic

@app.get("/visits", response_model=List[schemas.Visit])
def get_visits(db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.Visit).all()

@app.post("/visits", response_model=schemas.Visit)
def create_visit(visit: schemas.VisitCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    db_visit = models.Visit(**visit.model_dump())
    db.add(db_visit)
    db.commit()
    db.refresh(db_visit)
    return db_visit
