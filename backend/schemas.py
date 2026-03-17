from pydantic import BaseModel
from typing import List, Optional
import datetime

class UserBase(BaseModel):
    username: str

class UserCreate(UserBase):
    password: str
    role: str = "staff"

class User(UserBase):
    id: int
    role: str
    class Config:
        from_attributes = True

class PatientBase(BaseModel):
    full_name: str
    phone: str
    email: Optional[str] = None

class PatientCreate(PatientBase):
    pass

class Patient(PatientBase):
    id: int
    display_id: str
    class Config:
        from_attributes = True

class ClinicBase(BaseModel):
    name: str
    location: str
    phone: str

class ClinicCreate(ClinicBase):
    pass

class Clinic(ClinicBase):
    id: int
    class Config:
        from_attributes = True

class VisitBase(BaseModel):
    diagnosis: str
    prescription: str
    notes: Optional[str] = None
    date: datetime.datetime

class VisitCreate(VisitBase):
    patient_id: int
    clinic_id: int

class Visit(VisitBase):
    id: int
    patient_id: int
    clinic_id: int
    user_id: int
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
