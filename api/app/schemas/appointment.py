from typing import Optional
from pydantic import Field
from app.schemas.base import CamelModel

class AppointmentBase(CamelModel):
    client_id: str
    client_name: str
    phone: str
    service_id: str
    service_name: str
    staff_id: str
    staff_name: str
    date: str
    time: str
    status: str = "Pending"
    reminder_status: Optional[str] = "Pending"
    notes: Optional[str] = None
    price: float = Field(ge=0)
    branch_id: Optional[str] = None

class AppointmentCreate(AppointmentBase):
    pass

class AppointmentUpdate(CamelModel):
    client_id: Optional[str] = None
    client_name: Optional[str] = None
    phone: Optional[str] = None
    service_id: Optional[str] = None
    service_name: Optional[str] = None
    staff_id: Optional[str] = None
    staff_name: Optional[str] = None
    date: Optional[str] = None
    time: Optional[str] = None
    status: Optional[str] = None
    reminder_status: Optional[str] = None
    notes: Optional[str] = None
    price: Optional[float] = Field(None, ge=0)
    branch_id: Optional[str] = None

class AppointmentResponse(AppointmentBase):
    id: str
