from typing import Optional, List
from pydantic import Field
from app.schemas.base import CamelModel

class ClientPackageCreate(CamelModel):
    client_id: str
    client_name: str
    package_name: str
    service_id: str
    total_sessions: int = Field(default=3, ge=1)
    total_amount_paid: float = Field(ge=0)
    branch_id: Optional[str] = None
    purchase_date: Optional[str] = None
    expiry_date: Optional[str] = None
    notes: Optional[str] = None

class ClientPackageResponse(CamelModel):
    id: str
    client_id: str
    client_name: str
    package_name: str
    service_id: str
    total_sessions: int
    used_sessions: int
    remaining_sessions: int
    total_amount_paid: float
    price_per_session: float
    status: str
    branch_id: Optional[str] = None
    purchase_date: str
    expiry_date: Optional[str] = None
    notes: Optional[str] = None

class PackageRedemptionInput(CamelModel):
    staff_name: Optional[str] = None
    notes: Optional[str] = None

class PackageRedemptionResponse(CamelModel):
    id: str
    package_id: str
    client_name: str
    session_number: int
    date: str
    time: Optional[str] = None
    staff_name: Optional[str] = None
    notes: Optional[str] = None
