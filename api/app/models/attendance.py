from sqlalchemy import Column, String
from app.models.base import Base

class AttendanceRecord(Base):
    __tablename__ = "attendance"

    id = Column(String, primary_key=True, index=True)
    staff_id = Column(String, nullable=False)
    staff_name = Column(String, nullable=False)
    role = Column(String, nullable=False)
    date = Column(String, nullable=False) # YYYY-MM-DD
    status = Column(String, nullable=False) # Present, Late, Leave, Absent
    check_in_time = Column(String, nullable=True)
    check_out_time = Column(String, nullable=True)
    notes = Column(String, nullable=True)
