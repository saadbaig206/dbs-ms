import asyncio
import sys
import os

# Adjust path so we can import from app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.future import select
from app.db.session import SessionLocal
from app.models.user import User
from app.models.staff import Staff
from app.core.security import get_password_hash

async def create_staff_user():
    print("--- Aura Clinic: Create User & Staff Member (Staff Role) ---")
    name = "Dr. Sarah Jenkins"
    email = "sarah@dbs.pk"
    password = "password123"
    role = "staff"
    staff_role = "Senior Dermatologist"
    phone = "+92 (300) 987-6543"
    
    async with SessionLocal() as db:
        # Check if user already exists
        result = await db.execute(select(User).where(User.email == email))
        existing_user = result.scalars().first()
        if existing_user:
            print(f"User with email '{email}' already exists. Re-hashing password...")
            existing_user.hashed_password = get_password_hash(password)
            existing_user.role = role
        else:
            hashed = get_password_hash(password)
            new_user = User(
                email=email,
                hashed_password=hashed,
                role=role
            )
            db.add(new_user)
            print(f"Creating user profile for '{email}' with role '{role}'...")

        # Check if staff record exists
        staff_id = "STF-102"
        result_staff = await db.execute(select(Staff).where(Staff.id == staff_id))
        existing_staff = result_staff.scalars().first()
        if not existing_staff:
            new_staff = Staff(
                id=staff_id,
                name=name,
                role=staff_role,
                salary=120000.0,
                phone=phone,
                email=email,
                joining_date="2026-02-10",
                status="Active",
                performance_rating=4.8,
                assigned_services=["Hand & Foot Laser", "Signature Treatments"],
                attendance_rate=100.0,
                photo="https://images.unsplash.com/photo-1594824813573-246434de83fb?auto=format&fit=crop&q=80&w=300"
            )
            db.add(new_staff)
            print(f"Creating staff profile for '{name}' (ID: {staff_id})...")
        else:
            existing_staff.email = email
            existing_staff.name = name
            existing_staff.role = staff_role
            print(f"Updating existing staff profile for '{name}'...")

        await db.commit()
        print("\nSuccessfully saved credentials on Neon Database!")
        print(f"Login Email: {email}")
        print(f"Login Password: {password}")
        print(f"Role: {role}")

if __name__ == "__main__":
    asyncio.run(create_staff_user())
