from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
import datetime
from .database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    password_hash = Column(String)
    role = Column(String) # "admin" or "staff"

class Patient(Base):
    __tablename__ = "patients"
    id = Column(Integer, primary_key=True, index=True)
    display_id = Column(String, unique=True, index=True)
    full_name = Column(String)
    phone = Column(String)
    email = Column(String)
    visits = relationship("Visit", back_populates="patient")

class Clinic(Base):
    __tablename__ = "clinics"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    location = Column(String)
    phone = Column(String)
    visits = relationship("Visit", back_populates="clinic")

class Visit(Base):
    __tablename__ = "visits"
    id = Column(Integer, primary_key=True, index=True)
    diagnosis = Column(String)
    prescription = Column(String)
    notes = Column(String)
    date = Column(DateTime, default=datetime.datetime.utcnow)
    patient_id = Column(Integer, ForeignKey("patients.id"))
    clinic_id = Column(Integer, ForeignKey("clinics.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    
    patient = relationship("Patient", back_populates="visits")
    clinic = relationship("Clinic", back_populates="visits")
    user = relationship("User")
