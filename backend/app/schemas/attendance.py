from typing import Optional
from app.schemas.base import CamelModel

class AttendanceBase(CamelModel):
    staff_id: str
    staff_name: str
    role: str
    date: str
    status: str
    check_in_time: Optional[str] = None
    check_out_time: Optional[str] = None
    notes: Optional[str] = None

class AttendanceCreate(CamelModel):
    staff_id: str
    status: str
    notes: Optional[str] = None

class AttendanceResponse(AttendanceBase):
    id: str
