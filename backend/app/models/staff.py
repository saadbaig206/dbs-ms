from sqlalchemy import Column, String, Float, JSON
from app.models.base import Base

class Staff(Base):
    __tablename__ = "staff"

    id = Column(String, primary_key=True, index=True)
    photo = Column(String, nullable=True)
    name = Column(String, nullable=False)
    role = Column(String, nullable=False) # e.g. Medical Director, Dermatologist, etc.
    salary = Column(Float, nullable=False)
    phone = Column(String, nullable=False)
    email = Column(String, nullable=False)
    joining_date = Column(String, nullable=False) # YYYY-MM-DD
    status = Column(String, nullable=False, default="Active") # Active, On Leave, Inactive
    performance_rating = Column(Float, default=5.0)
    assigned_services = Column(JSON, nullable=False, default=list) # List of service names or IDs
    attendance_rate = Column(Float, default=100.0)
