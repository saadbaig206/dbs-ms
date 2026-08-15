from typing import List, Optional
from pydantic import Field
from app.schemas.base import CamelModel

class ClientHistoryItemSchema(CamelModel):
    id: Optional[str] = None
    date: Optional[str] = None
    service_name: Optional[str] = None
    staff_name: Optional[str] = None
    amount: Optional[float] = None
    status: Optional[str] = None

class ClientBase(CamelModel):
    name: str
    phone: str
    cnic: Optional[str] = None
    gender: str
    age: int = Field(ge=0)
    address: Optional[str] = None
    assigned_staff_id: Optional[str] = None
    assigned_staff_name: Optional[str] = None
    preferred_service: Optional[str] = None
    notes: Optional[str] = None
    branch_id: Optional[str] = None

class ClientCreate(ClientBase):
    pass

class ClientUpdate(CamelModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    cnic: Optional[str] = None
    gender: Optional[str] = None
    age: Optional[int] = Field(None, ge=0)
    address: Optional[str] = None
    assigned_staff_id: Optional[str] = None
    assigned_staff_name: Optional[str] = None
    preferred_service: Optional[str] = None
    total_spent: Optional[float] = Field(None, ge=0)
    visits_count: Optional[int] = Field(None, ge=0)
    notes: Optional[str] = None
    history: Optional[List[ClientHistoryItemSchema]] = None
    branch_id: Optional[str] = None

class ClientResponse(ClientBase):
    id: str
    total_spent: float
    visits_count: int
    history: Optional[List[ClientHistoryItemSchema]] = []
    joined_date: str
