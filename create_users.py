import sys
from backend.database import SessionLocal, engine
from backend import models

# Ensure tables are created
models.Base.metadata.create_all(bind=engine)

def create_users():
    db = SessionLocal()
    
    users_to_create = [
        {"username": "admin", "password_hash": "admin123", "role": "admin"},
        {"username": "clinic", "password_hash": "clinic123", "role": "staff"}
    ]
    
    for user_data in users_to_create:
        existing_user = db.query(models.User).filter(models.User.username == user_data["username"]).first()
        if existing_user:
            print(f"User '{user_data['username']}' already exists.")
        else:
            new_user = models.User(
                username=user_data["username"],
                password_hash=user_data["password_hash"],
                role=user_data["role"]
            )
            db.add(new_user)
            print(f"User '{user_data['username']}' created successfully!")
            
    db.commit()
    db.close()

if __name__ == "__main__":
    create_users()
