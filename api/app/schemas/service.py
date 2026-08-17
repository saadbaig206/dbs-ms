from typing import List, Optional
from pydantic import Field
from app.schemas.base import CamelModel

class RequiredInventoryItem(CamelModel):
    inventory_item_id: str
    item_name: str
    quantity_used: int

class ServiceBase(CamelModel):
    name: str
    category: str
    price: float = Field(ge=0)
    duration_minutes: int = Field(ge=0)
    assigned_staff_ids: List[str] = Field(default_factory=list)
    assigned_staff_names: List[str] = Field(default_factory=list)
    status: str = "Active"
    image: Optional[str] = None
    description: Optional[str] = None
    required_inventory: List[RequiredInventoryItem] = Field(default_factory=list)

class ServiceCreate(ServiceBase):
    pass

class ServiceUpdate(CamelModel):
    name: Optional[str] = None
    category: Optional[str] = None
    price: Optional[float] = Field(None, ge=0)
    duration_minutes: Optional[int] = Field(None, ge=0)
    assigned_staff_ids: Optional[List[str]] = None
    assigned_staff_names: Optional[List[str]] = None
    status: Optional[str] = None
    image: Optional[str] = None
    description: Optional[str] = None
    required_inventory: Optional[List[RequiredInventoryItem]] = None

class ServiceResponse(ServiceBase):
    id: str
