from sqlalchemy import Column, String, Integer, Float, JSON, ForeignKey
from sqlalchemy.ext.mutable import MutableList
from app.models.base import Base

class Client(Base):
    __tablename__ = "clients"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    cnic = Column(String, nullable=True)
    gender = Column(String, nullable=False) # Female, Male, Other
    age = Column(Integer, nullable=False)
    address = Column(String, nullable=True)
    assigned_staff_id = Column(String, nullable=True)
    assigned_staff_name = Column(String, nullable=True)
    preferred_service = Column(String, nullable=True)
    total_spent = Column(Float, default=0.0)
    visits_count = Column(Integer, default=0)
    notes = Column(String, nullable=True)
    history = Column(MutableList.as_mutable(JSON), nullable=False, default=list) # List of ClientHistoryItem dicts
    joined_date = Column(String, nullable=False) # YYYY-MM-DD
    branch_id = Column(String, ForeignKey("branches.id"), nullable=True)
