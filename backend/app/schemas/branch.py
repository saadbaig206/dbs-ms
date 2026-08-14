from typing import Optional
from app.schemas.base import CamelModel

class BranchBase(CamelModel):
    name: str
    location: str
    phone: Optional[str] = None

class BranchCreate(BranchBase):
    pass

class BranchUpdate(CamelModel):
    name: Optional[str] = None
    location: Optional[str] = None
    phone: Optional[str] = None

class BranchResponse(BranchBase):
    id: str
