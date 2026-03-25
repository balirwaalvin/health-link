from pydantic import BaseModel
from typing import List, Optional
import datetime

class UserBase(BaseModel):
    username: str
    full_name: str

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
    created_by_id: int
    class Config:
        from_attributes = True

class ClinicBase(BaseModel):
    clinic_name: str
    location: str
    contact_phone: str

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
    visit_date: Optional[datetime.datetime] = None

class VisitCreate(VisitBase):
    patient_id: int
    clinic_id: int

class Visit(VisitBase):
    id: int
    patient_id: int
    clinic_id: int
    created_by_id: int
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    full_name: Optional[str] = None


class MessageResponse(BaseModel):
    message: str


class OtpResponse(BaseModel):
    message: str
    email_to: Optional[str] = None
    otp_preview: str
    valid_minutes: int


class OtpVerifyRequest(BaseModel):
    otp: str


class OtpVerifyResponse(BaseModel):
    message: str
    access_granted: bool


class PatientUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None


class ClinicUpdate(BaseModel):
    clinic_name: Optional[str] = None
    location: Optional[str] = None
    contact_phone: Optional[str] = None


class VisitUpdate(BaseModel):
    diagnosis: Optional[str] = None
    prescription: Optional[str] = None
    notes: Optional[str] = None
    visit_date: Optional[datetime.datetime] = None
    patient_id: Optional[int] = None
    clinic_id: Optional[int] = None


class VisitExpanded(BaseModel):
    id: int
    diagnosis: str
    prescription: str
    notes: Optional[str] = None
    visit_date: datetime.datetime
    patient_id: int
    clinic_id: int
    created_by_id: int
    patient_name: str
    patient_display_id: str
    clinic_name: str

    class Config:
        from_attributes = True
