from typing import Optional
from app.schemas.base import CamelModel

class BranchBase(CamelModel):
    name: str
    location: str
    phone: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class BranchCreate(BranchBase):
    pass

class BranchUpdate(CamelModel):
    name: Optional[str] = None
    location: Optional[str] = None
    phone: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class BranchResponse(BranchBase):
    id: str
