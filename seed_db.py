import os
import sys
import datetime

# Add root folder to sys.path to resolve 'backend' module
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from backend.database import engine, Base, SessionLocal
from backend.models import User, Patient, Clinic, Visit

def seed_database():
    print("Dropping all existing tables...")
    Base.metadata.drop_all(bind=engine)
    
    print("Creating all tables from current models...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    try:
        print("Seeding users...")
        admin = User(
            username="admin", 
            password_hash="admin123", 
            role="admin", 
            full_name="System Administrator"
        )
        staff = User(
            username="staff", 
            password_hash="staff123", 
            role="staff", 
            full_name="Reception Staff"
        )
        db.add_all([admin, staff])
        db.commit()
        db.refresh(admin)
        db.refresh(staff)
        
        print("Seeding clinics...")
        clinic1 = Clinic(
            clinic_name="Mercy Clinic", 
            location="Kampala Rd", 
            contact_phone="0772123456"
        )
        clinic2 = Clinic(
            clinic_name="Mukono Family Clinic", 
            location="Mukono Town", 
            contact_phone="0752123456"
        )
        clinic3 = Clinic(
            clinic_name="Bugujju HC", 
            location="Bugujju Zone", 
            contact_phone="0702123456"
        )
        db.add_all([clinic1, clinic2, clinic3])
        db.commit()
        db.refresh(clinic1)
        db.refresh(clinic2)
        
        print("Seeding patients...")
        patient1 = Patient(
            display_id="MKN-001",
            full_name="John Doe",
            phone="0777111222",
            email="john@example.com",
            created_by_id=staff.id
        )
        patient2 = Patient(
            display_id="MKN-002",
            full_name="Jane Smith",
            phone="0755333444",
            email="jane@example.com",
            created_by_id=staff.id
        )
        patient3 = Patient(
            display_id="MKN-003",
            full_name="Alice Brown",
            phone="0700555666",
            email="alice@example.com",
            created_by_id=staff.id
        )
        db.add_all([patient1, patient2, patient3])
        db.commit()
        db.refresh(patient1)
        db.refresh(patient2)
        
        print("Seeding visits...")
        visit1 = Visit(
            diagnosis="Malaria",
            prescription="Coartem 2x2",
            notes="Patient presented with high fever and chills.",
            visit_date=datetime.datetime.utcnow(),
            patient_id=patient1.id,
            clinic_id=clinic1.id,
            created_by_id=admin.id
        )
        visit2 = Visit(
            diagnosis="Typhoid",
            prescription="Ciprofloxacin 500mg 1x2",
            notes="Complained of stomach ache and fatigue over past week.",
            visit_date=datetime.datetime.utcnow(),
            patient_id=patient2.id,
            clinic_id=clinic2.id,
            created_by_id=staff.id
        )
        db.add_all([visit1, visit2])
        db.commit()
        
        print("Database seeded successfully! You can now log in with admin/admin123 or staff/staff123.")
        
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
