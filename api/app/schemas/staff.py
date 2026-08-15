from typing import List, Optional
from pydantic import EmailStr, Field
from app.schemas.base import CamelModel

class StaffBase(CamelModel):
    photo: Optional[str] = None
    name: str
    role: str
    salary: float = Field(ge=0)
    phone: str
    email: EmailStr
    joining_date: str
    status: str = "Active"
    performance_rating: float = Field(default=5.0, ge=1, le=5)
    assigned_services: List[str] = Field(default_factory=list)
    attendance_rate: float = Field(default=100.0, ge=0, le=100)
    branch_id: Optional[str] = None

class StaffCreate(StaffBase):
    password: str

class StaffUpdate(CamelModel):
    photo: Optional[str] = None
    name: Optional[str] = None
    role: Optional[str] = None
    salary: Optional[float] = Field(None, ge=0)
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    joining_date: Optional[str] = None
    status: Optional[str] = None
    performance_rating: Optional[float] = Field(None, ge=1, le=5)
    assigned_services: Optional[List[str]] = None
    attendance_rate: Optional[float] = Field(None, ge=0, le=100)
    branch_id: Optional[str] = None

class StaffResponse(StaffBase):
    id: str
