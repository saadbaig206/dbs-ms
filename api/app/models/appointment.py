from sqlalchemy import Column, String, Float, ForeignKey
from app.models.base import Base

class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(String, primary_key=True, index=True)
    client_id = Column(String, nullable=False)
    client_name = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    service_id = Column(String, nullable=False)
    service_name = Column(String, nullable=False)
    staff_id = Column(String, nullable=False)
    staff_name = Column(String, nullable=False)
    date = Column(String, nullable=False) # YYYY-MM-DD
    time = Column(String, nullable=False) # e.g. 10:00 AM
    status = Column(String, nullable=False, default="Pending") # Confirmed, In-Progress, Completed, Cancelled, Pending
    reminder_status = Column(String, nullable=True, default="Pending") # Pending, Sent, Rejected
    notes = Column(String, nullable=True)
    price = Column(Float, nullable=False)
    branch_id = Column(String, ForeignKey("branches.id"), nullable=True)
